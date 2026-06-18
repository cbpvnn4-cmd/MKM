from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel

from ..database import get_db
from ..models.purchases import PurchaseOrder, PurchaseOrderItem, Supplier, Elevator, ElevatorCalculationConfig, APInvoice, APPayment, PurchaseOrderPayment, PurchaseOrderInstallment, PurchaseOrderContainer
from ..models.products import Product
from ..models.inventory import StockMovement
from .auth import get_current_user
from ..services.financial import calculate_partner_capital_summary

router = APIRouter()

# Pydantic models for requests/responses
class ElevatorCreate(BaseModel):
    elevator_code: str
    height_meters: float
    model_type: str
    manufacture_year: Optional[int] = None
    cabin_count: int = 1
    unit_price_usd: Optional[float] = None
    section_count: Optional[int] = None
    rope_count: Optional[int] = None
    cable_count: Optional[int] = None
    notes: Optional[str] = None

class ElevatorResponse(BaseModel):
    id: int
    elevator_code: str
    height_meters: float
    model_type: str
    manufacture_year: Optional[int]
    cabin_count: int
    section_count: Optional[int]
    rope_count: Optional[int]
    cable_count: Optional[int]
    status: str
    unit_price_usd: Optional[float]
    total_cost_usd: Optional[float]
    notes: Optional[str]

    class Config:
        from_attributes = True

class PurchaseOrderItemCreate(BaseModel):
    # إما product_id (موجود) أو بيانات منتج جديد
    product_id: Optional[int] = None

    # بيانات المنتج الجديد (إذا لم يكن موجوداً)
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    product_category: Optional[str] = None
    product_uom: Optional[str] = "unit"

    # بيانات مشتركة
    qty: float
    unit_cost_usd: float

class InstallmentCreate(BaseModel):
    """Schema لإنشاء دفعة"""
    name: str
    type: str = "regular"  # advance, regular
    percentage: float
    amount_usd: float
    dueDate: date
    status: str = "pending"  # pending, partial, paid, overdue
    paid_amount_usd: float = 0
    notes: Optional[str] = None

class ContainerCreate(BaseModel):
    """Schema لإنشاء حاوية"""
    container_no: Optional[str] = None
    size: Optional[str] = None
    weight: Optional[float] = None
    shipping_cost: Optional[float] = None
    total_cost: Optional[float] = None
    notes: Optional[str] = None

class InstallmentResponse(BaseModel):
    """Schema لعرض دفعة"""
    id: int
    name: str
    type: str
    percentage: float
    amount_usd: float
    paid_amount_usd: float
    due_date: date
    status: str
    notes: Optional[str]

    class Config:
        from_attributes = True

class ContainerResponse(BaseModel):
    """Schema لعرض حاوية"""
    id: int
    container_no: Optional[str]
    size: Optional[str]
    weight: Optional[float]
    shipping_cost: Optional[float]
    total_cost: Optional[float]
    notes: Optional[str]

    class Config:
        from_attributes = True

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    warehouse_id: Optional[int] = None  # المستودع المستهدف
    po_no: str
    po_date: date
    expected_delivery_date: Optional[date] = None
    # Default to DRAFT at API level to avoid capital gate on creation unless explicitly confirmed
    status: Optional[str] = "DRAFT"
    notes: Optional[str] = None
    items: List[PurchaseOrderItemCreate] = []
    elevators: List[ElevatorCreate] = []
    installments: List[InstallmentCreate] = []
    containers: List[ContainerCreate] = []
    advancePayment: Optional[float] = 0
    advancePercentage: Optional[float] = 30

