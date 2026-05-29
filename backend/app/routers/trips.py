from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Trip
from ..schemas import TripGenerate, TripResponse, PatchAction
from ..utils import calculate_budget
import json
import os
import math
import re
import secrets
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

USE_MOCK = os.getenv("USE_MOCK", "true").lower() == "true"

groq_client = None
if not USE_MOCK:
    from groq import Groq
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def parse_duration_minutes(duration_str):
    if not duration_str:
        return 0
    total = 0
    for part in re.findall(r"(\d+\.?\d*)\s*(hr|h|min|m)", duration_str.lower()):
        val = float(part[0])
        unit = part[1]
        if unit in ("hr", "h"):
            total += val * 60
        else:
            total += val
    return int(total)


def inject_transit(activities):
    for i, act in enumerate(activities):
        if "next_transit" in act:
            del act["next_transit"]
        if i < len(activities) - 1:
            nxt = activities[i + 1]
            if act.get("lat") is not None and act.get("lng") is not None and nxt.get("lat") is not None and nxt.get("lng") is not None:
                dist = haversine_km(act["lat"], act["lng"], nxt["lat"], nxt["lng"])
                if dist < 2:
                    minutes = max(1, round(dist / 5 * 60))
                    mode = "walk"
                else:
                    minutes = max(1, round(dist / 30 * 60))
                    mode = "drive"
                act["next_transit"] = {"minutes": minutes, "mode": mode, "distance_km": round(dist, 2)}
            else:
                act["next_transit"] = {"minutes": 15, "mode": "drive", "distance_km": None}


def optimize_day_schedule(day):
    start_min = parse_time_to_minutes(day.get("day_start"))
    end_min = parse_time_to_minutes(day.get("day_end"))
    if start_min is not None and end_min is not None:
        available = end_min - start_min
    else:
        available = 12 * 60

    total = 0
    acts = day.get("activities", [])
    for i, act in enumerate(acts):
        total += parse_duration_minutes(act.get("duration", ""))
        if "next_transit" in act:
            total += act["next_transit"]["minutes"]
    day["time_budget"] = max(0, available)
    day["time_used"] = total
    day["over_budget"] = total > available


