from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Trip
from ..schemas import TripGenerate, TripResponse
import json
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

USE_MOCK = os.getenv("USE_MOCK", "true").lower() == "true"

groq_client = None
if not USE_MOCK:
    from groq import Groq
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def build_mock_itinerary(destination):
    return {
        "days": [
            {
                "day": 1,
                "date": "Day 1",
                "activities": [
                    {
                        "name": f"Arrival in {destination}",
                        "description": "Check into your hotel and explore the local neighborhood.",
                        "cost": "Free",
                        "lat": 28.6139,
                        "lng": 77.2090,
                    },
                    {
                        "name": "City Center Walking Tour",
                        "description": "Guided walking tour of the main attractions and landmarks.",
                        "cost": "$25",
                        "lat": 28.7041,
                        "lng": 77.1025,
                    },
                    {
                        "name": "Local Cuisine Lunch",
                        "description": "Try authentic local dishes at a highly-rated restaurant.",
                        "cost": "$20",
                        "lat": 28.6304,
                        "lng": 77.2177,
                    },
                    {
                        "name": "Evening Market Visit",
                        "description": "Explore the local market for souvenirs and street food.",
                        "cost": "$15",
                        "lat": 28.6562,
                        "lng": 77.2410,
                    },
                ],
            },
            {
                "day": 2,
                "date": "Day 2",
                "activities": [
                    {
                        "name": "Historical Monument Visit",
                        "description": "Visit the most famous historical site in the area.",
                        "cost": "$15",
                        "lat": 28.5245,
                        "lng": 77.1855,
                    },
                    {
                        "name": "Museum Tour",
                        "description": "Explore the local museum to learn about the culture and history.",
                        "cost": "$10",
                        "lat": 28.6180,
                        "lng": 77.2320,
                    },
                    {
                        "name": "Nature Park",
                        "description": "Relax and enjoy a peaceful afternoon at the botanical garden.",
                        "cost": "Free",
                        "lat": 28.5967,
                        "lng": 77.2200,
                    },
                    {
                        "name": "Sunset Viewpoint",
                        "description": "Watch the sunset from a famous viewpoint in the city.",
                        "cost": "Free",
                        "lat": 28.6028,
                        "lng": 77.2068,
                    },
                ],
            },
            {
                "day": 3,
                "date": "Day 3",
                "activities": [
                    {
                        "name": "Day Trip to Nearby Attraction",
                        "description": "Take a short trip to a popular nearby destination.",
                        "cost": "$40",
                        "lat": 28.4870,
                        "lng": 77.0670,
                    },
                    {
                        "name": "Shopping at Local Bazaar",
                        "description": "Browse through traditional handicrafts and textiles.",
                        "cost": "$30",
                        "lat": 28.6353,
                        "lng": 77.2240,
                    },
                    {
                        "name": "Cooking Class",
                        "description": "Learn to cook authentic local dishes from a professional chef.",
                        "cost": "$35",
                        "lat": 28.6190,
                        "lng": 77.2340,
                    },
                    {
                        "name": "Farewell Dinner",
                        "description": "Special farewell dinner at a rooftop restaurant.",
                        "cost": "$50",
                        "lat": 28.6280,
                        "lng": 77.2080,
                    },
                ],
            },
        ]
    }


@router.post("/generate")
def generate_trip(data: TripGenerate, user_id: int, db: Session = Depends(get_db)):
    itinerary_dict = None

    if not USE_MOCK and groq_client:
        prompt = (
            f"Plan a trip to {data.destination}. "
            f"Budget: {data.budget or 'Not specified'}. "
            f"Interests: {data.interests or 'General'}. "
            f"Dates: {data.start_date or 'N/A'} to {data.end_date or 'N/A'}. "
            "Provide a day-by-day itinerary with specific places, activities, "
            "approximate costs, and coordinates (lat/lng) for each place. "
            "Return ONLY valid JSON with this exact structure (no markdown, no backticks): "
            '{"days": [{"day": 1, "date": "...", "activities": [{"name": "...", "description": "...", "cost": "...", "lat": 0.0, "lng": 0.0}]}]}'
        )
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            text = response.choices[0].message.content.strip()
            itinerary_dict = json.loads(text)
        except Exception:
            pass

    if itinerary_dict is None:
        itinerary_dict = build_mock_itinerary(data.destination)

    title = f"Trip to {data.destination}"
    trip = Trip(
        user_id=user_id,
        title=title,
        destination=data.destination,
        start_date=data.start_date,
        end_date=data.end_date,
        budget=data.budget,
        interests=data.interests,
        itinerary=itinerary_dict,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.get("/", response_model=list[TripResponse])
def list_trips(user_id: int, db: Session = Depends(get_db)):
    return db.query(Trip).filter(Trip.user_id == user_id).order_by(Trip.created_at.desc()).all()


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.delete("/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted"}