class PurchaseOrderResponse(BaseModel):
    id: int
    supplier_id: int
    warehouse_id: Optional[int] = None  # المستودع المستهدف
    po_no: str
    po_date: date
    expected_delivery_date: Optional[date]
    status: str
    total_amount_usd: Optional[float]
    paid_amount_usd: Optional[float] = 0  # 🆕 المبلغ المدفوع
    notes: Optional[str]
    elevators: List[ElevatorResponse] = []
    payments: List['PurchaseOrderPaymentResponse'] = []  # 🆕 قائمة المدفوعات
    installments: List[InstallmentResponse] = []  # 🆕 قائمة الدفعات
    containers: List[ContainerResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None  # 🆕 قائمة الحاويات

    class Config:
        from_attributes = True

@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    purchase_order: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """إنشاء أمر شراء جديد مع إمكانية إضافة مصاعد"""

    # التحقق من وجود المورد
    supplier = db.query(Supplier).filter(Supplier.id == purchase_order.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="المورد غير موجود")

    # توحيد والتحقق من حالة الطلب لضمان عدم الرجوع الافتراضي إلى "DRAFT"
    valid_statuses = ["DRAFT", "CONFIRMED", "RECEIVED", "CANCELLED"]
    # Default to DRAFT unless client explicitly confirms
    status_value = (purchase_order.status or "DRAFT").upper()
    if status_value not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"الحالة غير صحيحة. الحالات المتاحة: {', '.join(valid_statuses)}"
        )

    # إنشاء أمر الشراء
    db_purchase_order = PurchaseOrder(
        supplier_id=purchase_order.supplier_id,
        warehouse_id=purchase_order.warehouse_id,
        po_no=purchase_order.po_no,
        po_date=purchase_order.po_date,
        expected_delivery_date=purchase_order.expected_delivery_date,
        status=status_value,  # حفظ الحالة بعد التحقق والتوحيد
        notes=purchase_order.notes,
        created_by=current_user.id
    )

    db.add(db_purchase_order)
    db.flush()  # للحصول على ID

    # إضافة المصاعد مع الحسابات التلقائية
    total_elevators_cost = Decimal('0')
    if purchase_order.elevators:
        # الحصول على إعدادات الحساب
        calc_config = db.query(ElevatorCalculationConfig).filter(
            ElevatorCalculationConfig.is_active == True
        ).first()

        for elevator_data in purchase_order.elevators:
            db_elevator = Elevator(
                elevator_code=elevator_data.elevator_code,
                purchase_order_id=db_purchase_order.id,
                height_meters=elevator_data.height_meters,
                model_type=elevator_data.model_type,
                manufacture_year=elevator_data.manufacture_year,
                cabin_count=elevator_data.cabin_count,
                unit_price_usd=elevator_data.unit_price_usd,
                notes=elevator_data.notes,
                created_by=current_user.id
            )

            # حساب المكونات التلقائياً
            db_elevator.calculate_components(calc_config)

            # تطبيق القيم اليدوية إن وُجدت
            if elevator_data.section_count is not None and elevator_data.section_count > 0:
                db_elevator.section_count = elevator_data.section_count
            if elevator_data.rope_count is not None and elevator_data.rope_count > 0:
                db_elevator.rope_count = elevator_data.rope_count
            if elevator_data.cable_count is not None and elevator_data.cable_count > 0:
                db_elevator.cable_count = elevator_data.cable_count

            # حساب التكلفة الإجمالية
            if db_elevator.unit_price_usd:
                elevator_cost = Decimal(str(db_elevator.unit_price_usd))
                db_elevator.total_cost_usd = elevator_cost
                total_elevators_cost += elevator_cost

            db.add(db_elevator)

    # إضافة عناصر الشراء العادية
    total_items_cost = Decimal('0')
    item_counter = 1  # عداد للبنود لضمان تفرد SKU
    for item_data in purchase_order.items:
        # 🎯 إذا لم يوجد product_id، أنشئ منتج جديد
        if not item_data.product_id:
            if not item_data.product_name:
                raise HTTPException(
                    status_code=400,
                    detail="يجب تحديد product_id أو product_name"
                )

            # إنشاء SKU فريد: إما من البيانات أو توليده تلقائياً
            if item_data.product_sku:
                # التحقق من عدم وجود منتج بنفس SKU
                existing_product = db.query(Product).filter(Product.sku == item_data.product_sku).first()
                if existing_product:
                    # استخدم المنتج الموجود بدلاً من إنشاء جديد
                    product_id = existing_product.id
                    db_item = PurchaseOrderItem(
                        purchase_order_id=db_purchase_order.id,
                        product_id=product_id,
                        qty=item_data.qty,
                        unit_cost_usd=item_data.unit_cost_usd,
                        created_by=current_user.id
                    )
                    total_items_cost += Decimal(str(db_item.line_total_usd))
                    db.add(db_item)
                    item_counter += 1
                    continue
                generated_sku = item_data.product_sku
            else:
                # توليد SKU فريد مع timestamp
                import time
                timestamp = str(int(time.time() * 1000))[-8:]  # آخر 8 أرقام من timestamp
                generated_sku = f"AUTO-PO-{db_purchase_order.po_no}-{item_counter}-{timestamp}"

                # التحقق من عدم وجود تكرار (احتياطي)
                while db.query(Product).filter(Product.sku == generated_sku).first():
                    import random
                    generated_sku = f"AUTO-PO-{db_purchase_order.po_no}-{item_counter}-{timestamp}-{random.randint(100, 999)}"

            # إنشاء منتج جديد
            new_product = Product(
                sku=generated_sku,
                name=item_data.product_name,
                category=item_data.product_category or "غير مصنف",
                uom=item_data.product_uom or "unit",
                price_usd=item_data.unit_cost_usd * 1.2,  # سعر البيع = التكلفة + 20%
                cost_price=item_data.unit_cost_usd,
                stock=0,  # سيتم تحديثه عند الاستلام
                is_active=True,
                auto_created_from_po=True
            )
            db.add(new_product)
            db.flush()  # للحصول على ID
            product_id = new_product.id
        else:
            product_id = item_data.product_id

        db_item = PurchaseOrderItem(
            purchase_order_id=db_purchase_order.id,
            product_id=product_id,
            qty=item_data.qty,
            unit_cost_usd=item_data.unit_cost_usd,
            created_by=current_user.id
        )
        total_items_cost += Decimal(str(db_item.line_total_usd))
        db.add(db_item)
        item_counter += 1

    # معالجة بيانات الحاويات (containers)
    total_containers_cost = Decimal('0')
    if purchase_order.containers:
        for container_data in purchase_order.containers:
            db_container = PurchaseOrderContainer(
                purchase_order_id=db_purchase_order.id,
                container_no=container_data.container_no,
                size=container_data.size,
                weight=container_data.weight,
                shipping_cost=container_data.shipping_cost,
                total_cost=container_data.total_cost,
                notes=container_data.notes,
                created_by=current_user.id
            )
            db.add(db_container)

            container_total = container_data.total_cost
            if container_total is None and container_data.shipping_cost is not None:
                container_total = container_data.shipping_cost
            if container_total is not None:
                total_containers_cost += Decimal(str(container_total))

    # تحديث المجموع الكلي
    total_amount_value = total_elevators_cost + total_items_cost + total_containers_cost
    db_purchase_order.total_amount_usd = total_amount_value

    # 🆕 معالجة بيانات الدفعات (installments)
    if purchase_order.installments:
        for installment_data in purchase_order.installments:
            db_installment = PurchaseOrderInstallment(
                purchase_order_id=db_purchase_order.id,
                name=installment_data.name,
                type=installment_data.type,
                percentage=installment_data.percentage,
                amount_usd=installment_data.amount_usd,
                paid_amount_usd=installment_data.paid_amount_usd,
                due_date=installment_data.dueDate,
                status=installment_data.status,
                notes=installment_data.notes,
                created_by=current_user.id
            )
            db.add(db_installment)

    # 🆕 حفظ بيانات المبلغ المدفوع إذا كان موجوداً
    if hasattr(purchase_order, 'advancePayment') and purchase_order.advancePayment:
        db_purchase_order.paid_amount_usd = purchase_order.advancePayment

    # التحقق من توفر رأس المال قبل الحفظ
    if status_value in ("CONFIRMED", "RECEIVED"):
        summary = calculate_partner_capital_summary(
            db,
            exclude_purchase_order_id=db_purchase_order.id
        )
        if total_amount_value > summary["available_capital"]:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "INSUFFICIENT_CAPITAL",
                    "message": (
                        "المبلغ المطلوب لأمر الشراء يتجاوز رأس المال المتاح. "
                        f"المتاح حالياً: ${float(summary['available_capital']):,.2f}"
                    ),
                    "available_capital": float(summary["available_capital"]),
                    "required_amount": float(total_amount_value),
                    "net_capital": float(summary["net_capital"])
                }
            )

    db.commit()
    db.refresh(db_purchase_order)

    # إرجاع البيانات مع العلاقات
    return db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.elevators),
        joinedload(PurchaseOrder.payments),
        joinedload(PurchaseOrder.installments),
        joinedload(PurchaseOrder.containers)
    ).filter(PurchaseOrder.id == db_purchase_order.id).first()