def build_mock_itinerary(destination):
    return {
        "days": [
            {
                "day": 1,
                "date": "Day 1",
                "activities": [
                    {
                        "name": f"Arrival in {destination}",
                        "time": "09:00 AM",
                        "duration": "1 hr",
                        "description": "Check into your hotel and explore the local neighborhood.",
                        "cost": "Free",
                        "lat": 28.6139, "lng": 77.2090,
                        "category": "relaxation",
                        "nearby_alternatives": [
                            {"name": "Cafe Hop", "description": "Cozy cafe for a quick coffee break.", "duration": "30 min", "cost": "$5", "lat": 28.6150, "lng": 77.2100, "category": "food", "reason": "Across the street, zero transit time"}
                        ]
                    },
                    {
                        "name": "City Center Walking Tour",
                        "time": "10:15 AM",
                        "duration": "2 hrs",
                        "description": "Guided walking tour of the main attractions and landmarks.",
                        "cost": "$25",
                        "lat": 28.7041, "lng": 77.1025,
                        "category": "sightseeing",
                        "nearby_alternatives": [
                            {"name": "Rickshaw Ride", "description": "Quick guided rickshaw tour of old city lanes.", "duration": "45 min", "cost": "$10", "lat": 28.7000, "lng": 77.1000, "category": "adventure", "reason": "Same starting point, 75% shorter duration"}
                        ]
                    },
                    {
                        "name": "Local Cuisine Lunch",
                        "time": "12:30 PM",
                        "duration": "1 hr",
                        "description": "Try authentic local dishes at a highly-rated restaurant.",
                        "cost": "$20",
                        "lat": 28.6304, "lng": 77.2177,
                        "category": "food",
                        "nearby_alternatives": [
                            {"name": "Street Food Walk", "description": "Quick tasting tour of 3 famous street stalls.", "duration": "40 min", "cost": "$8", "lat": 28.6310, "lng": 77.2180, "category": "food", "reason": "Same block, faster, cheaper"}
                        ]
                    },
                    {
                        "name": "Historical Fort Visit",
                        "time": "02:00 PM",
                        "duration": "2.5 hrs",
                        "description": "Explore the famous historic fort and its architecture.",
                        "cost": "$15",
                        "lat": 28.6562, "lng": 77.2410,
                        "category": "sightseeing",
                        "nearby_alternatives": [
                            {"name": "Sound & Light Show", "description": "Evening show at the fort grounds — just 1 hr.", "duration": "1 hr", "cost": "$10", "lat": 28.6560, "lng": 77.2415, "category": "culture", "reason": "Same location, half the time"}
                        ]
                    },
                    {
                        "name": "Evening Market Visit",
                        "time": "05:00 PM",
                        "duration": "1.5 hrs",
                        "description": "Explore the local market for souvenirs and street food.",
                        "cost": "$15",
                        "lat": 28.6353, "lng": 77.2240,
                        "category": "shopping",
                        "nearby_alternatives": [
                            {"name": "Sunset Rooftop Lounge", "description": "Rooftop bar with panoramic city views.", "duration": "45 min", "cost": "$12", "lat": 28.6360, "lng": 77.2230, "category": "nightlife", "reason": "2 min walk, perfect for sunset"}
                        ]
                    },
                ],
            },
            {
                "day": 2,
                "date": "Day 2",
                "activities": [
                    {
                        "name": "Temple Visit",
                        "time": "08:00 AM",
                        "duration": "1.5 hrs",
                        "description": "Visit the most famous temple in the area.",
                        "cost": "Free",
                        "lat": 28.5245, "lng": 77.1855,
                        "category": "culture",
                        "nearby_alternatives": [
                            {"name": "Garden Walk", "description": "Peaceful garden adjacent to the temple.", "duration": "30 min", "cost": "Free", "lat": 28.5250, "lng": 77.1840, "category": "relaxation", "reason": "Next door, quick visit"}
                        ]
                    },
                    {
                        "name": "Museum Tour",
                        "time": "10:00 AM",
                        "duration": "2 hrs",
                        "description": "Explore the local museum to learn about culture and history.",
                        "cost": "$10",
                        "lat": 28.6180, "lng": 77.2320,
                        "category": "culture",
                        "nearby_alternatives": [
                            {"name": "Art Gallery", "description": "Small gallery featuring local artists — quick walkthrough.", "duration": "40 min", "cost": "$5", "lat": 28.6190, "lng": 77.2300, "category": "culture", "reason": "2 blocks away, shorter visit"}
                        ]
                    },
                    {
                        "name": "Nature Park",
                        "time": "12:30 PM",
                        "duration": "1.5 hrs",
                        "description": "Relax and enjoy a peaceful afternoon at the botanical garden.",
                        "cost": "Free",
                        "lat": 28.5967, "lng": 77.2200,
                        "category": "relaxation",
                        "nearby_alternatives": [
                            {"name": "Botanical Glasshouse", "description": "Indoor exotic plant exhibit — 20 min walkthrough.", "duration": "20 min", "cost": "$3", "lat": 28.5970, "lng": 77.2210, "category": "sightseeing", "reason": "Inside the park, very quick"}
                        ]
                    },
                    {
                        "name": "Sunset Viewpoint",
                        "time": "04:30 PM",
                        "duration": "1 hr",
                        "description": "Watch the sunset from a famous viewpoint in the city.",
                        "cost": "Free",
                        "lat": 28.6028, "lng": 77.2068,
                        "category": "sightseeing",
                        "nearby_alternatives": [
                            {"name": "Lake Walk", "description": "Scenic walk around the nearby lake.", "duration": "35 min", "cost": "Free", "lat": 28.6035, "lng": 77.2050, "category": "relaxation", "reason": "Adjacent viewpoint area"}
                        ]
                    },
                ],
            },
            {
                "day": 3,
                "date": "Day 3",
                "activities": [
                    {
                        "name": "Day Trip to Nearby Falls",
                        "time": "07:00 AM",
                        "duration": "3 hrs",
                        "description": "Scenic waterfalls a short drive from the city center.",
                        "cost": "$40",
                        "lat": 28.4870, "lng": 77.0670,
                        "category": "adventure",
                        "nearby_alternatives": [
                            {"name": "River Rafting", "description": "Short white-water rafting experience (1.5 hrs).", "duration": "1.5 hrs", "cost": "$35", "lat": 28.4860, "lng": 77.0680, "category": "adventure", "reason": "Same location, shorter duration"}
                        ]
                    },
                    {
                        "name": "Shopping at Local Bazaar",
                        "time": "10:30 AM",
                        "duration": "2 hrs",
                        "description": "Browse through traditional handicrafts and textiles.",
                        "cost": "$30",
                        "lat": 28.6353, "lng": 77.2240,
                        "category": "shopping",
                        "nearby_alternatives": [
                            {"name": "Handicraft Workshop", "description": "Watch artisans at work — 30 min demo.", "duration": "30 min", "cost": "Free", "lat": 28.6358, "lng": 77.2248, "category": "culture", "reason": "Inside the bazaar, very quick"}
                        ]
                    },
                    {
                        "name": "Cooking Class",
                        "time": "01:00 PM",
                        "duration": "2 hrs",
                        "description": "Learn to cook authentic local dishes from a professional chef.",
                        "cost": "$35",
                        "lat": 28.6190, "lng": 77.2340,
                        "category": "food",
                        "nearby_alternatives": [
                            {"name": "Food Tasting Tour", "description": "Sample 5 local dishes at nearby stalls — 45 min.", "duration": "45 min", "cost": "$15", "lat": 28.6195, "lng": 77.2345, "category": "food", "reason": "Same neighborhood, quicker option"}
                        ]
                    },
                    {
                        "name": "Farewell Dinner",
                        "time": "06:00 PM",
                        "duration": "2 hrs",
                        "description": "Special farewell dinner at a rooftop restaurant.",
                        "cost": "$50",
                        "lat": 28.6280, "lng": 77.2080,
                        "category": "food",
                        "nearby_alternatives": [
                            {"name": "Street Food Finale", "description": "Quick farewell feast at famous street stalls.", "duration": "1 hr", "cost": "$15", "lat": 28.6285, "lng": 77.2075, "category": "food", "reason": "Same roof area, half the time & cost"}
                        ]
                    },
                ],
            },
        ]
    }


