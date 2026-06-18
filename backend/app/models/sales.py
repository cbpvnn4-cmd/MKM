from sqlalchemy import Column, Integer, String, DateTime, Date, Numeric, ForeignKey, CheckConstraint, UniqueConstraint, TypeDecorator, event
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from app.database.database import Base
from datetime import datetime, date


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


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    so_no = Column(String, unique=True)
    _so_date = Column("so_date", DateType, nullable=False)  # Private column
    status = Column(String, CheckConstraint("status IN ('DRAFT','CONFIRMED','FULFILLED','INVOICED','CANCELLED')"), default="DRAFT")
    order_type = Column(String, CheckConstraint("order_type IN ('items','elevators')"), default="items")
    exchange_rate = Column(Numeric(precision=18, scale=4), nullable=False, server_default="1.0000")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    @hybrid_property
    def so_date(self):
        return self._so_date

    @so_date.setter
    def so_date(self, value):
        """Convert string to date object"""
        if value is None:
            self._so_date = None
        elif isinstance(value, date) and not isinstance(value, datetime):
            self._so_date = value
        elif isinstance(value, datetime):
            self._so_date = value.date()
        elif isinstance(value, str):
            self._so_date = datetime.strptime(value.strip(), "%Y-%m-%d").date()
        else:
            raise TypeError(f"Cannot convert {type(value)} to date")

    # Relationships
    customer = relationship("Customer", back_populates="sales_orders")
    items = relationship("SalesOrderItem", back_populates="sales_order", cascade="all, delete-orphan")
    invoice = relationship("Invoice", back_populates="sales_order", uselist=False)

    # Constraints
    __table_args__ = (
        UniqueConstraint('so_no', name='unique_so_no'),
    )


# Event listener to convert date strings before insert/update
@event.listens_for(SalesOrder, 'before_insert')
@event.listens_for(SalesOrder, 'before_update')
def convert_date_fields(mapper, connection, target):
    """Convert string dates to date objects before database operations"""
    if hasattr(target, 'so_date') and isinstance(target.so_date, str):
        target.so_date = datetime.strptime(target.so_date, "%Y-%m-%d").date()


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"))
    qty = Column(Numeric(precision=18, scale=3), nullable=False)
    unit_price_usd = Column(Numeric(precision=18, scale=2), nullable=False)
    line_total_usd = Column(Numeric(precision=18, scale=2))

    # Elevator components (for elevator sales only)
    sections = Column(Integer, default=0)           # عدد السكاشن
    ropes = Column(Integer, default=0)              # عدد الرباط
    cable_meters = Column(Numeric(precision=18, scale=2), default=0)  # طول الكيبل
    cabins = Column(Integer, default=1)             # عدد الكابينات
    doors = Column(Integer, default=0)              # عدد الأبواب

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    sales_order = relationship("SalesOrder", back_populates="items")
    product = relationship("Product")

    # Computed column for line total
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.qty is not None and self.unit_price_usd is not None:
            self.line_total_usd = self.qty * self.unit_price_usd


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String, unique=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"))
    issue_date = Column(DateType, nullable=False)
    due_date = Column(DateType)
    currency = Column(String, default="USD")
    subtotal_usd = Column(Numeric(precision=18, scale=2))
    tax_pct = Column(Numeric(precision=5, scale=2), default=0)
    tax_amount_usd = Column(Numeric(precision=18, scale=2))
    total_usd = Column(Numeric(precision=18, scale=2))
    status = Column(String, CheckConstraint("status IN ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','VOID')"), default="DRAFT")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    customer = relationship("Customer", back_populates="invoices")
    sales_order = relationship("SalesOrder", back_populates="invoice")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        UniqueConstraint('invoice_no', name='unique_invoice_no'),
    )


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    paid_on = Column(DateType, nullable=False)
    method = Column(String)
    amount_usd = Column(Numeric(precision=18, scale=2), nullable=False)
    note = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")

    # Check constraint for amount
    __table_args__ = (
        CheckConstraint("amount_usd >= 0", name="check_payment_amount_non_negative"),
    )
