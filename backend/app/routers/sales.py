from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import List, Optional, Union
from datetime import datetime, date
from pydantic import BaseModel, Field
import math
from decimal import Decimal
import re

from app.database.database import get_db
from app.models.products import Product as ProductModel
from app.models.sales import SalesOrder as SalesOrderModel, SalesOrderItem as SalesOrderItemModel, Invoice as InvoiceModel, Payment as PaymentModel
from app.models.files import FileUpload as FileUploadModel
from app.models.audit import AuditLog
from app.core.file_storage import FileStorageService
from app.models.inventory import StockMovement as StockMovementModel
from app.models.purchases import ElevatorCalculationConfig
from app.schemas.sales import (
    Product,
    ProductCreate,
    ProductUpdate,
    SalesOrder,
    SalesOrderCreate,
    SalesOrderUpdate,
    SalesOrderItem,
    SalesOrderItemCreate,
    SalesOrderItemUpdate,
    SalesOrderDetail,
    Invoice,
    InvoiceCreate,
    InvoiceUpdate,
    Payment,
    PaymentCreate,
    PaymentCreateForInvoice,
    PaymentUpdate,
)

router = APIRouter()


# Pydantic schema for sales order with items
class SalesOrderWithItemsCreate(BaseModel):
    soNo: str
    customer: Optional[str] = None
    customer_id: Optional[int] = None
    date: date  # MUST be date type since validator converts it
    status: str = "DRAFT"
    orderType: str = "items"
    exchange_rate: Optional[Decimal] = Field(default=Decimal("1.0000"), alias="exchangeRate")
    items: List[dict] = []
    elevators: List[dict] = []

    @classmethod
    def validate_date(cls, v):
        if isinstance(v, str):
            return datetime.strptime(v, "%Y-%m-%d").date()
        return v

    model_config = {"arbitrary_types_allowed": True, "populate_by_name": True}

def get_product_stock(db: Session, product_id: int) -> int:
    """Calculate current stock for a product based on stock movements"""
    stock_in = db.query(func.sum(StockMovementModel.quantity)).filter(
        StockMovementModel.product_id == product_id,
        StockMovementModel.movement_type == 'IN'
    ).scalar() or 0

    stock_out = db.query(func.sum(StockMovementModel.quantity)).filter(
        StockMovementModel.product_id == product_id,
        StockMovementModel.movement_type == 'OUT'
    ).scalar() or 0

    adjustments = db.query(func.sum(StockMovementModel.quantity)).filter(
        StockMovementModel.product_id == product_id,
        StockMovementModel.movement_type == 'ADJUST'
    ).scalar() or 0

    return int(stock_in - stock_out + adjustments)

def create_stock_movement_for_sale(db: Session, product_id: int, quantity: float, sales_order_no: str, notes: Optional[str] = None):
    """Create stock movement record for product sale"""
    stock_movement = StockMovementModel(
        product_id=product_id,
        movement_type='OUT',
        quantity=quantity,
        reference_no=f"SO-{sales_order_no}",
        movement_date=func.current_date(),
        notes=notes or f"Sale from sales order {sales_order_no}"
    )
    db.add(stock_movement)
    return stock_movement


COMPONENT_LABELS = {
    "section": "السكاشن",
    "rabat": "الرباط",
    "cable": "الكيبل",
    "cabin": "الكابينات"
}

COMPONENT_QUERIES = {
    "section": {
        "sku_terms": ["ELEVATOR-SECTION"],
        "name_terms": ["سكشن"]
    },
    "rabat": {
        "sku_terms": ["ELEVATOR-RABAT", "ELEVATOR-ROPE"],
        "name_terms": ["رباط"]
    },
    "cable": {
        "sku_terms": ["ELEVATOR-CABLE"],
        "name_terms": ["كيبل"]
    },
    "cabin": {
        "sku_terms": ["ELEVATOR-CABIN"],
        "name_terms": ["كابينة"]
    }
}


def get_or_create_component_product(db: Session, component_key: str) -> ProductModel:
    """Find or create the product record for a specific elevator component."""
    query_def = COMPONENT_QUERIES[component_key]
    filters = []
    for sku_term in query_def.get("sku_terms", []):
        filters.append(ProductModel.sku.ilike(f"%{sku_term}%"))
    for name_term in query_def.get("name_terms", []):
        filters.append(ProductModel.name.ilike(f"%{name_term}%"))

    product = None
    if filters:
        product = db.query(ProductModel).filter(or_(*filters)).first()

    if not product:
        # إنشاء المنتج إن لم يكن موجوداً مسبقاً
        product = ProductModel(
            sku=query_def.get("sku_terms", [f"ELEVATOR-{component_key.upper()}"])[0],
            name=COMPONENT_LABELS.get(component_key, component_key),
            category="مكونات المصاعد",
            uom="unit",
            price_usd=0,
            cost_price=0,
            stock=0,
            is_active=True
        )
        db.add(product)
        db.flush()

    return product


