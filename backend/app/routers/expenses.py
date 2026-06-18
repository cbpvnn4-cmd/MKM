from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.database.database import get_db
from app.models.expenses import Expense as ExpenseModel
from app.schemas.expense import Expense, ExpenseCreate, ExpenseUpdate
from app.services.financial import calculate_partner_capital_summary

router = APIRouter()

# Expense endpoints
@router.get("/", response_model=List[Expense])
def read_expenses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    expenses = db.query(ExpenseModel).offset(skip).limit(limit).all()
    return expenses


@router.post("/", response_model=Expense)
def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db)):
    amount_decimal = Decimal(str(expense.amount_usd))
    summary = calculate_partner_capital_summary(db)
    if amount_decimal > summary["available_capital"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "INSUFFICIENT_CAPITAL",
                "message": (
                    "المبلغ المطلوب لهذا المصروف يتجاوز رأس المال المتاح. "
                    f"المتاح حالياً: ${float(summary['available_capital']):,.2f}"
                ),
                "available_capital": float(summary["available_capital"]),
                "required_amount": float(amount_decimal),
                "net_capital": float(summary["net_capital"])
            }
        )

    db_expense = ExpenseModel(**expense.dict())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.get("/{expense_id}", response_model=Expense)
def read_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(ExpenseModel).filter(ExpenseModel.id == expense_id).first()
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.put("/{expense_id}", response_model=Expense)
def update_expense(expense_id: int, expense: ExpenseUpdate, db: Session = Depends(get_db)):
    db_expense = db.query(ExpenseModel).filter(ExpenseModel.id == expense_id).first()
    if db_expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")

    amount_decimal = Decimal(str(expense.amount_usd))
    summary = calculate_partner_capital_summary(db, exclude_expense_id=expense_id)
    if amount_decimal > summary["available_capital"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "INSUFFICIENT_CAPITAL",
                "message": (
                    "المبلغ المطلوب لهذا المصروف يتجاوز رأس المال المتاح. "
                    f"المتاح حالياً: ${float(summary['available_capital']):,.2f}"
                ),
                "available_capital": float(summary["available_capital"]),
                "required_amount": float(amount_decimal),
                "net_capital": float(summary["net_capital"])
            }
        )
    
    for key, value in expense.dict().items():
        setattr(db_expense, key, value)
    
    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.delete("/{expense_id}", response_model=Expense)
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    db_expense = db.query(ExpenseModel).filter(ExpenseModel.id == expense_id).first()
    if db_expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    db.delete(db_expense)
    db.commit()
    return db_expense
