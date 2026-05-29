from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
import math
import httpx
import json
from ..utils import get_currency_for_destination

router = APIRouter()

# ============ SMART BUDGET FEASIBILITY ANALYZER ============

DESTINATION_COST_DATA = {
    "default": {"accommodation": (20, 50, 150), "food": (10, 25, 60), "transport": (5, 15, 40), "activities": (5, 20, 50)},
    "paris": {"accommodation": (50, 120, 300), "food": (20, 40, 100), "transport": (10, 25, 60), "activities": (15, 35, 80)},
    "london": {"accommodation": (45, 100, 250), "food": (18, 35, 80), "transport": (12, 28, 55), "activities": (12, 30, 70)},
    "tokyo": {"accommodation": (40, 90, 220), "food": (15, 30, 75), "transport": (8, 20, 50), "activities": (10, 25, 60)},
    "new york": {"accommodation": (60, 150, 350), "food": (25, 50, 120), "transport": (8, 20, 50), "activities": (20, 45, 100)},
    "dubai": {"accommodation": (50, 120, 300), "food": (15, 35, 80), "transport": (10, 22, 50), "activities": (25, 55, 120)},
    "bangkok": {"accommodation": (10, 25, 80), "food": (5, 10, 30), "transport": (3, 8, 20), "activities": (5, 15, 40)},
    "goa": {"accommodation": (10, 30, 100), "food": (5, 12, 35), "transport": (3, 10, 25), "activities": (5, 15, 40)},
    "manali": {"accommodation": (8, 25, 80), "food": (4, 10, 30), "transport": (5, 12, 30), "activities": (5, 15, 35)},
    "bali": {"accommodation": (15, 35, 100), "food": (5, 12, 35), "transport": (3, 10, 25), "activities": (8, 20, 50)},
    "sydney": {"accommodation": (55, 130, 300), "food": (20, 40, 90), "transport": (10, 25, 55), "activities": (20, 45, 100)},
    "mumbai": {"accommodation": (15, 40, 120), "food": (5, 12, 35), "transport": (3, 8, 25), "activities": (5, 15, 40)},
    "delhi": {"accommodation": (10, 30, 100), "food": (4, 10, 30), "transport": (3, 8, 20), "activities": (5, 12, 35)},
    "bangalore": {"accommodation": (12, 35, 100), "food": (5, 12, 35), "transport": (3, 10, 25), "activities": (5, 15, 35)},
    "chennai": {"accommodation": (10, 28, 90), "food": (4, 10, 30), "transport": (3, 8, 20), "activities": (5, 12, 30)},
    "kerala": {"accommodation": (10, 30, 100), "food": (4, 10, 30), "transport": (5, 12, 28), "activities": (5, 15, 35)},
    "jaipur": {"accommodation": (8, 25, 80), "food": (4, 10, 25), "transport": (3, 8, 20), "activities": (5, 12, 30)},
    "varanasi": {"accommodation": (8, 20, 70), "food": (3, 8, 20), "transport": (3, 8, 20), "activities": (3, 10, 25)},
    "rishikesh": {"accommodation": (8, 22, 75), "food": (3, 8, 22), "transport": (3, 8, 20), "activities": (5, 15, 35)},
    "amsterdam": {"accommodation": (50, 110, 250), "food": (18, 35, 80), "transport": (8, 20, 45), "activities": (15, 35, 75)},
    "rome": {"accommodation": (40, 90, 200), "food": (15, 30, 70), "transport": (8, 18, 40), "activities": (12, 28, 60)},
    "barcelona": {"accommodation": (35, 80, 180), "food": (15, 28, 65), "transport": (8, 18, 40), "activities": (12, 25, 55)},
    "istanbul": {"accommodation": (20, 50, 130), "food": (8, 18, 45), "transport": (5, 12, 30), "activities": (8, 20, 50)},
    "hanoi": {"accommodation": (8, 20, 60), "food": (3, 8, 20), "transport": (3, 8, 18), "activities": (5, 12, 30)},
    "cape town": {"accommodation": (25, 60, 150), "food": (10, 20, 50), "transport": (8, 18, 40), "activities": (15, 30, 65)},
    "mexico city": {"accommodation": (15, 35, 90), "food": (6, 15, 35), "transport": (3, 10, 25), "activities": (8, 18, 40)},
    "hong kong": {"accommodation": (45, 100, 250), "food": (12, 28, 65), "transport": (8, 18, 40), "activities": (15, 30, 70)},
    "singapore": {"accommodation": (40, 90, 220), "food": (12, 25, 60), "transport": (8, 18, 40), "activities": (15, 30, 65)},
    "kathmandu": {"accommodation": (8, 20, 60), "food": (3, 8, 20), "transport": (3, 8, 18), "activities": (5, 12, 30)},
    "sri lanka": {"accommodation": (10, 25, 80), "food": (4, 10, 25), "transport": (5, 12, 28), "activities": (5, 15, 35)},
}


