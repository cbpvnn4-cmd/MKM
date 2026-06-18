from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import Any, List, Optional, cast
from datetime import datetime, date
from decimal import Decimal

from app.database.database import get_db
from app.models.quotations import (
    Quotation as QuotationModel,
    Contract as ContractModel,
    ContractMilestone as ContractMilestoneModel,
    ContractElevator as ContractElevatorModel,
    ContractPayment as ContractPaymentModel
)
from app.models.sales import SalesOrder as SalesOrderModel, SalesOrderItem as SalesOrderItemModel
from app.models.customers import Customer as CustomerModel
from app.schemas.quotation import (
    Contract,
    ContractCreate,
    ContractUpdate,
    ContractDetail,
    ContractMilestone,
    ContractMilestoneCreate,
    ContractMilestoneUpdate,
    ContractElevator as ContractElevatorSchema,
    ContractPayment as ContractPaymentSchema
)

router = APIRouter()


def _require_instance(value: Optional[Any], *, detail: str, status_code: int = status.HTTP_404_NOT_FOUND) -> Any:
    """Ensure ORM query returned a value before accessing its attributes."""
    if value is None:
        raise HTTPException(status_code=status_code, detail=detail)
    return value


def _contract_detail_from_instance(contract: ContractModel, **overrides: Any) -> ContractDetail:
    """Build a ContractDetail schema from a SQLAlchemy instance with optional overrides."""
    payload = ContractDetail.model_validate(cast(Any, contract)).model_dump()
    payload.update(overrides)
    return ContractDetail(**payload)


def generate_contract_number(db: Session) -> str:
    """Generate the next contract number in sequence (CT-001, CT-002, ...)"""
    last_contract = db.query(ContractModel).order_by(
        desc(ContractModel.id)
    ).first()

    if last_contract is None:
        return "CT-001"

    last_contract_data = cast(Any, last_contract)
    contract_number = last_contract_data.contract_no
    if not contract_number:
        return "CT-001"

    # Extract number from last contract_no (e.g., "CT-123" -> 123)
    try:
        last_number = int(str(contract_number).split('-')[-1])
        new_number = last_number + 1
        return f"CT-{new_number:03d}"
    except (ValueError, IndexError):
        # If parsing fails, count records and add 1
        count = db.query(func.count(ContractModel.id)).scalar()
        return f"CT-{(count + 1):03d}"


# ==================== Contract Endpoints ====================

