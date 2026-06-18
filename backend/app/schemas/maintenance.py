from pydantic import BaseModel, validator
from typing import List, Optional
from datetime import date, datetime


class ServiceTicketBase(BaseModel):
    ticket_no: Optional[str] = None
    project_id: Optional[int] = None
    customer_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "MEDIUM"
    status: Optional[str] = "OPEN"
    assigned_to: Optional[int] = None

    @validator('priority')
    def validate_priority(cls, v):
        if v not in ['LOW', 'MEDIUM', 'HIGH', 'URGENT']:
            raise ValueError('Priority must be one of: LOW, MEDIUM, HIGH, URGENT')
        return v

    @validator('status')
    def validate_status(cls, v):
        if v not in ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED']:
            raise ValueError('Status must be one of: OPEN, IN_PROGRESS, ON_HOLD, RESOLVED, CLOSED')
        return v


class ServiceTicketCreate(ServiceTicketBase):
    pass


class ServiceTicketUpdate(ServiceTicketBase):
    pass


class ServiceTicketInDBBase(ServiceTicketBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ServiceTicket(ServiceTicketInDBBase):
    pass


class ServiceLogBase(BaseModel):
    service_ticket_id: int
    log_date: date
    technician_id: Optional[int] = None
    hours_spent: Optional[int] = None
    description: Optional[str] = None


class ServiceLogCreate(ServiceLogBase):
    pass


class ServiceLogUpdate(ServiceLogBase):
    pass


class ServiceLogInDBBase(ServiceLogBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ServiceLog(ServiceLogInDBBase):
    pass