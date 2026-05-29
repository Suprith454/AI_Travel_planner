import re

COST_PATTERNS = [
    (r"([\d,]+)\s*-\s*([\d,]+)", lambda m: (float(m.group(1).replace(",", "")) + float(m.group(2).replace(",", ""))) / 2),
    (r"([\d,]+(?:\.\d+)?)", lambda m: float(m.group(1).replace(",", ""))),
]


def parse_cost(cost_str: str) -> float:
    if not cost_str:
        return 0.0
    s = cost_str.strip()
    if s.lower() in ("free", "not specified", "n/a", ""):
        return 0.0
    for pattern, fn in COST_PATTERNS:
        m = re.search(pattern, s)
        if m:
            return fn(m)
    return 0.0


def detect_currency(cost_str: str) -> str:
    if not cost_str:
        return ""
    symbols = {"$": "$", "€": "€", "£": "£", "¥": "¥", "₹": "₹", "₩": "₩"}
    for sym, code in symbols.items():
        if sym in cost_str:
            return sym
    return ""


CATEGORY_MAP = {
    "food": "Food",
    "restaurant": "Food",
    "dining": "Food",
    "meal": "Food",
    "breakfast": "Food",
    "lunch": "Food",
    "dinner": "Food",
    "accommodation": "Accommodation",
    "hotel": "Accommodation",
    "stay": "Accommodation",
    "lodging": "Accommodation",
    "resort": "Accommodation",
    "transport": "Transport",
    "transit": "Transport",
    "travel": "Transport",
    "drive": "Transport",
    "taxi": "Transport",
    "cab": "Transport",
    "uber": "Transport",
    "bus": "Transport",
    "train": "Transport",
    "flight": "Transport",
    "sightseeing": "Activities",
    "adventure": "Activities",
    "culture": "Activities",
    "shopping": "Activities",
    "nightlife": "Activities",
    "relaxation": "Activities",
    "tour": "Activities",
    "museum": "Activities",
    "hike": "Activities",
    "trek": "Activities",
    "park": "Activities",
    "beach": "Activities",
    "entertainment": "Activities",
    "activity": "Activities",
}


def categorize_cost(category: str) -> str:
    if not category:
        return "Other"
    for key, val in CATEGORY_MAP.items():
        if key in category.lower():
            return val
    return "Other"


def calculate_budget(itinerary: dict) -> dict:
    days = itinerary.get("days", []) if itinerary else []
    daily_costs = []
    total_cost = 0.0
    currency = ""
    category_totals = {}

    for day in days:
        day_cost = 0.0
        for act in day.get("activities", []):
            cost_str = act.get("cost", "")
            cost_val = parse_cost(cost_str)
            day_cost += cost_val
            if not currency:
                currency = detect_currency(cost_str)
            cat = categorize_cost(act.get("category", ""))
            category_totals[cat] = category_totals.get(cat, 0) + cost_val
        daily_costs.append({
            "day": day.get("day", 0),
            "date": day.get("date", ""),
            "cost": round(day_cost, 2),
            "activities_count": len(day.get("activities", [])),
        })
        total_cost += day_cost

    category_breakdown = [
        {"category": "Accommodation", "cost": round(category_totals.get("Accommodation", 0), 2)},
        {"category": "Food", "cost": round(category_totals.get("Food", 0), 2)},
        {"category": "Transport", "cost": round(category_totals.get("Transport", 0), 2)},
        {"category": "Activities", "cost": round(category_totals.get("Activities", 0), 2)},
        {"category": "Other", "cost": round(
            sum(v for k, v in category_totals.items() if k not in ("Accommodation", "Food", "Transport", "Activities")), 2
        )},
    ]

    return {
        "total_cost": round(total_cost, 2),
        "currency": currency,
        "daily_costs": daily_costs,
        "category_breakdown": [c for c in category_breakdown if c["cost"] > 0],
    }
