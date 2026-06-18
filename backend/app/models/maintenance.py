from sqlalchemy import Column, Integer, String, DateTime, Date, Text, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base


class ServiceTicket(Base):
    __tablename__ = "service_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_no = Column(String, unique=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    title = Column(String, nullable=False)
    description = Column(Text)
    priority = Column(String, CheckConstraint("priority IN ('LOW','MEDIUM','HIGH','URGENT')"), default="MEDIUM")
    status = Column(String, CheckConstraint("status IN ('OPEN','IN_PROGRESS','ON_HOLD','RESOLVED','CLOSED')"), default="OPEN")
    assigned_to = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    customer = relationship("Customer")
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    service_logs = relationship("ServiceLog", back_populates="service_ticket", cascade="all, delete-orphan")


class ServiceLog(Base):
    __tablename__ = "service_logs"

    id = Column(Integer, primary_key=True, index=True)
    service_ticket_id = Column(Integer, ForeignKey("service_tickets.id", ondelete="CASCADE"), nullable=False)
    log_date = Column(Date, nullable=False)
    technician_id = Column(Integer, ForeignKey("users.id"))
    hours_spent = Column(Integer)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    service_ticket = relationship("ServiceTicket", back_populates="service_logs")
    technician = relationship("User", foreign_keys=[technician_id])