def parse_time_to_minutes(t):
    if not t:
        return None
    m = re.match(r"(\d+):(\d+)\s*(AM|PM)", t, re.I)
    if m:
        h, mi, ap = int(m.group(1)), int(m.group(2)), m.group(3).upper()
        if ap == "PM" and h != 12:
            h += 12
        elif ap == "AM" and h == 12:
            h = 0
        return h * 60 + mi
    return None


def time_add(t, minutes):
    if not t:
        return t
    total = parse_time_to_minutes(t)
    if total is None:
        return t
    total += minutes
    h = total // 60 % 24
    m = total % 60
    ap = "AM" if h < 12 else "PM"
    if h == 0:
        h = 12
    elif h > 12:
        h -= 12
    return f"{h}:{m:02d} {ap}"


def post_process_itinerary(itinerary_dict):
    for day in itinerary_dict.get("days", []):
        acts = day.get("activities", [])
        inject_transit(acts)
        # Set default day_start from first activity time
        if not day.get("day_start") and acts and acts[0].get("time"):
            day["day_start"] = acts[0]["time"]
        # Set default day_end (12 hours after start, or 9 PM)
        if not day.get("day_end"):
            if day.get("day_start"):
                day["day_end"] = time_add(day["day_start"], 12 * 60)
            else:
                day["day_end"] = "09:00 PM"
        # Auto-fill time if missing
        for i, act in enumerate(acts):
            if not act.get("time") and i > 0:
                prev = acts[i - 1]
                prev_dur = parse_duration_minutes(prev.get("duration", ""))
                prev_transit = prev.get("next_transit", {}).get("minutes", 0)
                prev_time = prev.get("time")
                if prev_time:
                    act["time"] = time_add(prev_time, prev_dur + prev_transit)
            if not act.get("time"):
                day_start = day.get("day_start", "09:00 AM")
                start_min = parse_time_to_minutes(day_start)
                if start_min is not None:
                    act["time"] = time_add(day_start, i * 60)
                else:
                    act["time"] = f"{9 + i}:00 AM"
        optimize_day_schedule(day)
    return itinerary_dict


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
            "For each activity include a start time (time), duration (duration), "
            "and 1-2 nearby_alternatives (each with name, description, duration, cost, lat, lng, category, reason why it's a good alternative when short on time). "
            "Return ONLY valid JSON with this exact structure (no markdown, no backticks): "
            '{"days": [{"day": 1, "date": "...", "activities": [{"name": "...", "time": "...", "duration": "...", "description": "...", "cost": "...", "lat": 0.0, "lng": 0.0, "category": "...", "nearby_alternatives": [{"name": "...", "description": "...", "duration": "...", "cost": "...", "lat": 0.0, "lng": 0.0, "category": "...", "reason": "..."}]}]}]}'
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

    itinerary_dict = post_process_itinerary(itinerary_dict)

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
    return _trip_dict(trip)


