from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List

from app.database.database import get_db
from app.models.customers import Customer as CustomerModel
from app.schemas.customer import Customer, CustomerCreate, CustomerUpdate

router = APIRouter()

# Customer endpoints
@router.get("/customers", response_model=List[Customer])
def read_customers(skip: int = 0, limit: int = 100, response: Response = None, db: Session = Depends(get_db)):
    # Get total count
    total_count = db.query(CustomerModel).count()

    # Get paginated customers
    customers = db.query(CustomerModel).offset(skip).limit(limit).all()

    # Add total count to response headers
    if response:
        response.headers["X-Total-Count"] = str(total_count)
        response.headers["X-Page-Size"] = str(limit)
        response.headers["X-Page-Offset"] = str(skip)

    return customers


@router.post("/customers", response_model=Customer)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    db_customer = CustomerModel(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer


@router.get("/customers/{customer_id}", response_model=Customer)
def read_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(CustomerModel).filter(CustomerModel.id == customer_id).first()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/customers/{customer_id}", response_model=Customer)
def update_customer(customer_id: int, customer: CustomerUpdate, db: Session = Depends(get_db)):
    db_customer = db.query(CustomerModel).filter(CustomerModel.id == customer_id).first()
    if db_customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    for key, value in customer.dict().items():
        setattr(db_customer, key, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer


@router.delete("/customers/{customer_id}", response_model=Customer)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    db_customer = db.query(CustomerModel).filter(CustomerModel.id == customer_id).first()
    if db_customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    db.delete(db_customer)
    db.commit()
    return db_customer

