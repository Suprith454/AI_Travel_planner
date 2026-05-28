from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import Trip, User
from ..routers.trips import (
    build_mock_itinerary, post_process_itinerary,
    parse_duration_minutes, inject_transit,
)
import json
import os
import re
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
USE_MOCK = os.getenv("USE_MOCK", "true").lower() == "true"

groq_client = None
if not USE_MOCK:
    from groq import Groq
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


class ChatPlanRequest(BaseModel):
    message: str
    user_id: int


def parse_natural_language(message: str) -> dict:
    if not USE_MOCK and groq_client:
        prompt = (
            "Extract travel planning information from the following user message. "
            "Return ONLY valid JSON (no markdown, no backticks) with these fields:\n"
            '{"destination": "...", "duration_days": 5, "budget": "...", '
            '"interests": "...", "travelers": 2}\n'
            "- destination: the place they want to visit (required)\n"
            "- duration_days: number of days as integer (default 3 if not specified)\n"
            "- budget: their total budget as string (default 'Not specified')\n"
            "- interests: comma-separated interests as string (default 'General')\n"
            "- travelers: number of travelers as integer (default 1)\n\n"
            f"User message: {message}"
        )
        try:
            resp = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content.strip())
            return data
        except Exception:
            pass
    return extract_basic(message)


def extract_basic(message: str) -> dict:
    dest_match = re.search(r"to\s+([A-Za-z\s]+?)(?:\s+for|\s+under|\s+with|\s*$)", message, re.I)
    destination = dest_match.group(1).strip() if dest_match else "a wonderful destination"

    days_match = re.search(r"(\d+)\s*-?\s*day", message, re.I)
    duration = int(days_match.group(1)) if days_match else 3

    budget_match = re.search(r"(?:under|budget of|for)\s*(₹?\s*[\d,]+)", message)
    budget = budget_match.group(1) if budget_match else "Not specified"

    interests = "General"
    interests_match = re.search(r"(?:interests?|likes?|activities?):?\s*(.+?)(?:\.|$)", message, re.I)
    if interests_match:
        interests = interests_match.group(1).strip()

    return {
        "destination": destination,
        "duration_days": duration,
        "budget": budget,
        "interests": interests,
        "travelers": 1,
    }


def generate_friendly_reply(params: dict, trip) -> str:
    dest = params.get("destination", "your destination")
    days = params.get("duration_days", 3)
    budget = params.get("budget", "your budget")
    lines = [
        f"Here's your **{days}-day trip to {dest}**! 🎉",
        "",
        f"**Budget:** {budget}",
        f"**Interests:** {params.get('interests', 'General')}",
        "",
        "**Quick summary:**",
    ]
    itinerary = trip.itinerary or {}
    for day in itinerary.get("days", [])[:3]:
        acts = day.get("activities", [])
        names = [a.get("name", "") for a in acts[:3]]
        line = f"  **Day {day['day']}:** " + " → ".join(names)
        if len(acts) > 3:
            line += f" + {len(acts) - 3} more"
        lines.append(line)

    total_time = sum(
        parse_duration_minutes(a.get("duration", ""))
        for day in itinerary.get("days", [])
        for a in day.get("activities", [])
    )
    lines.append("")
    lines.append(f"⏱ **Total activity time:** ~{total_time // 60}h {total_time % 60}m")
    lines.append("")
    lines.append("Ready to explore? Click below to see the full day-by-day itinerary with maps, photos, and time management! 👇")
    return "\n".join(lines)


