from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class ElevatorBOMBase(BaseModel):
    product_id: int
    component_type: str = Field(..., description="Type: section, rope, cable, motor, door, etc.")
    component_name: Optional[str] = None
    quantity: Decimal = Field(default=1, ge=0)
    unit_price: Decimal = Field(default=0, ge=0)
    warehouse_section: Optional[str] = None
    notes: Optional[str] = None


class ElevatorBOMCreate(ElevatorBOMBase):
    pass


class ElevatorBOMUpdate(BaseModel):
    component_type: Optional[str] = None
    component_name: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    warehouse_section: Optional[str] = None
    notes: Optional[str] = None


class ElevatorBOM(ElevatorBOMBase):
    id: int
    total_price: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ElevatorSalePricingBase(BaseModel):
    sales_order_id: int
    product_id: int
    pricing_method: str = Field(..., description="full, custom, or components")
    base_price: Optional[Decimal] = None
    height_price: Decimal = Field(default=0)
    section_price: Decimal = Field(default=0)
    rope_price: Decimal = Field(default=0)
    cable_price: Decimal = Field(default=0)
    motor_price: Decimal = Field(default=0)
    door_price: Decimal = Field(default=0)
    installation_cost: Decimal = Field(default=0)
    maintenance_cost: Decimal = Field(default=0)
    profit_percentage: Decimal = Field(default=20, ge=0, le=100)
    final_price: Decimal
    notes: Optional[str] = None


class ElevatorSalePricingCreate(ElevatorSalePricingBase):
    pass


class ElevatorSalePricing(ElevatorSalePricingBase):
    id: int
    profit_amount: Optional[Decimal] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ElevatorPricingCalculation(BaseModel):
    """Model for calculating elevator pricing dynamically"""
    product_id: int
    pricing_method: str = "custom"  # full, custom, components

    # Elevator specifications
    height_meters: Optional[Decimal] = None
    section_count: Optional[int] = None
    rope_count: Optional[int] = None
    cable_count: Optional[int] = None
    door_count: Optional[int] = None

    # Unit prices (can be customized per sale)
    height_unit_price: Decimal = Field(default=150)  # per meter
    section_unit_price: Decimal = Field(default=250)
    rope_unit_price: Decimal = Field(default=60)
    cable_unit_price: Decimal = Field(default=40)
    motor_unit_price: Decimal = Field(default=3000)
    door_unit_price: Decimal = Field(default=150)

    # Additional costs
    installation_cost: Decimal = Field(default=2500)
    maintenance_cost: Decimal = Field(default=500)

    # Profit
    profit_percentage: Decimal = Field(default=20, ge=0, le=100)


class ElevatorPricingResult(BaseModel):
    """Result of pricing calculation"""
    pricing_method: str
    base_price: Decimal

    # Component breakdown
    height_price: Decimal
    section_price: Decimal
    rope_price: Decimal
    cable_price: Decimal
    motor_price: Decimal
    door_price: Decimal

    # Additional costs
    installation_cost: Decimal
    maintenance_cost: Decimal

    # Subtotal
    subtotal: Decimal

    # Profit
    profit_percentage: Decimal
    profit_amount: Decimal

    # Final
    final_price: Decimal

    # Details for display
    breakdown: dict