@router.get("/contracts", response_model=List[Contract])
async def list_contracts(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    contract_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    List all contracts with optional filtering
    - Filter by status: DRAFT, ACTIVE, COMPLETED, TERMINATED
    - Filter by customer_id
    - Filter by contract_type
    """
    query = db.query(ContractModel).options(
        joinedload(ContractModel.customer),
        joinedload(ContractModel.quotation),
        joinedload(ContractModel.sales_order),
        joinedload(ContractModel.milestones)
    )

    if status:
        query = query.filter(ContractModel.status == status.upper())

    if customer_id:
        query = query.filter(ContractModel.customer_id == customer_id)

    if contract_type:
        query = query.filter(ContractModel.contract_type == contract_type.upper())

    query = query.order_by(desc(ContractModel.created_at))
    contracts = query.offset(skip).limit(limit).all()

    # Add customer name to response
    result = []
    for contract in contracts:
        contract_obj = cast(Any, contract)
        contract_dict = Contract.model_validate(contract_obj).model_dump()
        contract_dict['customer_name'] = contract_obj.customer.name if contract_obj.customer else None
        result.append(Contract(**contract_dict))

    return result


@router.post("/contracts", response_model=ContractDetail, status_code=status.HTTP_201_CREATED)
async def create_contract(
    contract_data: ContractCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new contract
    - Can be created from a quotation or standalone
    - Automatically generates contract number if not provided
    - Supports adding milestones for payment tracking
    """
    # Validate customer exists
    customer = _require_instance(
        db.query(CustomerModel).filter(CustomerModel.id == contract_data.customer_id).first(),
        detail=f"Customer with id {contract_data.customer_id} not found"
    )

    # If quotation_id is provided, validate it exists and is ACCEPTED
    quotation = None
    if contract_data.quotation_id:
        quotation = _require_instance(
            db.query(QuotationModel).filter(
                QuotationModel.id == contract_data.quotation_id
            ).first(),
            detail=f"Quotation with id {contract_data.quotation_id} not found"
        )

        if quotation.status != 'ACCEPTED':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only create contract from ACCEPTED quotations"
            )

    # Generate contract number if not provided
    if not contract_data.contract_no:
        contract_data.contract_no = generate_contract_number(db)

    # Check if contract number already exists
    existing = db.query(ContractModel).filter(
        ContractModel.contract_no == contract_data.contract_no
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contract number {contract_data.contract_no} already exists"
        )

    # Create contract
    contract = ContractModel(
        contract_no=contract_data.contract_no,
        customer_id=contract_data.customer_id,
        quotation_id=contract_data.quotation_id,
        contract_date=contract_data.contract_date,
        start_date=contract_data.start_date,
        end_date=contract_data.end_date,
        status=contract_data.status,
        contract_type=contract_data.contract_type,
        # Seller
        seller_company_name=contract_data.seller_company_name,
        seller_address=contract_data.seller_address,
        seller_phone=contract_data.seller_phone,
        seller_email=contract_data.seller_email,
        seller_authorized_person=contract_data.seller_authorized_person,
        # Buyer
        buyer_name=contract_data.buyer_name,
        buyer_address=contract_data.buyer_address,
        buyer_phone=contract_data.buyer_phone,
        buyer_email=contract_data.buyer_email,
        buyer_representative=contract_data.buyer_representative,
        # Project
        project_name=contract_data.project_name,
        project_location=contract_data.project_location,
        building_type=contract_data.building_type,
        num_floors=contract_data.num_floors,
        usage_type=contract_data.usage_type,
        # Signatory
        signed_by_customer=contract_data.signed_by_customer,
        signed_by_company=contract_data.signed_by_company,
        # Commercial terms
        payment_schedule=contract_data.payment_schedule,
        payment_terms=contract_data.payment_terms,
        delivery_terms=contract_data.delivery_terms,
        warranty_terms=contract_data.warranty_terms,
        warranty_period=contract_data.warranty_period,
        # Obligations
        seller_obligations=contract_data.seller_obligations,
        buyer_obligations=contract_data.buyer_obligations,
        # Legal terms
        terms_and_conditions=contract_data.terms_and_conditions,
        penalties_clause=contract_data.penalties_clause,
        termination_clause=contract_data.termination_clause,
        general_terms=contract_data.general_terms,
        # Amounts
        currency=contract_data.currency,
        total_amount=contract_data.total_amount,
        total_amount_text=contract_data.total_amount_text,
        price_includes=contract_data.price_includes,
        # Misc
        notes=contract_data.notes,
        # Elevator fields
        elevator_type=contract_data.elevator_type,
        elevator_model=contract_data.elevator_model,
        elevator_capacity=contract_data.elevator_capacity,
        elevator_height=contract_data.elevator_height,
        elevator_sections=contract_data.elevator_sections,
        elevator_cost=contract_data.elevator_cost,
        elevator_notes=contract_data.elevator_notes
    )

    db.add(contract)
    db.flush()  # Get the contract ID

    # Create milestones
    milestones = []
    for milestone_data in contract_data.milestones:
        milestone = ContractMilestoneModel(
            contract_id=contract.id,
            milestone_name=milestone_data.milestone_name,
            description=milestone_data.description,
            sequence_order=milestone_data.sequence_order,
            due_date=milestone_data.due_date,
            status=milestone_data.status,
            payment_percent=milestone_data.payment_percent,
            payment_amount=milestone_data.payment_amount,
            notes=milestone_data.notes
        )
        db.add(milestone)
        milestones.append(milestone)

    # Create elevators
    elevators = []
    for elevator_data in contract_data.elevators:
        elevator = ContractElevatorModel(
            contract_id=contract.id,
            **elevator_data.model_dump()
        )
        db.add(elevator)
        elevators.append(elevator)

    # Create payments
    payments = []
    for payment_data in contract_data.payments:
        payment = ContractPaymentModel(
            contract_id=contract.id,
            **payment_data.model_dump()
        )
        db.add(payment)
        payments.append(payment)

    db.commit()
    db.refresh(contract)

    milestones_payload = [ContractMilestone.model_validate(m) for m in milestones]
    elevators_payload = [ContractElevatorSchema.model_validate(e) for e in elevators]
    payments_payload = [ContractPaymentSchema.model_validate(p) for p in payments]
    return _contract_detail_from_instance(
        contract,
        milestones=milestones_payload,
        elevators=elevators_payload,
        payments=payments_payload,
        customer_name=customer.name,
        customer_email=customer.email,
        customer_phone=customer.phone,
        customer_address=customer.address,
        quotation_no=quotation.quotation_no if quotation else None
    )


