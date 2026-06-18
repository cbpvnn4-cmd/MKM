from sqlalchemy import Column, String, BigInteger, ForeignKey, Date, Numeric, Text, CheckConstraint, UniqueConstraint, Integer, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import BaseModel

class Supplier(BaseModel):
    __tablename__ = "suppliers"

    name = Column(String(100), nullable=False)
    contact_person = Column(String(100))
    phone = Column(String(20))
    email = Column(String(100))
    address = Column(Text)
    tax_id = Column(String(50))
    payment_terms = Column(String(100))  # e.g., "Net 30", "COD", etc.

    # Relationships
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")
    ap_invoices = relationship("APInvoice", back_populates="supplier")

class PurchaseOrder(BaseModel):
    __tablename__ = "purchase_orders"

    supplier_id = Column(BigInteger, ForeignKey("suppliers.id"), nullable=False)
    warehouse_id = Column(BigInteger, ForeignKey("warehouses.id"), nullable=True)  # المستودع المستهدف
    po_no = Column(String(50), unique=True, nullable=False)
    po_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date)
    status = Column(String(20), nullable=False, default="DRAFT")
    total_amount_usd = Column(Numeric(18, 2))
    paid_amount_usd = Column(Numeric(18, 2), default=0, nullable=False)  # المبلغ المدفوع
    notes = Column(Text)
    received_date = Column(Date)  # تاريخ استلام البضاعة

    # Relationships
    supplier = relationship("Supplier", back_populates="purchase_orders")
    warehouse = relationship("Warehouse", foreign_keys=[warehouse_id])
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    ap_invoices = relationship("APInvoice", back_populates="purchase_order")
    elevators = relationship("Elevator", back_populates="purchase_order", cascade="all, delete-orphan")
    payments = relationship("PurchaseOrderPayment", back_populates="purchase_order", cascade="all, delete-orphan")
    installments = relationship("PurchaseOrderInstallment", back_populates="purchase_order", cascade="all, delete-orphan")
    containers = relationship("PurchaseOrderContainer", back_populates="purchase_order", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT', 'CONFIRMED', 'RECEIVED', 'CANCELLED')",
            name="check_purchase_order_status"
        ),
    )

    def receive_goods(self, db_session, warehouse_id, received_date=None, auto_decompose_elevators=True):
        """
        استلام البضاعة وتحديث المخزون تلقائياً

        Args:
            db_session: جلسة قاعدة البيانات
            warehouse_id: رقم المستودع المستلم
            received_date: تاريخ الاستلام (افتراضي: اليوم)
            auto_decompose_elevators: تفكيك المصاعد تلقائياً إلى أجزاء (افتراضي: True)
        """
        from datetime import date
        from decimal import Decimal
        from .inventory import StockMovement
        from .products import Product

        if self.status == "RECEIVED":
            raise ValueError("تم استلام هذا الطلب مسبقاً")

        if not received_date:
            received_date = date.today()

        # ============================================
        # 1. معالجة البنود العادية (items)
        # ============================================
        for item in self.items:
            # تحديث كمية المنتج في جدول products
            product = db_session.query(Product).filter(Product.id == item.product_id).first()
            if product:
                # زيادة المخزون
                if product.stock is None:
                    product.stock = Decimal('0')
                product.stock += Decimal(str(item.qty))

                # تسجيل حركة المخزون
                stock_movement = StockMovement(
                    product_id=item.product_id,
                    warehouse_id=warehouse_id,
                    movement_type="IN",  # إدخال
                    quantity=item.qty,
                    unit_cost=item.unit_cost_usd,
                    reference_no=f"PO-{self.po_no}",
                    movement_date=received_date,
                    notes=f"استلام من أمر شراء رقم {self.po_no}",
                    created_by=self.created_by
                )
                db_session.add(stock_movement)

                # تحديث الكمية المستلمة في البند
                item.received_qty = item.qty

        # ============================================
        # 2. معالجة المصاعد (elevators) - تفكيك إلى أجزاء
        # ============================================
        if auto_decompose_elevators and self.elevators:
            for elevator in self.elevators:
                # تحديث حالة المصعد
                elevator.status = "DELIVERED"

                # تعريف مكونات المصعد وربطها بـ products
                # يجب أن يكون لديك منتجات في جدول products بأسماء محددة
                component_mapping = {
                    'section': ('سكشن', elevator.section_count),
                    'rope': ('رباط', elevator.rope_count),
                    'cable': ('كيبل', elevator.cable_count),
                    'cabin': ('كابينة', elevator.cabin_count)
                }

                for component_type, (component_name, quantity) in component_mapping.items():
                    if quantity and quantity > 0:
                        # البحث عن المنتج في قاعدة البيانات
                        # يمكن البحث بالاسم أو SKU
                        product = db_session.query(Product).filter(
                            (Product.name.ilike(f"%{component_name}%")) |
                            (Product.sku.ilike(f"%{component_type}%"))
                        ).first()

                        # 🆕 إذا لم يوجد المنتج، أنشئه تلقائياً
                        if not product:
                            product = Product(
                                sku=f"ELEVATOR-{component_type.upper()}",
                                name=component_name,
                                category="مكونات المصاعد",
                                uom="unit",
                                price_usd=0,  # سيتم تحديثه لاحقاً
                                cost_price=0,
                                stock=0,
                                is_active=True
                            )
                            db_session.add(product)
                            db_session.flush()  # للحصول على ID
                            print(f"Created new product: {component_name}")

                        # زيادة المخزون
                        if product.stock is None:
                            product.stock = Decimal('0')
                        product.stock += Decimal(str(quantity))

                        # تسجيل حركة المخزون
                        stock_movement = StockMovement(
                            product_id=product.id,
                            warehouse_id=warehouse_id,
                            movement_type="IN",
                            quantity=quantity,
                            unit_cost=0,  # يمكن حسابه من سعر المصعد الإجمالي
                            reference_no=f"PO-{self.po_no}-ELEVATOR-{elevator.elevator_code}",
                            movement_date=received_date,
                            notes=f"استلام {component_name} من مصعد {elevator.elevator_code} (أمر شراء {self.po_no})",
                            created_by=self.created_by
                        )
                        db_session.add(stock_movement)

        # تحديث حالة أمر الشراء
        self.status = "RECEIVED"
        self.received_date = received_date
        self.updated_by = self.created_by

