from fastapi import APIRouter, Query
import httpx
import asyncio

router = APIRouter()

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

CATEGORY_TAGS = {
    "food": [("amenity", "restaurant"), ("amenity", "cafe"), ("amenity", "fast_food"), ("amenity", "pub")],
    "sightseeing": [("tourism", "attraction"), ("tourism", "viewpoint"), ("historic", "monument")],
    "adventure": [("leisure", "adventure"), ("sport", "climbing"), ("tourism", "theme_park")],
    "culture": [("tourism", "museum"), ("historic", "museum"), ("amenity", "arts_centre"), ("tourism", "gallery")],
    "shopping": [("shop", "mall"), ("shop", "department_store"), ("shop", "gift"), ("shop", "supermarket")],
    "relaxation": [("leisure", "park"), ("leisure", "garden"), ("natural", "beach"), ("leisure", "nature_reserve")],
    "nightlife": [("amenity", "nightclub"), ("amenity", "bar"), ("amenity", "casino")],
    "hotel": [("tourism", "hotel"), ("tourism", "hostel"), ("tourism", "guest_house")],
}

ALL_CATEGORIES = list(CATEGORY_TAGS.keys())


def build_overpass_query(lat: float, lng: float, radius: int, tags: list) -> str:
    tag_filters = " ".join(f'["{k}"="{v}"]' for k, v in tags)
    return f"""
    [out:json][timeout:10];
    (node(around:{radius},{lat},{lng}){tag_filters};
     way(around:{radius},{lat},{lng}){tag_filters};
     rel(around:{radius},{lat},{lng}){tag_filters};);
    out center 10;
    """


def parse_overpass_result(elements: list, origin_lat: float, origin_lng: float) -> list:
    results = []
    for el in elements:
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lng = el.get("lon") or el.get("center", {}).get("lon")
        if lat is None or lng is None:
            continue

        tags = el.get("tags", {})
        name = tags.get("name", "")
        if not name:
            continue

        category = "other"
        for cat, cat_tags in CATEGORY_TAGS.items():
            for k, v in cat_tags:
                if tags.get(k) == v:
                    category = cat
                    break
            if category != "other":
                break

        dist = ((lat - origin_lat) ** 2 + (lng - origin_lng) ** 2) ** 0.5 * 111_000

        results.append({
            "name": name,
            "description": tags.get("description", tags.get("note", "")),
            "lat": lat,
            "lng": lng,
            "category": category,
            "distance_m": round(dist),
            "address": tags.get("addr:street", "") + " " + tags.get("addr:housenumber", ""),
        })
    return results


@router.get("/nearby")
def search_nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(500, ge=50, le=5000),
    category: str = Query(None),
):
    if category and category in CATEGORY_TAGS:
        tags = CATEGORY_TAGS[category]
    else:
        tags = []
        for cat_tags in CATEGORY_TAGS.values():
            tags.extend(cat_tags)

    query = build_overpass_query(lat, lng, radius, tags)

    try:
        resp = httpx.post(OVERPASS_URL, data={"data": query}, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return {"places": [], "error": "Unable to fetch nearby places"}

    places = parse_overpass_result(data.get("elements", []), lat, lng)

    places.sort(key=lambda p: p["distance_m"])
    top = places[:15]

    return {"places": top}
