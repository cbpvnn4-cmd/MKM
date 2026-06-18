from sqlalchemy import Column, String, BigInteger, Numeric, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from .base import BaseModel

class Product(BaseModel):
    __tablename__ = "products"

    sku = Column(String(50), unique=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100))
    uom = Column(String(20), default="unit")  # unit of measure
    price_usd = Column(Numeric(18, 2), nullable=False, default=0)
    cost_price = Column(Numeric(18, 2), default=0)  # سعر التكلفة
    stock = Column(Numeric(18, 3), default=0)  # المخزون الحالي
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    auto_created_from_po = Column(Boolean, default=False, nullable=False)  # يدل أن المنتج أُنشئ تلقائياً مع أمر شراء

    # Relationships
    # sales_order_items = relationship("SalesOrderItem", back_populates="product")
    # purchase_order_items = relationship("PurchaseOrderItem", back_populates="product")
    stock_moves = relationship("StockMovement", back_populates="product")
    # invoice_items = relationship("InvoiceItem", back_populates="product")
    # bom_components = relationship("ElevatorBOM", back_populates="product")

    # Alias for frontend compatibility
    @hybrid_property
    def price(self):
        """Alias for price_usd for frontend compatibility"""
        return self.price_usd
