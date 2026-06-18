from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base


class ElevatorBOM(Base):
    """
    Bill of Materials for Elevators
    Stores detailed breakdown of elevator components with individual pricing
    """
    __tablename__ = "elevator_bom"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)  # The main elevator product

    # Component details
    component_type = Column(String(50), nullable=False)  # section, rabat, cable, motor, door, etc.
    component_name = Column(String(200))
    quantity = Column(Numeric(18, 3), nullable=False, default=1)
    unit_price = Column(Numeric(18, 2), nullable=False, default=0)
    total_price = Column(Numeric(18, 2))  # quantity * unit_price

    # Additional info
    warehouse_section = Column(String(100))  # Which section of warehouse it's stored
    notes = Column(String(500))

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    product = relationship("Product")


class ElevatorSalePricing(Base):
    """
    Stores custom pricing calculations for elevator sales
    Tracks how each sale was priced (full price vs component-based)
    """
    __tablename__ = "elevator_sale_pricing"

    id = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    # Pricing method
    pricing_method = Column(String(20), nullable=False)  # 'full', 'custom', 'components'

    # Base prices
    base_price = Column(Numeric(18, 2))

    # Component pricing details (JSON or individual columns)
    height_price = Column(Numeric(18, 2), default=0)
    section_price = Column(Numeric(18, 2), default=0)
    rope_price = Column(Numeric(18, 2), default=0)  # يمثل سعر الرباط (rope)
    cable_price = Column(Numeric(18, 2), default=0)
    motor_price = Column(Numeric(18, 2), default=0)
    door_price = Column(Numeric(18, 2), default=0)

    # Additional costs
    installation_cost = Column(Numeric(18, 2), default=0)
    maintenance_cost = Column(Numeric(18, 2), default=0)

    # Profit
    profit_percentage = Column(Numeric(5, 2), default=20)
    profit_amount = Column(Numeric(18, 2))

    # Final price
    final_price = Column(Numeric(18, 2), nullable=False)

    notes = Column(String(500))

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    sales_order = relationship("SalesOrder")
    product = relationship("Product")
