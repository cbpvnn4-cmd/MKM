from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Date,
    Numeric,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    Text,
    TypeDecorator,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base
from datetime import datetime, date
from decimal import Decimal
from typing import Any, Optional, cast


class DateType(TypeDecorator):
    """Custom type that automatically converts strings to date objects"""
    impl = Date
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Convert value to date before sending to database"""
        if value is None:
            return None
        if isinstance(value, date) and not isinstance(value, datetime):
            return value
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, str):
            try:
                return datetime.strptime(value.strip(), "%Y-%m-%d").date()
            except ValueError:
                raise ValueError(f"Invalid date format: {value}")
        raise TypeError(f"Cannot convert {type(value)} to date")

    def process_result_value(self, value, dialect):
        """Convert value from database to Python"""
        return value


class Quotation(Base):
    """
    Quotation model for managing pre-sale quotations
    Status flow: DRAFT → SENT → ACCEPTED/REJECTED/EXPIRED
    """
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    quotation_no = Column(String, unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    # Dates
    quotation_date = Column(DateType, nullable=False)
    valid_until = Column(DateType, nullable=True)

    # Status: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
    status = Column(
        String,
        CheckConstraint("status IN ('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED')"),
        default="DRAFT",
        nullable=False
    )

    # Order type to distinguish between standard items and elevator quotations
    order_type = Column(
        String,
        CheckConstraint("order_type IN ('items','elevators')"),
        default="items",
        nullable=False
    )

    # Contact person (optional)
    contact_person = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)

    # Commercial terms
    payment_terms = Column(Text, nullable=True)  # e.g., "50% upfront, 50% on delivery"
    delivery_terms = Column(Text, nullable=True)  # e.g., "30 days from order confirmation"
    warranty_terms = Column(Text, nullable=True)  # e.g., "1 year manufacturer warranty"

    # Discounts
    discount_percent = Column(Numeric(precision=5, scale=2), default=0)
    discount_amount = Column(Numeric(precision=18, scale=2), default=0)

    # Additional info
    notes = Column(Text, nullable=True)
    terms_and_conditions = Column(Text, nullable=True)

    # Currency
    currency = Column(String, default="USD")
    exchange_rate = Column(Numeric(precision=18, scale=4), nullable=False, server_default="1.0000")

    # Totals (calculated)
    subtotal = Column(Numeric(precision=18, scale=2), default=0)
    tax_percent = Column(Numeric(precision=5, scale=2), default=0)
    tax_amount = Column(Numeric(precision=18, scale=2), default=0)
    total = Column(Numeric(precision=18, scale=2), default=0)

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Approval tracking
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="quotations")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")
    contracts = relationship("Contract", back_populates="quotation")

    # Constraints
    __table_args__ = (
        UniqueConstraint('quotation_no', name='unique_quotation_no'),
    )

class QuotationItem(Base):
    """
    Individual line items in a quotation
    Can represent standard products or elevator components
    """
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)  # Can be null for custom items

    # Item details
    description = Column(Text, nullable=False)  # Product name or custom description
    specifications = Column(Text, nullable=True)  # Additional specs

    # Quantity and pricing
    qty = Column(Numeric(precision=18, scale=3), nullable=False)
    uom = Column(String, default="unit")  # Unit of measure
    unit_price = Column(Numeric(precision=18, scale=2), nullable=False)

    # Discount at item level
    discount_percent = Column(Numeric(precision=5, scale=2), default=0)
    discount_amount = Column(Numeric(precision=18, scale=2), default=0)

    # Line total (calculated)
    line_total = Column(Numeric(precision=18, scale=2), nullable=False)

    # Elevator-specific components (for order_type='elevators')
    sections = Column(Integer, default=0)           # عدد السكاشن
    ropes = Column(Integer, default=0)              # عدد الرباط
    cable_meters = Column(Numeric(precision=18, scale=2), default=0)  # طول الكيبل
    cabins = Column(Integer, default=1)             # عدد الكابينات
    doors = Column(Integer, default=0)              # عدد الأبواب

    # Additional elevator specifications
    elevator_type = Column(String, nullable=True)   # Passenger, Freight, Service, Hospital
    capacity_kg = Column(Integer, nullable=True)    # Load capacity in kg
    capacity_persons = Column(Integer, nullable=True)  # Person capacity
    speed_mps = Column(Numeric(precision=5, scale=2), nullable=True)  # Speed in m/s
    floors = Column(Integer, nullable=True)         # Number of floors
    stops = Column(Integer, nullable=True)          # Number of stops
    travel_distance = Column(Numeric(precision=10, scale=2), nullable=True)  # Travel distance in meters

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    quotation = relationship("Quotation", back_populates="items")
    product = relationship("Product")

    # Computed line total
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._calculate_line_total()

    def _calculate_line_total(self) -> None:
        """Calculate line total based on qty, unit price, and discounts"""
        qty_value = cast(Optional[Decimal], self.qty)
        unit_price_value = cast(Optional[Decimal], self.unit_price)
        if qty_value is None or unit_price_value is None:
            return

        subtotal = qty_value * unit_price_value
        discount_value = Decimal("0")

        percent_value = cast(Optional[Decimal], self.discount_percent)
        amount_value = cast(Optional[Decimal], self.discount_amount)

        if percent_value is not None and percent_value > Decimal("0"):
            discount_value = subtotal * (percent_value / Decimal("100"))
        elif amount_value is not None and amount_value > Decimal("0"):
            discount_value = amount_value

        self.line_total = subtotal - discount_value


class Contract(Base):
    """
    Contract model for managing formal contracts
    Can be created from accepted quotations or standalone
    Status flow: DRAFT → ACTIVE → COMPLETED/TERMINATED
    """
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    contract_no = Column(String, unique=True, nullable=False)

    # References
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=True)  # Optional: created from quotation
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=True)  # Generated sales order

    # Dates
    contract_date = Column(DateType, nullable=False)
    start_date = Column(DateType, nullable=True)
    end_date = Column(DateType, nullable=True)
    signed_date = Column(DateType, nullable=True)

    # Status: DRAFT, ACTIVE, COMPLETED, TERMINATED, CANCELLED
    status = Column(
        String,
        CheckConstraint("status IN ('DRAFT','ACTIVE','COMPLETED','TERMINATED','CANCELLED')"),
        default="DRAFT",
        nullable=False
    )

    # Contract type
    contract_type = Column(String, default="SALES")  # SALES, MAINTENANCE, SERVICE, etc.

    # Parties - Seller (البائع)
    seller_company_name = Column(String, nullable=True)  # اسم الشركة البائعة
    seller_address = Column(Text, nullable=True)  # عنوان البائع
    seller_phone = Column(String, nullable=True)  # هاتف البائع
    seller_email = Column(String, nullable=True)  # إيميل البائع
    seller_authorized_person = Column(String, nullable=True)  # الشخص المفوّض بالتوقيع

    # Parties - Buyer (المشتري)
    buyer_name = Column(String, nullable=True)  # اسم المشتري / الزبون
    buyer_address = Column(Text, nullable=True)  # عنوان المشتري
    buyer_phone = Column(String, nullable=True)  # هاتف المشتري
    buyer_email = Column(String, nullable=True)  # إيميل المشتري
    buyer_representative = Column(String, nullable=True)  # ممثل المشتري

    # Project Details (بيانات المشروع)
    project_name = Column(String, nullable=True)  # اسم المشروع
    project_location = Column(Text, nullable=True)  # موقع المشروع
    building_type = Column(String, nullable=True)  # نوع المبنى (سكني، تجاري، خدمي...)
    num_floors = Column(Integer, nullable=True)  # عدد الطوابق
    usage_type = Column(String, nullable=True)  # نوع الاستخدام

    # Signatory info
    signed_by_customer = Column(String, nullable=True)  # Customer representative name
    signed_by_company = Column(String, nullable=True)   # Company representative name

    # Commercial terms
    payment_schedule = Column(Text, nullable=True)  # JSON or text description
    payment_terms = Column(Text, nullable=True)
    delivery_terms = Column(Text, nullable=True)
    warranty_terms = Column(Text, nullable=True)
    warranty_period = Column(String, nullable=True)  # مدة الضمان (مثل: 12 شهر)

    # Seller Obligations (التزامات البائع)
    seller_obligations = Column(Text, nullable=True)
    
    # Buyer Obligations (التزامات المشتري)
    buyer_obligations = Column(Text, nullable=True)

    # Legal terms
    terms_and_conditions = Column(Text, nullable=True)
    general_terms = Column(Text, nullable=True)  # الشروط العامة
    penalties_clause = Column(Text, nullable=True)
    termination_clause = Column(Text, nullable=True)

    # Currency and amounts
    currency = Column(String, default="USD")
    total_amount = Column(Numeric(precision=18, scale=2), nullable=False)
    total_amount_text = Column(String, nullable=True)  # المبلغ كتابةً

    # Price includes (السعر يشمل)
    price_includes = Column(Text, nullable=True)

    # Additional info
    notes = Column(Text, nullable=True)

    # Elevator-specific fields (for manual entry when not linked to sales_order)
    elevator_type = Column(String, nullable=True)  # نوع المصعد
    elevator_model = Column(String, nullable=True)  # موديل المصعد
    elevator_capacity = Column(String, nullable=True)  # الحمولة
    elevator_height = Column(String, nullable=True)  # الارتفاع
    elevator_sections = Column(String, nullable=True)  # عدد السكاشن
    elevator_cost = Column(Numeric(precision=18, scale=2), nullable=True)  # التكلفة
    elevator_notes = Column(Text, nullable=True)  # ملاحظات إضافية

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Approval tracking
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="contracts")
    quotation = relationship("Quotation", back_populates="contracts")
    sales_order = relationship("SalesOrder")
    milestones = relationship("ContractMilestone", back_populates="contract", cascade="all, delete-orphan")
    elevators = relationship("ContractElevator", back_populates="contract", cascade="all, delete-orphan")
    payments = relationship("ContractPayment", back_populates="contract", cascade="all, delete-orphan")
    attachments = relationship("ContractAttachment", back_populates="contract", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        UniqueConstraint('contract_no', name='unique_contract_no'),
    )

class ContractMilestone(Base):
    """
    Milestones within a contract for tracking progress and payments
    """
    __tablename__ = "contract_milestones"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)

    # Milestone details
    milestone_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    sequence_order = Column(Integer, default=1)  # Order of milestone in contract

    # Dates
    due_date = Column(DateType, nullable=True)
    actual_completion_date = Column(DateType, nullable=True)

    # Status: PENDING, IN_PROGRESS, COMPLETED, OVERDUE
    status = Column(
        String,
        CheckConstraint("status IN ('PENDING','IN_PROGRESS','COMPLETED','OVERDUE')"),
        default="PENDING",
        nullable=False
    )

    # Payment allocation
    payment_percent = Column(Numeric(precision=5, scale=2), default=0)
    payment_amount = Column(Numeric(precision=18, scale=2), default=0)

    # Notes
    notes = Column(Text, nullable=True)

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    contract = relationship("Contract", back_populates="milestones")

class ContractElevator(Base):
    """
    Elevator specifications within a contract
    """
    __tablename__ = "contract_elevators"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)

    # Elevator specifications (المواصفات الفنية)
    elevator_type = Column(String, nullable=False)  # نوع المصعد: ركاب، خدمي، بنورامي...
    model = Column(String, nullable=True)  # الموديل: مثل SC200/200
    capacity_kg = Column(Integer, nullable=True)  # الحمولة بالكيلوغرام
    capacity_persons = Column(Integer, nullable=True)  # عدد الأشخاص
    speed_mps = Column(Numeric(precision=5, scale=2), nullable=True)  # السرعة م/ث
    num_stops = Column(Integer, nullable=True)  # عدد التوقفات
    travel_height = Column(Numeric(precision=10, scale=2), nullable=True)  # ارتفاع الخدمة
    door_type = Column(String, nullable=True)  # نوع الأبواب: أوتوماتيك، نصف أوتوماتيك
    origin_country = Column(String, nullable=True)  # بلد المنشأ
    quantity = Column(Integer, default=1)  # عدد المصاعد
    
    # Additional features (الملحقات)
    emergency_system = Column(String, nullable=True)  # نظام إنقاذ طوارئ
    intercom = Column(String, nullable=True)  # إنتركم
    display_screen = Column(String, nullable=True)  # شاشة عرض
    other_features = Column(Text, nullable=True)  # ميزات إضافية
    
    # Price
    unit_price = Column(Numeric(precision=18, scale=2), nullable=False)
    total_price = Column(Numeric(precision=18, scale=2), nullable=False)
    
    # Warranty
    warranty_period = Column(String, nullable=True)  # فترة الضمان: مثل "12 شهر"
    
    # Notes
    notes = Column(Text, nullable=True)

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    contract = relationship("Contract", back_populates="elevators")


class ContractPayment(Base):
    """
    Payment schedule for contracts
    """
    __tablename__ = "contract_payments"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)

    # Payment details
    payment_number = Column(Integer, nullable=False)  # رقم الدفعة
    description = Column(String, nullable=False)  # الوصف: مثل "عند توقيع العقد"
    percentage = Column(Numeric(precision=5, scale=2), nullable=True)  # النسبة من المبلغ
    amount = Column(Numeric(precision=18, scale=2), nullable=False)  # المبلغ
    
    # Dates
    due_date = Column(DateType, nullable=True)  # تاريخ الاستحقاق
    
    # Status: PENDING, PAID, LATE, CANCELLED
    status = Column(
        String,
        CheckConstraint("status IN ('PENDING','PAID','LATE','CANCELLED')"),
        default="PENDING",
        nullable=False
    )

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    contract = relationship("Contract", back_populates="payments")

    # Date conversion handled by DateType

class ContractAttachment(Base):
    """
    File attachments for contracts
    """
    __tablename__ = "contract_attachments"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)

    # File details
    file_name = Column(String, nullable=False)  # اسم الملف
    file_path = Column(String, nullable=False)  # مسار الملف
    file_type = Column(String, nullable=True)  # نوع الملف: PDF, Image, Word...
    file_size = Column(Integer, nullable=True)  # حجم الملف بالبايت
    description = Column(String, nullable=True)  # وصف الملف

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    contract = relationship("Contract", back_populates="attachments")
