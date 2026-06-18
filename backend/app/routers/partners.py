from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.database import get_db
from app.models.partners import (
    Partner as PartnerModel,
    PartnerCapitalMovement as PartnerCapitalMovementModel,
    OwnershipSnapshot as OwnershipSnapshotModel,
    PartnerAccountLedger as PartnerAccountLedgerModel,
    PartnerProfitPayout as PartnerProfitPayoutModel
)
from app.models.profit_distribution import ProfitDistributionLine
from app.schemas.partner import (
    Partner,
    PartnerCreate,
    PartnerUpdate,
    PartnerCapitalMovement,
    PartnerCapitalMovementCreate,
    OwnershipSnapshot,
    OwnershipSnapshotCreate,
    PartnerCapitalSummary,
    PartnerAccountLedger,
    PartnerProfitPayout,
    PartnerProfitPayoutCreate,
    PartnerFinancialSummary,
    PartnerAccountStatement,
    PartnerStatementTransaction
)
from app.services.financial import calculate_partner_capital_summary
from sqlalchemy import func, desc
from typing import Optional, cast
from decimal import Decimal
from datetime import date as date_type

router = APIRouter()

# Capital summary endpoint
@router.get("/capital-summary", response_model=PartnerCapitalSummary)
def get_capital_summary(db: Session = Depends(get_db)):
    summary = calculate_partner_capital_summary(db)
    return {key: float(value) for key, value in summary.items()}