def get_or_create_elevator_sale_product(db: Session) -> ProductModel:
    """Return a generic product to represent a sold elevator (for revenue tracking)."""
    product = db.query(ProductModel).filter(ProductModel.sku == "ELEVATOR-SALE").first()
    if product:
        return product

    product = ProductModel(
        sku="ELEVATOR-SALE",
        name="مصعد جاهز",
        category="مصاعد",
        uom="unit",
        price_usd=0,
        cost_price=0,
        stock=0,
        is_active=True
    )
    db.add(product)
    db.flush()
    return product


def calculate_component_requirements(height_meters: float, cabin_count: int, config: Optional[ElevatorCalculationConfig]):
    """Compute default component requirements based on elevator height and cabin count."""
    if not height_meters or height_meters <= 0:
        return 0, 0, 0

    section_length = float(config.section_length_meters) if config else 1.5
    base_rabat_per_section = config.base_rope_per_section if config else 2
    base_cable_per_section = config.base_cable_per_section if config else 1
    double_multiplier = float(config.double_cabin_multiplier) if config else 1.8

    section_count = math.ceil(float(height_meters) / section_length)
    cabin_multiplier = double_multiplier if cabin_count == 2 else 1.0
    rabat_count = int(section_count * base_rabat_per_section * cabin_multiplier)
    cable_count = int(section_count * base_cable_per_section * cabin_multiplier)
    return section_count, rabat_count, cable_count

# Product endpoints
@router.get("/products")  # Removed response_model to allow all fields
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(ProductModel).offset(skip).limit(limit).all()

    # Add stock information, cost_price, and price alias to each product
    result = []
    for product in products:
        # Get cost_price and stock directly from product attributes
        cost_price_value = getattr(product, 'cost_price', 0)
        stock_value = get_product_stock(db, product.id)

        product_dict = {
            "id": product.id,
            "sku": product.sku,
            "name": product.name,
            "category": product.category,
            "uom": product.uom,
            "price_usd": product.price_usd,
            "cost_price": cost_price_value,
            "price": product.price_usd,  # Add alias for frontend compatibility
            "created_at": product.created_at,
            "updated_at": product.updated_at,
            "stock": stock_value
        }
        result.append(product_dict)

    return result


