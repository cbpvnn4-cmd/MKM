from pydantic import BaseModel, EmailStr, validator, root_validator
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal


class PartnerBase(BaseModel):
    name: str
    national_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    active: Optional[bool] = True

    @validator('national_id', 'phone', pre=True, always=True)
    def empty_string_to_none(cls, v):
        # Allow frontend to send empty strings; normalize to None
        if isinstance(v, str) and v.strip() == '':
            return None
        return v

    @validator('email', pre=True, always=True)
    def empty_email_to_none(cls, v):
        if isinstance(v, str) and v.strip() == '':
            return None
        return v


class PartnerCreate(PartnerBase):
    pass


class PartnerUpdate(PartnerBase):
    pass


class PartnerInDBBase(PartnerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        # Support both Pydantic v1 and v2 styles
        orm_mode = True
        from_attributes = True

    @root_validator(pre=True)
    def handle_is_active_field(cls, values):
        # Convert is_active field from database to active field for API
        if hasattr(values, 'is_active'):
            values.active = values.is_active
        elif isinstance(values, dict) and 'is_active' in values:
            values['active'] = values['is_active']
        return values


class Partner(PartnerInDBBase):
    pass


class PartnerCapitalMovementBase(BaseModel):
    partner_id: int
    movement_type: str
    amount_usd: Decimal
    happened_at: date
    note: Optional[str] = None

    @validator('movement_type')
    def validate_movement_type(cls, v):
        if v not in ['DEPOSIT', 'WITHDRAW']:
            raise ValueError('Movement type must be either DEPOSIT or WITHDRAW')
        return v

    @validator('amount_usd')
    def validate_amount(cls, v):
        if v < 0:
            raise ValueError('Amount must be non-negative')
        return v


class PartnerCapitalMovementCreate(BaseModel):
    movement_type: str
    amount_usd: Decimal
    happened_at: date
    note: Optional[str] = None

    @validator('movement_type')
    def validate_movement_type(cls, v):
        if v not in ['DEPOSIT', 'WITHDRAW']:
            raise ValueError('Movement type must be either DEPOSIT or WITHDRAW')
        return v

    @validator('amount_usd')
    def validate_amount(cls, v):
        if v < 0:
            raise ValueError('Amount must be non-negative')
        return v


class PartnerCapitalMovementUpdate(PartnerCapitalMovementBase):
    pass


class PartnerCapitalMovementInDBBase(PartnerCapitalMovementBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PartnerCapitalMovement(PartnerCapitalMovementInDBBase):
    pass


class OwnershipSnapshotBase(BaseModel):
    snapshot_on: date
    partner_id: int
    equity_usd: Decimal
    equity_pct: Decimal

    @validator('equity_pct')
    def validate_equity_percentage(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Equity percentage must be between 0 and 100')
        return v


class OwnershipSnapshotCreate(BaseModel):
    snapshot_on: date
    equity_usd: Decimal
    equity_pct: Decimal

    @validator('equity_pct')
    def validate_equity_percentage(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Equity percentage must be between 0 and 100')
        return v


class OwnershipSnapshotUpdate(OwnershipSnapshotBase):
    pass


class OwnershipSnapshotInDBBase(OwnershipSnapshotBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OwnershipSnapshot(OwnershipSnapshotInDBBase):
    pass


class PartnerCapitalSummary(BaseModel):
    total_deposits: float
    total_withdrawals: float
    net_capital: float
    total_purchase_commitments: float
    total_expenses: float
    available_capital: float


# Partner Account Ledger Schemas
class PartnerAccountLedgerBase(BaseModel):
    partner_id: int
    transaction_date: date
    transaction_type: str
    debit_amount: Decimal = Decimal("0")
    credit_amount: Decimal = Decimal("0")
    running_balance: Decimal = Decimal("0")
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    description: Optional[str] = None

    @validator('transaction_type')
    def validate_transaction_type(cls, v):
        allowed = ['CAPITAL_DEPOSIT', 'CAPITAL_WITHDRAW', 'PROFIT_DISTRIBUTION', 'PROFIT_PAYOUT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT']
        if v not in allowed:
            raise ValueError(f'Transaction type must be one of: {", ".join(allowed)}')
        return v


class PartnerAccountLedgerCreate(BaseModel):
    transaction_date: date
    transaction_type: str
    debit_amount: Decimal = Decimal("0")
    credit_amount: Decimal = Decimal("0")
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    description: Optional[str] = None


class PartnerAccountLedger(PartnerAccountLedgerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Partner Profit Payout Schemas
class PartnerProfitPayoutBase(BaseModel):
    partner_id: int
    distribution_line_id: Optional[int] = None
    payout_amount: Decimal
    payout_date: date
    payment_method: str = 'BANK_TRANSFER'
    reference_no: Optional[str] = None
    notes: Optional[str] = None

    @validator('payment_method')
    def validate_payment_method(cls, v):
        allowed = ['BANK_TRANSFER', 'CASH', 'CHECK', 'WIRE_TRANSFER', 'OTHER']
        if v not in allowed:
            raise ValueError(f'Payment method must be one of: {", ".join(allowed)}')
        return v

    @validator('payout_amount')
    def validate_payout_amount(cls, v):
        if v <= 0:
            raise ValueError('Payout amount must be positive')
        return v


class PartnerProfitPayoutCreate(BaseModel):
    distribution_line_id: Optional[int] = None
    payout_amount: Decimal
    payout_date: date
    payment_method: str = 'BANK_TRANSFER'
    reference_no: Optional[str] = None
    notes: Optional[str] = None

    @validator('payment_method')
    def validate_payment_method(cls, v):
        allowed = ['BANK_TRANSFER', 'CASH', 'CHECK', 'WIRE_TRANSFER', 'OTHER']
        if v not in allowed:
            raise ValueError(f'Payment method must be one of: {", ".join(allowed)}')
        return v

    @validator('payout_amount')
    def validate_payout_amount(cls, v):
        if v <= 0:
            raise ValueError('Payout amount must be positive')
        return v


class PartnerProfitPayout(PartnerProfitPayoutBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Partner Financial Summary Schema (Comprehensive)
class PartnerFinancialSummary(BaseModel):
    """Comprehensive financial summary for a partner"""
    partner_id: int
    partner_name: str

    # Capital
    total_capital_deposits: float
    total_capital_withdrawals: float
    net_capital: float

    # Profits
    total_profit_distributions: float  # All time profits allocated
    total_profit_payouts: float  # All time profits paid out
    outstanding_profits: float  # Profits not yet paid

    # Ownership
    current_ownership_percentage: Optional[float] = None
    current_equity_value: Optional[float] = None

    # Overall Balance
    total_balance: float  # net_capital + outstanding_profits

    class Config:
        from_attributes = True


# Partner Account Statement Schemas
class PartnerStatementTransaction(BaseModel):
    """Single transaction in partner account statement"""
    transaction_date: date
    transaction_type: str
    description: str
    currency: str = 'USD'
    debit_amount: float = 0
    credit_amount: float = 0
    running_balance: float = 0
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None

    class Config:
        from_attributes = True


class PartnerAccountStatement(BaseModel):
    """Complete account statement for a partner"""
    # Partner info
    partner_id: int
    partner_name: str
    partner_code: Optional[str] = None
    
    # Date range
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    
    # Summary
    opening_balance: float = 0
    total_deposits: float = 0
    total_withdrawals: float = 0
    total_profits_distributed: float = 0
    total_profits_paid: float = 0
    closing_balance: float = 0
    
    # Transactions
    transactions: List[PartnerStatementTransaction] = []
    
    class Config:
        from_attributes = True
