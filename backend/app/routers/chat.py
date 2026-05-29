from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import Trip, User
from ..routers.trips import (
    build_mock_itinerary, post_process_itinerary,
    parse_duration_minutes,
)
from ..utils import calculate_budget
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


class ChatPlanRequest(BaseModel):
    message: str
    user_id: int
    history: list[dict] | None = None


def list_user_trips(user_id: int, db: Session) -> str:
    trips = db.query(Trip).filter(Trip.user_id == user_id).order_by(Trip.created_at.desc()).limit(10).all()
    if not trips:
        return "No existing trips."
    lines = []
    for t in trips:
        created = t.created_at.strftime("%b %d, %Y") if t.created_at else "recently"
        lines.append(f"- {t.title} ({t.destination}), planned {created}")
    return "\n".join(lines)


def build_system_prompt(user_name: str, trips_context: str) -> str:
    return (
        "You are a travel planning assistant for the AI Travel Planner app. "
        "Your only job is to help users plan and manage trips. "
        "Never answer questions unrelated to travel, trip planning, or this app. "
        "Politely redirect off-topic questions back to travel planning.\n\n"
        "RULES:\n"
        "1. When a user wants to plan a trip, you MUST have the DESTINATION and NUMBER OF DAYS before creating it. "
        "If either is missing, ask a clarifying question.\n"
        "2. Budget is optional — ask for it but don't require it.\n"
        "3. Interests are optional — you can suggest activities based on the destination.\n"
        "4. Be conversational, friendly, and concise (under 120 words).\n"
        "5. You can reference the user's existing trips (listed below) when relevant.\n"
        "6. If asked about app features (how to view a trip, use the map, etc.), answer helpfully.\n"
        "7. If the user provides their full name or other personal info in conversation, "
        "do NOT store it or use it beyond the current reply.\n\n"
        "You MUST respond in JSON format with these fields:\n"
        '{"type": "...", "reply": "..."}\n\n'
        "- type: one of 'plan_ask' (need more info before planning), "
        "'plan_ready' (have all info, ready to create trip), "
        "'app_answer' (answering app/travel question), "
        "'off_topic' (not travel related)\n"
        "- reply: your conversational response to the user\n\n"
        "When type is 'plan_ready', include these extra fields:\n"
        '"params": {"destination": "...", "duration_days": 5, "budget": "...", '
        '"interests": "...", "travelers": 1}\n\n'
        f"USER NAME: {user_name}\n"
        f"USER'S EXISTING TRIPS:\n{trips_context}\n\n"
        "Remember: respond ONLY with valid JSON, no markdown or backticks."
    )


def generate_itinerary(destination: str, duration_days: int, budget: str, interests: str, travelers: int) -> dict:
    if not USE_MOCK and groq_client:
        prompt = (
            f"Plan a {duration_days}-day trip to {destination}. "
            f"Budget: {budget}. "
            f"Interests: {interests}. "
            f"Number of travelers: {travelers}. "
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
            return json.loads(text)
        except Exception:
            pass
    return build_mock_itinerary(destination)


def build_trip_reply(params: dict) -> str:
    dest = params.get("destination", "your destination")
    days = params.get("duration_days", 3)
    budget = params.get("budget", "Not specified")
    interests = params.get("interests", "General")
    lines = [
        f"Your **{days}-day trip to {dest}** is ready! 🎉",
        "",
        f"**Budget:** {budget}",
        f"**Interests:** {interests}",
        "",
        "Click the card below to explore your full day-by-day itinerary with maps, photos, and activity details! 👇",
    ]
    return "\n".join(lines)


@router.post("/plan")
def chat_plan(data: ChatPlanRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    trips_context = list_user_trips(data.user_id, db)
    system_prompt = build_system_prompt(user.name or user.email, trips_context)

    messages = [{"role": "system", "content": system_prompt}]

    for msg in (data.history or [])[-8:]:
        role = "assistant" if msg.get("role") == "bot" else "user"
        content = msg.get("text", msg.get("content", ""))
        if content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": data.message})

    if USE_MOCK or not groq_client:
        return mock_chat_response(data.message, data.user_id, db)

    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content.strip())
    except Exception as e:
        return {"reply": "I'm having trouble processing that. Could you try rephrasing?", "trip": None}

    if result.get("type") == "plan_ready":
        params = result.get("params", {})
        destination = params.get("destination", "")
        duration_days = params.get("duration_days", 3)
        budget = params.get("budget", "Not specified")
        interests = params.get("interests", "General")
        travelers = params.get("travelers", 1)

        itinerary_dict = generate_itinerary(destination, duration_days, budget, interests, travelers)
        itinerary_dict = post_process_itinerary(itinerary_dict)

        title = f"Trip to {destination}"
        trip = Trip(
            user_id=data.user_id,
            title=title,
            destination=destination,
            budget=budget,
            interests=interests,
            itinerary=itinerary_dict,
            start_date=None,
            end_date=None,
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        reply = result.get("reply") or build_trip_reply(params)
        budget_summary = calculate_budget(trip.itinerary)
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
                "budget_summary": budget_summary,
            },
        }

    return {"reply": result.get("reply", "I'm not sure how to help with that."), "trip": None}