@router.get("/purchase-orders", response_model=List[PurchaseOrderResponse])
async def get_purchase_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """الحصول على قائمة أوامر الشراء"""
    purchase_orders = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.elevators)
    ).offset(skip).limit(limit).all()

    return purchase_orders

@router.get("/purchase-orders/{purchase_order_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """الحصول على تفاصيل أمر شراء محدد"""
    purchase_order = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.elevators),
        joinedload(PurchaseOrder.payments),
        joinedload(PurchaseOrder.installments),
        joinedload(PurchaseOrder.containers)
    ).filter(PurchaseOrder.id == purchase_order_id).first()

    if not purchase_order:
        raise HTTPException(status_code=404, detail="أمر الشراء غير موجود")

    return purchase_order


@router.put("/purchase-orders/{purchase_order_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    purchase_order_id: int,
    purchase_order: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """تحديث أمر شراء موجود"""

    # البحث عن أمر الشراء
    db_purchase_order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == purchase_order_id
    ).first()

    if not db_purchase_order:
        raise HTTPException(status_code=404, detail="أمر الشراء غير موجود")

    # توحيد والتحقق من حالة الطلب لضمان عدم الرجوع الافتراضي إلى "DRAFT"
    valid_statuses = ["DRAFT", "CONFIRMED", "RECEIVED", "CANCELLED"]
    status_value = (purchase_order.status or "DRAFT").upper()
    if status_value not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"الحالة غير صحيحة. الحالات المتاحة: {', '.join(valid_statuses)}"
        )

    # تحديث البيانات الأساسية
    db_purchase_order.supplier_id = purchase_order.supplier_id
    db_purchase_order.po_no = purchase_order.po_no
    db_purchase_order.po_date = purchase_order.po_date
    db_purchase_order.expected_delivery_date = purchase_order.expected_delivery_date
    db_purchase_order.status = status_value  # تحديث الحالة بعد التحقق والتوحيد
    db_purchase_order.notes = purchase_order.notes
    db_purchase_order.updated_by = current_user.id

    # حذف العناصر القديمة
    db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.purchase_order_id == purchase_order_id
    ).delete()

    # حذف المصاعد القديمة
    db.query(Elevator).filter(
        Elevator.purchase_order_id == purchase_order_id
    ).delete()

    # إضافة المصاعد الجديدة
    total_elevators_cost = Decimal('0')
    if purchase_order.elevators:
        calc_config = db.query(ElevatorCalculationConfig).filter(
            ElevatorCalculationConfig.is_active == True
        ).first()

        for elevator_data in purchase_order.elevators:
            db_elevator = Elevator(
                elevator_code=elevator_data.elevator_code,
                purchase_order_id=db_purchase_order.id,
                height_meters=elevator_data.height_meters,
                model_type=elevator_data.model_type,
                manufacture_year=elevator_data.manufacture_year,
                cabin_count=elevator_data.cabin_count,
                unit_price_usd=elevator_data.unit_price_usd,
                notes=elevator_data.notes,
                created_by=current_user.id
            )
            db_elevator.calculate_components(calc_config)
            if elevator_data.section_count is not None and elevator_data.section_count > 0:
                db_elevator.section_count = elevator_data.section_count
            if elevator_data.rope_count is not None and elevator_data.rope_count > 0:
                db_elevator.rope_count = elevator_data.rope_count
            if elevator_data.cable_count is not None and elevator_data.cable_count > 0:
                db_elevator.cable_count = elevator_data.cable_count
            if db_elevator.unit_price_usd:
                elevator_cost = Decimal(str(db_elevator.unit_price_usd))
                db_elevator.total_cost_usd = elevator_cost
                total_elevators_cost += elevator_cost
            db.add(db_elevator)

    # إضافة العناصر الجديدة
    total_items_cost = Decimal('0')
    item_counter = 1  # عداد للبنود لضمان تفرد SKU
    for item_data in purchase_order.items:
        if not item_data.product_id:
            if not item_data.product_name:
                raise HTTPException(status_code=400, detail="يجب تحديد product_id أو product_name")

            # إنشاء SKU فريد: إما من البيانات أو توليده تلقائياً
            if item_data.product_sku:
                # التحقق من عدم وجود منتج بنفس SKU
                existing_product = db.query(Product).filter(Product.sku == item_data.product_sku).first()
                if existing_product:
                    # استخدم المنتج الموجود بدلاً من إنشاء جديد
                    product_id = existing_product.id
                    db_item = PurchaseOrderItem(
                        purchase_order_id=db_purchase_order.id,
                        product_id=product_id,
                        qty=item_data.qty,
                        unit_cost_usd=item_data.unit_cost_usd,
                        created_by=current_user.id
                    )
                    total_items_cost += Decimal(str(db_item.line_total_usd))
                    db.add(db_item)
                    item_counter += 1
                    continue
                generated_sku = item_data.product_sku
            else:
                # توليد SKU فريد مع timestamp
                import time
                timestamp = str(int(time.time() * 1000))[-8:]  # آخر 8 أرقام من timestamp
                generated_sku = f"AUTO-PO-{db_purchase_order.po_no}-{item_counter}-{timestamp}"

                # التحقق من عدم وجود تكرار (احتياطي)
                while db.query(Product).filter(Product.sku == generated_sku).first():
                    import random
                    generated_sku = f"AUTO-PO-{db_purchase_order.po_no}-{item_counter}-{timestamp}-{random.randint(100, 999)}"

            new_product = Product(
                sku=generated_sku,
                name=item_data.product_name,
                category=item_data.product_category or "غير مصنف",
                uom=item_data.product_uom or "unit",
                price_usd=item_data.unit_cost_usd * 1.2,
                cost_price=item_data.unit_cost_usd,
                stock=0,
                is_active=True,
                auto_created_from_po=True
            )
            db.add(new_product)
            db.flush()
            product_id = new_product.id
        else:
            product_id = item_data.product_id

        db_item = PurchaseOrderItem(
            purchase_order_id=db_purchase_order.id,
            product_id=product_id,
            qty=item_data.qty,
            unit_cost_usd=item_data.unit_cost_usd,
            created_by=current_user.id
        )
        total_items_cost += Decimal(str(db_item.line_total_usd))
        db.add(db_item)
        item_counter += 1

    # حذف الدفعات القديمة
    db.query(PurchaseOrderInstallment).filter(
        PurchaseOrderInstallment.purchase_order_id == purchase_order_id
    ).delete()

    # إضافة الدفعات الجديدة
    if purchase_order.installments:
        for installment_data in purchase_order.installments:
            db_installment = PurchaseOrderInstallment(
                purchase_order_id=db_purchase_order.id,
                name=installment_data.name,
                type=installment_data.type,
                percentage=installment_data.percentage,
                amount_usd=installment_data.amount_usd,
                paid_amount_usd=installment_data.paid_amount_usd,
                due_date=installment_data.dueDate,
                status=installment_data.status,
                notes=installment_data.notes,
                created_by=current_user.id
            )
            db.add(db_installment)

    # حذف الحاويات القديمة
    db.query(PurchaseOrderContainer).filter(
        PurchaseOrderContainer.purchase_order_id == purchase_order_id
    ).delete()

    # إضافة الحاويات الجديدة
    total_containers_cost = Decimal('0')
    if purchase_order.containers:
        for container_data in purchase_order.containers:
            db_container = PurchaseOrderContainer(
                purchase_order_id=db_purchase_order.id,
                container_no=container_data.container_no,
                size=container_data.size,
                weight=container_data.weight,
                shipping_cost=container_data.shipping_cost,
                total_cost=container_data.total_cost,
                notes=container_data.notes,
                created_by=current_user.id
            )
            db.add(db_container)

            container_total = container_data.total_cost
            if container_total is None and container_data.shipping_cost is not None:
                container_total = container_data.shipping_cost
            if container_total is not None:
                total_containers_cost += Decimal(str(container_total))

    total_amount_value = total_elevators_cost + total_items_cost + total_containers_cost
    db_purchase_order.total_amount_usd = total_amount_value

    if status_value in ("CONFIRMED", "RECEIVED"):
        summary = calculate_partner_capital_summary(
            db,
            exclude_purchase_order_id=db_purchase_order.id
        )
        if total_amount_value > summary["available_capital"]:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "INSUFFICIENT_CAPITAL",
                    "message": (
                        "المبلغ المطلوب لأمر الشراء يتجاوز رأس المال المتاح. "
                        f"المتاح حالياً: ${float(summary['available_capital']):,.2f}"
                    ),
                    "available_capital": float(summary["available_capital"]),
                    "required_amount": float(total_amount_value),
                    "net_capital": float(summary["net_capital"])
                }
            )

    # 🆕 حفظ بيانات المبلغ المدفوع
    if hasattr(purchase_order, 'advancePayment') and purchase_order.advancePayment:
        db_purchase_order.paid_amount_usd = purchase_order.advancePayment

    db.commit()
    db.refresh(db_purchase_order)

    return db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.elevators),
        joinedload(PurchaseOrder.payments),
        joinedload(PurchaseOrder.installments),
        joinedload(PurchaseOrder.containers)
    ).filter(PurchaseOrder.id == db_purchase_order.id).first()

@router.delete("/purchase-orders/{purchase_order_id}")
async def delete_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """حذف أمر شراء"""

    # البحث عن أمر الشراء
    purchase_order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == purchase_order_id
    ).first()

    if not purchase_order:
        raise HTTPException(status_code=404, detail="أمر الشراء غير موجود")

    # التحقق من حالة الأمر - لا يمكن حذف الأوامر المستلمة
    if purchase_order.status == "RECEIVED":
        raise HTTPException(
            status_code=400,
            detail="لا يمكن حذف أمر شراء مستلم. يرجى إلغاء الاستلام أولاً"
        )

    # جمع العناصر قبل الحذف لمعرفة المنتجات التي أنشئت تلقائياً
    po_items = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.purchase_order_id == purchase_order_id
    ).all()

    auto_products_to_consider = []
    if po_items:
        product_ids = [item.product_id for item in po_items if item.product_id]
        if product_ids:
            auto_products_to_consider = db.query(Product).filter(
                Product.id.in_(product_ids),
                Product.auto_created_from_po == True
            ).all()

    products_to_delete = []
    for product in auto_products_to_consider:
        other_po_items = db.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.product_id == product.id,
            PurchaseOrderItem.purchase_order_id != purchase_order_id
        ).count()
        stock_movements = db.query(StockMovement).filter(
            StockMovement.product_id == product.id
        ).count()
        current_stock = float(product.stock or 0)

        if other_po_items == 0 and stock_movements == 0 and current_stock == 0:
            products_to_delete.append(product)

    # حذف المصاعد المرتبطة
    db.query(Elevator).filter(Elevator.purchase_order_id == purchase_order_id).delete()

    # حذف عناصر الشراء المرتبطة
    db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.purchase_order_id == purchase_order_id
    ).delete()

    # حذف أمر الشراء
    db.delete(purchase_order)

    # حذف المنتجات التي تم إنشاؤها تلقائياً ولم تعد مستخدمة
    deleted_products_count = 0
    for product in products_to_delete:
        db.delete(product)
        deleted_products_count += 1

    db.commit()

    return {
        "message": "تم حذف أمر الشراء بنجاح",
        "id": purchase_order_id,
        "deleted_auto_products": deleted_products_count
    }



# Support both GET and POST, and both with/without the 'purchases' prefix
@router.get("/purchases/elevators/calculate", response_model=dict)
@router.get("/elevators/calculate", response_model=dict)
@router.post("/elevators/calculate", response_model=dict)
@router.post("/purchases/elevators/calculate", response_model=dict)
async def calculate_elevator_components(
    height_meters: float,
    cabin_count: int = 1,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """حساب مكونات المصعد بناءً على الارتفاع وعدد الكابينات"""

    # الحصول على إعدادات الحساب
    calc_config = db.query(ElevatorCalculationConfig).filter(
        ElevatorCalculationConfig.is_active == True
    ).first()

    # إنشاء مصعد مؤقت للحسابات
    temp_elevator = Elevator(
        elevator_code="temp",
        height_meters=height_meters,
        model_type="temp",
        cabin_count=cabin_count
    )

    temp_elevator.calculate_components(calc_config)

    return {
        "height_meters": height_meters,
        "cabin_count": cabin_count,
        "section_count": temp_elevator.section_count,
        "rope_count": temp_elevator.rope_count,
        "cable_count": temp_elevator.cable_count,
        "section_length_used": float(calc_config.section_length_meters) if calc_config else 1.5
    }

@router.get("/elevators", response_model=List[ElevatorResponse])
async def get_elevators(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """الحصول على قائمة المصاعد"""
    elevators = db.query(Elevator).offset(skip).limit(limit).all()
    return elevators

# إعدادات حساب المصاعد
class ElevatorConfigCreate(BaseModel):
    section_length_meters: float = 1.5
    base_rope_per_section: int = 2
    base_cable_per_section: int = 1
    double_cabin_multiplier: float = 1.8

@router.post("/elevator-config")
async def create_elevator_config(
    config: ElevatorConfigCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """إنشاء أو تحديث إعدادات حساب المصاعد"""

    # إلغاء تفعيل الإعدادات القديمة
    db.query(ElevatorCalculationConfig).update({"is_active": False})

    # إنشاء إعدادات جديدة
    db_config = ElevatorCalculationConfig(
        section_length_meters=config.section_length_meters,
        base_rope_per_section=config.base_rope_per_section,
        base_cable_per_section=config.base_cable_per_section,
        double_cabin_multiplier=config.double_cabin_multiplier,
        is_active=True,
        created_by=current_user.id
    )

    db.add(db_config)
    db.commit()

    return {"message": "تم تحديث إعدادات حساب المصاعد بنجاح"}

@router.get("/elevator-config")
async def get_elevator_config(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """الحصول على إعدادات حساب المصاعد الحالية"""
    config = db.query(ElevatorCalculationConfig).filter(
        ElevatorCalculationConfig.is_active == True
    ).first()

    if not config:
        return {
            "section_length_meters": 1.5,
            "base_rope_per_section": 2,
            "base_cable_per_section": 1,
            "double_cabin_multiplier": 1.8
        }

    return {
        "section_length_meters": float(config.section_length_meters),
        "base_rope_per_section": config.base_rope_per_section,
        "base_cable_per_section": config.base_cable_per_section,
        "double_cabin_multiplier": float(config.double_cabin_multiplier)
    }

# =====================================================
# استلام البضاعة وربطها بالمخزون
# =====================================================

class ReceiveGoodsRequest(BaseModel):
    warehouse_id: Optional[int] = None
    received_date: Optional[date] = None
    auto_decompose_elevators: bool = True  # تفكيك المصاعد تلقائياً إلى أجزاء

@router.post("/purchase-orders/{purchase_order_id}/receive")
async def receive_purchase_order(
    purchase_order_id: int,
    receive_data: Optional[ReceiveGoodsRequest] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    🎯 استلام البضاعة من أمر الشراء وتحديث المخزون تلقائياً

    هذه الدالة تقوم بـ:
    1. تغيير حالة أمر الشراء إلى RECEIVED
    2. زيادة كمية المنتجات في المخزون
    3. تسجيل حركات المخزون في stock_movements
    4. تفكيك المصاعد إلى قطع غيار (إن وجدت)
    """
    from ..models.inventory import Warehouse as WarehouseModel

    # التحقق من وجود أمر الشراء
    purchase_order = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.items),
        joinedload(PurchaseOrder.elevators)
    ).filter(PurchaseOrder.id == purchase_order_id).first()

    if not purchase_order:
        raise HTTPException(status_code=404, detail="أمر الشراء غير موجود")

    # التحقق من الحالة
    if purchase_order.status == "RECEIVED":
        raise HTTPException(status_code=400, detail="تم استلام هذا الطلب مسبقاً")

    if purchase_order.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="لا يمكن استلام طلب ملغى")

    # التحقق من وجود بنود أو مصاعد في أمر الشراء
    if not purchase_order.items and not purchase_order.elevators:
        raise HTTPException(status_code=400, detail="أمر الشراء لا يحتوي على بنود أو مصاعد")

    # معالجة بيانات الاستلام
    if receive_data is None:
        receive_data = ReceiveGoodsRequest()

    # إذا لم يُحدد مستودع، استخدم الأول
    warehouse_id = receive_data.warehouse_id
    if not warehouse_id:
        default_warehouse = db.query(WarehouseModel).first()
        if not default_warehouse:
            raise HTTPException(
                status_code=400,
                detail="لا يوجد مستودع في النظام. يرجى إضافة مستودع أولاً"
            )
        warehouse_id = default_warehouse.id

    try:
        # استدعاء دالة استلام البضاعة
        purchase_order.receive_goods(
            db_session=db,
            warehouse_id=warehouse_id,
            received_date=receive_data.received_date,
            auto_decompose_elevators=receive_data.auto_decompose_elevators
        )

        db.commit()
        db.refresh(purchase_order)

        return {
            "success": True,
            "message": "تم استلام البضاعة وتحديث المخزون بنجاح",
            "purchase_order_id": purchase_order.id,
            "po_no": purchase_order.po_no,
            "status": purchase_order.status,
            "items_received": len(purchase_order.items),
            "elevators_received": len(purchase_order.elevators) if purchase_order.elevators else 0,
            "elevator_decomposition": receive_data.auto_decompose_elevators,
            "received_date": str(purchase_order.received_date) if purchase_order.received_date else None
        }

    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"حدث خطأ أثناء استلام البضاعة: {str(e)}")