@router.get("/", response_model=list[TripResponse])
def list_trips(user_id: int, db: Session = Depends(get_db)):
    return db.query(Trip).filter(Trip.user_id == user_id).order_by(Trip.created_at.desc()).all()


def _trip_dict(trip):
    d = {
        "id": trip.id,
        "title": trip.title,
        "destination": trip.destination,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "budget": trip.budget,
        "interests": trip.interests,
        "itinerary": trip.itinerary,
        "share_token": trip.share_token,
        "created_at": trip.created_at.isoformat() if trip.created_at else None,
        "budget_summary": calculate_budget(trip.itinerary),
    }
    return d


@router.get("/{trip_id}")
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return _trip_dict(trip)


@router.patch("/{trip_id}")
def patch_trip(trip_id: int, body: PatchAction, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    itinerary = trip.itinerary
    days = itinerary.get("days", [])
    if body.day_index is None or body.day_index < 0 or body.day_index >= len(days):
        raise HTTPException(status_code=400, detail="Invalid day_index")
    day = days[body.day_index]
    acts = day.get("activities", [])

    if body.action == "shorten":
        if body.activity_index is None or body.activity_index < 0 or body.activity_index >= len(acts):
            raise HTTPException(status_code=400, detail="Invalid activity_index")
        if not body.new_duration:
            raise HTTPException(status_code=400, detail="new_duration required")
        acts[body.activity_index]["duration"] = body.new_duration

    elif body.action == "swap":
        if body.activity_index is None or body.activity_index < 0 or body.activity_index >= len(acts):
            raise HTTPException(status_code=400, detail="Invalid activity_index")
        if body.alternative_index is None:
            raise HTTPException(status_code=400, detail="alternative_index required")
        act = acts[body.activity_index]
        alternatives = act.get("nearby_alternatives", [])
        if body.alternative_index < 0 or body.alternative_index >= len(alternatives):
            raise HTTPException(status_code=400, detail="Invalid alternative_index")
        alt = alternatives[body.alternative_index]
        time = act.get("time")
        act.clear()
        act.update(alt)
        if time:
            act["time"] = time

    elif body.action == "skip":
        if body.activity_index is None or body.activity_index < 0 or body.activity_index >= len(acts):
            raise HTTPException(status_code=400, detail="Invalid activity_index")
        day["activities"] = [a for j, a in enumerate(acts) if j != body.activity_index]

    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {body.action}")

    inject_transit(day.get("activities", []))
    optimize_day_schedule(day)

    trip.itinerary = itinerary
    db.commit()
    db.refresh(trip)
    return _trip_dict(trip)


@router.delete("/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted"}


@router.post("/{trip_id}/share")
def generate_share_link(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if not trip.share_token:
        trip.share_token = secrets.token_urlsafe(16)
        db.commit()
        db.refresh(trip)
    return {"share_token": trip.share_token}


@router.get("/shared/{token}")
def get_shared_trip(token: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.share_token == token).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return _trip_dict(trip)
