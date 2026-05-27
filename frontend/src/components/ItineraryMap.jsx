import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    valid.forEach((act) => {
      const marker = L.marker([act.lat, act.lng]).addTo(map);
      marker.bindPopup(`<b>${act.name}</b>${act.description ? `<br>${act.description}` : ""}`);
    });

    map.setView([20, 0], 2);

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [activities]);

  if (activities.filter((a) => a.lat != null && a.lng != null).length === 0) {
    return <p style={{ color: "#888", fontSize: 13 }}>No location coordinates available for map display.</p>;
  }

  return <div ref={mapRef} className="map-container" />;
}

export default ItineraryMap;
