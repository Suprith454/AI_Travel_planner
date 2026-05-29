import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DAY_COLORS = [
  "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f97316", "#6366f1",
];

function ItineraryMap({ activities }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const valid = activities.filter((a) => a.lat != null && a.lng != null);

    if (valid.length === 0 || !mapRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    }).addTo(map);

    const markers = [];
    valid.forEach((act) => {
      const dayIndex = act.day ? act.day - 1 : 0;
      const color = DAY_COLORS[dayIndex % DAY_COLORS.length];

      const markerHtml = `<div style="
        width: 28px; height: 28px;
        background: ${color};
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      ">${act.day || (markers.length + 1)}</div>`;

      const icon = L.divIcon({
        html: markerHtml,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([act.lat, act.lng], { icon }).addTo(map);
      marker.bindPopup(`<b>${act.name}</b>${act.description ? `<br/>${act.description}` : ""}`);
      markers.push(marker);
    });

    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 12);
    } else {
      const bounds = L.latLngBounds(valid.map((a) => [a.lat, a.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [activities]);

  if (activities.filter((a) => a.lat != null && a.lng != null).length === 0) {
    return <div className="map-placeholder">No location coordinates available for map display.</div>;
  }

  return <div ref={mapRef} className="map-container" />;
}

export default ItineraryMap;