@router.post("/purchase-orders/{purchase_order_id}/unreceive")
async def unreceive_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    🔙 إلغاء استلام أمر الشراء (تغيير الحالة من RECEIVED إلى CONFIRMED)

    ملاحظة: هذه الدالة تقوم فقط بتغيير حالة الأمر.
    لا تقوم بالتراجع عن حركات المخزون التي تمت عند الاستلام.
    """
    # التحقق من وجود أمر الشراء
    purchase_order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == purchase_order_id
    ).first()

    if not purchase_order:
        raise HTTPException(status_code=404, detail="أمر الشراء غير موجود")

    # التحقق من الحالة - يجب أن يكون مستلماً
    if purchase_order.status != "RECEIVED":
        raise HTTPException(
            status_code=400,
            detail=f"أمر الشراء ليس بحالة مستلم. الحالة الحالية: {purchase_order.status}"
        )

    # تغيير الحالة إلى CONFIRMED
    purchase_order.status = "CONFIRMED"
    purchase_order.updated_by = current_user.id

    db.commit()
    db.refresh(purchase_order)

    return {
        "success": True,
        "message": "تم إلغاء استلام أمر الشراء بنجاح",
        "purchase_order_id": purchase_order.id,
        "po_no": purchase_order.po_no,
        "status": purchase_order.status
    }

@router.put("/purchase-orders/{purchase_order_id}/status")
async def update_purchase_order_status(
    purchase_order_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    تحديث حالة أمر الشراء

    الحالات المتاحة:
    - DRAFT: مسودة
    - CONFIRMED: مؤكد (تم إرساله للمورد)
    - RECEIVED: تم الاستلام (استخدم endpoint /receive بدلاً من هذا)
    - CANCELLED: ملغى
    """

    purchase_order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == purchase_order_id
    ).first()

    if not purchase_order:
        raise HTTPException(status_code=404, detail="أمر الشراء غير موجود")

    valid_statuses = ["DRAFT", "CONFIRMED", "RECEIVED", "CANCELLED"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"الحالة غير صحيحة. الحالات المتاحة: {', '.join(valid_statuses)}"
        )

    # منع التغيير المباشر إلى RECEIVED
    if new_status == "RECEIVED":
        raise HTTPException(
            status_code=400,
            detail="لتغيير الحالة إلى 'تم الاستلام'، يرجى استخدام endpoint: POST /purchase-orders/{id}/receive"
        )

    purchase_order.status = new_status
    purchase_order.updated_by = current_user.id

    db.commit()

    return {
        "message": "تم تحديث حالة أمر الشراء بنجاح",
        "purchase_order_id": purchase_order.id,
        "new_status": new_status
    }


