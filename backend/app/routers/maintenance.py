from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.database import get_db
from app.models.maintenance import ServiceTicket as ServiceTicketModel, ServiceLog as ServiceLogModel
from app.schemas.maintenance import ServiceTicket, ServiceTicketCreate, ServiceTicketUpdate, ServiceLog, ServiceLogCreate, ServiceLogUpdate

router = APIRouter()

# Service Ticket endpoints
@router.get("/service-tickets", response_model=List[ServiceTicket])
def read_service_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    service_tickets = db.query(ServiceTicketModel).offset(skip).limit(limit).all()
    return service_tickets


@router.post("/service-tickets", response_model=ServiceTicket)
def create_service_ticket(service_ticket: ServiceTicketCreate, db: Session = Depends(get_db)):
    db_service_ticket = ServiceTicketModel(**service_ticket.dict())
    db.add(db_service_ticket)
    db.commit()
    db.refresh(db_service_ticket)
    return db_service_ticket


@router.get("/service-tickets/{ticket_id}", response_model=ServiceTicket)
def read_service_ticket(ticket_id: int, db: Session = Depends(get_db)):
    service_ticket = db.query(ServiceTicketModel).filter(ServiceTicketModel.id == ticket_id).first()
    if service_ticket is None:
        raise HTTPException(status_code=404, detail="Service ticket not found")
    return service_ticket


@router.put("/service-tickets/{ticket_id}", response_model=ServiceTicket)
def update_service_ticket(ticket_id: int, service_ticket: ServiceTicketUpdate, db: Session = Depends(get_db)):
    db_service_ticket = db.query(ServiceTicketModel).filter(ServiceTicketModel.id == ticket_id).first()
    if db_service_ticket is None:
        raise HTTPException(status_code=404, detail="Service ticket not found")
    
    for key, value in service_ticket.dict().items():
        setattr(db_service_ticket, key, value)
    
    db.commit()
    db.refresh(db_service_ticket)
    return db_service_ticket


@router.delete("/service-tickets/{ticket_id}", response_model=ServiceTicket)
def delete_service_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_service_ticket = db.query(ServiceTicketModel).filter(ServiceTicketModel.id == ticket_id).first()
    if db_service_ticket is None:
        raise HTTPException(status_code=404, detail="Service ticket not found")
    
    db.delete(db_service_ticket)
    db.commit()
    return db_service_ticket


# Service Log endpoints
@router.get("/service-logs", response_model=List[ServiceLog])
def read_service_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    service_logs = db.query(ServiceLogModel).offset(skip).limit(limit).all()
    return service_logs


@router.post("/service-logs", response_model=ServiceLog)
def create_service_log(service_log: ServiceLogCreate, db: Session = Depends(get_db)):
    # Verify that service ticket exists
    service_ticket = db.query(ServiceTicketModel).filter(ServiceTicketModel.id == service_log.service_ticket_id).first()
    if service_ticket is None:
        raise HTTPException(status_code=404, detail="Service ticket not found")
    
    db_service_log = ServiceLogModel(**service_log.dict())
    db.add(db_service_log)
    db.commit()
    db.refresh(db_service_log)
    return db_service_log


@router.get("/service-logs/{log_id}", response_model=ServiceLog)
def read_service_log(log_id: int, db: Session = Depends(get_db)):
    service_log = db.query(ServiceLogModel).filter(ServiceLogModel.id == log_id).first()
    if service_log is None:
        raise HTTPException(status_code=404, detail="Service log not found")
    return service_log


@router.put("/service-logs/{log_id}", response_model=ServiceLog)
def update_service_log(log_id: int, service_log: ServiceLogUpdate, db: Session = Depends(get_db)):
    db_service_log = db.query(ServiceLogModel).filter(ServiceLogModel.id == log_id).first()
    if db_service_log is None:
        raise HTTPException(status_code=404, detail="Service log not found")
    
    # Verify that service ticket exists
    if service_log.service_ticket_id:
        service_ticket = db.query(ServiceTicketModel).filter(ServiceTicketModel.id == service_log.service_ticket_id).first()
        if service_ticket is None:
            raise HTTPException(status_code=404, detail="Service ticket not found")
    
    for key, value in service_log.dict().items():
        setattr(db_service_log, key, value)
    
    db.commit()
    db.refresh(db_service_log)
    return db_service_log


@router.delete("/service-logs/{log_id}", response_model=ServiceLog)
def delete_service_log(log_id: int, db: Session = Depends(get_db)):
    db_service_log = db.query(ServiceLogModel).filter(ServiceLogModel.id == log_id).first()
    if db_service_log is None:
        raise HTTPException(status_code=404, detail="Service log not found")
    
    db.delete(db_service_log)
    db.commit()
    return db_service_log