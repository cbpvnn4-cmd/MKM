from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal


class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SupplierBase):
    pass


class SupplierInDBBase(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Supplier(SupplierInDBBase):
    pass


class PurchaseOrderBase(BaseModel):
    supplier_id: int
    po_no: str
    po_date: date
    expected_delivery_date: Optional[date] = None
    status: Optional[str] = "DRAFT"
    total_amount_usd: Optional[Decimal] = None
    notes: Optional[str] = None

    @validator('status')
    def validate_status(cls, v):
        if v not in ['DRAFT', 'CONFIRMED', 'RECEIVED', 'CANCELLED']:
            raise ValueError('Status must be one of: DRAFT, CONFIRMED, RECEIVED, CANCELLED')
        return v


class PurchaseOrderCreate(PurchaseOrderBase):
    pass


class PurchaseOrderUpdate(PurchaseOrderBase):
    pass


class PurchaseOrderInDBBase(PurchaseOrderBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PurchaseOrder(PurchaseOrderInDBBase):
    pass


class APInvoiceBase(BaseModel):
    supplier_id: Optional[int] = None
    purchase_order_id: Optional[int] = None
    invoice_no: Optional[str] = None
    invoice_date: date
    due_date: Optional[date] = None
    amount: Decimal
    paid_amount: Optional[Decimal] = Decimal("0.00")
    status: Optional[str] = "DRAFT"

    @validator('status')
    def validate_status(cls, v):
        if v not in ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID']:
            raise ValueError('Status must be one of: DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID')
        return v


class APInvoiceCreate(APInvoiceBase):
    pass


class APInvoiceUpdate(APInvoiceBase):
    pass


class APInvoiceInDBBase(APInvoiceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class APInvoice(APInvoiceInDBBase):
    pass


class WarehouseBase(BaseModel):
    name: str
    location: Optional[str] = None
    capacity: Optional[Decimal] = None


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(WarehouseBase):
    pass


class WarehouseInDBBase(WarehouseBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Warehouse(WarehouseInDBBase):
    pass


class StockMovementBase(BaseModel):
    product_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    movement_type: str
    quantity: Decimal
    unit_cost: Optional[Decimal] = None
    reference_no: Optional[str] = None
    movement_date: date
    notes: Optional[str] = None

    @validator('movement_type')
    def validate_movement_type(cls, v):
        if v not in ['IN', 'OUT', 'ADJUST']:
            raise ValueError('Movement type must be one of: IN, OUT, ADJUST')
        return v

    @validator('quantity')
    def validate_quantity(cls, v):
        if v < 0:
            raise ValueError('Quantity must be non-negative')
        return v


class StockMovementCreate(StockMovementBase):
    pass


class StockMovementUpdate(StockMovementBase):
    pass


class StockMovementInDBBase(StockMovementBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StockMovement(StockMovementInDBBase):
    pass