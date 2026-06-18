from pydantic import BaseModel, validator, Field
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal


# ==================== QuotationItem Schemas ====================

class QuotationItemBase(BaseModel):
    """Base schema for quotation items"""
    product_id: Optional[int] = None
    description: str
    specifications: Optional[str] = None
    qty: Decimal
    uom: Optional[str] = "unit"
    unit_price: Decimal
    discount_percent: Optional[Decimal] = Decimal("0")
    discount_amount: Optional[Decimal] = Decimal("0")

    # Elevator-specific fields
    sections: Optional[int] = 0
    ropes: Optional[int] = 0
    cable_meters: Optional[Decimal] = Decimal("0")
    cabins: Optional[int] = 1
    doors: Optional[int] = 0
    elevator_type: Optional[str] = None
    capacity_kg: Optional[int] = None
    capacity_persons: Optional[int] = None
    speed_mps: Optional[Decimal] = None
    floors: Optional[int] = None
    stops: Optional[int] = None
    travel_distance: Optional[Decimal] = None

    @validator('qty')
    def validate_qty(cls, v):
        if v <= 0:
            raise ValueError('Quantity must be positive')
        return v

    @validator('unit_price')
    def validate_unit_price(cls, v):
        if v < 0:
            raise ValueError('Unit price cannot be negative')
        return v


class QuotationItemCreate(QuotationItemBase):
    """Schema for creating a quotation item"""
    pass


class QuotationItemUpdate(QuotationItemBase):
    """Schema for updating a quotation item"""
    pass


class QuotationItemInDB(QuotationItemBase):
    """Schema for quotation item from database"""
    id: int
    quotation_id: int
    line_total: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuotationItem(QuotationItemInDB):
    """Schema for quotation item response"""
    pass


# ==================== Quotation Schemas ====================

class QuotationBase(BaseModel):
    """Base schema for quotations"""
    customer_id: int
    quotation_date: date
    valid_until: Optional[date] = None
    status: Optional[str] = "DRAFT"
    order_type: Optional[str] = "items"
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    warranty_terms: Optional[str] = None
    discount_percent: Optional[Decimal] = Decimal("0")
    discount_amount: Optional[Decimal] = Decimal("0")
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    currency: Optional[str] = "USD"
    exchange_rate: Decimal = Field(default=Decimal("1.0000"))
    tax_percent: Optional[Decimal] = Decimal("0")

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
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

    @validator('valid_until')
    def validate_valid_until(cls, v, values):
        if v and 'quotation_date' in values:
            if v < values['quotation_date']:
                raise ValueError('valid_until must be after quotation_date')
        return v


class QuotationCreate(QuotationBase):
    """Schema for creating a quotation"""
    quotation_no: Optional[str] = None  # Auto-generated if not provided
    items: List[QuotationItemCreate] = []


class QuotationUpdate(BaseModel):
    """Schema for updating a quotation"""
    customer_id: Optional[int] = None
    quotation_date: Optional[date] = None
    valid_until: Optional[date] = None
    status: Optional[str] = None
    order_type: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    warranty_terms: Optional[str] = None
    discount_percent: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    currency: Optional[str] = None
    exchange_rate: Optional[Decimal] = None
    tax_percent: Optional[Decimal] = None

    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


class QuotationInDB(QuotationBase):
    """Schema for quotation from database"""
    id: int
    quotation_no: str
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Quotation(QuotationInDB):
    """Schema for quotation list response"""
    customer_name: Optional[str] = None


class QuotationDetail(QuotationInDB):
    """Schema for detailed quotation response"""
    items: List[QuotationItem] = []
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None


# ==================== Contract Milestone Schemas ====================

