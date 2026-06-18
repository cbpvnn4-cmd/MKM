from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import Optional, List
from ..database.database import get_db
from ..services.profit_engine import AdvancedProfitEngine
from ..models.profit_distribution import ProfitRun, ProfitConfig, ProfitDistributionLine, ProfitAlert
from ..models.users import User
from ..routers.auth import get_current_active_user
from ..core.permissions import (
    PERMISSIONS, has_permission, filter_data_by_permissions,
    require_permission, require_any_permission
)
from pydantic import BaseModel
from decimal import Decimal

router = APIRouter()

# Pydantic models for request/response
class ProfitRunRequest(BaseModel):
    target_month: date
    method: str = "TWCap"  # TWCap or Instant

class ProfitConfigUpdate(BaseModel):
    company_pct: Optional[Decimal] = None
    reserve_rate: Optional[Decimal] = None
    use_time_weight: Optional[bool] = None
    unusual_lookback: Optional[int] = None

class ProfitSimulation(BaseModel):
    target_month: date
    net_profit: Decimal
    method: str = "TWCap"


class ProfitRunUpdate(BaseModel):
    method: Optional[str] = None
    company_pct: Optional[Decimal] = None
    reserve_rate: Optional[Decimal] = None
    use_time_weight: Optional[bool] = None
    reason: str


class ProfitRunDelete(BaseModel):
    reason: str