def _get_cost_data(destination: str) -> dict:
    dest_lower = destination.lower().strip()
    for key in DESTINATION_COST_DATA:
        if key in dest_lower or dest_lower in key:
            return DESTINATION_COST_DATA[key]
    return DESTINATION_COST_DATA["default"]


def _tier_pick(data: dict, tier: str) -> dict:
    idx = 0 if tier == "budget" else (1 if tier == "mid" else 2)
    return {
        "accommodation": data["accommodation"][idx],
        "food": data["food"][idx],
        "transport": data["transport"][idx],
        "activities": data["activities"][idx],
    }


@router.get("/budget/analyze")
def analyze_budget(
    destination: str = Query(...),
    days: int = Query(..., ge=1),
    travelers: int = Query(1, ge=1),
    budget: Optional[float] = Query(None),
    tier: str = Query("mid"),
):
    data = _get_cost_data(destination)
    costs = _tier_pick(data, tier)
    per_person_daily = sum(costs.values())
    total_per_person = per_person_daily * days
    total_trip = total_per_person * travelers

    breakdown = {
        "accommodation": {"daily": costs["accommodation"], "total": round(costs["accommodation"] * days * travelers, 2)},
        "food": {"daily": costs["food"], "total": round(costs["food"] * days * travelers, 2)},
        "transport": {"daily": costs["transport"], "total": round(costs["transport"] * days * travelers, 2)},
        "activities": {"daily": costs["activities"], "total": round(costs["activities"] * days * travelers, 2)},
    }

    currency = get_currency_for_destination(destination)

    result = {
        "destination": destination,
        "days": days,
        "travelers": travelers,
        "tier": tier,
        "currency": currency,
        "per_person_daily": round(per_person_daily, 2),
        "total_per_person": round(total_per_person, 2),
        "total_trip_cost": round(total_trip, 2),
        "breakdown": breakdown,
    }

    if budget and budget > 0:
        feasibility = min(100, round((total_trip / budget) * 100)) if total_trip > 0 else 100
        result["budget"] = budget
        result["feasibility_score"] = min(100, max(0, 100 - max(0, feasibility - 100)))
        result["over_budget"] = total_trip > budget
        result["excess_amount"] = round(max(0, total_trip - budget), 2)

        if result["over_budget"]:
            result["recommendation"] = f"Trip exceeds budget by {result['excess_amount']}. Consider reducing trip duration, choosing budget tier, or a closer destination."
        elif feasibility >= 80:
            result["recommendation"] = "Budget looks good! You have comfortable room for the trip."
        else:
            result["recommendation"] = "Budget is tight but feasible. Consider choosing budget tier or reducing days."
    else:
        result["budget"] = None
        result["feasibility_score"] = None
        result["recommendation"] = None

    return result


@router.get("/budget/multi-tier")
def multi_tier_budget(
    destination: str = Query(...),
    days: int = Query(..., ge=1),
    travelers: int = Query(1, ge=1),
):
    data = _get_cost_data(destination)
    currency = get_currency_for_destination(destination)
    tiers = {}
    for tier_name in ["budget", "mid", "luxury"]:
        costs = _tier_pick(data, tier_name)
        total = sum(costs.values()) * days * travelers
        tiers[tier_name] = {
            "total_cost": round(total, 2),
            "daily_per_person": round(sum(costs.values()), 2),
            "breakdown": {
                "accommodation": round(costs["accommodation"] * days * travelers, 2),
                "food": round(costs["food"] * days * travelers, 2),
                "transport": round(costs["transport"] * days * travelers, 2),
                "activities": round(costs["activities"] * days * travelers, 2),
            },
        }
    return {"destination": destination, "days": days, "travelers": travelers, "currency": currency, "tiers": tiers}


