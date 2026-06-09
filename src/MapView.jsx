import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function InvalidateSize() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100); }, [map]);
  return null;
}

const C = {
  bg: "#F5F5F7", surface: "#FFFFFF", fg: "#1D1D1F", muted: "#6E6E73",
  border: "#D2D2D7", accent: "#E8E8ED",
};
const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif";

const rarityColor = (score) => {
  const n = Number(score);
  if (n >= 9) return "#F59E0B";
  if (n >= 7) return "#F97316";
  if (n >= 5) return "#8B5CF6";
  if (n >= 3) return "#007AFF";
  return "#8E8E93";
};

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
};

export default function MapView() {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/sightings")
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); } else { setSightings(data); }
        setLoading(false);
      })
      .catch(() => { setError("No se pudo cargar el mapa"); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", color: C.muted, fontFamily: font, fontSize: 14 }}>
      Cargando mapa…
    </div>
  );

  if (error) return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: "32px 20px", textAlign: "center", fontFamily: font }}>
      <p style={{ color: "#FF3B30", fontSize: 14, margin: 0 }}>{error}</p>
    </div>
  );

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 16px" }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: C.fg, margin: 0 }}>{sightings.length}</p>
          <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>avistamientos</p>
        </div>
        <div style={{ flex: 1, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 16px" }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: C.fg, margin: 0 }}>
            {new Set(sightings.map(s => s.car_make + s.car_model)).size}
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>modelos únicos</p>
        </div>
        <div style={{ flex: 1, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 16px" }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#F59E0B", margin: 0 }}>
            {sightings.filter(s => Number(s.rarity_score) >= 7).length}
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>raros+</p>
        </div>
      </div>

      {/* Map */}
      <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 16 }}>
        <MapContainer
          center={[19.4326, -99.1332]}
          zoom={sightings.length > 0 ? 10 : 5}
          style={{ height: "55vh", width: "100%" }}
          zoomControl={false}
        >
          <InvalidateSize />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://openstreetmap.org">OSM</a>'
          />
          {sightings.map(s => (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={Number(s.rarity_score) >= 7 ? 9 : 7}
              pathOptions={{
                fillColor: rarityColor(s.rarity_score),
                fillOpacity: 0.85,
                color: "#fff",
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontFamily: font, minWidth: 140 }}>
                  <p style={{ fontWeight: 700, margin: "0 0 2px", fontSize: 14 }}>
                    {s.car_make} {s.car_model}
                  </p>
                  <p style={{ color: "#6E6E73", margin: "0 0 4px", fontSize: 12 }}>
                    {s.car_year}{s.trim ? ` · ${s.trim}` : ""}
                  </p>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: rarityColor(s.rarity_score),
                    background: rarityColor(s.rarity_score) + "18",
                    borderRadius: 100, padding: "2px 8px",
                  }}>
                    {s.rarity_label || "—"}
                  </span>
                  <p style={{ color: "#8E8E93", margin: "6px 0 0", fontSize: 11 }}>
                    {timeAgo(s.created_at)}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Recent sightings list */}
      {sightings.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.muted, margin: "0 0 8px" }}>
            Recientes
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sightings.slice(0, 10).map(s => (
              <div key={s.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.fg, margin: 0 }}>{s.car_make} {s.car_model}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>{s.car_year} · {timeAgo(s.created_at)}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: rarityColor(s.rarity_score), background: rarityColor(s.rarity_score) + "18", borderRadius: 100, padding: "3px 10px" }}>
                  {s.rarity_label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sightings.length === 0 && (
        <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: "40px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 32, margin: "0 0 8px" }}>📍</p>
          <p style={{ fontSize: 15, fontWeight: 500, color: C.fg, margin: "0 0 6px" }}>Todavía no hay avistamientos</p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Escanea un coche y registra el primero</p>
        </div>
      )}
    </div>
  );
}