@router.get("/contracts/{contract_id}", response_model=ContractDetail)
async def get_contract(contract_id: int, db: Session = Depends(get_db)):
    """Get detailed contract by ID with milestones and related information"""
    contract = _require_instance(
        db.query(ContractModel).options(
            joinedload(ContractModel.customer),
            joinedload(ContractModel.quotation),
            joinedload(ContractModel.sales_order).joinedload(SalesOrderModel.items),
            joinedload(ContractModel.milestones),
            joinedload(ContractModel.elevators),
            joinedload(ContractModel.payments)
        ).filter(ContractModel.id == contract_id).first(),
        detail=f"Contract with id {contract_id} not found"
    )

    # Get elevator data from sales_order if linked, otherwise use contract fields
    elevator_type = contract.elevator_type
    elevator_model = contract.elevator_model
    elevator_capacity = contract.elevator_capacity
    elevator_height = contract.elevator_height
    elevator_sections = contract.elevator_sections
    elevator_cost = contract.elevator_cost
    elevator_notes = contract.elevator_notes

    # If contract is linked to a sales_order, get elevator data from there
    if contract.sales_order and contract.sales_order.items:
        first_item = contract.sales_order.items[0]
        if first_item.product:
            elevator_type = elevator_type or first_item.product.category
            elevator_model = elevator_model or first_item.product.name
            # Extract capacity from product name (e.g., "مصعد 630 kg" -> "630 kg")
            if not elevator_capacity and first_item.product.name:
                import re
                capacity_match = re.search(r'\d+\s*(kg|كغ)', first_item.product.name, re.IGNORECASE)
                if capacity_match:
                    elevator_capacity = capacity_match.group(0)

        elevator_height = elevator_height or (str(first_item.cable_meters) if first_item.cable_meters else None)
        elevator_sections = elevator_sections or (str(first_item.sections) if first_item.sections else None)
        elevator_cost = elevator_cost or first_item.unit_price_usd

    milestone_payload = [ContractMilestone.model_validate(m) for m in contract.milestones]
    elevators_payload = [ContractElevatorSchema.model_validate(e) for e in contract.elevators] if contract.elevators else []
    payments_payload = [ContractPaymentSchema.model_validate(p) for p in contract.payments] if contract.payments else []
    return _contract_detail_from_instance(
        contract,
        milestones=milestone_payload,
        elevators=elevators_payload,
        payments=payments_payload,
        customer_name=contract.customer.name if contract.customer else None,
        customer_email=contract.customer.email if contract.customer else None,
        customer_phone=contract.customer.phone if contract.customer else None,
        customer_address=contract.customer.address if contract.customer else None,
        quotation_no=contract.quotation.quotation_no if contract.quotation else None,
        sales_order_no=contract.sales_order.so_no if contract.sales_order else None,
        elevator_type=elevator_type,
        elevator_model=elevator_model,
        elevator_capacity=elevator_capacity,
        elevator_height=elevator_height,
        elevator_sections=elevator_sections,
        elevator_cost=elevator_cost,
        elevator_notes=elevator_notes
    )


