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


class ShareTripEmail(BaseModel):
    recipient_email: str
    trip_id: int


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



class DailyCost(BaseModel):
    day: int
    date: str
    cost: float
    activities_count: int


class BudgetSummary(BaseModel):
    total_cost: float
    currency: str
    daily_costs: list[DailyCost]


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
    budget_summary: Optional[BudgetSummary] = None

    model_config = {"from_attributes": True}