class ContractMilestoneBase(BaseModel):
    """Base schema for contract milestones"""
    milestone_name: str
    description: Optional[str] = None
    sequence_order: Optional[int] = 1
    due_date: Optional[date] = None
    status: Optional[str] = "PENDING"
    payment_percent: Optional[Decimal] = Decimal("0")
    payment_amount: Optional[Decimal] = Decimal("0")
    notes: Optional[str] = None

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v

    @validator('payment_percent')
    def validate_payment_percent(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Payment percent must be between 0 and 100')
        return v


class ContractMilestoneCreate(ContractMilestoneBase):
    """Schema for creating a contract milestone"""
    pass


class ContractMilestoneUpdate(BaseModel):
    """Schema for updating a contract milestone"""
    milestone_name: Optional[str] = None
    description: Optional[str] = None
    sequence_order: Optional[int] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    payment_percent: Optional[Decimal] = None
    payment_amount: Optional[Decimal] = None
    notes: Optional[str] = None
    actual_completion_date: Optional[date] = None


class ContractMilestoneInDB(ContractMilestoneBase):
    """Schema for contract milestone from database"""
    id: int
    contract_id: int
    actual_completion_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContractMilestone(ContractMilestoneInDB):
    """Schema for contract milestone response"""
    pass


# ==================== Contract Schemas ====================

class ContractBase(BaseModel):
    """Base schema for contracts"""
    customer_id: int
    quotation_id: Optional[int] = None
    contract_date: date
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = "DRAFT"
    contract_type: Optional[str] = "SALES"
    
    # Seller info
    seller_company_name: Optional[str] = None
    seller_address: Optional[str] = None
    seller_phone: Optional[str] = None
    seller_email: Optional[str] = None
    seller_authorized_person: Optional[str] = None
    
    # Buyer info
    buyer_name: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_phone: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_representative: Optional[str] = None
    
    # Project details
    project_name: Optional[str] = None
    project_location: Optional[str] = None
    building_type: Optional[str] = None
    num_floors: Optional[int] = None
    usage_type: Optional[str] = None
    
    # Signatory
    signed_by_customer: Optional[str] = None
    signed_by_company: Optional[str] = None
    
    # Commercial terms
    payment_schedule: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    warranty_terms: Optional[str] = None
    warranty_period: Optional[str] = None
    
    # Obligations
    seller_obligations: Optional[str] = None
    buyer_obligations: Optional[str] = None
    
    # Legal terms
    terms_and_conditions: Optional[str] = None
    general_terms: Optional[str] = None
    penalties_clause: Optional[str] = None
    termination_clause: Optional[str] = None
    
    # Currency and amounts
    currency: Optional[str] = "USD"
    total_amount: Decimal
    total_amount_text: Optional[str] = None
    price_includes: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None

    # Elevator-specific fields (for manual entry when not linked to sales_order)
    elevator_type: Optional[str] = None
    elevator_model: Optional[str] = None
    elevator_capacity: Optional[str] = None
    elevator_height: Optional[str] = None
    elevator_sections: Optional[str] = None
    elevator_cost: Optional[Decimal] = None
    elevator_notes: Optional[str] = None

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'CANCELLED']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v

    @validator('total_amount')
    def validate_total_amount(cls, v):
        if v < 0:
            raise ValueError('Total amount cannot be negative')
        return v

    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'start_date' in values and values['start_date']:
            if v < values['start_date']:
                raise ValueError('end_date must be after start_date')
        return v


class ContractCreate(ContractBase):
    """Schema for creating a contract"""
    contract_no: Optional[str] = None  # Auto-generated if not provided
    milestones: List['ContractMilestoneCreate'] = Field(default_factory=list)
    elevators: List['ContractElevatorCreate'] = Field(default_factory=list)
    payments: List['ContractPaymentCreate'] = Field(default_factory=list)


