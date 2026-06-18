from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, desc
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from app.database.database import get_db
from app.models.quotations import (
    Quotation as QuotationModel,
    QuotationItem as QuotationItemModel
)
from app.models.customers import Customer as CustomerModel
from app.models.products import Product as ProductModel
from app.schemas.quotation import (
    Quotation,
    QuotationCreate,
    QuotationUpdate,
    QuotationDetail,
    QuotationItem,
    QuotationItemCreate,
    QuotationItemUpdate
)

router = APIRouter()


def build_quotation_detail_response(quotation: QuotationModel) -> QuotationDetail:
    """Map SQLAlchemy quotation instance to QuotationDetail schema."""
    customer = getattr(quotation, "customer", None)
    items = getattr(quotation, "items", [])

    detail = QuotationDetail.model_validate(quotation)
    return detail.model_copy(
        update={
            "items": [QuotationItem.model_validate(item) for item in items],
            "customer_name": getattr(customer, "name", None),
            "customer_email": getattr(customer, "email", None),
            "customer_phone": getattr(customer, "phone", None),
            "customer_address": getattr(customer, "address", None),
        }
    )


def generate_quotation_number(db: Session) -> str:
    """Generate the next quotation number in sequence (QT-001, QT-002, ...)"""
    last_quotation = db.query(QuotationModel).order_by(
        desc(QuotationModel.id)
    ).first()

    if not last_quotation or not last_quotation.quotation_no:
        return "QT-001"

    # Extract number from last quotation_no (e.g., "QT-123" -> 123)
    try:
        last_number = int(last_quotation.quotation_no.split('-')[-1])
        new_number = last_number + 1
        return f"QT-{new_number:03d}"
    except (ValueError, IndexError):
        # If parsing fails, count records and add 1
        count = db.query(func.count(QuotationModel.id)).scalar()
        return f"QT-{(count + 1):03d}"


def calculate_quotation_totals(items: List[QuotationItemModel]) -> dict:
    """Calculate subtotal, tax, and total for quotation"""
    subtotal = Decimal("0")

    for item in items:
        # Calculate item line total
        item_subtotal = item.qty * item.unit_price
        discount = Decimal("0")

        if item.discount_percent and item.discount_percent > 0:
            discount = item_subtotal * (item.discount_percent / Decimal("100"))
        elif item.discount_amount and item.discount_amount > 0:
            discount = item.discount_amount

        line_total = item_subtotal - discount
        subtotal += line_total

    return {
        "subtotal": subtotal,
        "subtotal_before_discount": subtotal
    }


# ==================== Quotation Endpoints ====================