# ============================================
# Payment Management Endpoints (AP Payments)
# ============================================

class APPaymentCreate(BaseModel):
    """Schema for creating a new payment"""
    amount_usd: float
    paid_on: date
    method: Optional[str] = "BANK_TRANSFER"  # CASH, BANK_TRANSFER, CHECK, etc.
    reference_no: Optional[str] = None
    notes: Optional[str] = None

class APPaymentResponse(BaseModel):
    """Schema for payment response"""
    id: int
    ap_invoice_id: int
    amount_usd: float
    paid_on: date
    method: Optional[str]
    reference_no: Optional[str]
    notes: Optional[str]
    created_at: Optional[date]

    class Config:
        from_attributes = True

class APInvoiceCreate(BaseModel):
    """Schema for creating an AP Invoice"""
    purchase_order_id: Optional[int] = None
    invoice_no: str
    invoice_date: date
    due_date: Optional[date] = None
    amount_usd: float
    notes: Optional[str] = None

class APInvoiceResponse(BaseModel):
    """Schema for AP Invoice response"""
    id: int
    supplier_id: int
    purchase_order_id: Optional[int]
    invoice_no: str
    invoice_date: date
    due_date: Optional[date]
    amount_usd: float
    paid_amount_usd: float
    status: str
    payments: List[APPaymentResponse] = []

    class Config:
        from_attributes = True


