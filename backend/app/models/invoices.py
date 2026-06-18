from sqlalchemy import Column, String, BigInteger, ForeignKey, Date, Numeric, Text, CheckConstraint
from sqlalchemy.orm import relationship
from .base import BaseModel

class InvoiceItem(BaseModel):
    __tablename__ = "invoice_items"

    invoice_id = Column(BigInteger, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(BigInteger, ForeignKey("products.id"), nullable=True)
    description = Column(String(500), nullable=False)  # For custom line items
    qty = Column(Numeric(18, 3), nullable=False, default=1)
    unit_price_usd = Column(Numeric(18, 2), nullable=False)
    line_total_usd = Column(Numeric(18, 2), nullable=False)

    # Relationships
    # invoice = relationship("Invoice", back_populates="items")
    # product = relationship("Product", back_populates="invoice_items")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.qty and self.unit_price_usd:
            self.line_total_usd = self.qty * self.unit_price_usd