@router.get("/quotations", response_model=List[Quotation])
async def list_quotations(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    order_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all quotations with optional filtering
    - Filter by status: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
    - Filter by customer_id
    - Filter by order_type: items, elevators
    """
    query = db.query(QuotationModel).options(
        joinedload(QuotationModel.customer),
        joinedload(QuotationModel.items)
    )

    if status:
        query = query.filter(QuotationModel.status == status.upper())

    if customer_id:
        query = query.filter(QuotationModel.customer_id == customer_id)

    if order_type:
        query = query.filter(QuotationModel.order_type == order_type)

    query = query.order_by(desc(QuotationModel.created_at))
    quotations = query.offset(skip).limit(limit).all()

    # Add customer name to response
    result = []
    for quot in quotations:
        quot_dict = Quotation.model_validate(quot).model_dump()
        quot_dict['customer_name'] = quot.customer.name if quot.customer else None
        result.append(Quotation(**quot_dict))

    return result


@router.post("/quotations", response_model=QuotationDetail, status_code=status.HTTP_201_CREATED)
async def create_quotation(
    quotation_data: QuotationCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new quotation with items
    - Automatically generates quotation number if not provided
    - Calculates totals based on items
    - Supports both standard items and elevator quotations
    """
    # Validate customer exists
    customer = db.query(CustomerModel).filter(CustomerModel.id == quotation_data.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with id {quotation_data.customer_id} not found"
        )

    # Generate quotation number if not provided
    if not quotation_data.quotation_no:
        quotation_data.quotation_no = generate_quotation_number(db)

    # Check if quotation number already exists
    existing = db.query(QuotationModel).filter(
        QuotationModel.quotation_no == quotation_data.quotation_no
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quotation number {quotation_data.quotation_no} already exists"
        )

    # Create quotation
    quotation = QuotationModel(
        quotation_no=quotation_data.quotation_no,
        customer_id=quotation_data.customer_id,
        quotation_date=quotation_data.quotation_date,
        valid_until=quotation_data.valid_until,
        status=quotation_data.status,
        order_type=quotation_data.order_type,
        contact_person=quotation_data.contact_person,
        contact_email=quotation_data.contact_email,
        contact_phone=quotation_data.contact_phone,
        payment_terms=quotation_data.payment_terms,
        delivery_terms=quotation_data.delivery_terms,
        warranty_terms=quotation_data.warranty_terms,
        discount_percent=quotation_data.discount_percent,
        discount_amount=quotation_data.discount_amount,
        notes=quotation_data.notes,
        terms_and_conditions=quotation_data.terms_and_conditions,
        currency=quotation_data.currency,
        exchange_rate=quotation_data.exchange_rate,
        tax_percent=quotation_data.tax_percent,
        subtotal=Decimal("0"),
        tax_amount=Decimal("0"),
        total=Decimal("0")
    )

    db.add(quotation)
    db.flush()  # Get the quotation ID

    # Create quotation items
    items = []
    for item_data in quotation_data.items:
        # Calculate line total
        item_subtotal = item_data.qty * item_data.unit_price
        discount = Decimal("0")

        if item_data.discount_percent and item_data.discount_percent > 0:
            discount = item_subtotal * (item_data.discount_percent / Decimal("100"))
        elif item_data.discount_amount and item_data.discount_amount > 0:
            discount = item_data.discount_amount

        line_total = item_subtotal - discount

        item = QuotationItemModel(
            quotation_id=quotation.id,
            product_id=item_data.product_id,
            description=item_data.description,
            specifications=item_data.specifications,
            qty=item_data.qty,
            uom=item_data.uom,
            unit_price=item_data.unit_price,
            discount_percent=item_data.discount_percent,
            discount_amount=item_data.discount_amount,
            line_total=line_total,
            # Elevator-specific fields
            sections=item_data.sections,
            ropes=item_data.ropes,
            cable_meters=item_data.cable_meters,
            cabins=item_data.cabins,
            doors=item_data.doors,
            elevator_type=item_data.elevator_type,
            capacity_kg=item_data.capacity_kg,
            capacity_persons=item_data.capacity_persons,
            speed_mps=item_data.speed_mps,
            floors=item_data.floors,
            stops=item_data.stops,
            travel_distance=item_data.travel_distance
        )
        db.add(item)
        items.append(item)

    db.flush()

    # Calculate totals
    totals = calculate_quotation_totals(items)
    subtotal = totals['subtotal']

    # Apply quotation-level discount
    if quotation.discount_percent and quotation.discount_percent > 0:
        subtotal = subtotal * (Decimal("1") - (quotation.discount_percent / Decimal("100")))
    elif quotation.discount_amount and quotation.discount_amount > 0:
        subtotal = subtotal - quotation.discount_amount

    # Calculate tax
    tax_amount = subtotal * (quotation.tax_percent / Decimal("100")) if quotation.tax_percent else Decimal("0")
    total = subtotal + tax_amount

    # Update quotation totals
    quotation.subtotal = subtotal
    quotation.tax_amount = tax_amount
    quotation.total = total

    db.commit()
    db.refresh(quotation)

    # Return detailed quotation
    quotation.customer = customer
    quotation.items = items
    return build_quotation_detail_response(quotation)


@router.get("/quotations/{quotation_id}", response_model=QuotationDetail)
async def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Get detailed quotation by ID with items and customer information"""
    quotation = db.query(QuotationModel).options(
        joinedload(QuotationModel.customer),
        joinedload(QuotationModel.items)
    ).filter(QuotationModel.id == quotation_id).first()

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with id {quotation_id} not found"
        )

    return build_quotation_detail_response(quotation)


@router.put("/quotations/{quotation_id}", response_model=QuotationDetail)
async def update_quotation(
    quotation_id: int,
    quotation_update: QuotationUpdate,
    db: Session = Depends(get_db)
):
    """
    Update quotation
    - Cannot update if status is ACCEPTED or REJECTED
    """
    quotation = db.query(QuotationModel).filter(QuotationModel.id == quotation_id).first()

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with id {quotation_id} not found"
        )

    # Prevent updating accepted or rejected quotations
    if quotation.status in ['ACCEPTED', 'REJECTED']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update quotation with status {quotation.status}"
        )

    # Update fields
    update_data = quotation_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(quotation, field, value)

    quotation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(quotation)

    # Return detailed quotation
    db.refresh(quotation)
    quotation_with_relations = db.query(QuotationModel).options(
        joinedload(QuotationModel.customer),
        joinedload(QuotationModel.items)
    ).filter(QuotationModel.id == quotation_id).first()

    return build_quotation_detail_response(quotation_with_relations)


@router.delete("/quotations/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """
    Delete quotation
    - Can only delete if status is DRAFT
    """
    quotation = db.query(QuotationModel).filter(QuotationModel.id == quotation_id).first()

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with id {quotation_id} not found"
        )

    # Only allow deletion of DRAFT quotations
    if quotation.status != 'DRAFT':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete quotations with DRAFT status"
        )

    db.delete(quotation)
    db.commit()

    return None


# ==================== Quotation Status Change Endpoints ====================

@router.post("/quotations/{quotation_id}/send", response_model=QuotationDetail)
async def send_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """
    Mark quotation as SENT
    - Can only send DRAFT quotations
    """
    quotation = db.query(QuotationModel).filter(QuotationModel.id == quotation_id).first()

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with id {quotation_id} not found"
        )

    if quotation.status != 'DRAFT':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only send quotations with DRAFT status"
        )

    quotation.status = 'SENT'
    quotation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(quotation)

    # Return detailed quotation
    quotation_with_relations = db.query(QuotationModel).options(
        joinedload(QuotationModel.customer),
        joinedload(QuotationModel.items)
    ).filter(QuotationModel.id == quotation_id).first()

    return build_quotation_detail_response(quotation_with_relations)


@router.post("/quotations/{quotation_id}/accept", response_model=QuotationDetail)
async def accept_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """
    Mark quotation as ACCEPTED
    - Can only accept SENT quotations
    """
    quotation = db.query(QuotationModel).filter(QuotationModel.id == quotation_id).first()

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with id {quotation_id} not found"
        )

    if quotation.status not in ['DRAFT', 'SENT']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only accept quotations with DRAFT or SENT status"
        )

    quotation.status = 'ACCEPTED'
    quotation.approved_at = datetime.utcnow()
    quotation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(quotation)

    # Return detailed quotation
    quotation_with_relations = db.query(QuotationModel).options(
        joinedload(QuotationModel.customer),
        joinedload(QuotationModel.items)
    ).filter(QuotationModel.id == quotation_id).first()

    return build_quotation_detail_response(quotation_with_relations)


@router.post("/quotations/{quotation_id}/reject", response_model=QuotationDetail)
async def reject_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """
    Mark quotation as REJECTED
    - Can only reject SENT quotations
    """
    quotation = db.query(QuotationModel).filter(QuotationModel.id == quotation_id).first()

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with id {quotation_id} not found"
        )

    if quotation.status not in ['DRAFT', 'SENT']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only reject quotations with DRAFT or SENT status"
        )

    quotation.status = 'REJECTED'
    quotation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(quotation)

    # Return detailed quotation
    quotation_with_relations = db.query(QuotationModel).options(
        joinedload(QuotationModel.customer),
        joinedload(QuotationModel.items)
    ).filter(QuotationModel.id == quotation_id).first()

    return build_quotation_detail_response(quotation_with_relations)


# ==================== Statistics Endpoint ====================

@router.get("/quotations/stats/summary")
async def get_quotation_stats(db: Session = Depends(get_db)):
    """Get summary statistics for quotations"""
    total = db.query(func.count(QuotationModel.id)).scalar()
    draft = db.query(func.count(QuotationModel.id)).filter(QuotationModel.status == 'DRAFT').scalar()
    sent = db.query(func.count(QuotationModel.id)).filter(QuotationModel.status == 'SENT').scalar()
    accepted = db.query(func.count(QuotationModel.id)).filter(QuotationModel.status == 'ACCEPTED').scalar()
    rejected = db.query(func.count(QuotationModel.id)).filter(QuotationModel.status == 'REJECTED').scalar()
    expired = db.query(func.count(QuotationModel.id)).filter(QuotationModel.status == 'EXPIRED').scalar()

    total_value = db.query(func.sum(QuotationModel.total)).filter(
        QuotationModel.status.in_(['SENT', 'ACCEPTED'])
    ).scalar() or Decimal("0")

    return {
        "total": total,
        "draft": draft,
        "sent": sent,
        "accepted": accepted,
        "rejected": rejected,
        "expired": expired,
        "total_value": float(total_value)
    }