@router.post("/run", response_model=dict)
async def run_profit_distribution(
    request: ProfitRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    تنفيذ توزيع الأرباح للشهر المحدد
    يتطلب صلاحيات إدارة توزيع الأرباح
    """
    if not has_permission(current_user, PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, db):
        raise HTTPException(
            status_code=403,
            detail="ليس لديك صلاحية لتنفيذ توزيع الأرباح"
        )

    # التحقق من عدم وجود توزيع سابق لنفس الشهر
    existing_run = db.query(ProfitRun).filter(
        ProfitRun.run_month == request.target_month
    ).first()

    if existing_run:
        raise HTTPException(
            status_code=400,
            detail=f"يوجد توزيع أرباح مسبق للشهر {request.target_month}"
        )

    engine = AdvancedProfitEngine(db)

    try:
        profit_run = engine.run_profit_distribution(
            target_month=request.target_month,
            method=request.method
        )

        return {
            "success": True,
            "run_id": profit_run.id,
            "month": profit_run.run_month,
            "net_profit": profit_run.net_profit_usd,
            "company_share": profit_run.mamar_share_usd,
            "partners_total": profit_run.partners_total_usd,
            "reserve_amount": profit_run.reserve_amount_usd,
            "method": profit_run.calculation_method
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في تنفيذ توزيع الأرباح: {str(e)}")

@router.get("/distribution/{month}")
async def get_profit_distribution(
    month: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    الحصول على توزيع الأرباح للشهر المحدد
    """
    if not has_permission(current_user, PERMISSIONS.VIEW_PROFIT_DISTRIBUTION, db):
        raise HTTPException(
            status_code=403,
            detail="ليس لديك صلاحية لعرض توزيع الأرباح"
        )

    profit_run = db.query(ProfitRun).filter(ProfitRun.run_month == month).first()

    if not profit_run:
        raise HTTPException(status_code=404, detail="لم يتم العثور على توزيع أرباح لهذا الشهر")

    # تطبيق فلترة البيانات حسب الصلاحيات
    filters = filter_data_by_permissions(current_user, "profit_distribution", db)

    # إذا كان المستخدم لا يملك صلاحية الإدارة، اعرض حصته فقط
    if not has_permission(current_user, PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, db):
        # البحث عن الشريك المرتبط بالمستخدم
        from ..models.partners import Partner
        partner = db.query(Partner).filter(Partner.user_id == current_user.id).first()
        if partner:
            partner_lines = [line for line in profit_run.distribution_lines
                            if line.partner_id == partner.id]
            return {
                "month": profit_run.run_month,
                "net_profit": profit_run.net_profit_usd,
                "your_share": sum(line.amount_usd for line in partner_lines),
                "weight_used": sum(line.weight_used for line in partner_lines)
            }
        else:
            raise HTTPException(
                status_code=403,
                detail="ليس لديك صلاحية لعرض هذه البيانات"
            )

    return {
        "run_id": profit_run.id,
        "month": profit_run.run_month,
        "net_profit": profit_run.net_profit_usd,
        "company_share": profit_run.mamar_share_usd,
        "partners_total": profit_run.partners_total_usd,
        "reserve_amount": profit_run.reserve_amount_usd,
        "method": profit_run.calculation_method,
        "company_pct": float(profit_run.company_pct or 0),
        "reserve_rate": float(profit_run.reserve_rate or 0),
        "use_time_weight": profit_run.config.use_time_weight if profit_run.config else True,
        "distribution_lines": [
            {
                "partner_id": line.partner_id,
                "partner_name": line.partner.name,
                "weight_used": line.weight_used,
                "amount_usd": line.amount_usd
            }
            for line in profit_run.distribution_lines
        ],
        "alerts": [
            {
                "level": alert.level,
                "message": alert.message,
                "partner_name": alert.partner.name if alert.partner else None
            }
            for alert in profit_run.alerts
        ]
    }

@router.post("/simulate")
async def simulate_profit_distribution(
    simulation: ProfitSimulation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    محاكاة توزيع الأرباح بدون حفظ في قاعدة البيانات
    """
    if not has_permission(current_user, PERMISSIONS.VIEW_PROFIT_DISTRIBUTION, db):
        raise HTTPException(
            status_code=403,
            detail="ليس لديك صلاحية لمحاكاة توزيع الأرباح"
        )

    engine = AdvancedProfitEngine(db)

    # حساب الأوزان
    if simulation.method == "TWCap":
        weights = engine._calculate_time_weighted_ownership(simulation.target_month)
    else:
        weights = engine._calculate_instant_ownership(simulation.target_month)

    # الحصول على الإعدادات الحالية
    config = engine._get_or_create_config()

    if simulation.net_profit <= 0:
        return {
            "scenario": "loss",
            "net_profit": simulation.net_profit,
            "message": "لا يوجد توزيع في حالة الخسارة"
        }

    # حساب التوزيع
    reserve_amount = simulation.net_profit * (config.reserve_rate / 100)
    distributable_profit = simulation.net_profit - reserve_amount
    company_share = distributable_profit * (config.company_pct / 100)
    partners_total = distributable_profit - company_share

    # توزيع المبلغ
    distribution_lines = engine._distribute_amount(partners_total, weights)

    return {
        "scenario": "profit",
        "net_profit": simulation.net_profit,
        "reserve_amount": reserve_amount,
        "company_share": company_share,
        "partners_total": partners_total,
        "method": simulation.method,
        "distribution": [
            {
                "partner_id": line["partner_id"],
                "weight": line["weight"],
                "amount": line["amount"]
            }
            for line in distribution_lines
        ]
    }

@router.get("/config")
async def get_profit_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """الحصول على إعدادات توزيع الأرباح"""
    if not has_permission(current_user, PERMISSIONS.VIEW_PROFIT_DISTRIBUTION, db):
        raise HTTPException(
            status_code=403,
            detail="ليس لديك صلاحية لعرض إعدادات الأرباح"
        )

    engine = AdvancedProfitEngine(db)
    config = engine._get_or_create_config()

    return {
        "company_pct": config.company_pct,
        "reserve_rate": config.reserve_rate,
        "use_time_weight": config.use_time_weight,
        "unusual_lookback": config.unusual_lookback
    }

@router.put("/config")
async def update_profit_config(
    updates: ProfitConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """تحديث إعدادات توزيع الأرباح"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_SETTINGS, db):
        raise HTTPException(
            status_code=403,
            detail="ليس لديك صلاحية لتحديث إعدادات الأرباح"
        )

    engine = AdvancedProfitEngine(db)
    config = engine._get_or_create_config()

    if updates.company_pct is not None:
        config.company_pct = updates.company_pct
    if updates.reserve_rate is not None:
        config.reserve_rate = updates.reserve_rate
    if updates.use_time_weight is not None:
        config.use_time_weight = updates.use_time_weight
    if updates.unusual_lookback is not None:
        config.unusual_lookback = updates.unusual_lookback

    db.commit()

    return {"success": True, "message": "تم تحديث الإعدادات بنجاح"}

@router.get("/summary")
async def get_profit_summary(
    start_month: date = Query(..., description="شهر البداية"),
    end_month: date = Query(..., description="شهر النهاية"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """الحصول على ملخص الأرباح لفترة محددة"""
    if not has_permission(current_user, PERMISSIONS.VIEW_REPORTS, db):
        raise HTTPException(
            status_code=403,
            detail="ليس لديك صلاحية لعرض تقارير الأرباح"
        )

    engine = AdvancedProfitEngine(db)
    summary = engine.get_profit_summary(start_month, end_month)

    return summary

@router.get("/history")
async def get_profit_history(
    limit: int = Query(12, description="عدد الأشهر"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """الحصول على تاريخ توزيعات الأرباح"""
    if not has_permission(current_user, PERMISSIONS.VIEW_PROFIT_DISTRIBUTION, db):
        raise HTTPException(
            status_code=403,
            detail="ليس لديك صلاحية لعرض تاريخ الأرباح"
        )

    profit_runs = db.query(ProfitRun).order_by(
        ProfitRun.run_month.desc()
    ).limit(limit).all()

    # إذا كان المستخدم لا يملك صلاحية الإدارة، اعرض حصته فقط
    if not has_permission(current_user, PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, db):
        from ..models.partners import Partner
        partner = db.query(Partner).filter(Partner.user_id == current_user.id).first()
        if partner:
            result = []
            for run in profit_runs:
                partner_lines = [line for line in run.distribution_lines
                               if line.partner_id == partner.id]
                result.append({
                    "month": run.run_month,
                    "net_profit": run.net_profit_usd,
                    "your_share": sum(line.amount_usd for line in partner_lines)
                })
            return result
        else:
            return []  # لا توجد بيانات للمستخدم

    return [
        {
            "run_id": run.id,
            "month": run.run_month,
            "net_profit": run.net_profit_usd,
            "company_share": run.mamar_share_usd,
            "partners_total": run.partners_total_usd,
            "method": run.calculation_method,
            "company_pct": float(run.company_pct or 0),
            "reserve_rate": float(run.reserve_rate or 0)
        }
        for run in profit_runs
    ]


def _validate_reason(reason: str, min_length: int = 10):
    if not reason or len(reason.strip()) < min_length:
        raise HTTPException(
            status_code=400,
            detail=f"يجب توضيح سبب لا يقل عن {min_length} أحرف قبل تنفيذ هذا الإجراء"
        )


@router.put("/distribution/{run_id}")
async def update_profit_distribution(
    run_id: int,
    updates: ProfitRunUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not has_permission(current_user, PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لتعديل توزيعات الأرباح")

    _validate_reason(updates.reason)

    profit_run = db.query(ProfitRun).filter(ProfitRun.id == run_id).first()
    if not profit_run:
        raise HTTPException(status_code=404, detail="لم يتم العثور على توزيع الأرباح المطلوب")

    engine = AdvancedProfitEngine(db)
    profit_data = engine.calculate_monthly_profit(profit_run.run_month)
    net_profit = profit_data["net_profit"]

    method = updates.method or profit_run.calculation_method
    method = method if method in ("TWCap", "Instant") else profit_run.calculation_method

    if net_profit <= 0:
        # في حالة الخسارة، نكتفي بتحديث الحقول الأساسية وحفظ تنبيه
        profit_run.net_profit_usd = net_profit
        profit_run.mamar_share_usd = Decimal('0')
        profit_run.partners_total_usd = Decimal('0')
        profit_run.reserve_amount_usd = Decimal('0')
        profit_run.calculation_method = method
        db.query(ProfitDistributionLine).filter(ProfitDistributionLine.run_id == profit_run.id).delete()
        db.query(ProfitAlert).filter(ProfitAlert.run_id == profit_run.id).delete()
        db.add(ProfitAlert(
            profit_run=profit_run,
            level="CRITICAL",
            message=f"تم تحديث توزيع الخسارة يدوياً: {updates.reason}"
        ))
        db.commit()
        db.refresh(profit_run)
        return {
            "run_id": profit_run.id,
            "net_profit": float(profit_run.net_profit_usd or 0),
            "company_share": float(profit_run.mamar_share_usd or 0),
            "partners_total": float(profit_run.partners_total_usd or 0),
            "reserve_amount": float(profit_run.reserve_amount_usd or 0),
            "method": profit_run.calculation_method
        }

    company_pct = updates.company_pct if updates.company_pct is not None else profit_run.company_pct
    reserve_rate = updates.reserve_rate if updates.reserve_rate is not None else profit_run.reserve_rate
    use_time_weight = updates.use_time_weight if updates.use_time_weight is not None else engine._get_or_create_config().use_time_weight

    company_pct_value = Decimal(str(company_pct))
    reserve_rate_value = Decimal(str(reserve_rate))

    if company_pct_value < 0 or company_pct_value > 100:
        raise HTTPException(status_code=400, detail="نسبة الشركة يجب أن تكون بين 0 و 100")
    if reserve_rate_value < 0 or reserve_rate_value > 100:
        raise HTTPException(status_code=400, detail="نسبة الاحتياطي يجب أن تكون بين 0 و 100")

    reserve_amount = (net_profit * reserve_rate_value) / Decimal('100')
    distributable_profit = net_profit - reserve_amount
    company_share = (distributable_profit * company_pct_value) / Decimal('100')
    partners_total = distributable_profit - company_share

    if method == "TWCap" and use_time_weight:
        weights = engine._calculate_time_weighted_ownership(profit_run.run_month)
    else:
        weights = engine._calculate_instant_ownership(profit_run.run_month)

    distribution_lines = engine._distribute_amount(partners_total, weights)

    # إزالة الخطوط والتنبيهات السابقة
    db.query(ProfitDistributionLine).filter(ProfitDistributionLine.run_id == profit_run.id).delete()
    db.query(ProfitAlert).filter(ProfitAlert.run_id == profit_run.id).delete()

    profit_run.net_profit_usd = net_profit
    profit_run.company_pct = company_pct_value
    profit_run.reserve_rate = reserve_rate_value
    profit_run.reserve_amount_usd = reserve_amount
    profit_run.mamar_share_usd = company_share
    profit_run.partners_total_usd = partners_total
    profit_run.calculation_method = method

    for line in distribution_lines:
        db.add(ProfitDistributionLine(
            run_id=profit_run.id,
            partner_id=line["partner_id"],
            weight_used=line["weight"],
            amount_usd=line["amount"]
        ))

    db.flush()
    alerts = engine._generate_alerts(profit_run, weights)
    for alert in alerts:
        alert.profit_run = profit_run
        db.add(alert)

    db.add(ProfitAlert(
        profit_run=profit_run,
        level="WARN",
        message=f"تم تعديل التوزيع يدوياً: {updates.reason}"
    ))

    db.commit()
    db.refresh(profit_run)

    return {
        "run_id": profit_run.id,
        "net_profit": float(profit_run.net_profit_usd or 0),
        "company_share": float(profit_run.mamar_share_usd or 0),
        "partners_total": float(profit_run.partners_total_usd or 0),
        "reserve_amount": float(profit_run.reserve_amount_usd or 0),
        "method": profit_run.calculation_method
    }


@router.delete("/distribution/{run_id}")
async def delete_profit_distribution(
    run_id: int,
    payload: ProfitRunDelete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not has_permission(current_user, PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لحذف توزيعات الأرباح")

    _validate_reason(payload.reason, min_length=15)

    profit_run = db.query(ProfitRun).filter(ProfitRun.id == run_id).first()
    if not profit_run:
        raise HTTPException(status_code=404, detail="لم يتم العثور على توزيع الأرباح المطلوب")

    month = profit_run.run_month
    db.delete(profit_run)
    db.commit()

    return {
        "success": True,
        "message": f"تم حذف توزيع أرباح شهر {month} بنجاح",
        "deleted_month": month
    }


# ============= Company Share Beneficiaries Endpoints =============

from ..models.profit_distribution import (
    CompanyShareBeneficiary as CompanyShareBeneficiaryModel,
    BeneficiaryDistributionDecision as BeneficiaryDistributionDecisionModel
)
from ..schemas.profit_distribution import (
    CompanyShareBeneficiary,
    CompanyShareBeneficiaryCreate,
    CompanyShareBeneficiaryUpdate,
    BeneficiaryDistributionDecision as BeneficiaryDistributionDecisionSchema,
    BeneficiaryDistributionDecisionCreate,
    BeneficiaryDistributionDecisionUpdate
)


@router.get("/beneficiaries", response_model=List[CompanyShareBeneficiary])
async def get_beneficiaries(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """الحصول على قائمة مستفيدي حصة الشركة"""
    if not has_permission(current_user, PERMISSIONS.VIEW_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لعرض المستفيدين")

    query = db.query(CompanyShareBeneficiaryModel)
    if active_only:
        query = query.filter(CompanyShareBeneficiaryModel.is_active == True)

    beneficiaries = query.offset(skip).limit(limit).all()
    return beneficiaries


@router.get("/beneficiaries/{beneficiary_id}", response_model=CompanyShareBeneficiary)
async def get_beneficiary(
    beneficiary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """الحصول على مستفيد محدد"""
    if not has_permission(current_user, PERMISSIONS.VIEW_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لعرض المستفيدين")

    beneficiary = db.query(CompanyShareBeneficiaryModel).filter(
        CompanyShareBeneficiaryModel.id == beneficiary_id
    ).first()

    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")

    return beneficiary


@router.post("/beneficiaries", response_model=CompanyShareBeneficiary)
async def create_beneficiary(
    beneficiary: CompanyShareBeneficiaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """إنشاء مستفيد جديد"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لإنشاء مستفيدين")

    db_beneficiary = CompanyShareBeneficiaryModel(**beneficiary.dict())
    db.add(db_beneficiary)
    db.commit()
    db.refresh(db_beneficiary)
    return db_beneficiary


@router.put("/beneficiaries/{beneficiary_id}", response_model=CompanyShareBeneficiary)
async def update_beneficiary(
    beneficiary_id: int,
    beneficiary: CompanyShareBeneficiaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """تحديث بيانات مستفيد"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لتحديث المستفيدين")

    db_beneficiary = db.query(CompanyShareBeneficiaryModel).filter(
        CompanyShareBeneficiaryModel.id == beneficiary_id
    ).first()

    if not db_beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")

    update_data = beneficiary.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_beneficiary, key, value)

    db.commit()
    db.refresh(db_beneficiary)
    return db_beneficiary


@router.delete("/beneficiaries/{beneficiary_id}")
async def delete_beneficiary(
    beneficiary_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """حذف مستفيد"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لحذف المستفيدين")

    db_beneficiary = db.query(CompanyShareBeneficiaryModel).filter(
        CompanyShareBeneficiaryModel.id == beneficiary_id
    ).first()

    if not db_beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")

    db.delete(db_beneficiary)
    db.commit()
    return {"message": "Beneficiary deleted successfully"}


# ============= Beneficiary Distribution Decisions Endpoints =============

@router.get("/decisions", response_model=List[BeneficiaryDistributionDecisionSchema])
async def get_decisions(
    profit_run_id: int = None,
    beneficiary_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """الحصول على قرارات توزيع المستفيدين"""
    if not has_permission(current_user, PERMISSIONS.VIEW_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لعرض القرارات")

    query = db.query(BeneficiaryDistributionDecisionModel)

    if profit_run_id:
        query = query.filter(BeneficiaryDistributionDecisionModel.profit_run_id == profit_run_id)

    if beneficiary_id:
        query = query.filter(BeneficiaryDistributionDecisionModel.beneficiary_id == beneficiary_id)

    from sqlalchemy import desc as desc_sql
    decisions = query.order_by(desc_sql(BeneficiaryDistributionDecisionModel.decided_at)).offset(skip).limit(limit).all()
    return decisions


@router.get("/decisions/{decision_id}", response_model=BeneficiaryDistributionDecisionSchema)
async def get_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """الحصول على قرار محدد"""
    if not has_permission(current_user, PERMISSIONS.VIEW_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لعرض القرارات")

    decision = db.query(BeneficiaryDistributionDecisionModel).filter(
        BeneficiaryDistributionDecisionModel.id == decision_id
    ).first()

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    return decision


@router.post("/decisions", response_model=BeneficiaryDistributionDecisionSchema)
async def create_decision(
    decision: BeneficiaryDistributionDecisionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    إنشاء قرار توزيع جديد
    - إذا كان نوع القرار CAPITAL، يجب تحديد partner_id
    - إذا كان CASH، partner_id يكون اختياري
    """
    if not has_permission(current_user, PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لإنشاء قرارات التوزيع")

    # Validate profit_run exists
    profit_run = db.query(ProfitRun).filter(ProfitRun.id == decision.profit_run_id).first()
    if not profit_run:
        raise HTTPException(status_code=404, detail="Profit run not found")

    # Validate beneficiary exists
    beneficiary = db.query(CompanyShareBeneficiaryModel).filter(
        CompanyShareBeneficiaryModel.id == decision.beneficiary_id
    ).first()
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")

    # Validate decision_type
    if decision.decision_type not in ['CASH', 'CAPITAL']:
        raise HTTPException(status_code=400, detail="decision_type must be 'CASH' or 'CAPITAL'")

    # If CAPITAL, partner_id must be provided
    if decision.decision_type == 'CAPITAL' and not decision.partner_id:
        raise HTTPException(
            status_code=400,
            detail="partner_id is required when decision_type is 'CAPITAL'"
        )

    # Validate partner exists if provided
    if decision.partner_id:
        from ..models.partners import Partner
        partner = db.query(Partner).filter(Partner.id == decision.partner_id).first()
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")

    # Check for existing decision for this profit_run + beneficiary
    existing_decision = db.query(BeneficiaryDistributionDecisionModel).filter(
        BeneficiaryDistributionDecisionModel.profit_run_id == decision.profit_run_id,
        BeneficiaryDistributionDecisionModel.beneficiary_id == decision.beneficiary_id
    ).first()

    if existing_decision:
        raise HTTPException(
            status_code=400,
            detail=f"Decision already exists for this profit run and beneficiary (ID: {existing_decision.id})"
        )

    # Create decision
    db_decision = BeneficiaryDistributionDecisionModel(**decision.dict())
    db.add(db_decision)
    db.commit()
    db.refresh(db_decision)

    return db_decision


@router.put("/decisions/{decision_id}", response_model=BeneficiaryDistributionDecisionSchema)
async def update_decision(
    decision_id: int,
    decision: BeneficiaryDistributionDecisionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """تحديث قرار توزيع"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لتحديث قرارات التوزيع")

    db_decision = db.query(BeneficiaryDistributionDecisionModel).filter(
        BeneficiaryDistributionDecisionModel.id == decision_id
    ).first()

    if not db_decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    update_data = decision.dict(exclude_unset=True)

    # Validate decision_type if provided
    if 'decision_type' in update_data:
        if update_data['decision_type'] not in ['CASH', 'CAPITAL']:
            raise HTTPException(status_code=400, detail="decision_type must be 'CASH' or 'CAPITAL'")

    # Validate partner if provided
    if 'partner_id' in update_data and update_data['partner_id']:
        from ..models.partners import Partner
        partner = db.query(Partner).filter(Partner.id == update_data['partner_id']).first()
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")

    for key, value in update_data.items():
        setattr(db_decision, key, value)

    db.commit()
    db.refresh(db_decision)
    return db_decision


@router.delete("/decisions/{decision_id}")
async def delete_decision(
    decision_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """حذف قرار توزيع"""
    if not has_permission(current_user, PERMISSIONS.MANAGE_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لحذف قرارات التوزيع")

    db_decision = db.query(BeneficiaryDistributionDecisionModel).filter(
        BeneficiaryDistributionDecisionModel.id == decision_id
    ).first()

    if not db_decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    db.delete(db_decision)
    db.commit()
    return {"message": "Decision deleted successfully"}


@router.get("/profit-run/{run_id}/beneficiary-allocations")
async def get_beneficiary_allocations_for_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    الحصول على حصص المستفيدين المحسوبة لجولة توزيع معينة
    مع معلومات عن القرارات المتخذة إن وُجدت
    """
    if not has_permission(current_user, PERMISSIONS.VIEW_PROFIT_DISTRIBUTION, db):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية لعرض توزيع الأرباح")

    # التحقق من وجود الـ profit run
    profit_run = db.query(ProfitRun).filter(ProfitRun.id == run_id).first()
    if not profit_run:
        raise HTTPException(status_code=404, detail="Profit run not found")

    # الحصول على جميع المستفيدين النشطين
    beneficiaries = db.query(CompanyShareBeneficiaryModel).filter(
        CompanyShareBeneficiaryModel.is_active == True
    ).all()

    # حساب إجمالي النسب المئوية
    total_pct = sum(b.percentage for b in beneficiaries)

    if total_pct == 0:
        return {
            "profit_run_id": run_id,
            "company_share_usd": float(profit_run.mamar_share_usd),
            "beneficiaries": [],
            "message": "لا يوجد مستفيدون نشطون"
        }

    allocations = []
    for beneficiary in beneficiaries:
        # حساب الحصة
        allocated_amount = (profit_run.mamar_share_usd * beneficiary.percentage) / total_pct

        # البحث عن قرار موجود
        decision = db.query(BeneficiaryDistributionDecisionModel).filter(
            BeneficiaryDistributionDecisionModel.profit_run_id == run_id,
            BeneficiaryDistributionDecisionModel.beneficiary_id == beneficiary.id
        ).first()

        allocations.append({
            "beneficiary_id": beneficiary.id,
            "beneficiary_name": beneficiary.name,
            "percentage": float(beneficiary.percentage),
            "allocated_amount": float(allocated_amount),
            "decision": {
                "id": decision.id if decision else None,
                "type": decision.decision_type if decision else None,
                "partner_id": decision.partner_id if decision else None,
                "decided_at": decision.decided_at.isoformat() if decision and decision.decided_at else None,
                "notes": decision.notes if decision else None
            } if decision else None,
            "has_decision": decision is not None
        })

    return {
        "profit_run_id": run_id,
        "run_month": profit_run.run_month.isoformat(),
        "company_share_usd": float(profit_run.mamar_share_usd),
        "total_beneficiary_percentage": float(total_pct),
        "beneficiaries": allocations
    }
