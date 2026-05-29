import { useState, useEffect } from "react";
import { weather } from "../api";

function getWeatherCondition(data) {
  if (!data || data.length === 0) return null;
  const today = data[0];
  const temp = today.temp_max;
  const desc = (today.description || "").toLowerCase();
  if (desc.includes("rain") || desc.includes("drizzle") || desc.includes("thunder")) return "rainy";
  if (desc.includes("cloud") || desc.includes("overcast")) return "cloudy";
  if (desc.includes("snow") || desc.includes("sleet")) return "cold";
  if (temp >= 35) return "hot";
  if (temp >= 25) return "warm";
  return "pleasant";
}

const CONDITION_LABELS = {
  rainy: { label: "Rainy", icon: "\u{1F327}\uFE0F", tip: "Indoor activities recommended" },
  cloudy: { label: "Cloudy", icon: "\u{2601}\uFE0F", tip: "Good for outdoor with light layers" },
  cold: { label: "Cold", icon: "\u{2744}\uFE0F", tip: "Bundle up for outdoor activities" },
  hot: { label: "Hot", icon: "\u{2600}\uFE0F", tip: "Stay hydrated, avoid midday sun" },
  warm: { label: "Warm", icon: "\u{1F31E}", tip: "Perfect for outdoor activities" },
  pleasant: { label: "Pleasant", icon: "\u{1F31E}", tip: "Great weather for anything" },
};

function WeatherPanel({ lat, lng, onCondition }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;
    let cancelled = false;
    weather.get(lat, lng)
      .then((res) => {
        if (!cancelled && res.forecast?.length > 0) {
          setData(res.forecast.slice(0, 7));
        }
      })
      .catch(() => setError(true));
    return () => { cancelled = true; };
  }, [lat, lng]);

  useEffect(() => {
    if (data && onCondition) {
      onCondition(getWeatherCondition(data));
    }
  }, [data, onCondition]);

  if (error || !data) return null;

  const condition = getWeatherCondition(data);
  const info = CONDITION_LABELS[condition] || CONDITION_LABELS.pleasant;

  return (
    <div className="weather-strip" title={info.tip}>
      {data.map((d) => (
        <div key={d.date} className="weather-chip" title={`${d.date}: ${d.temp_max}°C / ${d.temp_min}°C`}>
          <span className="weather-icon">{d.icon}</span>
          <span className="weather-temp">{Math.round(d.temp_max)}°</span>
        </div>
      ))}
      <div className="weather-condition-badge">{info.icon} {info.label}</div>
    </div>
  );
}

export default WeatherPanel;
export { CONDITION_LABELS };