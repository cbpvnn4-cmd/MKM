"""
Script to populate partner_account_ledger from existing capital movements and profit data.
This ensures the account statement feature has data to display.
"""
import sys
from datetime import datetime
from decimal import Decimal
from typing import cast
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

# Add the app directory to the path
sys.path.insert(0, '.')

from app.models.partners import (
    Partner,
    PartnerCapitalMovement,
    PartnerAccountLedger,
    PartnerProfitPayout
)
from app.models.profit_distribution import ProfitDistributionLine
from app.database.database import get_db, SessionLocal

def populate_ledger():
    """Populate partner_account_ledger from capital movements and profit distributions"""
    db = SessionLocal()
    
    try:
        print("🔄 Starting ledger population from existing data...")
        
        # Get all partners
        partners = db.query(Partner).all()
        print(f"📊 Found {len(partners)} partners")
        
        for partner in partners:
            print(f"\n👤 Processing partner: {partner.name} (ID: {partner.id})")
            
            # Clear existing ledger entries for this partner
            db.query(PartnerAccountLedger).filter(
                PartnerAccountLedger.partner_id == partner.id
            ).delete()
            
            # Collect all transactions for this partner
            transactions = []
            
            # 1. Capital Movements
            movements = db.query(PartnerCapitalMovement).filter(
                PartnerCapitalMovement.partner_id == partner.id
            ).order_by(PartnerCapitalMovement.happened_at).all()
            
            print(f"  💰 Found {len(movements)} capital movements")
            
            for movement in movements:
                movement_type = cast(str, movement.movement_type)
                if movement_type == 'DEPOSIT':
                    transactions.append({
                        'date': movement.happened_at,
                        'type': 'CAPITAL_DEPOSIT',
                        'debit': Decimal('0'),
                        'credit': movement.amount_usd,
                        'description': movement.note or 'إيداع رأس مال',
                        'reference_id': movement.id,
                        'reference_type': 'capital_movement'
                    })
                else:  # WITHDRAW
                    transactions.append({
                        'date': movement.happened_at,
                        'type': 'CAPITAL_WITHDRAW',
                        'debit': movement.amount_usd,
                        'credit': Decimal('0'),
                        'description': movement.note or 'سحب رأس مال',
                        'reference_id': movement.id,
                        'reference_type': 'capital_movement'
                    })
            
            # 2. Profit Distributions
            distributions = db.query(ProfitDistributionLine).filter(
                ProfitDistributionLine.partner_id == partner.id
            ).all()
            
            print(f"  📈 Found {len(distributions)} profit distributions")
            
            for dist in distributions:
                # Get the distribution run to get the date
                if dist.profit_run:
                    transactions.append({
                        'date': dist.profit_run.run_month if dist.profit_run.run_month else datetime.now().date(),
                        'type': 'PROFIT_DISTRIBUTION',
                        'debit': Decimal('0'),
                        'credit': dist.amount_usd,
                        'description': f'توزيع أرباح - {dist.profit_run.run_month}',
                        'reference_id': dist.id,
                        'reference_type': 'profit_distribution'
                    })
            
            # 3. Profit Payouts
            payouts = db.query(PartnerProfitPayout).filter(
                PartnerProfitPayout.partner_id == partner.id
            ).order_by(PartnerProfitPayout.payout_date).all()
            
            print(f"  💸 Found {len(payouts)} profit payouts")
            
            for payout in payouts:
                transactions.append({
                    'date': payout.payout_date,
                    'type': 'PROFIT_PAYOUT',
                    'debit': payout.payout_amount,
                    'credit': Decimal('0'),
                    'description': payout.notes or f'دفع أرباح - {payout.payment_method}',
                    'reference_id': payout.id,
                    'reference_type': 'profit_payout'
                })
            
            # Sort all transactions by date
            transactions.sort(key=lambda x: x['date'])
            
            print(f"  📝 Total transactions to insert: {len(transactions)}")
            
            # Create ledger entries with running balance
            running_balance = Decimal('0')
            
            for trans in transactions:
                # Calculate running balance (Credit increases, Debit decreases)
                running_balance = running_balance + trans['credit'] - trans['debit']
                
                ledger_entry = PartnerAccountLedger(
                    partner_id=partner.id,
                    transaction_date=trans['date'],
                    transaction_type=trans['type'],
                    debit_amount=trans['debit'],
                    credit_amount=trans['credit'],
                    running_balance=running_balance,
                    reference_id=trans.get('reference_id'),
                    reference_type=trans.get('reference_type'),
                    description=trans['description']
                )
                
                db.add(ledger_entry)
            
            print(f"  ✅ Partner {partner.name}: Created {len(transactions)} ledger entries, final balance: ${running_balance}")
        
        # Commit all changes
        db.commit()
        print("\n✅ Ledger population completed successfully!")
        
        # Show summary
        total_ledger_entries = db.query(func.count(PartnerAccountLedger.id)).scalar()
        print(f"\n📊 Summary:")
        print(f"  Total partners processed: {len(partners)}")
        print(f"  Total ledger entries created: {total_ledger_entries}")
        
    except Exception as e:
        print(f"\n❌ Error during ledger population: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == '__main__':
    populate_ledger()