@router.put("/contracts/{contract_id}", response_model=ContractDetail)
async def update_contract(
    contract_id: int,
    contract_update: ContractUpdate,
    db: Session = Depends(get_db)
):
    """
    Update contract
    - Cannot update if status is COMPLETED or TERMINATED
    """
    contract = _require_instance(
        db.query(ContractModel).filter(ContractModel.id == contract_id).first(),
        detail=f"Contract with id {contract_id} not found"
    )

    # Prevent updating completed or terminated contracts
    if contract.status in ['COMPLETED', 'TERMINATED']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update contract with status {contract.status}"
        )

    # Update fields
    update_data = contract_update.model_dump(exclude_unset=True, exclude={'elevators', 'payments'})
    for field, value in update_data.items():
        setattr(contract, field, value)

    # Handle elevators update
    if contract_update.elevators is not None:
        # Delete existing elevators
        db.query(ContractElevatorModel).filter(ContractElevatorModel.contract_id == contract_id).delete()
        # Create new elevators
        for elevator_data in contract_update.elevators:
            elevator = ContractElevatorModel(
                contract_id=contract_id,
                **elevator_data.model_dump()
            )
            db.add(elevator)

    # Handle payments update
    if contract_update.payments is not None:
        # Delete existing payments
        db.query(ContractPaymentModel).filter(ContractPaymentModel.contract_id == contract_id).delete()
        # Create new payments
        for payment_data in contract_update.payments:
            payment = ContractPaymentModel(
                contract_id=contract_id,
                **payment_data.model_dump()
            )
            db.add(payment)

    contract.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(contract)

    # Return detailed contract with all relations
    contract_with_relations = _require_instance(
        db.query(ContractModel).options(
            joinedload(ContractModel.customer),
            joinedload(ContractModel.quotation),
            joinedload(ContractModel.sales_order),
            joinedload(ContractModel.milestones),
            joinedload(ContractModel.elevators),
            joinedload(ContractModel.payments)
        ).filter(ContractModel.id == contract_id).first(),
        detail=f"Contract with id {contract_id} not found"
    )

    milestones_payload = [ContractMilestone.model_validate(m) for m in contract_with_relations.milestones]
    elevators_payload = [ContractElevatorSchema.model_validate(e) for e in contract_with_relations.elevators] if contract_with_relations.elevators else []
    payments_payload = [ContractPaymentSchema.model_validate(p) for p in contract_with_relations.payments] if contract_with_relations.payments else []

    return _contract_detail_from_instance(
        contract_with_relations,
        milestones=milestones_payload,
        elevators=elevators_payload,
        payments=payments_payload,
        customer_name=contract_with_relations.customer.name if contract_with_relations.customer else None,
        customer_email=contract_with_relations.customer.email if contract_with_relations.customer else None,
        customer_phone=contract_with_relations.customer.phone if contract_with_relations.customer else None,
        customer_address=contract_with_relations.customer.address if contract_with_relations.customer else None,
        quotation_no=contract_with_relations.quotation.quotation_no if contract_with_relations.quotation else None,
        sales_order_no=contract_with_relations.sales_order.so_no if contract_with_relations.sales_order else None
    )


@router.delete("/contracts/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contract(contract_id: int, db: Session = Depends(get_db)):
    """
    Delete contract
    - Can only delete if status is DRAFT
    """
    contract = _require_instance(
        db.query(ContractModel).filter(ContractModel.id == contract_id).first(),
        detail=f"Contract with id {contract_id} not found"
    )

    # Only allow deletion of DRAFT contracts
    if contract.status != 'DRAFT':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete contracts with DRAFT status"
        )

    db.delete(contract)
    db.commit()

    return None