@router.post("/purchase-orders/{purchase_order_id}/invoice", response_model=APInvoiceResponse)
async def create_ap_invoice_for_purchase_order(
    purchase_order_id: int,
    invoice_data: APInvoiceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    إنشاء فاتورة دفع (AP Invoice) لأمر شراء محدد
    """
    # التحقق من وجود أمر الشراء
    purchase_order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == purchase_order_id
    ).first()

    if not purchase_order:
        raise HTTPException(status_code=404, detail="أمر الشراء غير موجود")

    # إنشاء الفاتورة
    ap_invoice = APInvoice(
        supplier_id=purchase_order.supplier_id,
        purchase_order_id=purchase_order_id,
        invoice_no=invoice_data.invoice_no,
        invoice_date=invoice_data.invoice_date,
        due_date=invoice_data.due_date,
        amount_usd=invoice_data.amount_usd,
        paid_amount_usd=0,
        status="ISSUED",
        created_by=current_user.id
    )

    db.add(ap_invoice)
    db.commit()
    db.refresh(ap_invoice)

    return ap_invoice


@router.get("/purchase-orders/{purchase_order_id}/invoices", response_model=List[APInvoiceResponse])
async def get_invoices_for_purchase_order(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    الحصول على جميع الفواتير المرتبطة بأمر شراء
    """
    invoices = db.query(APInvoice).options(
        joinedload(APInvoice.payments)
    ).filter(
        APInvoice.purchase_order_id == purchase_order_id
    ).all()

    return invoices


@router.post("/invoices/{invoice_id}/payments", response_model=APPaymentResponse)
async def add_payment_to_invoice(
    invoice_id: int,
    payment_data: APPaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    إضافة دفعة جديدة لفاتورة
    """
    # التحقق من وجود الفاتورة
    invoice = db.query(APInvoice).filter(APInvoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="الفاتورة غير موجودة")

    # التحقق من أن الدفعة لا تتجاوز المبلغ المتبقي
    remaining_amount = invoice.amount_usd - invoice.paid_amount_usd

    if payment_data.amount_usd > remaining_amount:
        raise HTTPException(
            status_code=400,
            detail=f"المبلغ المدفوع ({payment_data.amount_usd}) يتجاوز المبلغ المتبقي ({remaining_amount})"
        )

    # إنشاء الدفعة
    payment = APPayment(
        ap_invoice_id=invoice_id,
        amount_usd=payment_data.amount_usd,
        paid_on=payment_data.paid_on,
        method=payment_data.method,
        reference_no=payment_data.reference_no,
        notes=payment_data.notes,
        created_by=current_user.id
    )

    db.add(payment)

    # تحديث المبلغ المدفوع في الفاتورة
    invoice.paid_amount_usd += payment_data.amount_usd

    # تحديث حالة الفاتورة
    if invoice.paid_amount_usd >= invoice.amount_usd:
        invoice.status = "PAID"
    elif invoice.paid_amount_usd > 0:
        invoice.status = "PARTIALLY_PAID"

    invoice.updated_by = current_user.id

    db.commit()
    db.refresh(payment)

    return payment


@router.get("/invoices/{invoice_id}/payments", response_model=List[APPaymentResponse])
async def get_payments_for_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    الحصول على جميع الدفعات المرتبطة بفاتورة
    """
    payments = db.query(APPayment).filter(
        APPayment.ap_invoice_id == invoice_id
    ).all()

    return payments


@router.delete("/ap-payments/{payment_id}")
async def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    حذف دفعة (وتحديث حالة الفاتورة تلقائياً)
    """
    payment = db.query(APPayment).filter(APPayment.id == payment_id).first()

    if not payment:
        raise HTTPException(status_code=404, detail="الدفعة غير موجودة")

    # الحصول على الفاتورة المرتبطة
    invoice = db.query(APInvoice).filter(APInvoice.id == payment.ap_invoice_id).first()

    if invoice:
        # تحديث المبلغ المدفوع
        invoice.paid_amount_usd -= payment.amount_usd

        # تحديث الحالة
        if invoice.paid_amount_usd <= 0:
            invoice.status = "ISSUED"
        elif invoice.paid_amount_usd < invoice.amount_usd:
            invoice.status = "PARTIALLY_PAID"
        else:
            invoice.status = "PAID"

        invoice.updated_by = current_user.id

    db.delete(payment)
    db.commit()

    return {"message": "تم حذف الدفعة بنجاح", "payment_id": payment_id}


# ============================================
# Pending Payments (الذمم الدائنة)
# ============================================

class PendingInvoiceResponse(BaseModel):
    """Schema for pending invoice with supplier info"""
    id: int
    invoice_no: str
    invoice_date: date
    due_date: Optional[date]
    supplier_id: int
    supplier_name: str
    purchase_order_id: Optional[int]
    po_no: Optional[str]
    amount_usd: float
    paid_amount_usd: float
    remaining_amount: float
    status: str

    class Config:
        from_attributes = True


@router.get("/pending-invoices", response_model=List[PendingInvoiceResponse])
async def get_pending_invoices(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    الحصول على جميع الفواتير المعلقة (التي لها متبقي)
    """
    # جلب الفواتير غير المسددة بالكامل
    invoices = db.query(
        APInvoice.id,
        APInvoice.invoice_no,
        APInvoice.invoice_date,
        APInvoice.due_date,
        APInvoice.supplier_id,
        Supplier.name.label("supplier_name"),
        APInvoice.purchase_order_id,
        PurchaseOrder.po_no,
        APInvoice.amount_usd,
        APInvoice.paid_amount_usd,
        (APInvoice.amount_usd - APInvoice.paid_amount_usd).label("remaining_amount"),
        APInvoice.status
    ).join(
        Supplier, APInvoice.supplier_id == Supplier.id
    ).outerjoin(
        PurchaseOrder, APInvoice.purchase_order_id == PurchaseOrder.id
    ).filter(
        APInvoice.status.in_(["ISSUED", "PARTIALLY_PAID"])
    ).order_by(
        APInvoice.due_date.asc().nullslast(),
        APInvoice.invoice_date.desc()
    ).all()

    return [
        {
            "id": inv.id,
            "invoice_no": inv.invoice_no,
            "invoice_date": inv.invoice_date,
            "due_date": inv.due_date,
            "supplier_id": inv.supplier_id,
            "supplier_name": inv.supplier_name,
            "purchase_order_id": inv.purchase_order_id,
            "po_no": inv.po_no,
            "amount_usd": float(inv.amount_usd),
            "paid_amount_usd": float(inv.paid_amount_usd),
            "remaining_amount": float(inv.remaining_amount),
            "status": inv.status
        }
        for inv in invoices
    ]


@router.get("/invoices/{invoice_id}/details", response_model=dict)
async def get_invoice_details(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    الحصول على تفاصيل فاتورة مع سجل الدفعات
    """
    invoice = db.query(APInvoice).options(
        joinedload(APInvoice.supplier),
        joinedload(APInvoice.purchase_order),
        joinedload(APInvoice.payments)
    ).filter(APInvoice.id == invoice_id).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="الفاتورة غير موجودة")

    return {
        "id": invoice.id,
        "invoice_no": invoice.invoice_no,
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "supplier": {
            "id": invoice.supplier.id,
            "name": invoice.supplier.name,
            "phone": invoice.supplier.phone
        },
        "purchase_order": {
            "id": invoice.purchase_order.id,
            "po_no": invoice.purchase_order.po_no
        } if invoice.purchase_order else None,
        "amount_usd": float(invoice.amount_usd),
        "paid_amount_usd": float(invoice.paid_amount_usd),
        "remaining_amount": float(invoice.amount_usd - invoice.paid_amount_usd),
        "status": invoice.status,
        "payments": [
            {
                "id": p.id,
                "amount_usd": float(p.amount_usd),
                "paid_on": p.paid_on,
                "method": p.method,
                "reference_no": p.reference_no,
                "notes": p.notes,
                "created_at": p.created_at
            }
            for p in invoice.payments
        ]
    }
# ============================================
# ?? ���� ��������� ������� ������ ������ (���� ������)
# ============================================

class PurchaseOrderPaymentCreate(BaseModel):
    """Schema ������ ���� ����� ���� ����"""
    amount_usd: float
    paid_on: date
    method: str = "BANK_TRANSFER"  # CASH, BANK_TRANSFER, CHECK, CREDIT_CARD
    reference_no: Optional[str] = None
    notes: Optional[str] = None

class PurchaseOrderPaymentResponse(BaseModel):
    """Schema ���� ����"""
    id: int
    purchase_order_id: int
    amount_usd: float
    paid_on: date
    method: str
    reference_no: Optional[str]
    notes: Optional[str]
    created_at: Optional[object]

    class Config:
        from_attributes = True

@router.get("/purchase-orders/{purchase_order_id}/payments", response_model=List[PurchaseOrderPaymentResponse])
async def get_purchase_order_payments(
    purchase_order_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    ������ ��� ���� ��������� �������� ���� ����
    """
    # ������ �� ���� ��� ������
    purchase_order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == purchase_order_id
    ).first()

    if not purchase_order:
        raise HTTPException(status_code=404, detail="��� ������ ��� �����")

    # ��� ���������
    payments = db.query(PurchaseOrderPayment).filter(
        PurchaseOrderPayment.purchase_order_id == purchase_order_id
    ).order_by(PurchaseOrderPayment.paid_on.desc()).all()

    return payments

@router.post("/purchase-orders/{purchase_order_id}/payments", response_model=PurchaseOrderPaymentResponse)
async def add_purchase_order_payment(
    purchase_order_id: int,
    payment_data: PurchaseOrderPaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    إضافة دفعة جديدة لأمر شراء
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Adding payment to PO {purchase_order_id}: {payment_data.dict()}")

    # التحقق من وجود أمر الشراء
    purchase_order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == purchase_order_id
    ).first()

    if not purchase_order:
        raise HTTPException(status_code=404, detail="أمر الشراء غير موجود")

    logger.info(f"PO found - Total: {purchase_order.total_amount_usd}, Paid: {purchase_order.paid_amount_usd}")

    # التحقق من أن الدفعة لا تتجاوز المبلغ المتبقي
    from decimal import Decimal

    total = Decimal(str(purchase_order.total_amount_usd or 0))
    paid = Decimal(str(purchase_order.paid_amount_usd or 0))
    remaining_amount = float(total - paid)

    # استخدام round للتعامل مع مشاكل الأرقام العشرية
    payment_amount = round(payment_data.amount_usd, 2)
    remaining_rounded = round(remaining_amount, 2)

    if payment_amount > remaining_rounded:
        error_msg = f"المبلغ المدفوع ({payment_amount}) يتجاوز المبلغ المتبقي ({remaining_rounded})"
        logger.error(error_msg)
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )

    # ����� ������
    payment = PurchaseOrderPayment(
        purchase_order_id=purchase_order_id,
        amount_usd=payment_data.amount_usd,
        paid_on=payment_data.paid_on,
        method=payment_data.method,
        reference_no=payment_data.reference_no,
        notes=payment_data.notes,
        created_by=current_user.id
    )

    db.add(payment)

    # ����� ������ ������� �� ��� ������
    purchase_order.paid_amount_usd = (purchase_order.paid_amount_usd or 0) + payment_data.amount_usd
    purchase_order.updated_by = current_user.id

    db.commit()
    db.refresh(payment)

    return payment

@router.delete("/purchase-order-payments/{payment_id}")
async def delete_purchase_order_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    ��� ���� �� ��� ���� (������ ������ ������� ��������)
    """
    payment = db.query(PurchaseOrderPayment).filter(
        PurchaseOrderPayment.id == payment_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="������ ��� ������")

    # ������ ��� ��� ������ �������
    purchase_order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == payment.purchase_order_id
    ).first()

    if purchase_order:
        # ����� ������ �������
        purchase_order.paid_amount_usd = (purchase_order.paid_amount_usd or 0) - payment.amount_usd
        purchase_order.updated_by = current_user.id

    db.delete(payment)
    db.commit()

    return {"message": "�� ��� ������ �����", "payment_id": payment_id}