# Partner endpoints
# Support both '/api/partners' and '/api/partners/' to avoid 307 redirects through proxies
@router.get("", response_model=List[Partner])
@router.get("/", response_model=List[Partner])
def read_partners(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    partners = db.query(PartnerModel).offset(skip).limit(limit).all()
    return partners


@router.post("", response_model=Partner)
@router.post("/", response_model=Partner)
def create_partner(partner: PartnerCreate, db: Session = Depends(get_db)):
    data = partner.dict()
    if 'active' in data:
        data['is_active'] = data.pop('active')
    db_partner = PartnerModel(**data)
    db.add(db_partner)
    db.commit()
    db.refresh(db_partner)
    return db_partner


@router.get("/{partner_id}", response_model=Partner)
def read_partner(partner_id: int, db: Session = Depends(get_db)):
    partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner


@router.put("/{partner_id}", response_model=Partner)
def update_partner(partner_id: int, partner: PartnerUpdate, db: Session = Depends(get_db)):
    db_partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if db_partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    data = partner.dict()
    if 'active' in data:
        data['is_active'] = data.pop('active')
    for key, value in data.items():
        setattr(db_partner, key, value)
    
    db.commit()
    db.refresh(db_partner)
    return db_partner


@router.delete("/{partner_id}", response_model=Partner)
def delete_partner(partner_id: int, db: Session = Depends(get_db)):
    db_partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if db_partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    db.delete(db_partner)
    db.commit()
    return db_partner


# Partner capital movement endpoints
@router.post("/{partner_id}/capital-movements", response_model=PartnerCapitalMovement)
def create_capital_movement(partner_id: int, movement: PartnerCapitalMovementCreate, db: Session = Depends(get_db)):
    # Verify partner exists
    partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Create capital movement
    movement_data = movement.dict()
    movement_data['partner_id'] = partner_id
    db_movement = PartnerCapitalMovementModel(**movement_data)
    db.add(db_movement)
    db.commit()
    db.refresh(db_movement)
    return db_movement


@router.get("/{partner_id}/capital-movements", response_model=List[PartnerCapitalMovement])
def read_capital_movements(partner_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Verify partner exists
    partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    movements = db.query(PartnerCapitalMovementModel).filter(
        PartnerCapitalMovementModel.partner_id == partner_id
    ).offset(skip).limit(limit).all()
    
    return movements


# Ownership snapshot endpoints
@router.post("/{partner_id}/ownership-snapshots", response_model=OwnershipSnapshot)
def create_ownership_snapshot(partner_id: int, snapshot: OwnershipSnapshotCreate, db: Session = Depends(get_db)):
    # Verify partner exists
    partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Create ownership snapshot
    snapshot_data = snapshot.dict()
    snapshot_data['partner_id'] = partner_id

    # If a snapshot already exists for this partner/date, update it instead of inserting duplicates
    existing_snapshot = db.query(OwnershipSnapshotModel).filter(
        OwnershipSnapshotModel.partner_id == partner_id,
        OwnershipSnapshotModel.snapshot_on == snapshot_data['snapshot_on']
    ).order_by(desc(OwnershipSnapshotModel.created_at)).first()

    if existing_snapshot:
        existing_snapshot.equity_usd = snapshot_data['equity_usd']
        existing_snapshot.equity_pct = snapshot_data['equity_pct']
        db.commit()
        db.refresh(existing_snapshot)
        return existing_snapshot

    db_snapshot = OwnershipSnapshotModel(**snapshot_data)
    db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    return db_snapshot


@router.get("/{partner_id}/ownership-snapshots", response_model=List[OwnershipSnapshot])
def read_ownership_snapshots(partner_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Verify partner exists
    partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")

    snapshots_query = db.query(OwnershipSnapshotModel).filter(
        OwnershipSnapshotModel.partner_id == partner_id
    ).order_by(
        desc(OwnershipSnapshotModel.snapshot_on),
        desc(OwnershipSnapshotModel.created_at),
        desc(OwnershipSnapshotModel.id)
    )

    snapshots = snapshots_query.offset(skip).limit(limit).all()

    return snapshots


# NEW: Partner Financial Summary endpoint
@router.get("/{partner_id}/financial-summary", response_model=PartnerFinancialSummary)
def get_partner_financial_summary(partner_id: int, db: Session = Depends(get_db)):
    """
    Get comprehensive financial summary for a partner including:
    - Capital deposits and withdrawals
    - Profit distributions and payouts
    - Current ownership percentage
    - Overall balance
    """
    # Verify partner exists
    partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Calculate capital movements
    capital_deposits = db.query(func.sum(PartnerCapitalMovementModel.amount_usd)).filter(
        PartnerCapitalMovementModel.partner_id == partner_id,
        PartnerCapitalMovementModel.movement_type == 'DEPOSIT'
    ).scalar() or 0

    capital_withdrawals = db.query(func.sum(PartnerCapitalMovementModel.amount_usd)).filter(
        PartnerCapitalMovementModel.partner_id == partner_id,
        PartnerCapitalMovementModel.movement_type == 'WITHDRAW'
    ).scalar() or 0

    net_capital = float(capital_deposits - capital_withdrawals)

    # Calculate profit distributions (all time allocated)
    total_profit_distributions = db.query(func.sum(ProfitDistributionLine.amount_usd)).filter(
        ProfitDistributionLine.partner_id == partner_id
    ).scalar() or 0

    # Calculate profit payouts (all time paid)
    total_profit_payouts = db.query(func.sum(PartnerProfitPayoutModel.payout_amount)).filter(
        PartnerProfitPayoutModel.partner_id == partner_id
    ).scalar() or 0

    outstanding_profits = float(total_profit_distributions - total_profit_payouts)

    # Get current ownership
    latest_ownership = db.query(OwnershipSnapshotModel).filter(
        OwnershipSnapshotModel.partner_id == partner_id
    ).order_by(desc(OwnershipSnapshotModel.snapshot_on)).first()

    current_ownership_pct = (
        float(cast(Decimal, latest_ownership.equity_pct))
        if latest_ownership and latest_ownership.equity_pct is not None
        else None
    )
    current_equity_value = (
        float(cast(Decimal, latest_ownership.equity_usd))
        if latest_ownership and latest_ownership.equity_usd is not None
        else None
    )

    # Total balance
    total_balance = net_capital + outstanding_profits

    return PartnerFinancialSummary(
        partner_id=partner_id,
        partner_name=str(partner.name),
        total_capital_deposits=float(capital_deposits),
        total_capital_withdrawals=float(capital_withdrawals),
        net_capital=net_capital,
        total_profit_distributions=float(total_profit_distributions),
        total_profit_payouts=float(total_profit_payouts),
        outstanding_profits=outstanding_profits,
        current_ownership_percentage=current_ownership_pct,
        current_equity_value=current_equity_value,
        total_balance=total_balance
    )


# NEW: Partner Profit Payout endpoints
@router.post("/{partner_id}/profit-payouts", response_model=PartnerProfitPayout)
def create_profit_payout(partner_id: int, payout: PartnerProfitPayoutCreate, db: Session = Depends(get_db)):
    """Create a new profit payout for a partner"""
    # Verify partner exists
    partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Create payout
    payout_data = payout.dict()
    payout_data['partner_id'] = partner_id
    db_payout = PartnerProfitPayoutModel(**payout_data)
    db.add(db_payout)
    db.commit()
    db.refresh(db_payout)

    return db_payout


@router.get("/{partner_id}/profit-payouts", response_model=List[PartnerProfitPayout])
def read_profit_payouts(partner_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all profit payouts for a partner"""
    # Verify partner exists
    partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")

    payouts = db.query(PartnerProfitPayoutModel).filter(
        PartnerProfitPayoutModel.partner_id == partner_id
    ).order_by(desc(PartnerProfitPayoutModel.payout_date)).offset(skip).limit(limit).all()

    return payouts


# NEW: Partner Account Ledger endpoint
@router.get("/{partner_id}/account-ledger", response_model=List[PartnerAccountLedger])
def read_account_ledger(partner_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get account ledger (all transactions) for a partner"""
    # Verify partner exists
    partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")

    ledger = db.query(PartnerAccountLedgerModel).filter(
        PartnerAccountLedgerModel.partner_id == partner_id
    ).order_by(desc(PartnerAccountLedgerModel.transaction_date), desc(PartnerAccountLedgerModel.id)).offset(skip).limit(limit).all()

    return ledger


# NEW: Partner Account Statement endpoint
@router.get("/{partner_id}/account-statement", response_model=PartnerAccountStatement)
def get_partner_account_statement(
    partner_id: int,
    from_date: Optional[date_type] = None,
    to_date: Optional[date_type] = None,
    transaction_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get comprehensive account statement for a partner with filtering options.
    
    - **from_date**: Start date for filtering transactions (optional)
    - **to_date**: End date for filtering transactions (optional)
    - **transaction_type**: Filter by transaction type (optional)
    """
    # Verify partner exists
    partner = db.query(PartnerModel).filter(PartnerModel.id == partner_id).first()
    if partner is None:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Build query for transactions
    query = db.query(PartnerAccountLedgerModel).filter(
        PartnerAccountLedgerModel.partner_id == partner_id
    )

    # Apply date filters
    if from_date:
        query = query.filter(PartnerAccountLedgerModel.transaction_date >= from_date)
    if to_date:
        query = query.filter(PartnerAccountLedgerModel.transaction_date <= to_date)
    
    # Apply transaction type filter
    if transaction_type:
        query = query.filter(PartnerAccountLedgerModel.transaction_type == transaction_type)

    # Get all matching transactions ordered by date
    ledger_entries = query.order_by(
        PartnerAccountLedgerModel.transaction_date,
        PartnerAccountLedgerModel.id
    ).all()

    # Calculate opening balance (if from_date is specified, get balance before that date)
    opening_balance = 0
    if from_date:
        earlier_entries = (
            db.query(PartnerAccountLedgerModel)
            .filter(
                PartnerAccountLedgerModel.partner_id == partner_id,
                PartnerAccountLedgerModel.transaction_date < from_date,
            )
            .order_by(
                desc(PartnerAccountLedgerModel.transaction_date),
                desc(PartnerAccountLedgerModel.id),
            )
            .first()
        )

        if earlier_entries:
            earlier_balance = cast(Optional[Decimal], earlier_entries.running_balance)
            opening_balance = float(earlier_balance or 0)

    # Calculate summary totals
    total_deposits = 0
    total_withdrawals = 0
    total_profits_distributed = 0
    total_profits_paid = 0
    
    for entry in ledger_entries:
        credit_amount = cast(Optional[Decimal], entry.credit_amount)
        debit_amount = cast(Optional[Decimal], entry.debit_amount)
        transaction_type = cast(Optional[str], entry.transaction_type)

        if transaction_type == 'CAPITAL_DEPOSIT':
            total_deposits += float(credit_amount or 0)
        elif transaction_type == 'CAPITAL_WITHDRAW':
            total_withdrawals += float(debit_amount or 0)
        elif transaction_type == 'PROFIT_DISTRIBUTION':
            total_profits_distributed += float(credit_amount or 0)
        elif transaction_type == 'PROFIT_PAYOUT':
            total_profits_paid += float(debit_amount or 0)

    # Calculate closing balance
    closing_balance = opening_balance
    if ledger_entries:
        last_entry = ledger_entries[-1]
        last_running_balance = cast(Optional[Decimal], last_entry.running_balance)
        closing_balance = float(last_running_balance or 0)
    
    # Convert ledger entries to statement transactions
    transactions = []
    running_bal = opening_balance
    
    for entry in ledger_entries:
        entry_credit_amount = cast(Optional[Decimal], entry.credit_amount)
        entry_debit_amount = cast(Optional[Decimal], entry.debit_amount)
        entry_reference_id = cast(Optional[int], entry.reference_id)
        entry_reference_type = cast(Optional[str], entry.reference_type)
        entry_transaction_date = cast(date_type, entry.transaction_date)

        # Determine description based on transaction type
        description_map = {
            'CAPITAL_DEPOSIT': 'إيداع رأس مال',
            'CAPITAL_WITHDRAW': 'سحب رأس مال',
            'PROFIT_DISTRIBUTION': 'توزيع أرباح',
            'PROFIT_PAYOUT': 'دفع أرباح',
            'ADJUSTMENT': 'تسوية',
            'TRANSFER_IN': 'تحويل وارد',
            'TRANSFER_OUT': 'تحويل صادر'
        }
        
        entry_transaction_type = cast(Optional[str], entry.transaction_type) or ''
        entry_description = cast(Optional[str], entry.description)
        description = entry_description or description_map.get(entry_transaction_type, entry_transaction_type)
        
        # Calculate running balance for this transaction
        entry_running_balance = cast(Optional[Decimal], entry.running_balance)
        running_bal = float(entry_running_balance or 0)
        
        transactions.append(PartnerStatementTransaction(
            transaction_date=entry_transaction_date,
            transaction_type=entry_transaction_type,
            description=description,
            currency='USD',
            debit_amount=float(entry_debit_amount or 0),
            credit_amount=float(entry_credit_amount or 0),
            running_balance=running_bal,
            reference_id=entry_reference_id,
            reference_type=entry_reference_type
        ))

    # Build and return statement
    return PartnerAccountStatement(
        partner_id=partner_id,
        partner_name=str(partner.name),
        partner_code=cast(Optional[str], partner.national_id),
        from_date=from_date,
        to_date=to_date,
        opening_balance=opening_balance,
        total_deposits=total_deposits,
        total_withdrawals=total_withdrawals,
        total_profits_distributed=total_profits_distributed,
        total_profits_paid=total_profits_paid,
        closing_balance=closing_balance,
        transactions=transactions
    )
