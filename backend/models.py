from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    role = Column(String, default="student")
    
class Case(Base):
    __tablename__ = "cases"
    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    symptom = Column(Text)
    status = Column(String, default="ongoing")
    created_at = Column(DateTime, server_default=func.now())

class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"))
    device = Column(String)
    command = Column(String)
    raw_output = Column(Text)
    
class Diagnosis(Base):
    __tablename__ = "diagnoses"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"))
    root_cause = Column(Text)
    osi_layer = Column(String)
    confidence = Column(Integer)
    explanation = Column(Text)
    next_command = Column(String)
    suggested_fix = Column(Text)

class CaseMessage(Base):
    __tablename__ = "case_messages"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"))
    role = Column(String) # "user" or "assistant"
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

