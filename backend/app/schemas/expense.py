from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal


class ExpenseBase(BaseModel):
    date: date
    category: str
    description: Optional[str] = None
    amount: Decimal
    currency: Optional[str] = "USD"
    project_id: Optional[int] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(ExpenseBase):
    pass


class ExpenseInDBBase(ExpenseBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Expense(ExpenseInDBBase):
    pass