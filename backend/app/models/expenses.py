from sqlalchemy import Column, String, BigInteger, ForeignKey, Date, Numeric, Text, Boolean, CheckConstraint
from sqlalchemy.orm import relationship
from .base import BaseModel

class ExpenseCategory(BaseModel):
    __tablename__ = "expense_categories"

    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    expenses = relationship("Expense", back_populates="category")

class Expense(BaseModel):
    __tablename__ = "expenses"

    category_id = Column(BigInteger, ForeignKey("expense_categories.id"), nullable=False)
    description = Column(String(500), nullable=False)
    amount_usd = Column(Numeric(18, 2), nullable=False)
    expense_date = Column(Date, nullable=False)
    receipt_no = Column(String(100))
    vendor_name = Column(String(200))
    notes = Column(Text)

    # Relationships
    category = relationship("ExpenseCategory", back_populates="expenses")

    # Check constraint for amount
    __table_args__ = (
        CheckConstraint("amount_usd > 0", name="check_expense_amount_positive"),
    )