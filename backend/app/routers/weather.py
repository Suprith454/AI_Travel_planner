from fastapi import APIRouter, Query
import httpx

router = APIRouter()

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

CONDITION_CODES = {
    0: "clear", 1: "mostly_clear", 2: "partly_cloudy", 3: "overcast",
    45: "foggy", 48: "foggy",
    51: "drizzle", 53: "drizzle", 55: "drizzle",
    56: "freezing_drizzle", 57: "freezing_drizzle",
    61: "rain", 63: "rain", 65: "heavy_rain",
    66: "freezing_rain", 67: "freezing_rain",
    71: "snow", 73: "snow", 75: "heavy_snow",
    77: "snow_grains",
    80: "rain_showers", 81: "rain_showers", 82: "rain_showers",
    85: "snow_showers", 86: "snow_showers",
    95: "thunderstorm", 96: "thunderstorm", 99: "thunderstorm",
}


def map_condition(code: int) -> str:
    return CONDITION_CODES.get(code, "unknown")


WEATHER_ICONS = {
    "clear": "\u2600\uFE0F",
    "mostly_clear": "\uD83C\uDF24\uFE0F",
    "partly_cloudy": "\u26C5",
    "overcast": "\u2601\uFE0F",
    "foggy": "\uD83C\uDF2B\uFE0F",
    "drizzle": "\uD83C\uDF26\uFE0F",
    "freezing_drizzle": "\uD83C\uDF26\uFE0F",
    "rain": "\uD83C\uDF27\uFE0F",
    "heavy_rain": "\uD83C\uDF27\uFE0F",
    "freezing_rain": "\uD83C\uDF27\uFE0F",
    "snow": "\u2744\uFE0F",
    "heavy_snow": "\u2744\uFE0F",
    "snow_grains": "\u2744\uFE0F",
    "rain_showers": "\uD83C\uDF26\uFE0F",
    "snow_showers": "\u2744\uFE0F",
    "thunderstorm": "\u26A1",
    "unknown": "\u2753",
}


@router.get("/weather")
def get_weather(
    lat: float = Query(...),
    lng: float = Query(...),
    date: str = Query(None),
):
    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        "timezone": "auto",
        "forecast_days": 7,
    }
    try:
        resp = httpx.get(OPEN_METEO_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return {"error": "Unable to fetch weather data", "forecast": []}

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    codes = daily.get("weather_code", [])
    temps_max = daily.get("temperature_2m_max", [])
    temps_min = daily.get("temperature_2m_min", [])
    precip = daily.get("precipitation_probability_max", [])

    forecast = []
    for i in range(len(dates)):
        code = codes[i] if i < len(codes) else 0
        condition = map_condition(code)
        icon = WEATHER_ICONS.get(condition, "\u2753")
        day_data = {
            "date": dates[i],
            "condition": condition,
            "icon": icon,
            "temp_max": temps_max[i] if i < len(temps_max) else None,
            "temp_min": temps_min[i] if i < len(temps_min) else None,
            "precipitation_pct": precip[i] if i < len(precip) else None,
        }
        if date and day_data["date"] == date:
            return {"forecast": [day_data]}
        forecast.append(day_data)

    if date:
        return {"forecast": []}

    return {"forecast": forecast}