def mock_chat_response(message: str, user_id: int, db: Session) -> dict:
    message_lower = message.lower()
    dest_match = __import__("re").search(r"(?:to|in|for)\s+([A-Za-z\s]{2,}?)(?:\s+(?:for|with|under|\d)|\.|$)", message_lower)
    days_match = __import__("re").search(r"(\d+)\s*-?\s*day", message_lower)
    destination = dest_match.group(1).strip().title() if dest_match else ""
    duration_days = int(days_match.group(1)) if days_match else 0

    if not destination:
        return {"reply": "Where would you like to travel? Tell me the destination!", "trip": None}

    if duration_days <= 0:
        return {"reply": f"**{destination}** sounds great! How many days are you planning to stay?", "trip": None}

    budget = "Not specified"
    budget_match = __import__("re").search(r"(?:under|budget of|for)\s*(₹?\s*[\d,]+)", message_lower)
    if budget_match:
        budget = budget_match.group(1)

    interests = "General"
    interests_match = __import__("re").search(r"(?:interests?|likes?|activities?):?\s*(.+?)(?:\.|$)", message_lower, __import__("re").I)
    if interests_match:
        interests = interests_match.group(1).strip().title()

    itinerary_dict = build_mock_itinerary(destination)
    itinerary_dict = post_process_itinerary(itinerary_dict)

    trip = Trip(
        user_id=user_id,
        title=f"Trip to {destination}",
        destination=destination,
        budget=budget,
        interests=interests,
        itinerary=itinerary_dict,
        start_date=None,
        end_date=None,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    reply = (
        f"Your **{duration_days}-day trip to {destination}** is ready! 🎉\n\n"
        f"**Budget:** {budget}\n"
        f"**Interests:** {interests}\n\n"
        "Click the card below to explore your full day-by-day itinerary! 👇"
    )
    budget_summary = calculate_budget(trip.itinerary)
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
            "budget_summary": budget_summary,
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
    user_name = trip.user.name if trip.user else "Traveler"

    messages = [{"role": "system", "content": (
        "You are a travel assistant for the AI Travel Planner app. "
        "Only answer questions related to this specific trip, travel planning, or app features. "
        "For anything unrelated, politely redirect back to travel.\n\n"
        f"USER: {user_name}\n\n"
        f"TRIP DATA:\n{context}\n\n"
        "Rules:\n"
        "- Answer based on the itinerary data above (times, costs, activities, nearby alternatives).\n"
        "- Be friendly, concise, and specific to {user_name}'s trip.\n"
        "- If asked about weather, suggest checking Open-Meteo or a weather app.\n"
        "- If asked about general knowledge or non-travel topics, politely decline.\n"
        "- Keep answers under 120 words."
    )}]

    for msg in (data.history or [])[-6:]:
        role = "assistant" if msg.get("role") == "bot" else "user"
        content = msg.get("text", msg.get("content", ""))
        if content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": data.question})

    if USE_MOCK or not groq_client:
        return {"answer": "Based on your itinerary, check each day card for details. The map shows all locations and you can find nearby alternatives using the 🗺 Nearby button on any activity."}

    try:
        resp = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
        )
        answer = resp.choices[0].message.content.strip()
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