# ============ WEEKEND GETAWAY GENERATOR ============

NEARBY_DESTINATIONS = {
    "bangalore": [
        {"name": "Coorg", "state": "Karnataka", "travel_time": "5-6 hrs", "distance_km": 260, "budget_estimate": "₹8,000-15,000", "best_time": "Oct-Mar", "rating": 4.5, "type": "hill station"},
        {"name": "Mysore", "state": "Karnataka", "travel_time": "3 hrs", "distance_km": 150, "budget_estimate": "₹5,000-10,000", "best_time": "Oct-Mar", "rating": 4.3, "type": "heritage"},
        {"name": "Chikmagalur", "state": "Karnataka", "travel_time": "5-6 hrs", "distance_km": 240, "budget_estimate": "₹7,000-14,000", "best_time": "Sep-May", "rating": 4.4, "type": "hill station"},
        {"name": "Sakleshpur", "state": "Karnataka", "travel_time": "4-5 hrs", "distance_km": 220, "budget_estimate": "₹6,000-12,000", "best_time": "Oct-Mar", "rating": 4.2, "type": "hill station"},
        {"name": "Hampi", "state": "Karnataka", "travel_time": "6-7 hrs", "distance_km": 340, "budget_estimate": "₹6,000-12,000", "best_time": "Nov-Feb", "rating": 4.6, "type": "heritage"},
        {"name": "Wayanad", "state": "Kerala", "travel_time": "5-6 hrs", "distance_km": 270, "budget_estimate": "₹7,000-15,000", "best_time": "Oct-May", "rating": 4.4, "type": "hill station"},
        {"name": "Gokarna", "state": "Karnataka", "travel_time": "7-8 hrs", "distance_km": 420, "budget_estimate": "₹6,000-14,000", "best_time": "Oct-Mar", "rating": 4.3, "type": "beach"},
        {"name": "Pondicherry", "state": "Puducherry", "travel_time": "5-6 hrs", "distance_km": 310, "budget_estimate": "₹8,000-18,000", "best_time": "Oct-Mar", "rating": 4.2, "type": "heritage"},
    ],
    "mumbai": [
        {"name": "Lonavala", "state": "Maharashtra", "travel_time": "2 hrs", "distance_km": 100, "budget_estimate": "₹4,000-10,000", "best_time": "Jun-Sep", "rating": 4.2, "type": "hill station"},
        {"name": "Mahabaleshwar", "state": "Maharashtra", "travel_time": "5-6 hrs", "distance_km": 260, "budget_estimate": "₹6,000-14,000", "best_time": "Oct-Jun", "rating": 4.3, "type": "hill station"},
        {"name": "Pune", "state": "Maharashtra", "travel_time": "3-4 hrs", "distance_km": 150, "budget_estimate": "₹5,000-12,000", "best_time": "Oct-Mar", "rating": 4.1, "type": "city"},
        {"name": "Goa", "state": "Goa", "travel_time": "8-10 hrs", "distance_km": 580, "budget_estimate": "₹10,000-25,000", "best_time": "Nov-Feb", "rating": 4.5, "type": "beach"},
        {"name": "Alibaug", "state": "Maharashtra", "travel_time": "3 hrs", "distance_km": 120, "budget_estimate": "₹4,000-10,000", "best_time": "Oct-May", "rating": 4.0, "type": "beach"},
        {"name": "Matheran", "state": "Maharashtra", "travel_time": "3 hrs", "distance_km": 110, "budget_estimate": "₹3,000-8,000", "best_time": "Oct-May", "rating": 4.1, "type": "hill station"},
    ],
    "delhi": [
        {"name": "Jaipur", "state": "Rajasthan", "travel_time": "4-5 hrs", "distance_km": 280, "budget_estimate": "₹6,000-15,000", "best_time": "Oct-Mar", "rating": 4.4, "type": "heritage"},
        {"name": "Agra", "state": "Uttar Pradesh", "travel_time": "3-4 hrs", "distance_km": 230, "budget_estimate": "₹5,000-12,000", "best_time": "Oct-Mar", "rating": 4.5, "type": "heritage"},
        {"name": "Rishikesh", "state": "Uttarakhand", "travel_time": "5-6 hrs", "distance_km": 250, "budget_estimate": "₹5,000-14,000", "best_time": "Feb-Jun, Sep-Nov", "rating": 4.4, "type": "adventure"},
        {"name": "Manali", "state": "Himachal Pradesh", "travel_time": "10-12 hrs", "distance_km": 540, "budget_estimate": "₹8,000-20,000", "best_time": "Oct-Jun", "rating": 4.5, "type": "hill station"},
        {"name": "Shimla", "state": "Himachal Pradesh", "travel_time": "6-7 hrs", "distance_km": 350, "budget_estimate": "₹7,000-18,000", "best_time": "Mar-Jun, Dec-Feb", "rating": 4.3, "type": "hill station"},
        {"name": "Haridwar", "state": "Uttarakhand", "travel_time": "5-6 hrs", "distance_km": 220, "budget_estimate": "₹4,000-10,000", "best_time": "Oct-Mar", "rating": 4.1, "type": "religious"},
        {"name": "Amritsar", "state": "Punjab", "travel_time": "7-8 hrs", "distance_km": 450, "budget_estimate": "₹6,000-14,000", "best_time": "Oct-Mar", "rating": 4.3, "type": "heritage"},
    ],
    "chennai": [
        {"name": "Pondicherry", "state": "Puducherry", "travel_time": "3-4 hrs", "distance_km": 160, "budget_estimate": "₹5,000-12,000", "best_time": "Oct-Mar", "rating": 4.2, "type": "heritage"},
        {"name": "Mahabalipuram", "state": "Tamil Nadu", "travel_time": "1.5 hrs", "distance_km": 60, "budget_estimate": "₹3,000-8,000", "best_time": "Oct-Mar", "rating": 4.3, "type": "heritage"},
        {"name": "Kodaikanal", "state": "Tamil Nadu", "travel_time": "8-9 hrs", "distance_km": 500, "budget_estimate": "₹7,000-16,000", "best_time": "Apr-Jun, Sep-Oct", "rating": 4.4, "type": "hill station"},
        {"name": "Ooty", "state": "Tamil Nadu", "travel_time": "8-9 hrs", "distance_km": 540, "budget_estimate": "₹8,000-18,000", "best_time": "Apr-Jun, Sep-Nov", "rating": 4.3, "type": "hill station"},
    ],
    "kolkata": [
        {"name": "Darjeeling", "state": "West Bengal", "travel_time": "10-12 hrs", "distance_km": 570, "budget_estimate": "₹8,000-18,000", "best_time": "Apr-Jun, Sep-Nov", "rating": 4.5, "type": "hill station"},
        {"name": "Sundarbans", "state": "West Bengal", "travel_time": "4-5 hrs", "distance_km": 110, "budget_estimate": "₹5,000-12,000", "best_time": "Nov-Feb", "rating": 4.2, "type": "wildlife"},
        {"name": "Shantiniketan", "state": "West Bengal", "travel_time": "3-4 hrs", "distance_km": 160, "budget_estimate": "₹4,000-10,000", "best_time": "Oct-Mar", "rating": 4.1, "type": "heritage"},
    ],
    "hyderabad": [
        {"name": "Warangal", "state": "Telangana", "travel_time": "3 hrs", "distance_km": 150, "budget_estimate": "₹4,000-10,000", "best_time": "Oct-Mar", "rating": 4.1, "type": "heritage"},
        {"name": "Araku Valley", "state": "Andhra Pradesh", "travel_time": "10-12 hrs", "distance_km": 600, "budget_estimate": "₹6,000-14,000", "best_time": "Oct-Mar", "rating": 4.2, "type": "hill station"},
        {"name": "Vijayawada", "state": "Andhra Pradesh", "travel_time": "5-6 hrs", "distance_km": 280, "budget_estimate": "₹5,000-12,000", "best_time": "Oct-Mar", "rating": 4.0, "type": "city"},
    ],
    "default": [
        {"name": "Nearest Hill Station", "travel_time": "Varies", "distance_km": 100, "budget_estimate": "₹5,000-15,000", "best_time": "Year-round", "rating": 4.0, "type": "hill station"},
        {"name": "Nearest Beach Town", "travel_time": "Varies", "distance_km": 150, "budget_estimate": "₹6,000-15,000", "best_time": "Year-round", "rating": 4.0, "type": "beach"},
        {"name": "Nearest Heritage City", "travel_time": "Varies", "distance_km": 200, "budget_estimate": "₹5,000-12,000", "best_time": "Oct-Mar", "rating": 4.1, "type": "heritage"},
    ],
}