class ContractUpdate(BaseModel):
    """Schema for updating a contract"""
    customer_id: Optional[int] = None
    contract_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    signed_date: Optional[date] = None
    status: Optional[str] = None
    contract_type: Optional[str] = None

    # Seller info
    seller_company_name: Optional[str] = None
    seller_address: Optional[str] = None
    seller_phone: Optional[str] = None
    seller_email: Optional[str] = None
    seller_authorized_person: Optional[str] = None

    # Buyer info
    buyer_name: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_phone: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_representative: Optional[str] = None

    # Project details
    project_name: Optional[str] = None
    project_location: Optional[str] = None
    building_type: Optional[str] = None
    num_floors: Optional[int] = None
    usage_type: Optional[str] = None

    # Signatory
    signed_by_customer: Optional[str] = None
    signed_by_company: Optional[str] = None

    # Commercial terms
    payment_schedule: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    warranty_terms: Optional[str] = None
    warranty_period: Optional[str] = None

    # Obligations
    seller_obligations: Optional[str] = None
    buyer_obligations: Optional[str] = None

    # Legal terms
    terms_and_conditions: Optional[str] = None
    penalties_clause: Optional[str] = None
    termination_clause: Optional[str] = None
    general_terms: Optional[str] = None

    # Currency and amounts
    currency: Optional[str] = None
    total_amount: Optional[Decimal] = None
    total_amount_text: Optional[str] = None
    price_includes: Optional[str] = None
    notes: Optional[str] = None

    # Elevator-specific fields
    elevator_type: Optional[str] = None
    elevator_model: Optional[str] = None
    elevator_capacity: Optional[str] = None
    elevator_height: Optional[str] = None
    elevator_sections: Optional[str] = None
    elevator_cost: Optional[Decimal] = None
    elevator_notes: Optional[str] = None
    elevators: Optional[List['ContractElevatorCreate']] = None
    payments: Optional[List['ContractPaymentCreate']] = None

    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ['DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'CANCELLED']
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


class ContractInDB(ContractBase):
    """Schema for contract from database"""
    id: int
    contract_no: str
    sales_order_id: Optional[int] = None
    signed_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Contract(ContractInDB):
    """Schema for contract list response"""
    customer_name: Optional[str] = None


class ContractDetail(ContractInDB):
    """Schema for detailed contract response"""
    milestones: List['ContractMilestone'] = Field(default_factory=list)
    elevators: List['ContractElevator'] = Field(default_factory=list)
    payments: List['ContractPayment'] = Field(default_factory=list)
    attachments: List['ContractAttachment'] = Field(default_factory=list)
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    quotation_no: Optional[str] = None
    sales_order_no: Optional[str] = None


# ==================== Contract Elevator Schemas ====================

class ContractElevatorBase(BaseModel):
    """Base schema for contract elevators"""
    elevator_type: str
    model: Optional[str] = None
    capacity_kg: Optional[int] = None
    capacity_persons: Optional[int] = None
    speed_mps: Optional[Decimal] = None
    num_stops: Optional[int] = None
    travel_height: Optional[Decimal] = None
    door_type: Optional[str] = None
    origin_country: Optional[str] = None
    quantity: Optional[int] = 1
    emergency_system: Optional[str] = None
    intercom: Optional[str] = None
    display_screen: Optional[str] = None
    other_features: Optional[str] = None
    unit_price: Decimal
    total_price: Decimal
    warranty_period: Optional[str] = None
    notes: Optional[str] = None

    @validator('quantity')
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError('Quantity must be positive')
        return v


class ContractElevatorCreate(ContractElevatorBase):
    """Schema for creating a contract elevator"""
    pass


class ContractElevatorUpdate(BaseModel):
    """Schema for updating a contract elevator"""
    elevator_type: Optional[str] = None
    model: Optional[str] = None
    capacity_kg: Optional[int] = None
    capacity_persons: Optional[int] = None
    speed_mps: Optional[Decimal] = None
    num_stops: Optional[int] = None
    travel_height: Optional[Decimal] = None
    door_type: Optional[str] = None
    origin_country: Optional[str] = None
    quantity: Optional[int] = None
    emergency_system: Optional[str] = None
    intercom: Optional[str] = None
    display_screen: Optional[str] = None
    other_features: Optional[str] = None
    unit_price: Optional[Decimal] = None
    total_price: Optional[Decimal] = None
    warranty_period: Optional[str] = None
    notes: Optional[str] = None


class ContractElevatorInDB(ContractElevatorBase):
    """Schema for contract elevator from database"""
    id: int
    contract_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContractElevator(ContractElevatorInDB):
    """Schema for contract elevator response"""
    pass


# ==================== Contract Payment Schemas ====================

class ContractPaymentBase(BaseModel):
    """Base schema for contract payments"""
    payment_number: int
    description: str
    percentage: Optional[Decimal] = None
    amount: Decimal
    due_date: Optional[date] = None
    status: Optional[str] = "PENDING"

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['PENDING', 'PAID', 'LATE', 'CANCELLED']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v

    @validator('percentage')
    def validate_percentage(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Percentage must be between 0 and 100')
        return v


class ContractPaymentCreate(ContractPaymentBase):
    """Schema for creating a contract payment"""
    pass


class ContractPaymentUpdate(BaseModel):
    """Schema for updating a contract payment"""
    payment_number: Optional[int] = None
    description: Optional[str] = None
    percentage: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    due_date: Optional[date] = None
    status: Optional[str] = None


class ContractPaymentInDB(ContractPaymentBase):
    """Schema for contract payment from database"""
    id: int
    contract_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContractPayment(ContractPaymentInDB):
    """Schema for contract payment response"""
    pass


# ==================== Contract Attachment Schemas ====================

class ContractAttachmentBase(BaseModel):
    """Base schema for contract attachments"""
    file_name: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    description: Optional[str] = None


class ContractAttachmentCreate(ContractAttachmentBase):
    """Schema for creating a contract attachment"""
    pass


class ContractAttachmentInDB(ContractAttachmentBase):
    """Schema for contract attachment from database"""
    id: int
    contract_id: int
    created_at: datetime
    uploaded_by: Optional[int] = None

    class Config:
        from_attributes = True


class ContractAttachment(ContractAttachmentInDB):
    """Schema for contract attachment response"""
    pass
