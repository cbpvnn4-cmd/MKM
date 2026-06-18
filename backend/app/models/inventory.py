from sqlalchemy import Column, Integer, String, DateTime, Date, Numeric, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String)
    capacity = Column(Numeric(precision=18, scale=2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"))
    movement_type = Column(String, CheckConstraint("movement_type IN ('IN','OUT','ADJUST')"))
    quantity = Column(Numeric(precision=18, scale=3), nullable=False)
    unit_cost = Column(Numeric(precision=18, scale=2))
    reference_no = Column(String)
    movement_date = Column(Date, nullable=False)
    notes = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    product = relationship("Product")
    warehouse = relationship("Warehouse")

    # Check constraint for quantity
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="check_stock_movement_quantity_non_negative"),
    )