@router.post("/products", response_model=Product)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    db_product = ProductModel(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.get("/products/{product_id}", response_model=Product)
def read_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/products/{product_id}", response_model=Product)
def update_product(product_id: int, product: ProductUpdate, db: Session = Depends(get_db)):
    db_product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in product.dict().items():
        setattr(db_product, key, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product


@router.delete("/products/{product_id}", response_model=Product)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(db_product)
    db.commit()
    return db_product


# Sales Order endpoints
@router.get("/sales-orders", response_model=List[SalesOrder])
def read_sales_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Get all sales orders with invoice relationship loaded
    orders_query = (
        db.query(SalesOrderModel)
        .options(joinedload(SalesOrderModel.invoice))
        .offset(skip)
        .limit(limit)
    )

    orders = orders_query.all()

    # Calculate totals for each order and add invoice status
    sales_orders = []
    for order in orders:
        # Calculate total from items
        total = (
            db.query(func.coalesce(func.sum(SalesOrderItemModel.line_total_usd), 0))
            .filter(SalesOrderItemModel.sales_order_id == order.id)
            .scalar()
        )
        total_decimal = Decimal(str(total)) if total is not None else Decimal("0.00")
        setattr(order, "total_amount_usd", total_decimal)

        # Add comprehensive invoice information for frontend filtering
        if order.invoice:
            setattr(order, "invoice_id", order.invoice.id)
            setattr(order, "invoice_status", order.invoice.status)
            setattr(order, "invoice_total", order.invoice.total_usd)
            setattr(order, "has_invoice", True)
        else:
            setattr(order, "invoice_id", None)
            setattr(order, "invoice_status", None)
            setattr(order, "invoice_total", None)
            setattr(order, "has_invoice", False)

        sales_orders.append(order)

    return sales_orders


@router.get("/sales-orders/uninvoiced", response_model=List[SalesOrder])
def read_uninvoiced_sales_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Get sales orders that don't have invoices yet (uninvoiced orders only).
    This prevents duplicate invoicing by filtering out already invoiced orders.
    """
    # Get sales orders that don't have associated invoices
    orders_query = (
        db.query(SalesOrderModel)
        .outerjoin(InvoiceModel, SalesOrderModel.id == InvoiceModel.sales_order_id)
        .filter(InvoiceModel.id == None)  # Only orders without invoices
        .options(joinedload(SalesOrderModel.invoice))
        .offset(skip)
        .limit(limit)
    )

    orders = orders_query.all()

    # Calculate totals for each order
    sales_orders = []
    for order in orders:
        # Calculate total from items
        total = (
            db.query(func.coalesce(func.sum(SalesOrderItemModel.line_total_usd), 0))
            .filter(SalesOrderItemModel.sales_order_id == order.id)
            .scalar()
        )
        total_decimal = Decimal(str(total)) if total is not None else Decimal("0.00")
        setattr(order, "total_amount_usd", total_decimal)

        # Mark as not invoiced (redundant but explicit)
        setattr(order, "invoice_id", None)
        setattr(order, "invoice_status", None)
        setattr(order, "invoice_total", None)
        setattr(order, "has_invoice", False)

        sales_orders.append(order)

    return sales_orders


@router.post("/sales-orders", response_model=SalesOrder)
def create_sales_order(sales_order: SalesOrderCreate, db: Session = Depends(get_db)):
    # Convert date string to date object if needed
    order_data = sales_order.dict()
    if "so_date" in order_data and isinstance(order_data["so_date"], str):
        order_data["so_date"] = datetime.strptime(order_data["so_date"], "%Y-%m-%d").date()

    order_data.setdefault("order_type", "items")
    exchange_value = order_data.get("exchange_rate")
    if exchange_value is None:
        order_data["exchange_rate"] = Decimal("1.0000")
    elif not isinstance(exchange_value, Decimal):
        order_data["exchange_rate"] = Decimal(str(exchange_value))
    db_sales_order = SalesOrderModel(**order_data)
    db.add(db_sales_order)
    db.commit()
    db.refresh(db_sales_order)
    return db_sales_order

@router.post("/sales-orders/with-items")
def create_sales_order_with_items(order_data: SalesOrderWithItemsCreate, db: Session = Depends(get_db)):
    """Create sales order with items/elevators and update stock"""
    try:
        # Extract main order data
        order_type = order_data.orderType
        if order_type not in ("items", "elevators"):
            raise HTTPException(status_code=400, detail="Unsupported order type for sales order")

        # Create sales order - Pydantic already converted date
        db_sales_order = SalesOrderModel()
        db_sales_order.so_no = order_data.soNo
        db_sales_order.customer_id = order_data.customer_id
        db_sales_order.status = order_data.status
        db_sales_order.created_by = None
        db_sales_order.updated_by = None
        # Pydantic already converted to date object
        db_sales_order.so_date = order_data.date
        db_sales_order.order_type = order_type
        try:
            exchange_value = order_data.exchange_rate if order_data.exchange_rate is not None else Decimal("1.0000")
            if not isinstance(exchange_value, Decimal):
                exchange_value = Decimal(str(exchange_value))
            if exchange_value <= Decimal("0"):
                raise ValueError("exchange rate must be positive")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid exchange rate provided: {exc}") from exc
        db_sales_order.exchange_rate = exchange_value

        db.add(db_sales_order)
        db.flush()  # Get the ID without committing

        if order_type == "elevators":
            if not order_data.elevators:
                raise HTTPException(status_code=400, detail="يرجى إضافة مصعد واحد على الأقل.")

            config = db.query(ElevatorCalculationConfig).filter(ElevatorCalculationConfig.is_active == True).first()
            elevator_sale_product = get_or_create_elevator_sale_product(db)

            component_totals = {
                "section": 0,
                "rabat": 0,
                "cable": 0,
                "cabin": 0
            }

            prepared_items = []

            for index, elevator_data in enumerate(order_data.elevators, start=1):
                height_value = elevator_data.get("height_meters") or elevator_data.get("height")
                try:
                    height_meters = float(height_value) if height_value is not None else 0.0
                except (TypeError, ValueError):
                    height_meters = 0.0

                cabins_value = elevator_data.get("cabins")
                try:
                    cabin_count = int(cabins_value) if cabins_value is not None else 1
                except (TypeError, ValueError):
                    cabin_count = 1

                default_sections, default_rabats, default_cables = calculate_component_requirements(height_meters, cabin_count, config)

                sections_override = elevator_data.get("sections")
                rabat_override = elevator_data.get("rabat") or elevator_data.get("ropes")
                cable_override = elevator_data.get("cable_meters") or elevator_data.get("cables")

                try:
                    sections_needed = int(sections_override) if sections_override not in (None, "") else default_sections
                except (TypeError, ValueError):
                    sections_needed = default_sections

                try:
                    rabats_needed = int(rabat_override) if rabat_override not in (None, "") else default_rabats
                except (TypeError, ValueError):
                    rabats_needed = default_rabats

                try:
                    cable_needed = int(cable_override) if cable_override not in (None, "") else default_cables
                except (TypeError, ValueError):
                    cable_needed = default_cables

                try:
                    cabins_needed = int(cabins_value) if cabins_value not in (None, "") else cabin_count
                except (TypeError, ValueError):
                    cabins_needed = cabin_count

                sections_needed = max(sections_needed, 0)
                rabats_needed = max(rabats_needed, 0)
                cable_needed = max(cable_needed, 0)
                cabins_needed = max(cabins_needed, 0)

                if sections_needed == 0 and rabats_needed == 0 and cable_needed == 0 and cabins_needed == 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"لا يمكن إنشاء مصعد رقم {index} بدون تحديد المكونات."
                    )

                component_totals["section"] += sections_needed
                component_totals["rabat"] += rabats_needed
                component_totals["cable"] += cable_needed
                component_totals["cabin"] += cabins_needed

                sale_price_value = elevator_data.get("sale_price") or elevator_data.get("unitPrice") or 0
                try:
                    sale_price = float(sale_price_value)
                except (TypeError, ValueError):
                    sale_price = 0.0

                prepared_items.append({
                    "sections": sections_needed,
                    "rabats": rabats_needed,
                    "cables": cable_needed,
                    "cabins": cabins_needed,
                    "sale_price": sale_price
                })

            component_products = {}
            for component_key, total_required in component_totals.items():
                if total_required <= 0:
                    continue
                product = get_or_create_component_product(db, component_key)
                available_stock = get_product_stock(db, product.id)
                if total_required > available_stock:
                    label = COMPONENT_LABELS.get(component_key, component_key)
                    raise HTTPException(
                        status_code=400,
                        detail=f"❌ لا يتوفر مخزون كافٍ من {label}. المتاح: {available_stock}، المطلوب: {total_required}"
                    )
                component_products[component_key] = product

            for prepared in prepared_items:
                db_item = SalesOrderItemModel(
                    sales_order_id=db_sales_order.id,
                    product_id=elevator_sale_product.id,
                    qty=1,
                    unit_price_usd=prepared["sale_price"],
                    line_total_usd=prepared["sale_price"],
                    sections=prepared["sections"],
                    ropes=prepared["rabats"],
                    cable_meters=prepared["cables"],
                    cabins=prepared["cabins"]
                )
                db.add(db_item)

            for component_key, product in component_products.items():
                quantity = component_totals.get(component_key, 0)
                if quantity <= 0:
                    continue
                create_stock_movement_for_sale(
                    db,
                    product.id,
                    quantity,
                    order_data.soNo,
                    notes=f"استهلاك {COMPONENT_LABELS.get(component_key, component_key)} لأمر بيع المصعد {order_data.soNo}"
                )
        else:
            items_to_process = order_data.items
            for item_data in items_to_process:
                if not item_data.get("product_id"):
                    continue

                current_stock = get_product_stock(db, item_data["product_id"])
                requested_qty = float(item_data.get("qty", 0))

                if requested_qty > current_stock:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient stock for product {item_data.get('product', 'Unknown')}. Available: {current_stock}, Requested: {requested_qty}"
                    )

                item_info = {
                    "sales_order_id": db_sales_order.id,
                    "product_id": item_data["product_id"],
                    "qty": requested_qty,
                    "unit_price_usd": float(item_data.get("unitPrice", 0)),
                    "line_total_usd": requested_qty * float(item_data.get("unitPrice", 0))
                }

                db_item = SalesOrderItemModel(**item_info)
                db.add(db_item)

                if requested_qty > 0:
                    create_stock_movement_for_sale(
                        db,
                        item_data["product_id"],
                        requested_qty,
                        order_data.soNo
                    )

        db.commit()
        db.refresh(db_sales_order)

        # Create appropriate success message
        if order_type == "elevators":
            message = f"تم إنشاء أمر بيع المصاعد بنجاح! تم تحديث المخزون للمكونات المطلوبة."
        else:
            message = "Sales order created successfully and stock updated"

        return {
            "id": db_sales_order.id,
            "soNo": db_sales_order.so_no,
            "date": str(db_sales_order.so_date),
            "status": db_sales_order.status,
            "orderType": order_type,
            "order_type": order_type,
            "message": message
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating sales order: {str(e)}")


@router.get("/sales-orders/{sales_order_id}", response_model=SalesOrderDetail)
def read_sales_order(sales_order_id: int, db: Session = Depends(get_db)):
    sales_order = (
        db.query(SalesOrderModel)
        .options(
            joinedload(SalesOrderModel.items).joinedload(SalesOrderItemModel.product),
            joinedload(SalesOrderModel.invoice).joinedload(InvoiceModel.payments)
        )
        .filter(SalesOrderModel.id == sales_order_id)
        .first()
    )
    if sales_order is None:
        raise HTTPException(status_code=404, detail="Sales order not found")

    total_amount = Decimal("0.00")
    for item in sales_order.items:
        if item.line_total_usd is None and item.qty is not None and item.unit_price_usd is not None:
            item.line_total_usd = item.qty * item.unit_price_usd
        if item.line_total_usd is not None:
            total_amount += Decimal(str(item.line_total_usd))
    setattr(sales_order, "total_amount_usd", total_amount)

    # Normalize exchange rate
    exchange_rate_value = getattr(sales_order, "exchange_rate", None)
    try:
        if exchange_rate_value is None:
            exchange_rate_value = Decimal("1.0000")
        elif not isinstance(exchange_rate_value, Decimal):
            exchange_rate_value = Decimal(str(exchange_rate_value))
        if exchange_rate_value <= Decimal("0"):
            exchange_rate_value = Decimal("1.0000")
    except Exception:
        exchange_rate_value = Decimal("1.0000")
    setattr(sales_order, "exchange_rate", exchange_rate_value)

    # Payments and invoice summary
    invoice = getattr(sales_order, "invoice", None)
    payments = []
    total_paid = Decimal("0.00")
    last_payment_date = None
    payment_currency = "USD"

    if invoice:
        payments = list(invoice.payments or [])
        payment_currency = invoice.currency or payment_currency
        for payment in payments:
            amount_value = getattr(payment, "amount_usd", None)
            if amount_value is None:
                continue
            try:
                amount_decimal = Decimal(str(amount_value))
            except Exception:
                continue
            total_paid += amount_decimal
            potential_date = getattr(payment, "paid_on", None) or getattr(payment, "created_at", None)
            if potential_date and (last_payment_date is None or potential_date > last_payment_date):
                last_payment_date = potential_date

        invoice_total = invoice.total_usd
        if invoice_total is None:
            invoice_total = total_amount
        else:
            invoice_total = Decimal(str(invoice_total))
        remaining_amount = invoice_total - total_paid
        if remaining_amount < Decimal("0.00"):
            remaining_amount = Decimal("0.00")

        setattr(invoice, "paid_amount_usd", total_paid)
        setattr(invoice, "remaining_amount", remaining_amount)
    else:
        remaining_amount = total_amount - total_paid
        if remaining_amount < Decimal("0.00"):
            remaining_amount = Decimal("0.00")

    setattr(sales_order, "payments", payments)
    setattr(
        sales_order,
        "payment_summary",
        {
            "total_paid_usd": total_paid,
            "remaining_balance_usd": remaining_amount,
            "currency": payment_currency,
            "payment_count": len(payments),
            "last_payment_date": last_payment_date,
        },
    )

    # Attachments
    storage_service = FileStorageService()
    attachment_records = (
        db.query(FileUploadModel)
        .options(joinedload(FileUploadModel.uploader))
        .filter(
            FileUploadModel.entity_type == "sales_order",
            FileUploadModel.entity_id == sales_order_id,
            FileUploadModel.is_deleted == False,
        )
        .order_by(FileUploadModel.created_at.desc())
        .all()
    )

    attachments_payload = []
    for file_record in attachment_records:
        try:
            download_url = storage_service.get_file_url(file_record.file_path, file_record.s3_path)
        except Exception:
            download_url = None
        attachments_payload.append({
            "id": file_record.id,
            "filename": file_record.original_filename or file_record.filename,
            "file_size": file_record.file_size,
            "mime_type": file_record.mime_type,
            "category": file_record.category,
            "description": file_record.description,
            "download_url": download_url,
            "uploaded_by": file_record.uploader.username if getattr(file_record, "uploader", None) else None,
            "uploaded_at": file_record.created_at,
        })
    setattr(sales_order, "attachments", attachments_payload)

    # Audit trail - make it optional to avoid errors
    audit_payload = []
    try:
        audit_logs = (
            db.query(AuditLog)
            .filter(
                func.lower(AuditLog.entity_type).in_(["sales_order", "salesorder", "sales-orders", "sales orders"]),
                AuditLog.entity_id == sales_order_id,
            )
            .order_by(AuditLog.timestamp.desc())
            .limit(30)
            .all()
        )

        for log in audit_logs:
            audit_payload.append({
                "id": log.id,
                "action": log.action,
                "username": log.username or "Unknown",
                "user_role": log.user_role or "N/A",
                "description": log.description or "",
                "timestamp": log.timestamp,
                "is_successful": log.is_successful,
                "changes": log.changed_fields,
                "old_values": log.old_values,
                "new_values": log.new_values,
            })
    except Exception as e:
        print(f"Warning: Could not fetch audit logs: {e}")
        # Continue without audit logs

    setattr(sales_order, "audit_trail", audit_payload)

    # Related links
    related_links = []
    if getattr(sales_order, "customer_id", None):
        related_links.append({
            "label": "العميل",
            "url": f"/customers/{sales_order.customer_id}",
            "entity_type": "customer",
            "entity_id": sales_order.customer_id,
        })
    if invoice:
        related_links.append({
            "label": "الفاتورة المرتبطة",
            "url": f"/invoices/{invoice.id}",
            "entity_type": "invoice",
            "entity_id": invoice.id,
        })
        if payments:
            related_links.append({
                "label": f"سندات القبض ({len(payments)})",
                "url": f"/invoices/{invoice.id}#payments",
                "entity_type": "payment_group",
                "entity_id": invoice.id,
                "notes": "عرض فقط",
            })
    related_links.append({
        "label": "قيد اليومية",
        "url": None,
        "entity_type": "journal_entry",
        "entity_id": None,
        "notes": "لم يتم إنشاء قيد يومية مرتبط تلقائياً",
    })
    setattr(sales_order, "related_links", related_links)

    return sales_order


@router.put("/sales-orders/{sales_order_id}", response_model=SalesOrder)
def update_sales_order(sales_order_id: int, sales_order: SalesOrderUpdate, db: Session = Depends(get_db)):
    db_sales_order = db.query(SalesOrderModel).filter(SalesOrderModel.id == sales_order_id).first()
    if db_sales_order is None:
        raise HTTPException(status_code=404, detail="Sales order not found")

    # Convert date string to date object if needed
    order_data = sales_order.dict(exclude_unset=True)
    for key, value in order_data.items():
        if key == "so_date" and isinstance(value, str):
            value = datetime.strptime(value, "%Y-%m-%d").date()
        setattr(db_sales_order, key, value)

    db.commit()
    db.refresh(db_sales_order)
    return db_sales_order


@router.delete("/sales-orders/{sales_order_id}", response_model=SalesOrder)
def delete_sales_order(sales_order_id: int, db: Session = Depends(get_db)):
    db_sales_order = db.query(SalesOrderModel).filter(SalesOrderModel.id == sales_order_id).first()
    if db_sales_order is None:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    db.delete(db_sales_order)
    db.commit()
    return db_sales_order


# Sales Order Item endpoints
@router.post("/sales-order-items", response_model=SalesOrderItem)
def create_sales_order_item(item: SalesOrderItemCreate, db: Session = Depends(get_db)):
    db_item = SalesOrderItemModel(**item.dict())
    # Calculate line total
    db_item.line_total_usd = db_item.qty * db_item.unit_price_usd
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.put("/sales-order-items/{item_id}", response_model=SalesOrderItem)
def update_sales_order_item(item_id: int, item: SalesOrderItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(SalesOrderItemModel).filter(SalesOrderItemModel.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Sales order item not found")
    
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    
    # Recalculate line total
    if hasattr(db_item, 'qty') and hasattr(db_item, 'unit_price_usd'):
        db_item.line_total_usd = db_item.qty * db_item.unit_price_usd
    
    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/sales-order-items/{item_id}", response_model=SalesOrderItem)
def delete_sales_order_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(SalesOrderItemModel).filter(SalesOrderItemModel.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Sales order item not found")
    
    db.delete(db_item)
    db.commit()
    return db_item


# Invoice endpoints
@router.get("/invoices", response_model=List[Invoice])
def read_invoices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Compute paid totals via subquery to avoid N+1
    paid_subq = (
        db.query(
            PaymentModel.invoice_id.label("invoice_id"),
            func.coalesce(func.sum(PaymentModel.amount_usd), 0).label("paid_amount_usd"),
        )
        .group_by(PaymentModel.invoice_id)
        .subquery()
    )

    rows = (
        db.query(InvoiceModel, paid_subq.c.paid_amount_usd)
        .options(joinedload(InvoiceModel.customer))  # ✅ Load customer data
        .outerjoin(paid_subq, InvoiceModel.id == paid_subq.c.invoice_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for inv, paid in rows:
        paid = Decimal(paid or 0)
        setattr(inv, "paid_amount_usd", paid)
        total = Decimal(inv.total_usd or 0)
        setattr(inv, "remaining_amount", total - paid)

        # ✅ Add customer name if customer exists
        if inv.customer:
            setattr(inv, "customer_name", inv.customer.name)

        result.append(inv)
    return result


def _generate_next_invoice_number(db: Session) -> str:
    existing_numbers = (
        db.query(InvoiceModel.invoice_no)
        .filter(InvoiceModel.invoice_no.isnot(None))
        .all()
    )

    max_sequence = 0
    for (value,) in existing_numbers:
        if not value:
            continue
        match = re.search(r"(\d+)$", value)
        if match:
            max_sequence = max(max_sequence, int(match.group(1)))

    return f"INV-{max_sequence + 1:03d}"


@router.get("/invoices/next-number")
def get_next_invoice_number(db: Session = Depends(get_db)):
    next_number = _generate_next_invoice_number(db)
    return {"invoiceNo": next_number}


@router.post("/invoices", response_model=Invoice)
def create_invoice(invoice: InvoiceCreate, db: Session = Depends(get_db)):
    # Convert date strings to date objects if needed
    # Build data while excluding fields not mapped to the model and None values
    invoice_data = invoice.dict(exclude_unset=True, exclude_none=True)
    for date_field in ["issue_date", "due_date"]:
        if date_field in invoice_data and isinstance(invoice_data[date_field], str):
            invoice_data[date_field] = datetime.strptime(invoice_data[date_field], "%Y-%m-%d").date()

    if not invoice_data.get("invoice_no"):
        invoice_data["invoice_no"] = _generate_next_invoice_number(db)

    # Remove schema-only fields that do not exist on the model
    invoice_data.pop("project_id", None)

    db_invoice = InvoiceModel(**invoice_data)
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


@router.get("/invoices/{invoice_id}", response_model=Invoice)
def read_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = (
        db.query(InvoiceModel)
        .options(
            joinedload(InvoiceModel.customer),  # ✅ Load customer data
            joinedload(InvoiceModel.sales_order).joinedload(SalesOrderModel.items)
        )
        .filter(InvoiceModel.id == invoice_id)
        .first()
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    paid = (
        db.query(func.coalesce(func.sum(PaymentModel.amount_usd), 0))
        .filter(PaymentModel.invoice_id == invoice_id)
        .scalar()
    )
    paid = Decimal(paid or 0)
    setattr(invoice, "paid_amount_usd", paid)
    total = Decimal(invoice.total_usd or 0)
    setattr(invoice, "remaining_amount", total - paid)

    # ✅ Add customer name if customer exists
    if invoice.customer:
        setattr(invoice, "customer_name", invoice.customer.name)
        setattr(invoice, "customer_phone", invoice.customer.phone if hasattr(invoice.customer, 'phone') else None)
        setattr(invoice, "customer_email", invoice.customer.email if hasattr(invoice.customer, 'email') else None)
        setattr(invoice, "customer_address", invoice.customer.address if hasattr(invoice.customer, 'address') else None)

    # Include sales order details if available
    if invoice.sales_order:
        sales_order = invoice.sales_order
        # Prepare elevator details if it's an elevator order
        if sales_order.order_type == 'elevators' and sales_order.items:
            elevators = []
            for item in sales_order.items:
                elevator_data = {
                    "height_meters": item.height_meters if hasattr(item, 'height_meters') else None,
                    "sections": item.sections if hasattr(item, 'sections') else 0,
                    "rabat": item.ropes if hasattr(item, 'ropes') else 0,
                    "ropes": item.ropes if hasattr(item, 'ropes') else 0,
                    "cable_meters": item.cable_meters if hasattr(item, 'cable_meters') else 0,
                    "cabins": item.cabins if hasattr(item, 'cabins') else 1,
                    "sale_price": float(item.unit_price_usd) if item.unit_price_usd else 0,
                    "unit_price_usd": float(item.unit_price_usd) if item.unit_price_usd else 0,
                    "installation_date": item.installation_date if hasattr(item, 'installation_date') else None,
                    "notes": item.notes if hasattr(item, 'notes') else None
                }
                elevators.append(elevator_data)

            setattr(invoice, "salesOrder", {
                "id": sales_order.id,
                "so_no": sales_order.so_no,
                "order_type": sales_order.order_type,
                "orderType": sales_order.order_type,
                "elevators": elevators
            })
        else:
            setattr(invoice, "salesOrder", {
                "id": sales_order.id,
                "so_no": sales_order.so_no,
                "order_type": sales_order.order_type,
                "orderType": sales_order.order_type
            })

    return invoice


@router.put("/invoices/{invoice_id}", response_model=Invoice)
def update_invoice(invoice_id: int, invoice: InvoiceUpdate, db: Session = Depends(get_db)):
    db_invoice = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if db_invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Convert date strings to date objects if needed
    invoice_data = invoice.dict(exclude_unset=True, exclude_none=True)
    if "invoice_no" in invoice_data:
        requested_invoice_no = invoice_data.pop("invoice_no")
        if requested_invoice_no not in (None, db_invoice.invoice_no):
            raise HTTPException(status_code=400, detail="Invoice number cannot be modified")

    invoice_data.pop("project_id", None)
    for key, value in invoice_data.items():
        if key in ["issue_date", "due_date"] and isinstance(value, str):
            value = datetime.strptime(value, "%Y-%m-%d").date()
        setattr(db_invoice, key, value)

    db.commit()
    db.refresh(db_invoice)
    return db_invoice


@router.delete("/invoices/{invoice_id}", response_model=Invoice)
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    db_invoice = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if db_invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    db.delete(db_invoice)
    db.commit()
    return db_invoice



def _recompute_invoice_status(db: Session, invoice_id: int):
    inv = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if not inv:
        return
    total = Decimal(inv.total_usd or 0)
    paid = (
        db.query(func.coalesce(func.sum(PaymentModel.amount_usd), 0))
        .filter(PaymentModel.invoice_id == invoice_id)
        .scalar()
    )
    paid = Decimal(paid or 0)
    if total <= 0:
        inv.status = "DRAFT"
    elif paid <= 0:
        inv.status = "ISSUED"
    elif paid >= total:
        inv.status = "PAID"
    else:
        inv.status = "PARTIALLY_PAID"
    db.commit()
    db.refresh(inv)

@router.get("/sales-invoices/{invoice_id}/payments", response_model=List[Payment])
def get_sales_invoice_payments(invoice_id: int, db: Session = Depends(get_db)):
    payments = db.query(PaymentModel).filter(PaymentModel.invoice_id == invoice_id).all()
    return payments

@router.post("/sales-invoices/{invoice_id}/payments", response_model=Payment)
def add_sales_invoice_payment(invoice_id: int, payment: PaymentCreateForInvoice, db: Session = Depends(get_db)):
    inv = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    total = Decimal(inv.total_usd or 0)
    current_paid = (
        db.query(func.coalesce(func.sum(PaymentModel.amount_usd), 0))
        .filter(PaymentModel.invoice_id == invoice_id)
        .scalar()
    )
    current_paid = Decimal(current_paid or 0)
    new_amount = Decimal(payment.amount_usd)
    if new_amount <= 0:
        raise HTTPException(status_code=422, detail="Payment amount must be positive")
    if current_paid + new_amount > total and total > 0:
        raise HTTPException(status_code=422, detail="Payment exceeds invoice total")

    db_payment = PaymentModel(
        invoice_id=invoice_id,
        paid_on=payment.paid_on,
        method=payment.method,
        amount_usd=new_amount,
        note=payment.note,
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    _recompute_invoice_status(db, invoice_id)
    return db_payment

@router.delete("/sales-invoice-payments/{payment_id}", response_model=Payment)
def delete_sales_invoice_payment(payment_id: int, db: Session = Depends(get_db)):
    db_payment = db.query(PaymentModel).filter(PaymentModel.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    invoice_id = db_payment.invoice_id
    db.delete(db_payment)
    db.commit()
    _recompute_invoice_status(db, invoice_id)
    return db_payment
# Payment endpoints
@router.post("/payments", response_model=Payment)
def create_payment(payment: PaymentCreate, db: Session = Depends(get_db)):
    # Convert date string to date object if needed
    payment_data = payment.dict()
    if "paid_on" in payment_data and isinstance(payment_data["paid_on"], str):
        payment_data["paid_on"] = datetime.strptime(payment_data["paid_on"], "%Y-%m-%d").date()

    db_payment = PaymentModel(**payment_data)
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


@router.put("/payments/{payment_id}", response_model=Payment)
def update_payment(payment_id: int, payment: PaymentUpdate, db: Session = Depends(get_db)):
    db_payment = db.query(PaymentModel).filter(PaymentModel.id == payment_id).first()
    if db_payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Convert date string to date object if needed
    payment_data = payment.dict()
    for key, value in payment_data.items():
        if key == "paid_on" and isinstance(value, str):
            value = datetime.strptime(value, "%Y-%m-%d").date()
        setattr(db_payment, key, value)

    db.commit()
    db.refresh(db_payment)
    return db_payment


@router.delete("/payments/{payment_id}", response_model=Payment)
def delete_payment(payment_id: int, db: Session = Depends(get_db)):
    db_payment = db.query(PaymentModel).filter(PaymentModel.id == payment_id).first()
    if db_payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    db.delete(db_payment)
    db.commit()
    return db_payment