class PurchaseOrderItem(BaseModel):
    __tablename__ = "purchase_order_items"

    purchase_order_id = Column(BigInteger, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(BigInteger, ForeignKey("products.id"), nullable=False)
    qty = Column(Numeric(18, 3), nullable=False)
    unit_cost_usd = Column(Numeric(18, 2), nullable=False)
    line_total_usd = Column(Numeric(18, 2), nullable=False)
    received_qty = Column(Numeric(18, 3), default=0)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    # product = relationship("Product", back_populates="purchase_order_items")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.qty and self.unit_cost_usd:
            self.line_total_usd = self.qty * self.unit_cost_usd

class APInvoice(BaseModel):
    __tablename__ = "ap_invoices"

    supplier_id = Column(BigInteger, ForeignKey("suppliers.id"), nullable=False)
    purchase_order_id = Column(BigInteger, ForeignKey("purchase_orders.id"), nullable=True)
    invoice_no = Column(String(100), unique=True, nullable=False)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date)
    amount_usd = Column(Numeric(18, 2), nullable=False)
    paid_amount_usd = Column(Numeric(18, 2), default=0)
    status = Column(String(20), nullable=False, default="DRAFT")

    # Relationships
    supplier = relationship("Supplier", back_populates="ap_invoices")
    purchase_order = relationship("PurchaseOrder", back_populates="ap_invoices")
    payments = relationship("APPayment", back_populates="ap_invoice", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID')",
            name="check_ap_invoice_status"
        ),
        CheckConstraint("amount_usd >= 0", name="check_ap_invoice_amount_non_negative"),
        CheckConstraint("paid_amount_usd >= 0", name="check_ap_paid_amount_non_negative"),
    )

class APPayment(BaseModel):
    __tablename__ = "ap_payments"

    ap_invoice_id = Column(BigInteger, ForeignKey("ap_invoices.id", ondelete="CASCADE"), nullable=False)
    paid_on = Column(Date, nullable=False)
    method = Column(String(50))  # CASH, BANK_TRANSFER, CHECK, etc.
    amount_usd = Column(Numeric(18, 2), nullable=False)
    reference_no = Column(String(100))
    notes = Column(Text)

    # Relationships
    ap_invoice = relationship("APInvoice", back_populates="payments")

    # Constraints
    __table_args__ = (
        CheckConstraint("amount_usd > 0", name="check_ap_payment_amount_positive"),
    )

class PurchaseOrderPayment(BaseModel):
    """مدفوعات أوامر الشراء - نظام مباشر بدون فواتير"""
    __tablename__ = "purchase_order_payments"

    purchase_order_id = Column(BigInteger, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    paid_on = Column(Date, nullable=False)
    method = Column(String(50), default="BANK_TRANSFER")  # CASH, BANK_TRANSFER, CHECK, CREDIT_CARD
    amount_usd = Column(Numeric(18, 2), nullable=False)
    reference_no = Column(String(100))
    notes = Column(Text)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="payments")

    # Constraints
    __table_args__ = (
        CheckConstraint("amount_usd > 0", name="check_po_payment_amount_positive"),
    )