@router.get("/getaways/nearby")
def nearby_getaways(
    location: str = Query(...),
    budget: Optional[float] = Query(None),
    days: int = Query(2, ge=1, le=7),
):
    loc_lower = location.lower().strip()
    destinations = None
    for key in NEARBY_DESTINATIONS:
        if key in loc_lower or loc_lower in key:
            destinations = NEARBY_DESTINATIONS[key]
            break
    if not destinations:
        destinations = NEARBY_DESTINATIONS["default"]

    results = []
    for d in destinations:
        item = dict(d)
        if budget:
            item["within_budget"] = _estimate_within_budget(d.get("budget_estimate", ""), budget)
        else:
            item["within_budget"] = True
        results.append(item)

    return {"location": location, "days": days, "suggestions": results}


def _estimate_within_budget(est_str: str, budget: float) -> bool:
    import re
    nums = re.findall(r"[\d,]+", est_str.replace("₹", "").replace(",", ""))
    if len(nums) >= 2:
        low = float(nums[0])
        return low <= budget
    if len(nums) == 1:
        return float(nums[0]) <= budget
    return True


# ============ PACKING LIST GENERATOR ============

PACKING_ITEMS = {
    "clothes": {
        "essential": ["T-shirts (3-4)", "Underwear (1 per day)", "Socks (1 pair per day)", "Comfortable walking shoes", "Sleepwear"],
        "cold": ["Warm jacket", "Sweater/Hoodie", "Thermals", "Gloves", "Scarf", "Winter boots"],
        "hot": ["Light cotton clothes", "Shorts", "Sun hat", "Swimwear", "Sandals/Flip-flops"],
        "rainy": ["Raincoat/Umbrella", "Waterproof shoes", "Quick-dry clothes"],
        "religious": ["Modest clothing (covering shoulders/knees)", "Scarf/shawl for temples"],
    },
    "electronics": {
        "essential": ["Phone + charger", "Power bank (10000mAh+)", "Headphones/Earphones", "Camera (optional)"],
        "international": ["Universal travel adapter", "SIM card / eSIM", "Laptop/Tablet (if needed)"],
    },
    "medicines": {
        "essential": ["Basic first-aid kit", "Pain relievers (Paracetamol/Ibuprofen)", "Antacids", "Motion sickness pills", "Oral rehydration salts"],
        "prescription": ["Regular prescription medicines (enough for trip + extra)"],
        "precaution": ["Band-aids", "Antiseptic cream", "Insect repellent", "Sunscreen SPF 50+"],
    },
    "documents": {
        "essential": ["Government ID (Aadhaar/PAN/Driver's License)", "Trip itinerary printout", "Hotel booking confirmations", "Transport tickets"],
        "international": ["Passport (6+ months validity)", "Visa (if required)", "Travel insurance docs", "Passport-size photos (2-3)", "Emergency contact numbers"],
    },
    "travel essentials": {
        "essential": ["Reusable water bottle", "Snacks for journey", "Travel pillow", "Eye mask + Earplugs", "Wet wipes / Tissue paper", "Hand sanitizer", "Ziplock bags", "Small daypack"],
        "optional": ["Travel journal + pen", "Book/Kindle", "Playing cards", "Laundry bag"],
    },
}


