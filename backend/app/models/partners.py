from sqlalchemy import Column, String, Boolean, BigInteger, ForeignKey, Date, Numeric, Text, CheckConstraint
from sqlalchemy.orm import relationship
from .base import BaseModel

class Partner(BaseModel):
    __tablename__ = "partners"

    name = Column(String(100), nullable=False)
    national_id = Column(String(20), unique=True, index=True)
    phone = Column(String(20))
    email = Column(String(100))
    address = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    capital_movements = relationship("PartnerCapitalMovement", back_populates="partner", cascade="all, delete-orphan")
    ownership_snapshots = relationship("OwnershipSnapshot", back_populates="partner", cascade="all, delete-orphan")
    profit_distributions = relationship("ProfitDistributionLine", back_populates="partner")
    account_ledger = relationship("PartnerAccountLedger", back_populates="partner", cascade="all, delete-orphan")
    profit_payouts = relationship("PartnerProfitPayout", back_populates="partner", cascade="all, delete-orphan")

class PartnerCapitalMovement(BaseModel):
    __tablename__ = "partner_capital_movements"

    partner_id = Column(BigInteger, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False)
    movement_type = Column(String(20), nullable=False)  # DEPOSIT, WITHDRAW
    amount_usd = Column(Numeric(18, 2), nullable=False)
    happened_at = Column(Date, nullable=False)
    note = Column(Text)

    # Relationships
    partner = relationship("Partner", back_populates="capital_movements")

    # Constraints
    __table_args__ = (
        CheckConstraint("movement_type IN ('DEPOSIT', 'WITHDRAW')", name="check_movement_type"),
        CheckConstraint("amount_usd >= 0", name="check_positive_amount"),
    )

class OwnershipSnapshot(BaseModel):
    __tablename__ = "ownership_snapshots"

    snapshot_on = Column(Date, nullable=False, index=True)
    partner_id = Column(BigInteger, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False)
    equity_usd = Column(Numeric(18, 2), nullable=False)
    equity_pct = Column(Numeric(7, 4), nullable=False)

    # Relationships
    partner = relationship("Partner", back_populates="ownership_snapshots")

    # Constraints
    __table_args__ = (
        CheckConstraint("equity_pct >= 0 AND equity_pct <= 100.0000", name="check_equity_percentage"),
    )

class PartnerAccountLedger(BaseModel):
    __tablename__ = "partner_account_ledger"

    partner_id = Column(BigInteger, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_date = Column(Date, nullable=False, index=True)
    transaction_type = Column(String(50), nullable=False)
    debit_amount = Column(Numeric(18, 2), nullable=False, default=0)
    credit_amount = Column(Numeric(18, 2), nullable=False, default=0)
    running_balance = Column(Numeric(18, 2), nullable=False, default=0)
    reference_id = Column(BigInteger, nullable=True)
    reference_type = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)

    # Relationships
    partner = relationship("Partner", back_populates="account_ledger")

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "transaction_type IN ('CAPITAL_DEPOSIT', 'CAPITAL_WITHDRAW', 'PROFIT_DISTRIBUTION', 'PROFIT_PAYOUT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT')",
            name="check_ledger_transaction_type"
        ),
    )

class PartnerProfitPayout(BaseModel):
    __tablename__ = "partner_profit_payouts"

    partner_id = Column(BigInteger, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    distribution_line_id = Column(BigInteger, ForeignKey("profit_distribution_lines.id", ondelete="SET NULL"), nullable=True)
    payout_amount = Column(Numeric(18, 2), nullable=False)
    payout_date = Column(Date, nullable=False, index=True)
    payment_method = Column(String(50), nullable=False, default='BANK_TRANSFER')
    reference_no = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    partner = relationship("Partner", back_populates="profit_payouts")
    distribution_line = relationship("ProfitDistributionLine")

    # Constraints
    __table_args__ = (
        CheckConstraint("payment_method IN ('BANK_TRANSFER', 'CASH', 'CHECK', 'WIRE_TRANSFER', 'OTHER')", name="check_payout_payment_method"),
        CheckConstraint("payout_amount > 0", name="check_positive_payout_amount"),
    )