# ==================== Contract Status Change Endpoints ====================

@router.post("/contracts/{contract_id}/activate", response_model=ContractDetail)
async def activate_contract(contract_id: int, db: Session = Depends(get_db)):
    """
    Activate contract
    - Can only activate DRAFT contracts
    - Sets start_date to today if not set
    """
    contract = _require_instance(
        db.query(ContractModel).filter(ContractModel.id == contract_id).first(),
        detail=f"Contract with id {contract_id} not found"
    )

    if contract.status != 'DRAFT':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only activate contracts with DRAFT status"
        )

    contract.status = 'ACTIVE'
    if not contract.start_date:
        contract.start_date = date.today()
    contract.approved_at = datetime.utcnow()
    contract.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(contract)

    # Return detailed contract
    contract_with_relations = _require_instance(
        db.query(ContractModel).options(
            joinedload(ContractModel.customer),
            joinedload(ContractModel.quotation),
            joinedload(ContractModel.sales_order),
            joinedload(ContractModel.milestones)
        ).filter(ContractModel.id == contract_id).first(),
        detail=f"Contract with id {contract_id} not found"
    )

    milestone_payload = [ContractMilestone.model_validate(m) for m in contract_with_relations.milestones]
    return _contract_detail_from_instance(
        contract_with_relations,
        milestones=milestone_payload,
        customer_name=contract_with_relations.customer.name if contract_with_relations.customer else None,
        customer_email=contract_with_relations.customer.email if contract_with_relations.customer else None,
        customer_phone=contract_with_relations.customer.phone if contract_with_relations.customer else None,
        customer_address=contract_with_relations.customer.address if contract_with_relations.customer else None,
        quotation_no=contract_with_relations.quotation.quotation_no if contract_with_relations.quotation else None,
        sales_order_no=contract_with_relations.sales_order.so_no if contract_with_relations.sales_order else None
    )


@router.post("/contracts/{contract_id}/complete", response_model=ContractDetail)
async def complete_contract(contract_id: int, db: Session = Depends(get_db)):
    """
    Mark contract as COMPLETED
    - Can only complete ACTIVE contracts
    """
    contract = _require_instance(
        db.query(ContractModel).filter(ContractModel.id == contract_id).first(),
        detail=f"Contract with id {contract_id} not found"
    )

    if contract.status != 'ACTIVE':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only complete contracts with ACTIVE status"
        )

    contract.status = 'COMPLETED'
    contract.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(contract)

    # Return detailed contract
    contract_with_relations = _require_instance(
        db.query(ContractModel).options(
            joinedload(ContractModel.customer),
            joinedload(ContractModel.quotation),
            joinedload(ContractModel.sales_order),
            joinedload(ContractModel.milestones)
        ).filter(ContractModel.id == contract_id).first(),
        detail=f"Contract with id {contract_id} not found"
    )

    milestone_payload = [ContractMilestone.model_validate(m) for m in contract_with_relations.milestones]
    return _contract_detail_from_instance(
        contract_with_relations,
        milestones=milestone_payload,
        customer_name=contract_with_relations.customer.name if contract_with_relations.customer else None,
        customer_email=contract_with_relations.customer.email if contract_with_relations.customer else None,
        customer_phone=contract_with_relations.customer.phone if contract_with_relations.customer else None,
        customer_address=contract_with_relations.customer.address if contract_with_relations.customer else None,
        quotation_no=contract_with_relations.quotation.quotation_no if contract_with_relations.quotation else None,
        sales_order_no=contract_with_relations.sales_order.so_no if contract_with_relations.sales_order else None
    )


# ==================== Contract to Sales Order Conversion ====================