@router.get("/packing-list")
def packing_list(
    destination: str = Query(...),
    days: int = Query(..., ge=1),
    climate: str = Query("hot"),
    international: bool = Query(False),
    religious_sites: bool = Query(False),
):
    result = {}
    weather_modifiers = []
    if climate in ("cold", "freezing"): weather_modifiers.append("cold")
    if climate in ("hot", "warm", "tropical"): weather_modifiers.append("hot")
    if climate in ("rainy", "monsoon"): weather_modifiers.append("rainy")

    # Clothes
    clothes = list(PACKING_ITEMS["clothes"]["essential"])
    for mod in weather_modifiers:
        clothes.extend(PACKING_ITEMS["clothes"].get(mod, []))
    if religious_sites:
        clothes.extend(PACKING_ITEMS["clothes"].get("religious", []))
    result["clothes"] = clothes

    # Electronics
    electronics = list(PACKING_ITEMS["electronics"]["essential"])
    if international:
        electronics.extend(PACKING_ITEMS["electronics"].get("international", []))
    result["electronics"] = electronics

    # Medicines
    medicines = list(PACKING_ITEMS["medicines"]["essential"])
    medicines.extend(PACKING_ITEMS["medicines"]["precaution"])
    if international:
        medicines.extend(PACKING_ITEMS["medicines"]["prescription"])
    result["medicines"] = medicines

    # Documents
    documents = list(PACKING_ITEMS["documents"]["essential"])
    if international:
        documents.extend(PACKING_ITEMS["documents"]["international"])
    result["documents"] = documents

    # Travel Essentials
    essentials = list(PACKING_ITEMS["travel essentials"]["essential"])
    result["travel essentials"] = essentials

    return {"destination": destination, "days": days, "climate": climate, "international": international, "categories": result}


