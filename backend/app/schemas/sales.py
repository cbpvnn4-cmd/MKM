from pydantic import BaseModel, validator, Field
from typing import List, Optional, TYPE_CHECKING
from datetime import date, datetime
from decimal import Decimal

if TYPE_CHECKING:
    from typing import ForwardRef


class ProductBase(BaseModel):
    sku: Optional[str] = None
    name: str
    category: Optional[str] = None
    uom: Optional[str] = "unit"
    price_usd: Decimal = Decimal("0.00")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    pass


class ProductInDBBase(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Product(ProductInDBBase):
    stock: Optional[Decimal] = Decimal("0")
    cost_price: Optional[Decimal] = Decimal("0")
    price: Optional[Decimal] = None  # Alias for price_usd for frontend compatibility


class SalesOrderBase(BaseModel):
    customer_id: Optional[int] = None
    so_no: Optional[str] = None
    so_date: date
    status: Optional[str] = "DRAFT"
    order_type: Optional[str] = "items"
    exchange_rate: Decimal = Field(default=Decimal("1.0000"), alias="exchangeRate")

    @validator('status')
    def validate_status(cls, v):
        if v not in ['DRAFT', 'CONFIRMED', 'FULFILLED', 'INVOICED', 'CANCELLED']:
            raise ValueError('Status must be one of: DRAFT, CONFIRMED, FULFILLED, INVOICED, CANCELLED')
        return v

    @validator('order_type', pre=True, always=True)
    def validate_order_type(cls, v):
        if v is None:
            return "items"
        if v not in ['items', 'elevators']:
            raise ValueError('order_type must be either "items" or "elevators"')
        return v

    @validator('exchange_rate', pre=True, always=True)
    def validate_exchange_rate(cls, v):
        if v is None or v == '':
            return Decimal("1.0000")
        if isinstance(v, (int, float, str)):
            try:
                numeric = Decimal(str(v))
            except Exception as exc:
                raise ValueError(f"Invalid exchange rate value: {v}") from exc
        elif isinstance(v, Decimal):
            numeric = v
        else:
            raise ValueError('exchange_rate must be a numeric value')

        if numeric <= Decimal("0"):
            raise ValueError('exchange_rate must be positive')
        return numeric


class SalesOrderCreate(SalesOrderBase):
    pass


class SalesOrderUpdate(SalesOrderBase):
    pass


class SalesOrderInDBBase(SalesOrderBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SalesOrder(SalesOrderInDBBase):
    total_amount_usd: Optional[Decimal] = Decimal("0.00")


class SalesOrderItemBase(BaseModel):
    sales_order_id: int
    product_id: Optional[int] = None
    qty: Decimal
    unit_price_usd: Decimal
    line_total_usd: Optional[Decimal] = None

    # Elevator components (optional, for elevator sales only)
    sections: Optional[int] = 0
    ropes: Optional[int] = 0
    cable_meters: Optional[Decimal] = Decimal("0.00")
    cabins: Optional[int] = 1
    doors: Optional[int] = 0


class SalesOrderItemCreate(SalesOrderItemBase):
    pass


class SalesOrderItemUpdate(SalesOrderItemBase):
    pass


class SalesOrderItemInDBBase(SalesOrderItemBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SalesOrderItem(SalesOrderItemInDBBase):
    pass


class SalesOrderPaymentSummary(BaseModel):
    total_paid_usd: Decimal = Decimal("0.00")
    remaining_balance_usd: Decimal = Decimal("0.00")
    currency: Optional[str] = "USD"
    payment_count: int = 0
    last_payment_date: Optional[datetime] = None


class SalesOrderAttachment(BaseModel):
    id: int
    filename: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    download_url: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SalesOrderAuditEntry(BaseModel):
    id: int
    action: Optional[str] = None
    username: Optional[str] = None
    user_role: Optional[str] = None
    description: Optional[str] = None
    timestamp: datetime
    is_successful: Optional[bool] = True
    changes: Optional[dict] = None
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None


class SalesOrderRelatedLink(BaseModel):
    label: str
    url: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    notes: Optional[str] = None


class SalesOrderDetail(SalesOrder):
    items: List[SalesOrderItem] = []
    invoice: Optional['Invoice'] = None
    payments: List['Payment'] = []
    payment_summary: Optional[SalesOrderPaymentSummary] = None
    attachments: List[SalesOrderAttachment] = []
    audit_trail: List[SalesOrderAuditEntry] = []
    related_links: List[SalesOrderRelatedLink] = []


class InvoiceBase(BaseModel):
    invoice_no: Optional[str] = None
    customer_id: Optional[int] = None
    project_id: Optional[int] = None
    sales_order_id: Optional[int] = None
    issue_date: date
    due_date: Optional[date] = None
    currency: Optional[str] = "USD"
    subtotal_usd: Optional[Decimal] = None
    tax_pct: Optional[Decimal] = Decimal("0.00")
    tax_amount_usd: Optional[Decimal] = None
    total_usd: Optional[Decimal] = None
    status: Optional[str] = "DRAFT"

    @validator('status')
    def validate_status(cls, v):
        if v not in ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID']:
            raise ValueError('Status must be one of: DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID')
        return v


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(InvoiceBase):
    pass


class InvoiceInDBBase(InvoiceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    # Computed fields (read-only)
    paid_amount_usd: Optional[Decimal] = None
    remaining_amount: Optional[Decimal] = None


    class Config:
        from_attributes = True


class Invoice(InvoiceInDBBase):
    pass


class PaymentBase(BaseModel):
    invoice_id: int
    paid_on: date
    method: Optional[str] = None
    amount_usd: Decimal
    note: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentCreateForInvoice(BaseModel):
    paid_on: date
    method: Optional[str] = None
    amount_usd: Decimal
    note: Optional[str] = None


class PaymentUpdate(PaymentBase):
    pass


class PaymentInDBBase(PaymentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Payment(PaymentInDBBase):
    pass

# Rebuild models to resolve forward references
SalesOrderDetail.model_rebuild()