@router.post("/contracts/{contract_id}/convert-to-sales-order")
async def convert_contract_to_sales_order(contract_id: int, db: Session = Depends(get_db)):
    """
    Convert an ACTIVE contract to a sales order
    - Contract must be ACTIVE
    - Creates sales order from contract's linked quotation
    - Links sales order back to contract
    """
    contract = _require_instance(
        db.query(ContractModel).options(
            joinedload(ContractModel.quotation).joinedload(QuotationModel.items)
        ).filter(ContractModel.id == contract_id).first(),
        detail=f"Contract with id {contract_id} not found"
    )

    if contract.status != 'ACTIVE':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only convert ACTIVE contracts to sales orders"
        )

    if contract.sales_order_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contract already has a linked sales order"
        )

    if contract.quotation is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contract must have a linked quotation to convert to sales order"
        )

    # Generate SO number
    last_so = db.query(SalesOrderModel).order_by(desc(SalesOrderModel.id)).first()
    if last_so is None:
        so_no = "SO-001"
    else:
        last_so_data = cast(Any, last_so)
        so_identifier = last_so_data.so_no
        if not so_identifier:
            so_no = "SO-001"
        else:
            try:
                last_number = int(str(so_identifier).split('-')[-1])
                so_no = f"SO-{(last_number + 1):03d}"
            except (ValueError, IndexError):
                count = db.query(func.count(SalesOrderModel.id)).scalar()
                so_no = f"SO-{(count + 1):03d}"

    # Create sales order from quotation
    sales_order = SalesOrderModel(
        so_no=so_no,
        customer_id=contract.customer_id,
        so_date=date.today(),
        status="CONFIRMED",
        order_type=contract.quotation.order_type,
        exchange_rate=contract.quotation.exchange_rate
    )

    db.add(sales_order)
    db.flush()

    # Create sales order items from quotation items
    for quot_item in contract.quotation.items:
        so_item = SalesOrderItemModel(
            sales_order_id=sales_order.id,
            product_id=quot_item.product_id,
            qty=quot_item.qty,
            unit_price_usd=quot_item.unit_price,
            line_total_usd=quot_item.line_total,
            # Elevator components
            sections=quot_item.sections,
            ropes=quot_item.ropes,
            cable_meters=quot_item.cable_meters,
            cabins=quot_item.cabins,
            doors=quot_item.doors
        )
        db.add(so_item)

    # Link sales order to contract
    contract.sales_order_id = sales_order.id
    contract.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(sales_order)

    return {
        "message": "Contract converted to sales order successfully",
        "sales_order_id": sales_order.id,
        "sales_order_no": sales_order.so_no
    }


# ==================== Contract from Quotation Conversion ====================

@router.post("/quotations/{quotation_id}/convert-to-contract", response_model=ContractDetail, status_code=status.HTTP_201_CREATED)
async def convert_quotation_to_contract(quotation_id: int, db: Session = Depends(get_db)):
    """
    Convert an ACCEPTED quotation to a contract
    - Quotation must be ACCEPTED
    - Auto-populates contract with quotation details
    """
    quotation = _require_instance(
        db.query(QuotationModel).filter(QuotationModel.id == quotation_id).first(),
        detail=f"Quotation with id {quotation_id} not found"
    )

    if quotation.status != 'ACCEPTED':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only convert ACCEPTED quotations to contracts"
        )

    # Check if contract already exists for this quotation
    existing_contract = db.query(ContractModel).filter(
        ContractModel.quotation_id == quotation_id
    ).first()

    if existing_contract is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contract already exists for this quotation"
        )

    # Generate contract number
    contract_no = generate_contract_number(db)

    # Create contract from quotation
    contract = ContractModel(
        contract_no=contract_no,
        customer_id=quotation.customer_id,
        quotation_id=quotation.id,
        contract_date=date.today(),
        status="DRAFT",
        contract_type="SALES",
        payment_terms=quotation.payment_terms,
        delivery_terms=quotation.delivery_terms,
        warranty_terms=quotation.warranty_terms,
        terms_and_conditions=quotation.terms_and_conditions,
        currency=quotation.currency,
        total_amount=quotation.total
    )

    db.add(contract)
    db.commit()
    db.refresh(contract)

    # Return detailed contract
    contract_with_relations = _require_instance(
        db.query(ContractModel).options(
            joinedload(ContractModel.customer),
            joinedload(ContractModel.quotation),
            joinedload(ContractModel.milestones)
        ).filter(ContractModel.id == contract.id).first(),
        detail=f"Contract with id {contract.id} not found"
    )

    return _contract_detail_from_instance(
        contract_with_relations,
        milestones=[],
        customer_name=contract_with_relations.customer.name if contract_with_relations.customer else None,
        customer_email=contract_with_relations.customer.email if contract_with_relations.customer else None,
        customer_phone=contract_with_relations.customer.phone if contract_with_relations.customer else None,
        customer_address=contract_with_relations.customer.address if contract_with_relations.customer else None,
        quotation_no=contract_with_relations.quotation.quotation_no if contract_with_relations.quotation else None,
        sales_order_no=None
    )


