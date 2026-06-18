from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract
from ..models.profit_distribution import ProfitRun, ProfitDistributionLine, ProfitAlert, ProfitConfig
from ..models.partners import Partner, OwnershipSnapshot, PartnerCapitalMovement
from ..models.sales import Invoice, Payment
from ..models.expenses import Expense
from ..database.database import get_db

class AdvancedProfitEngine:
    """
    محرك حساب الأرباح المتقدم
    يدعم التوزيع الزمني الموزون وحساب الاحتياطي والتنبيهات
    """

    def __init__(self, db: Session):
        self.db = db

    def calculate_monthly_profit(
        self,
        target_month: date,
        config: Optional[ProfitConfig] = None
    ) -> Dict:
        """
        حساب صافي الربح الشهري
        """
        if not config:
            config = self._get_or_create_config()

        # حساب بداية ونهاية الشهر
        start_date = target_month.replace(day=1)
        if target_month.month == 12:
            end_date = target_month.replace(year=target_month.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_date = target_month.replace(month=target_month.month + 1, day=1) - timedelta(days=1)

        # حساب الإيرادات من الفواتير المدفوعة
        revenue = self._calculate_monthly_revenue(start_date, end_date)

        # حساب المصروفات
        expenses = self._calculate_monthly_expenses(start_date, end_date)

        # صافي الربح
        net_profit = revenue - expenses

        return {
            "target_month": target_month,
            "start_date": start_date,
            "end_date": end_date,
            "revenue": revenue,
            "expenses": expenses,
            "net_profit": net_profit,
            "config": config
        }

    def run_profit_distribution(
        self,
        target_month: date,
        method: str = "TWCap",
        config: Optional[ProfitConfig] = None
    ) -> ProfitRun:
        """
        تنفيذ توزيع الأرباح للشهر المحدد
        """
        # حساب الربح الشهري
        profit_data = self.calculate_monthly_profit(target_month, config)
        net_profit = profit_data["net_profit"]

        if not config:
            config = profit_data["config"]

        # إذا كان هناك خسارة، لا نوزع
        if net_profit <= 0:
            return self._create_loss_run(target_month, net_profit, config, method)

        # حساب الاحتياطي
        reserve_amount = net_profit * (config.reserve_rate / 100)
        distributable_profit = net_profit - reserve_amount

        # حصة الشركة (30%)
        company_share = distributable_profit * (config.company_pct / 100)

        # المبلغ المتبقي للشركاء (70%)
        partners_total = distributable_profit - company_share

        # حساب الأوزان الزمنية للشركاء
        if method == "TWCap" and config.use_time_weight:
            weights = self._calculate_time_weighted_ownership(target_month)
        else:
            weights = self._calculate_instant_ownership(target_month)

        # توزيع المبلغ على الشركاء
        distribution_lines = self._distribute_amount(partners_total, weights)

        # إنشاء سجل التوزيع
        profit_run = ProfitRun(
            run_month=target_month,
            net_profit_usd=net_profit,
            company_pct=config.company_pct,
            reserve_rate=config.reserve_rate,
            mamar_share_usd=company_share,
            partners_total_usd=partners_total,
            reserve_amount_usd=reserve_amount,
            calculation_method=method,
            config_id=config.id
        )

        self.db.add(profit_run)
        self.db.flush()  # للحصول على ID

        # إضافة خطوط التوزيع
        for line_data in distribution_lines:
            line = ProfitDistributionLine(
                run_id=profit_run.id,
                partner_id=line_data["partner_id"],
                weight_used=line_data["weight"],
                amount_usd=line_data["amount"]
            )
            self.db.add(line)

        # إنشاء التنبيهات إذا لزم الأمر
        alerts = self._generate_alerts(profit_run, weights)
        for alert in alerts:
            alert.run_id = profit_run.id
            self.db.add(alert)

        # حساب وتخزين حصص المستفيدين من حصة الشركة (30%)
        self._calculate_beneficiary_allocations(profit_run, company_share)

        self.db.commit()
        return profit_run

    def _calculate_monthly_revenue(self, start_date: date, end_date: date) -> Decimal:
        """حساب الإيرادات الشهرية"""
        # حساب إجمالي المدفوعات في الشهر المحدد
        total_payments = self.db.query(func.sum(Payment.amount_usd)).filter(
            and_(
                Payment.paid_on >= start_date,
                Payment.paid_on <= end_date
            )
        ).scalar() or Decimal('0')

        return total_payments

    def _calculate_monthly_expenses(self, start_date: date, end_date: date) -> Decimal:
        """حساب المصروفات الشهرية"""
        total_expenses = self.db.query(func.sum(Expense.amount_usd)).filter(
            and_(
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date
            )
        ).scalar() or Decimal('0')

        return total_expenses

    def _calculate_time_weighted_ownership(self, target_month: date) -> Dict[int, Decimal]:
        """
        حساب الملكية الموزونة زمنياً للشهر المحدد
        """
        start_date = target_month.replace(day=1)
        if target_month.month == 12:
            end_date = target_month.replace(year=target_month.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_date = target_month.replace(month=target_month.month + 1, day=1) - timedelta(days=1)

        # الحصول على جميع الشركاء النشطين
        active_partners = self.db.query(Partner).filter(Partner.is_active == True).all()

        weights = {}
        total_days = (end_date - start_date).days + 1

        for partner in active_partners:
            # حساب الوزن الزمني لكل شريك
            daily_weights = []

            current_date = start_date
            while current_date <= end_date:
                # العثور على آخر snapshot قبل أو في هذا التاريخ
                snapshot = self.db.query(OwnershipSnapshot).filter(
                    and_(
                        OwnershipSnapshot.partner_id == partner.id,
                        OwnershipSnapshot.snapshot_on <= current_date
                    )
                ).order_by(OwnershipSnapshot.snapshot_on.desc()).first()

                if snapshot:
                    daily_weights.append(snapshot.equity_pct)
                else:
                    daily_weights.append(Decimal('0'))

                current_date += timedelta(days=1)

            # حساب المتوسط الموزون
            avg_weight = sum(daily_weights) / len(daily_weights) if daily_weights else Decimal('0')
            weights[partner.id] = avg_weight

        return weights

    def _calculate_instant_ownership(self, target_date: date) -> Dict[int, Decimal]:
        """حساب الملكية اللحظية في تاريخ محدد"""
        # العثور على آخر snapshot لكل شريك
        subquery = self.db.query(
            OwnershipSnapshot.partner_id,
            func.max(OwnershipSnapshot.snapshot_on).label('max_date')
        ).filter(
            OwnershipSnapshot.snapshot_on <= target_date
        ).group_by(OwnershipSnapshot.partner_id).subquery()

        snapshots = self.db.query(OwnershipSnapshot).join(
            subquery,
            and_(
                OwnershipSnapshot.partner_id == subquery.c.partner_id,
                OwnershipSnapshot.snapshot_on == subquery.c.max_date
            )
        ).all()

        weights = {}
        for snapshot in snapshots:
            weights[snapshot.partner_id] = snapshot.equity_pct

        return weights

    def _distribute_amount(
        self,
        total_amount: Decimal,
        weights: Dict[int, Decimal]
    ) -> List[Dict]:
        """توزيع المبلغ على الشركاء بدقة السنتات"""
        if not weights or total_amount <= 0:
            return []

        total_weight = sum(weights.values())
        if total_weight == 0:
            return []

        distribution_lines = []
        cents_total = int(total_amount * 100)  # تحويل إلى سنتات
        cents_distributed = 0

        partners_list = list(weights.items())

        for i, (partner_id, weight) in enumerate(partners_list):
            if i == len(partners_list) - 1:  # الشريك الأخير يحصل على الباقي
                partner_cents = cents_total - cents_distributed
            else:
                partner_cents = int((cents_total * weight / total_weight).quantize(Decimal('1'), rounding=ROUND_HALF_UP))

            partner_amount = Decimal(partner_cents) / 100
            cents_distributed += partner_cents

            if partner_amount > 0:
                distribution_lines.append({
                    "partner_id": partner_id,
                    "weight": weight / total_weight,
                    "amount": partner_amount
                })

        return distribution_lines

    def _generate_alerts(self, profit_run: ProfitRun, weights: Dict[int, Decimal]) -> List[ProfitAlert]:
        """إنشاء التنبيهات للتوزيع"""
        alerts = []

        # تنبيهات للشركاء الجدد أو المغادرين
        # تنبيهات للتغييرات الكبيرة في النسب
        # تنبيهات للانحرافات غير العادية

        # مثال: تنبيه إذا كان هناك تغيير كبير في نسب الملكية
        for partner_id, current_weight in weights.items():
            # مقارنة مع الشهر السابق
            previous_month = profit_run.run_month.replace(day=1) - timedelta(days=1)
            previous_weights = self._calculate_instant_ownership(previous_month)

            if partner_id in previous_weights:
                change = abs(current_weight - previous_weights[partner_id])
                if change > Decimal('5.0'):  # تغيير أكبر من 5%
                    alerts.append(ProfitAlert(
                        partner_id=partner_id,
                        level="WARN",
                        message=f"تغيير كبير في نسبة الملكية: {change:.2f}%"
                    ))

        return alerts

    def _create_loss_run(
        self,
        target_month: date,
        net_loss: Decimal,
        config: ProfitConfig,
        method: str
    ) -> ProfitRun:
        """إنشاء سجل للخسارة (بدون توزيع)"""
        profit_run = ProfitRun(
            run_month=target_month,
            net_profit_usd=net_loss,
            company_pct=config.company_pct,
            reserve_rate=config.reserve_rate,
            mamar_share_usd=Decimal('0'),
            partners_total_usd=Decimal('0'),
            reserve_amount_usd=Decimal('0'),
            calculation_method=method,
            config_id=config.id
        )

        # إضافة وتشغيل flush للحصول على المعرّف قبل إنشاء التنبيه
        self.db.add(profit_run)
        self.db.flush()  # الآن أصبح profit_run.id متاحاً

        # تنبيه للخسارة، اربط بالكائن مباشرة لضمان ضبط run_id
        alert = ProfitAlert(
            level="CRITICAL",
            message=f"خسارة صافية للشهر: {abs(net_loss):.2f} USD",
            profit_run=profit_run
        )
        self.db.add(alert)

        self.db.commit()
        return profit_run

    def _get_or_create_config(self) -> ProfitConfig:
        """الحصول على أو إنشاء إعدادات الأرباح الافتراضية"""
        config = self.db.query(ProfitConfig).first()
        if not config:
            config = ProfitConfig(
                company_pct=Decimal('30.00'),
                reserve_rate=Decimal('0.00'),
                use_time_weight=True,
                unusual_lookback=6
            )
            self.db.add(config)
            self.db.commit()

        return config

    def get_profit_summary(self, start_month: date, end_month: date) -> Dict:
        """الحصول على ملخص الأرباح لفترة محددة"""
        profit_runs = self.db.query(ProfitRun).filter(
            and_(
                ProfitRun.run_month >= start_month,
                ProfitRun.run_month <= end_month
            )
        ).order_by(ProfitRun.run_month).all()

        total_profit = sum(run.net_profit_usd for run in profit_runs)
        total_company_share = sum(run.mamar_share_usd for run in profit_runs)
        total_partners_share = sum(run.partners_total_usd for run in profit_runs)
        total_reserve = sum(run.reserve_amount_usd for run in profit_runs)

        return {
            "period": f"{start_month} to {end_month}",
            "total_runs": len(profit_runs),
            "total_profit": float(total_profit),
            "total_company_share": float(total_company_share),
            "total_partners_share": float(total_partners_share),
            "total_reserve": float(total_reserve),
            "runs": [
                {
                    "id": run.id,
                    "run_month": run.run_month.isoformat(),
                    "net_profit_usd": float(run.net_profit_usd),
                    "mamar_share_usd": float(run.mamar_share_usd),
                    "partners_total_usd": float(run.partners_total_usd),
                    "reserve_amount_usd": float(run.reserve_amount_usd),
                    "calculation_method": run.calculation_method,
                    "created_at": run.created_at.isoformat() if run.created_at else None
                }
                for run in profit_runs
            ]
        }

    def _calculate_beneficiary_allocations(self, profit_run: ProfitRun, company_share: Decimal) -> None:
        """
        حساب حصص المستفيدين من حصة الشركة وتخزينها
        يتم استدعاء هذه الدالة تلقائياً عند تنفيذ توزيع الأرباح

        ملاحظة: لا يتم اتخاذ قرار (CASH/CAPITAL) تلقائياً - يجب على المستخدم اتخاذ القرار لاحقاً
        """
        from ..models.profit_distribution import CompanyShareBeneficiary

        # الحصول على جميع المستفيدين النشطين
        beneficiaries = self.db.query(CompanyShareBeneficiary).filter(
            CompanyShareBeneficiary.is_active == True
        ).all()

        if not beneficiaries:
            # لا يوجد مستفيدون نشطون
            return

        # حساب إجمالي النسب المئوية للمستفيدين
        total_beneficiary_pct = sum(b.percentage for b in beneficiaries)

        if total_beneficiary_pct == 0:
            return

        # توزيع حصة الشركة على المستفيدين بناءً على نسبهم
        for beneficiary in beneficiaries:
            # حساب حصة هذا المستفيد من حصة الشركة
            beneficiary_allocation = (company_share * beneficiary.percentage) / total_beneficiary_pct

            # تخزين الحصة (بدون قرار - سيتم اتخاذ القرار لاحقاً من قبل المستخدم)
            # ملاحظة: لا نقوم بإنشاء سجل decision هنا، فقط نحسب المبلغ
            # سيتم إنشاء القرارات من خلال الواجهة أو API

            # يمكن إضافة تنبيه للمستخدم بأن هناك حصص بحاجة لاتخاذ قرار
            alert = ProfitAlert(
                run_id=profit_run.id,
                level="INFO",
                message=f"حصة {beneficiary.name}: ${beneficiary_allocation:.2f} ({beneficiary.percentage}%) - بانتظار اتخاذ القرار"
            )
            self.db.add(alert)