# ============ EMERGENCY & SAFETY CENTER ============

EMERGENCY_DATA = {
    "india": {
        "police": "100",
        "ambulance": "108",
        "fire": "101",
        "women_helpline": "1091",
        "tourist_helpline": "1363 (multi-language)",
        "emergency": "112",
    },
    "usa": {"police": "911", "ambulance": "911", "fire": "911", "emergency": "911"},
    "uk": {"police": "999", "ambulance": "999", "fire": "999", "emergency": "112"},
    "france": {"police": "17", "ambulance": "15", "fire": "18", "emergency": "112"},
    "japan": {"police": "110", "ambulance": "119", "fire": "119", "emergency": "112"},
    "thailand": {"police": "191", "ambulance": "1669", "fire": "199", "tourist_police": "1155", "emergency": "112"},
    "uae": {"police": "999", "ambulance": "998", "fire": "997", "emergency": "112"},
    "australia": {"police": "000", "ambulance": "000", "fire": "000", "emergency": "112"},
    "singapore": {"police": "999", "ambulance": "995", "fire": "995", "emergency": "112"},
    "default": {"police": "112", "ambulance": "112", "fire": "112", "emergency": "112"},
}

SAFETY_TIPS = [
    "Keep your phone charged and carry a power bank.",
    "Share your itinerary with family or friends.",
    "Save emergency numbers before traveling.",
    "Avoid displaying valuable items in crowded places.",
    "Use registered taxis and ride-sharing apps.",
    "Keep digital and physical copies of important documents.",
    "Check local weather and news before heading out.",
    "Stay aware of common scams at tourist hotspots.",
    "Keep emergency cash in a separate location.",
    "Learn a few basic phrases in the local language.",
]

SCAM_TIPS = [
    "Beware of unofficial 'guides' offering tours at landmarks — always use authorized services.",
    "Check taxi fares beforehand or use metered/ride-sharing services.",
    "Avoid accepting 'free' items or blessings — they often come with hidden charges.",
    "Verify restaurant bills for extra items you didn't order.",
    "Don't trust strangers offering to take your photo — they may run with your phone/camera.",
    "Use official currency exchange counters, not street vendors.",
    "Be skeptical of 'closed for renovation' redirects to partner shops.",
    "Never share OTPs, PINs, or passwords with anyone.",
]


