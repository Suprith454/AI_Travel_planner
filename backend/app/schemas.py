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


class TripGenerate(BaseModel):
    destination: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[str] = None
    interests: Optional[str] = None
    travelers: Optional[str] = None


class PatchAction(BaseModel):
    action: str
    day_index: int
    activity_index: int | None = None
    alternative_index: int | None = None
    new_duration: str | None = None
    new_order: list[int] | None = None


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
