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


def calculate_budget(itinerary: dict) -> dict:
    days = itinerary.get("days", []) if itinerary else []
    daily_costs = []
    total_cost = 0.0
    currency = ""

    for day in days:
        day_cost = 0.0
        for act in day.get("activities", []):
            cost_str = act.get("cost", "")
            day_cost += parse_cost(cost_str)
            if not currency:
                currency = detect_currency(cost_str)
        daily_costs.append({
            "day": day.get("day", 0),
            "date": day.get("date", ""),
            "cost": round(day_cost, 2),
            "activities_count": len(day.get("activities", [])),
        })
        total_cost += day_cost

    return {
        "total_cost": round(total_cost, 2),
        "currency": currency,
        "daily_costs": daily_costs,
    }