@router.post("/plan")
def chat_plan(data: ChatPlanRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1. Parse natural language into structured params
    params = parse_natural_language(data.message)
    destination = params.get("destination", "a wonderful destination")
    budget = params.get("budget", "Not specified")
    interests = params.get("interests", "General")

    # 2. Generate itinerary via Groq or mock
    itinerary_dict = None
    if not USE_MOCK and groq_client:
        prompt = (
            f"Plan a {params.get('duration_days', 3)}-day trip to {destination}. "
            f"Budget: {budget}. "
            f"Interests: {interests}. "
            f"Number of travelers: {params.get('travelers', 1)}. "
            "Provide a day-by-day itinerary with specific places, activities, "
            "approximate costs, and coordinates (lat/lng) for each place. "
            "Include for each activity: a start time (time), duration (duration), "
            "category (food/sightseeing/adventure/culture/shopping/relaxation/nightlife), "
            "and 1-2 nearby_alternatives (name, description, duration, cost, lat, lng, category, reason). "
            "Make the itinerary realistic and detailed. "
            "Return ONLY valid JSON with this exact structure (no markdown, no backticks): "
            '{"days": [{"day": 1, "date": "...", "activities": [{"name": "...", "time": "...", "duration": "...", "description": "...", "cost": "...", "lat": 0.0, "lng": 0.0, "category": "...", "nearby_alternatives": [...]}]}]}'
        )
        try:
            resp = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            text = resp.choices[0].message.content.strip()
            itinerary_dict = json.loads(text)
        except Exception:
            pass

    if itinerary_dict is None:
        itinerary_dict = build_mock_itinerary(destination)

    itinerary_dict = post_process_itinerary(itinerary_dict)

    # 3. Save trip
    title = f"Trip to {destination}"
    trip = Trip(
        user_id=data.user_id,
        title=title,
        destination=destination,
        budget=budget,
        interests=interests,
        itinerary=itinerary_dict,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # 4. Generate friendly reply
    reply = generate_friendly_reply(params, trip)

    return {
        "reply": reply,
        "trip": {
            "id": trip.id,
            "title": trip.title,
            "destination": trip.destination,
            "budget": trip.budget,
            "interests": trip.interests,
            "itinerary": trip.itinerary,
            "created_at": trip.created_at.isoformat() if trip.created_at else None,
        },
    }


class ChatAskRequest(BaseModel):
    trip_id: int
    question: str
    history: list[dict] | None = None


def make_trip_context(trip) -> str:
    it = trip.itinerary or {}
    days = it.get("days", [])
    lines = [
        f"Title: {trip.title}",
        f"Destination: {trip.destination}",
        f"Budget: {trip.budget or 'Not specified'}",
        f"Interests: {trip.interests or 'General'}",
        "",
        "--- FULL ITINERARY ---",
    ]
    for day in days:
        lines.append(f"\nDay {day.get('day', '?')} ({day.get('date', '')}):")
        lines.append(f"  Time window: {day.get('day_start', '?')} → {day.get('day_end', '?')}")
        lines.append(f"  Time used: {day.get('time_used', '?')}min / {day.get('time_budget', '?')}min budget")
        if day.get("over_budget"):
            lines.append("  ⚠ OVER BUDGET")
        for act in day.get("activities", []):
            transit = act.get("next_transit", {})
            transit_str = f" → {transit.get('mode', '?')} {transit.get('minutes', '?')}min" if transit else ""
            dur = act.get("duration", "")
            t = act.get("time", "")
            cost = act.get("cost", "")
            cat = act.get("category", "")
            lines.append(f"  {t} {act.get('name', '?')} ({dur}, {cost}) [{cat}]{transit_str}")
            if act.get("nearby_alternatives"):
                for alt in act["nearby_alternatives"][:1]:
                    lines.append(f"    Nearby: {alt.get('name', '')} ({alt.get('duration', '')})")
    return "\n".join(lines)


@router.post("/ask")
def chat_ask(data: ChatAskRequest, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == data.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    context = make_trip_context(trip)

    messages = [{"role": "system", "content": (
        "You are a travel assistant helping a user with their trip. "
        "Answer questions based on the trip itinerary provided below. "
        "Be friendly, concise, and specific to their trip. "
        "Use the itinerary data (times, costs, coordinates, nearby alternatives, transit) to give accurate answers. "
        "If they ask about the schedule, weather, or recommendations, reference their actual plan. "
        "If you don't know something, say so honestly. Keep answers under 150 words.\n\n"
        f"--- TRIP DATA ---\n{context}"
    )}]

    for msg in (data.history or [])[-6:]:
        role = "assistant" if msg.get("role") == "bot" else "user"
        content = msg.get("text", msg.get("content", ""))
        if content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": data.question})

    if USE_MOCK or not groq_client:
        return {"answer": "Based on your itinerary, I'd recommend checking the activity details in each day card. The map shows all locations and you can find nearby alternatives using the 🗺 Nearby button on any activity."}

    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
        )
        answer = resp.choices[0].message.content.strip()
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
