from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.database.database import get_db
from app.models.elevator_bom import ElevatorBOM as ElevatorBOMModel
from app.models.elevator_bom import ElevatorSalePricing as ElevatorSalePricingModel
from app.models.products import Product as ProductModel
from app.schemas.elevator_bom import (
    ElevatorBOM,
    ElevatorBOMCreate,
    ElevatorBOMUpdate,
    ElevatorPricingCalculation,
    ElevatorPricingResult,
    ElevatorSalePricing,
    ElevatorSalePricingCreate
)

router = APIRouter()


# BOM endpoints
@router.get("/elevator-bom", response_model=List[ElevatorBOM])
def get_all_bom(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all elevator BOM records"""
    bom_items = db.query(ElevatorBOMModel).offset(skip).limit(limit).all()
    return bom_items


@router.get("/elevator-bom/product/{product_id}", response_model=List[ElevatorBOM])
def get_bom_by_product(product_id: int, db: Session = Depends(get_db)):
    """Get BOM for a specific elevator product"""
    # Check if product exists
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    bom_items = db.query(ElevatorBOMModel).filter(
        ElevatorBOMModel.product_id == product_id
    ).all()

    return bom_items


@router.post("/elevator-bom", response_model=ElevatorBOM)
def create_bom(bom: ElevatorBOMCreate, db: Session = Depends(get_db)):
    """Create new BOM entry"""
    # Check if product exists
    product = db.query(ProductModel).filter(ProductModel.id == bom.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Calculate total price
    total_price = bom.quantity * bom.unit_price

    db_bom = ElevatorBOMModel(
        **bom.dict(),
        total_price=total_price
    )

    db.add(db_bom)
    db.commit()
    db.refresh(db_bom)

    return db_bom


@router.put("/elevator-bom/{bom_id}", response_model=ElevatorBOM)
def update_bom(bom_id: int, bom: ElevatorBOMUpdate, db: Session = Depends(get_db)):
    """Update BOM entry"""
    db_bom = db.query(ElevatorBOMModel).filter(ElevatorBOMModel.id == bom_id).first()
    if not db_bom:
        raise HTTPException(status_code=404, detail="BOM entry not found")

    # Update fields
    update_data = bom.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_bom, key, value)

    # Recalculate total price if quantity or unit_price changed
    if 'quantity' in update_data or 'unit_price' in update_data:
        db_bom.total_price = db_bom.quantity * db_bom.unit_price

    db.commit()
    db.refresh(db_bom)

    return db_bom


@router.delete("/elevator-bom/{bom_id}")
def delete_bom(bom_id: int, db: Session = Depends(get_db)):
    """Delete BOM entry"""
    db_bom = db.query(ElevatorBOMModel).filter(ElevatorBOMModel.id == bom_id).first()
    if not db_bom:
        raise HTTPException(status_code=404, detail="BOM entry not found")

    db.delete(db_bom)
    db.commit()

    return {"message": "BOM entry deleted successfully"}


# Pricing calculator
@router.post("/elevator-pricing/calculate", response_model=ElevatorPricingResult)
def calculate_elevator_pricing(calc: ElevatorPricingCalculation, db: Session = Depends(get_db)):
    """
    Calculate elevator pricing dynamically based on components
    """
    # Get product details
    product = db.query(ProductModel).filter(ProductModel.id == calc.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Get BOM if exists for default values
    bom_items = db.query(ElevatorBOMModel).filter(
        ElevatorBOMModel.product_id == calc.product_id
    ).all()

    # Use BOM data or provided specs
    height_meters = calc.height_meters or Decimal(0)
    section_count = calc.section_count or 0
    rope_count = calc.rope_count or 0
    cable_count = calc.cable_count or 0
    door_count = calc.door_count or 0

    # If BOM exists, extract defaults
    if bom_items:
        for item in bom_items:
            if item.component_type == 'height' and calc.height_meters is None:
                height_meters = item.quantity
            elif item.component_type == 'section' and calc.section_count is None:
                section_count = int(item.quantity)
            elif item.component_type == 'rope' and calc.rope_count is None:
                rope_count = int(item.quantity)
            elif item.component_type == 'cable' and calc.cable_count is None:
                cable_count = int(item.quantity)
            elif item.component_type == 'door' and calc.door_count is None:
                door_count = int(item.quantity)

    # Calculate component prices
    height_price = height_meters * calc.height_unit_price
    section_price = Decimal(section_count) * calc.section_unit_price
    rope_price = Decimal(rope_count) * calc.rope_unit_price
    cable_price = Decimal(cable_count) * calc.cable_unit_price
    motor_price = calc.motor_unit_price
    door_price = Decimal(door_count) * calc.door_unit_price

    # Subtotal
    subtotal = (
        height_price +
        section_price +
        rope_price +
        cable_price +
        motor_price +
        door_price +
        calc.installation_cost +
        calc.maintenance_cost
    )

    # Calculate profit
    profit_amount = subtotal * (calc.profit_percentage / Decimal(100))
    final_price = subtotal + profit_amount

    # Create breakdown for display
    breakdown = {
        "height": {
            "quantity": float(height_meters),
            "unit_price": float(calc.height_unit_price),
            "total": float(height_price)
        },
        "sections": {
            "quantity": section_count,
            "unit_price": float(calc.section_unit_price),
            "total": float(section_price)
        },
        "ropes": {
            "quantity": rope_count,
            "unit_price": float(calc.rope_unit_price),
            "total": float(rope_price)
        },
        "cables": {
            "quantity": cable_count,
            "unit_price": float(calc.cable_unit_price),
            "total": float(cable_price)
        },
        "motor": {
            "quantity": 1,
            "unit_price": float(calc.motor_unit_price),
            "total": float(motor_price)
        },
        "doors": {
            "quantity": door_count,
            "unit_price": float(calc.door_unit_price),
            "total": float(door_price)
        },
        "installation": float(calc.installation_cost),
        "maintenance": float(calc.maintenance_cost),
        "subtotal": float(subtotal),
        "profit_percentage": float(calc.profit_percentage),
        "profit_amount": float(profit_amount),
        "final_price": float(final_price)
    }

    return ElevatorPricingResult(
        pricing_method=calc.pricing_method,
        base_price=product.price_usd,
        height_price=height_price,
        section_price=section_price,
        rope_price=rope_price,
        cable_price=cable_price,
        motor_price=motor_price,
        door_price=door_price,
        installation_cost=calc.installation_cost,
        maintenance_cost=calc.maintenance_cost,
        subtotal=subtotal,
        profit_percentage=calc.profit_percentage,
        profit_amount=profit_amount,
        final_price=final_price,
        breakdown=breakdown
    )


# Sale pricing endpoints
@router.post("/elevator-pricing/save", response_model=ElevatorSalePricing)
def save_elevator_sale_pricing(pricing: ElevatorSalePricingCreate, db: Session = Depends(get_db)):
    """Save elevator sale pricing details"""
    # Calculate profit amount
    subtotal = (
        pricing.height_price +
        pricing.section_price +
        pricing.rope_price +
        pricing.cable_price +
        pricing.motor_price +
        pricing.door_price +
        pricing.installation_cost +
        pricing.maintenance_cost
    )
    profit_amount = subtotal * (pricing.profit_percentage / Decimal(100))

    db_pricing = ElevatorSalePricingModel(
        **pricing.dict(),
        profit_amount=profit_amount
    )

    db.add(db_pricing)
    db.commit()
    db.refresh(db_pricing)

    return db_pricing


@router.get("/elevator-pricing/sales-order/{sales_order_id}", response_model=List[ElevatorSalePricing])
def get_elevator_pricing_by_sales_order(sales_order_id: int, db: Session = Depends(get_db)):
    """Get pricing details for a sales order"""
    pricing_records = db.query(ElevatorSalePricingModel).filter(
        ElevatorSalePricingModel.sales_order_id == sales_order_id
    ).all()

    return pricing_records