from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


# ============= Company Share Beneficiary Schemas =============

class CompanyShareBeneficiaryBase(BaseModel):
    name: str = Field(..., max_length=100, description="اسم المستفيد")
    percentage: Decimal = Field(..., ge=0, le=100, description="نسبة الاستفادة من حصة الشركة")
    is_active: bool = Field(True, description="هل المستفيد نشط")
    notes: Optional[str] = Field(None, description="ملاحظات")


class CompanyShareBeneficiaryCreate(CompanyShareBeneficiaryBase):
    pass


class CompanyShareBeneficiaryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class CompanyShareBeneficiary(CompanyShareBeneficiaryBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============= Beneficiary Distribution Decision Schemas =============

class BeneficiaryDistributionDecisionBase(BaseModel):
    profit_run_id: int = Field(..., description="معرف جولة توزيع الأرباح")
    beneficiary_id: int = Field(..., description="معرف المستفيد")
    amount_usd: Decimal = Field(..., ge=0, description="المبلغ بالدولار")
    decision_type: str = Field(..., description="نوع القرار: CASH أو CAPITAL")
    partner_id: Optional[int] = Field(None, description="معرف الشريك (في حالة CAPITAL)")
    notes: Optional[str] = Field(None, description="ملاحظات")
    decided_at: Optional[date] = Field(None, description="تاريخ القرار")


class BeneficiaryDistributionDecisionCreate(BeneficiaryDistributionDecisionBase):
    pass


class BeneficiaryDistributionDecisionUpdate(BaseModel):
    amount_usd: Optional[Decimal] = Field(None, ge=0)
    decision_type: Optional[str] = None
    partner_id: Optional[int] = None
    notes: Optional[str] = None
    decided_at: Optional[date] = None


class BeneficiaryDistributionDecision(BeneficiaryDistributionDecisionBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============= Profit Distribution Summary with Beneficiaries =============

class BeneficiaryAllocation(BaseModel):
    """توزيع حصة مستفيد واحد"""
    beneficiary_id: int
    beneficiary_name: str
    allocated_amount: Decimal
    decision_type: Optional[str] = None  # CASH or CAPITAL or None if not decided yet
    partner_id: Optional[int] = None
    decided: bool = False


class ProfitDistributionWithBeneficiaries(BaseModel):
    """توزيع الأرباح الشامل مع المستفيدين"""
    profit_run_id: int
    run_month: date
    net_profit_usd: Decimal
    company_pct: Decimal
    company_share_usd: Decimal
    partners_total_usd: Decimal
    reserve_amount_usd: Decimal

    # Beneficiary allocations
    beneficiary_allocations: list[BeneficiaryAllocation]

    class Config:
        from_attributes = True