# ==================== Statistics Endpoint ====================

@router.get("/contracts/stats/summary")
async def get_contract_stats(db: Session = Depends(get_db)):
    """Get summary statistics for contracts"""
    total = db.query(func.count(ContractModel.id)).scalar()
    draft = db.query(func.count(ContractModel.id)).filter(ContractModel.status == 'DRAFT').scalar()
    active = db.query(func.count(ContractModel.id)).filter(ContractModel.status == 'ACTIVE').scalar()
    completed = db.query(func.count(ContractModel.id)).filter(ContractModel.status == 'COMPLETED').scalar()
    terminated = db.query(func.count(ContractModel.id)).filter(ContractModel.status == 'TERMINATED').scalar()

    total_value = db.query(func.sum(ContractModel.total_amount)).filter(
        ContractModel.status.in_(['ACTIVE', 'COMPLETED'])
    ).scalar() or Decimal("0")

    return {
        "total": total,
        "draft": draft,
        "active": active,
        "completed": completed,
        "terminated": terminated,
        "total_value": float(total_value)
    }


# ==================== Milestone Management Endpoints ====================

@router.post("/contracts/{contract_id}/milestones", response_model=ContractMilestone, status_code=status.HTTP_201_CREATED)
async def create_milestone(
    contract_id: int,
    milestone_data: ContractMilestoneCreate,
    db: Session = Depends(get_db)
):
    """Add a new milestone to a contract"""
    _require_instance(
        db.query(ContractModel).filter(ContractModel.id == contract_id).first(),
        detail=f"Contract with id {contract_id} not found"
    )

    milestone = ContractMilestoneModel(
        contract_id=contract_id,
        **milestone_data.model_dump()
    )

    db.add(milestone)
    db.commit()
    db.refresh(milestone)

    return ContractMilestone.model_validate(milestone)


@router.put("/contracts/{contract_id}/milestones/{milestone_id}", response_model=ContractMilestone)
async def update_milestone(
    contract_id: int,
    milestone_id: int,
    milestone_update: ContractMilestoneUpdate,
    db: Session = Depends(get_db)
):
    """Update a contract milestone"""
    milestone = _require_instance(
        db.query(ContractMilestoneModel).filter(
            ContractMilestoneModel.id == milestone_id,
            ContractMilestoneModel.contract_id == contract_id
        ).first(),
        detail=f"Milestone with id {milestone_id} not found"
    )

    update_data = milestone_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(milestone, field, value)

    milestone.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(milestone)

    return ContractMilestone.model_validate(milestone)


@router.delete("/contracts/{contract_id}/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(contract_id: int, milestone_id: int, db: Session = Depends(get_db)):
    """Delete a contract milestone"""
    milestone = _require_instance(
        db.query(ContractMilestoneModel).filter(
            ContractMilestoneModel.id == milestone_id,
            ContractMilestoneModel.contract_id == contract_id
        ).first(),
        detail=f"Milestone with id {milestone_id} not found"
    )

    db.delete(milestone)
    db.commit()

    return None
