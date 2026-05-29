import { useState, useEffect } from "react";
import { weather } from "../api";

function WeatherPanel({ lat, lng, dayLabel }) {
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

  if (error || !data) return null;

  return (
    <div className="weather-strip">
      {data.map((d) => (
        <div key={d.date} className="weather-chip" title={`${d.date}: ${d.temp_max}°C / ${d.temp_min}°C`}>
          <span className="weather-icon">{d.icon}</span>
          <span className="weather-temp">{Math.round(d.temp_max)}°</span>
        </div>
      ))}
    </div>
  );
}

export default WeatherPanel;