class PurchaseOrderInstallment(BaseModel):
    """دفعات أوامر الشراء - جدول الدفعات المجدولة"""
    __tablename__ = "purchase_order_installments"

    purchase_order_id = Column(BigInteger, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)  # اسم الدفعة
    type = Column(String(20), default="regular")  # advance, regular
    percentage = Column(Numeric(5, 2), nullable=False)  # النسبة المئوية
    amount_usd = Column(Numeric(18, 2), nullable=False)  # المبلغ المطلوب
    paid_amount_usd = Column(Numeric(18, 2), default=0, nullable=False)  # المبلغ المدفوع
    due_date = Column(Date, nullable=False)  # تاريخ الاستحقاق
    status = Column(String(20), default="pending")  # pending, partial, paid, overdue
    notes = Column(Text)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="installments")

    # Constraints
    __table_args__ = (
        CheckConstraint("percentage >= 0 AND percentage <= 100", name="check_installment_percentage"),
        CheckConstraint("amount_usd >= 0", name="check_installment_amount"),
        CheckConstraint("paid_amount_usd >= 0", name="check_installment_paid_amount"),
        CheckConstraint("type IN ('advance', 'regular')", name="check_installment_type"),
        CheckConstraint("status IN ('pending', 'partial', 'paid', 'overdue')", name="check_installment_status"),
    )

class PurchaseOrderContainer(BaseModel):
    """حاويات الشحن لأوامر الشراء"""
    __tablename__ = "purchase_order_containers"

    purchase_order_id = Column(BigInteger, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    container_no = Column(String(50))  # رقم الحاوية
    size = Column(String(20))  # حجم الحاوية (20ft, 40ft, etc.)
    weight = Column(Float)  # الوزن بالطن
    shipping_cost = Column(Numeric(18, 2))  # تكلفة الشحن
    total_cost = Column(Numeric(18, 2))  # التكلفة الإجمالية
    notes = Column(Text)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="containers")

class ElevatorCalculationConfig(BaseModel):
    __tablename__ = "elevator_calculation_configs"

    section_length_meters = Column(Numeric(4, 2), default=1.5, nullable=False)
    base_rope_per_section = Column(Integer, default=2, nullable=False)
    base_cable_per_section = Column(Integer, default=1, nullable=False)
    double_cabin_multiplier = Column(Numeric(3, 2), default=1.8, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

class Elevator(BaseModel):
    __tablename__ = "elevators"

    elevator_code = Column(String(50), unique=True, nullable=False)
    purchase_order_id = Column(BigInteger, ForeignKey("purchase_orders.id"), nullable=True)

    # البيانات الأساسية
    height_meters = Column(Numeric(8, 2), nullable=False)
    model_type = Column(String(100), nullable=False)
    manufacture_year = Column(Integer)
    cabin_count = Column(Integer, default=1, nullable=False)

    # المواد والقطع (سيتم حسابها تلقائياً أو إدخالها يدوياً)
    section_count = Column(Integer)
    rope_count = Column(Integer)
    cable_count = Column(Integer)

    # حالة وتكاليف
    status = Column(String(20), default='ORDERED')
    unit_price_usd = Column(Numeric(18, 2))
    total_cost_usd = Column(Numeric(18, 2))

    notes = Column(Text)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="elevators")

    # Constraints
    __table_args__ = (
        CheckConstraint("cabin_count IN (1, 2)", name="check_elevator_cabin_count"),
        CheckConstraint("status IN ('ORDERED', 'IN_PRODUCTION', 'DELIVERED', 'INSTALLED', 'CANCELLED')", name="check_elevator_status"),
        CheckConstraint("height_meters > 0", name="check_elevator_height_positive"),
    )

    def calculate_components(self, config=None):
        """حساب المكونات التلقائي بناءً على الارتفاع وعدد الكابينات"""
        if not config:
            # استخدام القيم الافتراضية
            section_length = 1.5
            base_rope_per_section = 2
            base_cable_per_section = 1
            double_cabin_multiplier = 1.8
        else:
            section_length = float(config.section_length_meters)
            base_rope_per_section = config.base_rope_per_section
            base_cable_per_section = config.base_cable_per_section
            double_cabin_multiplier = float(config.double_cabin_multiplier)

        # حساب عدد السكاشن
        import math
        self.section_count = math.ceil(float(self.height_meters) / section_length)

        # حساب الرباط والكابلات
        cabin_multiplier = double_cabin_multiplier if self.cabin_count == 2 else 1.0
        self.rope_count = int(self.section_count * base_rope_per_section * cabin_multiplier)
        self.cable_count = int(self.section_count * base_cable_per_section * cabin_multiplier)
