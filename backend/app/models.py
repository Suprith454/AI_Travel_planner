from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, default="")
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    budget = Column(String, nullable=True)
    interests = Column(Text, nullable=True)
    itinerary = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
