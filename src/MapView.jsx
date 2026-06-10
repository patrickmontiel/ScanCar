import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const C = {
  bg: "#F5F5F7", surface: "#FFFFFF", fg: "#1D1D1F", muted: "#6E6E73",
  border: "#D2D2D7", accent: "#E8E8ED", red: "#FF3B30",
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

const rarityLabel = (score) => {
  const n = Number(score);
  if (n >= 9) return "Unicornio";
  if (n >= 7) return "Muy raro";
  if (n >= 5) return "Raro";
  if (n >= 3) return "Poco común";
  return "Común";
};

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} días`;
};

function InvalidateSize() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 150); }, [map]);
  return null;
}

export default function MapView() {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetch("/api/sightings")
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else setSightings(data); setLoading(false); })
      .catch(() => { setError("No se pudo cargar el mapa"); setLoading(false); });
  }, []);

  const deleteSighting = async (id) => {
    if (!window.confirm("¿Eliminar este avistamiento?")) return;
    setDeleting(id);
    try {
      await fetch("/api/sightings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setSightings(prev => prev.filter(s => s.id !== id));
    } catch (e) {}
    setDeleting(null);
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", color: C.muted, fontFamily: font, fontSize: 14 }}>
      Cargando mapa…
    </div>
  );

  if (error) return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: "32px 20px", textAlign: "center", fontFamily: font }}>
      <p style={{ color: C.red, fontSize: 14, margin: 0 }}>{error}</p>
    </div>
  );

  const unique = new Set(sightings.map(s => `${s.car_make}${s.car_model}`)).size;
  const rare = sightings.filter(s => Number(s.rarity_score) >= 7).length;

  return (
    <div style={{ fontFamily: font }}>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { value: sightings.length, label: "avistamientos", color: C.fg },
          { value: unique, label: "modelos únicos", color: C.fg },
          { value: rare, label: "raros o más", color: "#F59E0B" },
        ].map(({ value, label, color }) => (
          <div key={label} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "12px 10px", textAlign: "center" }}>
            <p style={{ fontSize: 24, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 0", lineHeight: 1.2 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      <style>{`.sc-map .leaflet-tile-pane{filter:invert(1) grayscale(1) contrast(1.15) brightness(1.05)}`}</style>
      <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <MapContainer
          className="sc-map"
          center={[19.4326, -99.1332]}
          zoom={sightings.length > 0 ? 10 : 5}
          style={{ height: "52vh", width: "100%" }}
          zoomControl={false}
        >
          <InvalidateSize />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {sightings.map(s => {
            const color = rarityColor(s.rarity_score);
            const isRare = Number(s.rarity_score) >= 7;
            return (
              <CircleMarker
                key={s.id}
                center={[s.lat, s.lng]}
                radius={isRare ? 10 : 7}
                pathOptions={{ fillColor: color, fillOpacity: 0.9, color: "#fff", weight: 2 }}
              >
                <Popup>
                  <div style={{ fontFamily: font, minWidth: 160 }}>
                    <p style={{ fontWeight: 700, margin: "0 0 2px", fontSize: 14, color: "#1D1D1F" }}>
                      {s.car_make} {s.car_model}
                    </p>
                    <p style={{ color: "#6E6E73", margin: "0 0 8px", fontSize: 12 }}>
                      {s.car_year}{s.trim ? ` · ${s.trim}` : ""}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color, background: color + "18", borderRadius: 100, padding: "2px 8px" }}>
                        {s.rarity_label || rarityLabel(s.rarity_score)}
                      </span>
                      <span style={{ color: "#8E8E93", fontSize: 11 }}>{timeAgo(s.created_at)}</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Leyenda */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {[
          { color: "#8E8E93", label: "Común" },
          { color: "#007AFF", label: "Poco común" },
          { color: "#8B5CF6", label: "Raro" },
          { color: "#F97316", label: "Muy raro" },
          { color: "#F59E0B", label: "Unicornio" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Recientes */}
      {sightings.length > 0 ? (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.muted, margin: "0 0 10px" }}>
            Recientes
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sightings.slice(0, 15).map(s => {
              const color = rarityColor(s.rarity_score);
              return (
                <div key={s.id} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.fg, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.car_make} {s.car_model}
                    </p>
                    <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>
                      {s.car_year ? `${s.car_year} · ` : ""}{timeAgo(s.created_at)}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color, background: color + "15", borderRadius: 100, padding: "3px 10px", flexShrink: 0 }}>
                    {s.rarity_label || rarityLabel(s.rarity_score)}
                  </span>
                  <button
                    onClick={() => deleteSighting(s.id)}
                    disabled={deleting === s.id}
                    style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", padding: "4px 6px", fontSize: 16, flexShrink: 0, opacity: deleting === s.id ? 0.4 : 1 }}
                    title="Eliminar avistamiento"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`, padding: "44px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 36, margin: "0 0 10px" }}>📍</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.fg, margin: "0 0 6px" }}>Todavía no hay avistamientos</p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Escanea un coche y registra el primero</p>
        </div>
      )}
    </div>
  );
}