@router.get("/emergency")
def emergency_info(country: str = Query("india")):
    country_lower = country.lower().strip()
    numbers = EMERGENCY_DATA.get(country_lower, EMERGENCY_DATA["default"])

    is_international = country_lower != "india"

    embassy_info = {}
    if is_international:
        embassy_info = {
            "note": "Contact your country's embassy or consulate in the destination country.",
            "tip": "Register with your embassy before international travel for assistance.",
        }

    return {
        "country": country,
        "emergency_numbers": numbers,
        "safety_tips": SAFETY_TIPS,
        "scam_awareness": SCAM_TIPS,
        "embassy_info": embassy_info,
    }


# ============ HIDDEN GEMS ============

HIDDEN_GEMS = {
    "goa": [
        {"name": "Kakolem Beach", "type": "beach", "why": "Secluded 'secret' beach with fewer tourists, accessible via a short hike.", "location": "South Goa"},
        {"name": "Fontainhas", "type": "heritage", "why": "Latin Quarter with colorful Portuguese-era houses, quiet streets, and local art galleries.", "location": "Panjim"},
        {"name": "Cafe Alchemia", "type": "cafe", "why": "Charming riverside cafe with live music, great coffee, and local artwork — not on tourist maps.", "location": "Mandrem"},
    ],
    "paris": [
        {"name": "Rue Cremieux", "type": "viewpoint", "why": "A hidden pastel-colored street that's Instagram-worthy but far less crowded than Montmartre.", "location": "12th arrondissement"},
        {"name": "Le Comptoir General", "type": "cafe", "why": "Quirky canal-side bar with a greenhouse vibe, vintage decor, and affordable drinks.", "location": "Canal Saint-Martin"},
        {"name": "Passage des Panoramas", "type": "attraction", "why": "One of the oldest covered passages in Paris with unique shops and local eateries.", "location": "2nd arrondissement"},
    ],
    "tokyo": [
        {"name": "Yanesen Neighborhood", "type": "attraction", "why": "Old Tokyo vibe with narrow lanes, traditional shops, and hardly any tourists.", "location": "Yanaka, Nezu, Sendagi"},
        {"name": "Gotoh Planetarium", "type": "attraction", "why": "A budget-friendly, immersive planetarium experience often missed by visitors.", "location": "Shibuya"},
        {"name": "Shimokitazawa", "type": "shopping", "why": "Vintage clothing and indie music scene — less crowded than Harajuku.", "location": "Setagaya"},
    ],
    "bali": [
        {"name": "Tirta Gangga", "type": "attraction", "why": "A beautiful water palace with fewer crowds than Ubud's temples.", "location": "Karangasem"},
        {"name": "Sibetan Village", "type": "attraction", "why": "Known as the 'salak village' — experience authentic rural Bali and fruit farming.", "location": "East Bali"},
        {"name": "Nyanyi Beach", "type": "beach", "why": "A peaceful black sand beach with a temple, completely off the tourist radar.", "location": "Tabanan"},
    ],
    "manali": [
        {"name": "Jogini Waterfall", "type": "attraction", "why": "A serene waterfall 20-min walk from Vashisht — fewer tourists than Solang Valley.", "location": "Vashisht, Manali"},
        {"name": "Hamta Village", "type": "attraction", "why": "A quiet Himalayan village with stunning views, untouched by commercialization.", "location": "15 km from Manali"},
        {"name": "Cafe 1947", "type": "cafe", "why": "Riverside cafe with wood-fired pizza, live music, and a relaxed vibe away from Mall Road.", "location": "Old Manali"},
    ],
    "default": [
        {"name": "Local Street Food Market", "type": "food", "why": "Visit the less famous local market for authentic food at half the price of tourist areas.", "location": "Ask locals"},
        {"name": "Hidden Viewpoint", "type": "viewpoint", "why": "Ask for a local viewpoint — most cities have one that doesn't appear on tourist maps.", "location": "Ask locals"},
        {"name": "Neighborhood Cafe", "type": "cafe", "why": "Skip the chain cafes and find a local spot where residents hang out.", "location": "Residential area"},
    ],
}


@router.get("/hidden-gems")
def hidden_gems(destination: str = Query(...)):
    dest_lower = destination.lower().strip()
    for key in HIDDEN_GEMS:
        if key in dest_lower or dest_lower in key:
            return {"destination": destination, "gems": HIDDEN_GEMS[key]}
    return {"destination": destination, "gems": HIDDEN_GEMS["default"]}
