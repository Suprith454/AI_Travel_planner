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
    symbols = {"$": "$", "€": "€", "£": "£", "¥": "¥", "₹": "₹", "₩": "₩", "₱": "₱", "₴": "₴", "₪": "₪", "د.إ": "د.إ", "R": "R", "₫": "₫"}
    for sym, code in symbols.items():
        if sym in cost_str:
            return sym
    return ""


DESTINATION_CURRENCY = {
    "india": "₹", "goa": "₹", "manali": "₹", "mumbai": "₹", "delhi": "₹", "bangalore": "₹", "bengaluru": "₹",
    "chennai": "₹", "kerala": "₹", "jaipur": "₹", "varanasi": "₹", "rishikesh": "₹", "agra": "₹", "udaipur": "₹",
    "japan": "¥", "tokyo": "¥", "kyoto": "¥", "osaka": "¥", "hokkaido": "¥",
    "china": "¥", "beijing": "¥", "shanghai": "¥", "hong kong": "HK$", "macau": "MOP$",
    "south korea": "₩", "seoul": "₩", "busan": "₩",
    "vietnam": "₫", "hanoi": "₫", "ho chi minh": "₫", "saigon": "₫",
    "thailand": "฿", "bangkok": "฿", "phuket": "฿", "chiang mai": "฿",
    "singapore": "S$",
    "indonesia": "Rp", "bali": "Rp", "jakarta": "Rp",
    "malaysia": "RM", "kuala lumpur": "RM",
    "nepal": "₨", "kathmandu": "₨", "pokhara": "₨",
    "sri lanka": "₨",
    "philippines": "₱", "manila": "₱", "cebu": "₱",
    "uae": "د.إ", "dubai": "د.إ", "abu dhabi": "د.إ",
    "turkey": "₺", "istanbul": "₺", "antalya": "₺",
    "uk": "£", "london": "£", "manchester": "£", "england": "£", "britain": "£",
    "europe": "€", "france": "€", "paris": "€", "italy": "€", "rome": "€", "milan": "€", "venice": "€",
    "spain": "€", "barcelona": "€", "madrid": "€", "germany": "€", "berlin": "€", "munich": "€",
    "netherlands": "€", "amsterdam": "€", "belgium": "€", "brussels": "€",
    "switzerland": "CHF", "zurich": "CHF", "geneva": "CHF",
    "sweden": "kr", "stockholm": "kr",
    "norway": "kr", "oslo": "kr",
    "denmark": "kr", "copenhagen": "kr",
    "australia": "A$", "sydney": "A$", "melbourne": "A$",
    "new zealand": "NZ$", "auckland": "NZ$",
    "usa": "$", "united states": "$", "new york": "$", "san francisco": "$", "chicago": "$",
    "los angeles": "$", "las vegas": "$", "miami": "$", "boston": "$",
    "canada": "C$", "toronto": "C$", "vancouver": "C$", "montreal": "C$",
    "mexico": "Mex$", "mexico city": "Mex$", "cancun": "Mex$",
    "brazil": "R$", "rio de janeiro": "R$", "sao paulo": "R$",
    "argentina": "AR$", "buenos aires": "AR$",
    "south africa": "R", "cape town": "R", "johannesburg": "R",
    "egypt": "E£", "cairo": "E£",
    "morocco": "MAD", "marrakech": "MAD",
    "kenya": "KSh", "nairobi": "KSh",
    "israel": "₪", "tel aviv": "₪", "jerusalem": "₪",
    "russia": "₽", "moscow": "₽", "st petersburg": "₽",
    "ukraine": "₴", "kyiv": "₴",
}


def get_currency_for_destination(destination: str) -> str:
    if not destination:
        return "$"
    dest_lower = destination.lower().strip()
    for key, sym in DESTINATION_CURRENCY.items():
        if key in dest_lower or dest_lower in key:
            return sym
    return "$"


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


def calculate_budget(itinerary: dict, destination: str = "") -> dict:
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

    if not currency and destination:
        currency = get_currency_for_destination(destination)

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
