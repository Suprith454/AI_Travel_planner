from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TripGenerate(BaseModel):
    destination: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[str] = None
    interests: Optional[str] = None


class TripResponse(BaseModel):
    id: int
    title: str
    destination: str
    start_date: Optional[str]
    end_date: Optional[str]
    budget: Optional[str]
    interests: Optional[str]
    itinerary: Optional[dict]
    created_at: datetime

    model_config = {"from_attributes": True}
