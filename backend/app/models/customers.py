from sqlalchemy import Column, String, BigInteger, ForeignKey, Date, Text, CheckConstraint
from sqlalchemy.orm import relationship
from .base import BaseModel

class Customer(BaseModel):
    __tablename__ = "customers"

    name = Column(String(100), nullable=False)
    phone = Column(String(20))
    email = Column(String(100))
    tax_no = Column(String(50))
    address = Column(Text)

    # Relationships
    sales_orders = relationship("SalesOrder", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")
    quotations = relationship("Quotation", back_populates="customer")
    contracts = relationship("Contract", back_populates="customer")