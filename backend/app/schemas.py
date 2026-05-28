from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OTPRequest(BaseModel):
    email: str
    purpose: str  # "signup" or "reset"


class OTPVerify(BaseModel):
    email: str
    code: str
    purpose: str


class ResetPassword(BaseModel):
    email: str
    code: str
    new_password: str


class GoogleAuth(BaseModel):
    id_token: str


class TripGenerate(BaseModel):
    destination: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[str] = None
    interests: Optional[str] = None
    travelers: Optional[str] = None


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
