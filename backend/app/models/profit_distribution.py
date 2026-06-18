from sqlalchemy import Column, String, BigInteger, Integer, ForeignKey, Date, Numeric, Text, CheckConstraint, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import BaseModel

class ProfitConfig(BaseModel):
    __tablename__ = "profit_configs"

    company_pct = Column(Numeric(5, 2), nullable=False, default=30.00)
    reserve_rate = Column(Numeric(5, 2), nullable=False, default=0.00)
    use_time_weight = Column(Boolean, nullable=False, default=True)
    unusual_lookback = Column(Integer, nullable=False, default=6)  # months to look back for unusual detection

    # Relationships
    profit_runs = relationship("ProfitRun", back_populates="config")

class ProfitRun(BaseModel):
    __tablename__ = "profit_runs"

    run_month = Column(Date, nullable=False, index=True)
    net_profit_usd = Column(Numeric(18, 2), nullable=False)
    company_pct = Column(Numeric(5, 2), nullable=False)
    reserve_rate = Column(Numeric(5, 2), nullable=False)
    mamar_share_usd = Column(Numeric(18, 2), nullable=False)
    partners_total_usd = Column(Numeric(18, 2), nullable=False)
    reserve_amount_usd = Column(Numeric(18, 2), nullable=False, default=0)
    calculation_method = Column(String(50), nullable=False)  # TWCap, Instant, etc.
    config_id = Column(BigInteger, ForeignKey("profit_configs.id"), nullable=True)

    # Relationships
    config = relationship("ProfitConfig", back_populates="profit_runs")
    distribution_lines = relationship("ProfitDistributionLine", back_populates="profit_run", cascade="all, delete-orphan")
    alerts = relationship("ProfitAlert", back_populates="profit_run", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        UniqueConstraint("run_month", name="unique_profit_run_month"),
    )

class ProfitDistributionLine(BaseModel):
    __tablename__ = "profit_distribution_lines"

    run_id = Column(BigInteger, ForeignKey("profit_runs.id", ondelete="CASCADE"), nullable=False)
    partner_id = Column(BigInteger, ForeignKey("partners.id"), nullable=False)
    weight_used = Column(Numeric(18, 8), nullable=False, default=0)
    amount_usd = Column(Numeric(18, 2), nullable=False, default=0)

    # Relationships
    profit_run = relationship("ProfitRun", back_populates="distribution_lines")
    partner = relationship("Partner", back_populates="profit_distributions")

class ProfitAlert(BaseModel):
    __tablename__ = "profit_alerts"

    run_id = Column(BigInteger, ForeignKey("profit_runs.id", ondelete="CASCADE"), nullable=False)
    partner_id = Column(BigInteger, ForeignKey("partners.id"), nullable=True)
    level = Column(String(20), nullable=False, default="INFO")  # INFO, WARN, CRITICAL
    message = Column(Text, nullable=False)

    # Relationships
    profit_run = relationship("ProfitRun", back_populates="alerts")
    partner = relationship("Partner")

    # Constraints
    __table_args__ = (
        CheckConstraint("level IN ('INFO', 'WARN', 'CRITICAL')", name="check_alert_level"),
    )

class CompanyShareBeneficiary(BaseModel):
    """
    مستفيدو نسبة الشركة (30%)
    مثل: سمير 15%، علي 15%
    """
    __tablename__ = "company_share_beneficiaries"

    name = Column(String(100), nullable=False)
    percentage = Column(Numeric(5, 2), nullable=False)  # 15.00
    is_active = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)

    # Relationships
    distribution_decisions = relationship("BeneficiaryDistributionDecision", back_populates="beneficiary", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        CheckConstraint("percentage > 0 AND percentage <= 100", name="check_beneficiary_percentage"),
    )

class BeneficiaryDistributionDecision(BaseModel):
    """
    قرارات توزيع حصة المستفيدين
    لكل مستفيد في كل شهر: سحب نقدي أو تحويل لرأس مال
    """
    __tablename__ = "beneficiary_distribution_decisions"

    profit_run_id = Column(BigInteger, ForeignKey("profit_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    beneficiary_id = Column(BigInteger, ForeignKey("company_share_beneficiaries.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_usd = Column(Numeric(18, 2), nullable=False)
    decision_type = Column(String(20), nullable=False)  # 'CASH' or 'CAPITAL'
    partner_id = Column(BigInteger, ForeignKey("partners.id"), nullable=True)  # if converted to capital
    notes = Column(Text, nullable=True)
    decided_at = Column(Date, nullable=True)

    # Relationships
    profit_run = relationship("ProfitRun")
    beneficiary = relationship("CompanyShareBeneficiary", back_populates="distribution_decisions")
    partner = relationship("Partner")

    # Constraints
    __table_args__ = (
        CheckConstraint("decision_type IN ('CASH', 'CAPITAL')", name="check_decision_type"),
        CheckConstraint("amount_usd >= 0", name="check_positive_amount"),
        UniqueConstraint("profit_run_id", "beneficiary_id", name="unique_beneficiary_decision_per_run"),
    )