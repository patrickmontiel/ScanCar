import React, { useState, useRef, useEffect } from "react";

const CONFIDENCE_THRESHOLD = 90;
const DB_KEY = "carnoceur-confirmados-v1";

const C = {
  bg: "#F5F5F7", surface: "#FFFFFF", fg: "#1D1D1F", muted: "#6E6E73",
  border: "#D2D2D7", accent: "#E8E8ED", primary: "#000000",
  green: "#34C759", red: "#FF3B30", blue: "#007AFF", orange: "#FF9500",
  mxGreen: "#006847",
};
const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif";
const r = { sm: 10, md: 12, lg: 16, xl: 20, pill: 100 };

// ── Icons ───────────────────────────────────────────────────────
const IconCamera = () => (
  <svg width="28" height="24" viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3L7 7H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4L19 3H9Z"/>
    <circle cx="14" cy="14" r="5"/>
  </svg>
);
const IconCheck = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2,6.5 5.5,10 11,3"/>
  </svg>
);
const IconStar = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
    <path d="M6 1l1.4 2.8L10.5 4l-2.25 2.2.53 3.08L6 7.8l-2.78 1.48.53-3.08L1.5 4l3.1-.2L6 1z"/>
  </svg>
);
const IconCar = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 14l3-7h10l3 7"/><rect x="3" y="14" width="26" height="10" rx="3"/>
    <circle cx="9" cy="24" r="3"/><circle cx="23" cy="24" r="3"/><line x1="12" y1="24" x2="20" y2="24"/>
  </svg>
);
const IconBack = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="11,4 6,9 11,14"/>
  </svg>
);

const Spinner = () => (
  <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.muted, animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </div>
);

const Tag = ({ children, dark = false }) => (
  <span style={{
    display: "inline-flex", alignItems: "center",
    background: dark ? C.primary : C.accent,
    color: dark ? "#fff" : C.fg,
    borderRadius: r.pill, padding: "3px 10px",
    fontSize: 12, fontWeight: 600,
  }}>
    {children}
  </span>
);

// ── Image resize (performance: shrink before sending to API) ────
const resizeImage = (file) => new Promise(resolve => {
  const MAX = 1024;
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    let { width: w, height: h } = img;
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else { w = Math.round(w * MAX / h); h = MAX; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    canvas.toBlob(blob => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        resolve({ dataUrl, mediaType: "image/jpeg", b64: dataUrl.split(",")[1] });
      };
      reader.readAsDataURL(blob);
    }, "image/jpeg", 0.85);
  };
  img.src = url;
});

// ── Profile builder ─────────────────────────────────────────────
const buildProfile = (cars) => {
  if (cars.length < 2) return null;
  const tags = [];

  const makes = cars.map(c => (c.make || "").toLowerCase());
  const jpMakes = ["toyota", "honda", "nissan", "mazda", "subaru", "mitsubishi", "lexus", "acura", "infiniti", "datsun"];
  const deMakes = ["bmw", "mercedes", "audi", "volkswagen", "porsche", "opel"];
  const itMakes = ["ferrari", "lamborghini", "alfa romeo", "maserati", "fiat", "lancia"];
  const jpCount = makes.filter(m => jpMakes.some(j => m.includes(j))).length;
  const deCount = makes.filter(m => deMakes.some(g => m.includes(g))).length;
  const itCount = makes.filter(m => itMakes.some(g => m.includes(g))).length;
  const max = Math.max(jpCount, deCount, itCount);
  if (max > 0) {
    if (max === jpCount) tags.push("Afinidad japonesa");
    else if (max === deCount) tags.push("Afinidad alemana");
    else tags.push("Afinidad italiana");
  }

  const asps = cars.map(c => (c.aspiration || "").toLowerCase());
  const turbos = asps.filter(a => a.includes("turbo")).length;
  const nas = asps.filter(a => a === "na" || a.startsWith("na ") || a.includes("atmosférico")).length;
  if (turbos > nas && turbos > 0) tags.push("Amante del turbo");
  else if (nas > turbos && nas > 0) tags.push("Purista NA");

  const dts = cars.map(c => (c.drivetrain || "").toUpperCase());
  const rwd = dts.filter(d => d.includes("RWD")).length;
  const awd = dts.filter(d => d.includes("AWD") || d.includes("4WD")).length;
  const fwd = dts.filter(d => d.includes("FWD")).length;
  const maxDt = Math.max(rwd, awd, fwd);
  if (maxDt > 0) {
    if (maxDt === rwd) tags.push("Tracción trasera");
    else if (maxDt === awd) tags.push("AWD / 4WD");
    else tags.push("Tracción delantera");
  }

  const hps = cars.map(c => {
    const m = String(c.horsepower || "").match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }).filter(n => n > 0);
  if (hps.length > 0) {
    const avg = hps.reduce((a, b) => a + b, 0) / hps.length;
    if (avg >= 400) tags.push("Potencia extrema");
    else if (avg >= 250) tags.push("Alto rendimiento");
    else if (avg >= 130) tags.push("Rendimiento moderado");
  }

  return tags.length > 0 ? tags : null;
};

// ── Data helpers ─────────────────────────────────────────────────
const val = (v) =>
  (v != null && v !== "" && String(v).toLowerCase() !== "null") ? v : "—";

const renderRows = (fields) =>
  fields.map(([label, value], i, arr) => (
    <div key={label} style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "11px 20px",
      borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
    }}>
      <span style={{ fontSize: 13, color: C.muted, flexShrink: 0, paddingRight: 16, minWidth: "38%" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right", flex: 1, color: val(value) === "—" ? C.border : C.fg }}>
        {val(value)}
      </span>
    </div>
  ));

const Section = ({ title, fields, accentColor }) => (
  <div style={{ borderTop: `1px solid ${C.border}` }}>
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: accentColor || C.muted, padding: "14px 20px 6px" }}>
      {title}
    </div>
    {renderRows(fields)}
  </div>
);

// ── Full car sheet (reutilizable para resultado y detalle de garage) ──
function CarSheet({ d, imageUrl }) {
  const stripMm = (v) => v ? String(v).replace(/\s*mm\s*$/i, "").trim() : v;
  const addMm = (v) => {
    if (!v || String(v).toLowerCase() === "null") return v;
    return String(v).toLowerCase().includes("mm") ? v : v + " mm";
  };
  const hasVal = (v) => v != null && v !== "" && String(v).toLowerCase() !== "null";
  const dims = [d.length, d.width, d.height].every(hasVal)
    ? `${stripMm(d.length)} × ${stripMm(d.width)} × ${stripMm(d.height)} mm` : null;

  return (
    <div style={{ background: C.surface, borderRadius: r.xl, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      {imageUrl && <img src={imageUrl} alt="coche" style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "cover" }} />}

      <div style={{ padding: "20px 20px 16px" }}>
        <p style={{ fontSize: 28, fontWeight: 700, color: C.fg, margin: "0 0 10px", lineHeight: 1.1 }}>
          {d.make} {d.model}
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {d.year && <Tag>{d.year}</Tag>}
          {d.chassis_code && String(d.chassis_code).toLowerCase() !== "null" && <Tag dark>{d.chassis_code}</Tag>}
          {d.trim && String(d.trim).toLowerCase() !== "null" && <Tag>{d.trim}</Tag>}
          {d.generation && !d.chassis_code && <Tag>{d.generation}</Tag>}
        </div>
        {d.body_style && String(d.body_style).toLowerCase() !== "null" && (
          <p style={{ fontSize: 13, color: C.muted, margin: "10px 0 0" }}>{d.body_style}</p>
        )}
      </div>

      <Section title="Motor y potencia" fields={[
        ["Código de motor", d.engine_code], ["Decodificación", d.engine_code_full],
        ["Cilindrada", d.engine_displacement], ["Configuración", d.engine_config],
        ["Aspiración", d.aspiration], ["Potencia", d.horsepower],
        ["Torque", d.torque], ["Redline", d.redline],
      ]} />
      <Section title="Rendimiento" fields={[
        ["0 – 100 km/h", d.zero_to_100], ["Velocidad máxima", d.top_speed],
        ["Transmisión", d.transmission], ["Tracción", d.drivetrain],
        ["Potencia / Peso", d.power_to_weight],
      ]} />
      <Section title="Medidas y consumo" fields={[
        ["Peso en vacío", d.weight], ["Consumo mixto", d.fuel_economy],
        ["Largo × Ancho × Alto", dims], ["Distancia entre ejes", addMm(d.wheelbase)],
      ]} />
      <Section title="De fábrica" fields={[
        ["Años de producción", d.production_years], ["Total producidos", d.production_total],
        ["Ediciones especiales", d.special_editions], ["Colores originales", d.factory_colors],
        ["Código de pintura", d.paint_code], ["Rines OEM", d.oem_wheels],
        ["Neumáticos OEM", d.oem_tires],
      ]} />
      <Section title="Valor" fields={[
        ["MSRP original", d.msrp_original], ["Valor de mercado", d.market_value],
      ]} />
      <Section title="Fiabilidad y potencial" fields={[
        ["Problemas conocidos", d.known_issues], ["Potencial de mod", d.mod_potential],
      ]} />

      <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>
          Dato de fan
        </div>
        {d.fun_fact && String(d.fun_fact).toLowerCase() !== "null" ? (
          <div style={{ background: C.accent, borderRadius: r.md, padding: "14px 16px" }}>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: C.fg, margin: 0 }}>{d.fun_fact}</p>
          </div>
        ) : <span style={{ fontSize: 13, color: C.border }}>—</span>}
      </div>

      <Section title="Cultura" fields={[
        ["Películas / series", d.movie_appearances], ["Celebridades", d.celebrity_connection],
        ["Origen del nombre", d.naming_origin],
      ]} />

      <div style={{ borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.mxGreen, padding: "14px 20px 6px" }}>
          Mercado México 🇲🇽
        </div>
        {renderRows([
          ["Estatus", d.mexico_status], ["Valor Libro Azul", d.libro_azul_estimate],
          ["Holograma CDMX", d.holograma], ["Tenencia", d.tenencia_note],
          ["Refacciones", d.refacciones], ["Depreciación MX", d.depreciation_mx],
        ])}
        <p style={{ fontSize: 11, color: C.muted, padding: "8px 20px 14px", margin: 0 }}>
          * Estimaciones. Consulta Libro Azul oficial y SEDEMA para valores exactos.
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────
export default function CarScanner() {
  const [stage, setStage] = useState("idle");
  const [imageData, setImageData] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [question, setQuestion] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [db, setDb] = useState([]);
  const [fromCommunity, setFromCommunity] = useState(false);
  const [savedToGarage, setSavedToGarage] = useState(false);
  const [view, setView] = useState("scan");
  const [selectedCar, setSelectedCar] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) setDb(JSON.parse(raw));
      const sc = localStorage.getItem(DB_KEY + "-count");
      if (sc) setScanCount(parseInt(sc, 10));
    } catch (e) {}
  }, []);

  const bumpScan = () => {
    setScanCount(n => {
      const next = n + 1;
      try { localStorage.setItem(DB_KEY + "-count", String(next)); } catch (e) {}
      return next;
    });
  };

  const saveToDb = (car) => {
    if (!car) return;
    setDb(prev => {
      const idx = prev.findIndex(d => d.make === car.make && d.model === car.model && d.generation === car.generation);
      let next;
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...next[idx], confirmations: next[idx].confirmations + 1 };
      } else {
        next = [{ id: Date.now(), ...car, confirmations: 1 }, ...prev];
      }
      try { localStorage.setItem(DB_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
    setSavedToGarage(true);
  };

  const callAPI = async (messages) => {
    const res = await fetch("/api/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const text = data.content.filter(c => c.type === "text").map(c => c.text).join("\n");
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  };

  const buildSystemInstruction = () => {
    const known = db.length
      ? `\n\nBASE CONFIRMADA (${db.length} modelos). Si la foto coincide claramente, reconócelo con alta confianza y marca "fromCommunity":true:\n` +
        db.map(d => `- ${d.make} ${d.model} ${d.generation} (${d.year})`).join("\n")
      : "";

    return `Eres un experto identificador de coches para una app del mercado mexicano.
Devuelve SIEMPRE y ÚNICAMENTE JSON válido, sin texto extra ni backticks.

══ REGLA DE ORO ══
NUNCA adivines cuando hay ambigüedad. Una identificación incorrecta es peor que una pregunta.

══ CUÁNDO PREGUNTAR (type:"question") ══
Pregunta si se cumple CUALQUIERA de estas condiciones:
1. Hay 2 o más candidatos con probabilidad ≥ 20%.
2. La diferencia entre el 1er y 2do candidato es menor de 30 puntos.
3. No puedes distinguir el trim/generación específico sin más info.
4. Tu confianza total es menor a ${CONFIDENCE_THRESHOLD}%.
En duda: SIEMPRE pregunta. Una pregunta buena es mejor que una respuesta incorrecta.

══ CUÁNDO DAR RESULTADO DIRECTO (type:"result") ══
Solo cuando el candidato principal tiene ≥ ${CONFIDENCE_THRESHOLD}% de confianza Y los demás candidatos tienen ≤ 10% cada uno Y ves la insignia/badge claramente.

══ SCHEMA RESULT ══
{
  "type":"result",
  "confidence":<0-100>,
  "fromCommunity":<bool>,
  "car":{
    "make":"Marca",
    "model":"Modelo completo",
    "year":"Año o rango (ej: 1999-2002)",
    "trim":"Versión exacta (Si/Type R/GTI/V-Spec) o null",
    "chassis_code":"Código chasis (R34/E46/EK9) o null si no aplica",
    "generation":"Texto generacional (ej: Cuarta generación / F30)",
    "body_style":"Carrocería y puertas (ej: Coupé 2 puertas)",
    "engine_displacement":"Cilindrada (ej: 2.6L / 2,600 cc)",
    "engine_config":"Configuración (ej: I6 / V8 / Flat-6)",
    "aspiration":"NA / Turbo / Twin-Turbo / Supercargado / Híbrido / Eléctrico",
    "engine_code":"Código oficial motor (RB26DETT / 2JZ-GTE / K20A) o null",
    "horsepower":"HP y RPM si se conoce (ej: 280 hp @ 6800 rpm)",
    "torque":"Nm y RPM (ej: 392 Nm @ 4400 rpm)",
    "redline":"Redline en RPM (ej: 8000 rpm) o null",
    "zero_to_100":"0-100 km/h (ej: 4.9 s)",
    "top_speed":"Velocidad máxima (ej: 250 km/h limitada)",
    "transmission":"Tipo y velocidades (ej: Manual 6 velocidades / DCT 7v)",
    "drivetrain":"FWD / RWD / AWD / 4WD con sistema si aplica",
    "weight":"Peso en vacío (ej: 1,560 kg)",
    "power_to_weight":"Relación potencia/peso (ej: 179 hp/t)",
    "fuel_economy":"Consumo mixto (ej: 10 L/100km)",
    "engine_code_full":"Decodificación del código de motor letra por letra, null si no aplica",
    "production_years":"Años de producción del modelo/generación",
    "length":"Largo en mm",
    "width":"Ancho en mm",
    "height":"Alto en mm",
    "wheelbase":"Distancia entre ejes en mm",
    "factory_colors":"Colores de fábrica separados por coma (máx 6)",
    "paint_code":"Código de pintura más icónico del modelo",
    "oem_wheels":"Specs rines OEM: diámetro×ancho ETxx PCD (ej: 17×7 ET45 5×114.3)",
    "oem_tires":"Medidas neumáticos OEM, escalonado si aplica",
    "msrp_original":"Precio original con moneda y año (ej: ~$24,000 USD 2003)",
    "market_value":"Valor de mercado actual estimado",
    "known_issues":"Problemas conocidos por año-modelo, máx 2 frases",
    "mod_potential":"Potencial de modificación y techo de poder típico",
    "production_total":"Total producidos (ej: ~11,578 unidades)",
    "special_editions":"Ediciones especiales o de homologación, null si no hay",
    "fun_fact":"Un dato específico y verificable: homologación, récord exacto, Easter egg concreto, decodificación del código. NUNCA frases genéricas como 'apareció en varios videojuegos'. Máx 2 frases.",
    "movie_appearances":"Películas/series/videojuegos con nombre específico (ej: Gran Turismo, Need for Speed: Most Wanted 2005). Si lo mencionas en fun_fact, DEBES incluirlo aquí. null si ninguno conocido.",
    "celebrity_connection":"Piloto o celebridad específica con relación verificable. null si ninguna.",
    "naming_origin":"Origen o significado del nombre/código, null si no hay dato interesante",
    "mexico_status":"Nacional / Importado-regularizable / Chocolate común / Raro en México / Clásico-coleccionable",
    "libro_azul_estimate":"Para coches comunes: estimación MXN condición Bueno. Para clásicos/coleccionables (>30 años o >$50k USD): 'No aplica — clásico coleccionable.'",
    "holograma":"Holograma CDMX: vehículos >30 años = EXENTO. Año 2000+ aplica 00/0/1/2 según verificación.",
    "tenencia_note":"Nota sobre tenencia por estado (CDMX, Jalisco, Edomex, etc.)",
    "refacciones":"Disponibilidad en México: Excelente / Buena / Limitada / Difícil",
    "depreciation_mx":"Depreciación o apreciación esperada en mercado mexicano"
  }
}

══ SCHEMA QUESTION ══
{
  "type":"question",
  "candidates":[{"name":"...","prob":58},{"name":"...","prob":35}],
  "question":"Pregunta concreta que distinga visualmente los candidatos",
  "options":["Opción A","Opción B"],
  "reason":"Por qué esta pregunta diferencia los candidatos"
}${known}`;
  };

  const startAnalysis = async (b64, mediaType) => {
    setStage("analyzing"); setErrorMsg(""); setFromCommunity(false); setSavedToGarage(false);
    bumpScan();
    const messages = [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
        { type: "text", text: buildSystemInstruction() + "\n\nIdentifica este coche." },
      ],
    }];
    try {
      const parsed = await callAPI(messages);
      setHistory([...messages, { role: "assistant", content: JSON.stringify(parsed) }]);
      handleParsed(parsed);
    } catch (e) {
      setErrorMsg(e.message || "No pude leer la respuesta. Intenta con otra foto.");
      setStage("error");
    }
  };

  const handleParsed = (parsed) => {
    if (parsed.type === "result") {
      setResult(parsed.car);
      setFromCommunity(!!parsed.fromCommunity);
      setStage("result");
    } else if (parsed.type === "question") {
      setCandidates(parsed.candidates || []);
      setQuestion(parsed);
      setStage("question");
    }
  };

  const answerQuestion = async (answer) => {
    setStage("analyzing");
    const messages = [...history, {
      role: "user",
      content: [{ type: "text", text: `El usuario respondió: "${answer}". Si ahora tienes confianza >= ${CONFIDENCE_THRESHOLD}%, devuelve resultado con TODOS los campos del schema. Si sigues con duda, haz otra pregunta. ${buildSystemInstruction()}` }],
    }];
    try {
      const parsed = await callAPI(messages);
      setHistory([...messages, { role: "assistant", content: JSON.stringify(parsed) }]);
      handleParsed(parsed);
    } catch (e) {
      setErrorMsg("Error procesando tu respuesta."); setStage("error");
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { dataUrl, mediaType, b64 } = await resizeImage(file);
    setImageData(dataUrl);
    startAnalysis(b64, mediaType);
  };

  const reset = () => {
    setStage("idle"); setImageData(null); setCandidates([]);
    setQuestion(null); setResult(null); setHistory([]);
    setErrorMsg(""); setFromCommunity(false); setSavedToGarage(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Views ────────────────────────────────────────────────────

  const renderScanArea = () => (
    <label style={{ display: "block", cursor: "pointer" }}>
      <div style={{ background: C.surface, border: `1.5px dashed ${C.border}`, borderRadius: r.xl, padding: "48px 24px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: C.muted }}>
          <IconCamera />
        </div>
        <p style={{ fontSize: 17, fontWeight: 600, color: C.fg, margin: "0 0 6px" }}>Fotografía un coche</p>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Frontal o 3/4 · JPG, HEIC, PNG</p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 20, background: C.primary, color: "#fff", borderRadius: r.pill, padding: "10px 22px", fontSize: 14, fontWeight: 600 }}>
          Seleccionar foto
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
    </label>
  );

  const renderAnalyzing = () => (
    <div style={{ background: C.surface, borderRadius: r.xl, overflow: "hidden", border: `1px solid ${C.border}` }}>
      {imageData && <img src={imageData} alt="coche" style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "cover" }} />}
      <div style={{ padding: "24px", textAlign: "center" }}>
        <Spinner />
        <p style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>Analizando — puede preguntar antes de responder…</p>
      </div>
    </div>
  );

  const renderQuestion = () => (
    <div>
      {imageData && (
        <div style={{ borderRadius: r.xl, overflow: "hidden", marginBottom: 12, border: `1px solid ${C.border}` }}>
          <img src={imageData} alt="coche" style={{ width: "100%", display: "block", maxHeight: 200, objectFit: "cover" }} />
        </div>
      )}
      <div style={{ background: C.surface, borderRadius: r.xl, border: `1px solid ${C.border}`, padding: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, marginBottom: 14 }}>Dudo entre</p>
        <div style={{ marginBottom: 18 }}>
          {candidates.map((c, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 5 }}>
                <span style={{ fontWeight: 500, color: C.fg }}>{c.name}</span>
                <span style={{ color: C.muted, fontSize: 13 }}>{c.prob}%</span>
              </div>
              <div style={{ height: 4, background: C.accent, borderRadius: 2 }}>
                <div style={{ width: `${c.prob}%`, height: "100%", background: C.primary, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: C.fg, lineHeight: 1.4, marginBottom: 14 }}>{question.question}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {question.options.map((opt, i) => (
              <button key={i} onClick={() => answerQuestion(opt)}
                style={{ background: C.surface, color: C.fg, border: `1.5px solid ${C.border}`, borderRadius: r.lg, padding: "13px 16px", fontSize: 15, fontWeight: 500, cursor: "pointer", textAlign: "left", fontFamily: font }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}>
                {opt}
              </button>
            ))}
          </div>
          {question.reason && <p style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>{question.reason}</p>}
        </div>
      </div>
    </div>
  );

  const renderResult = () => (
    <div>
      {imageData && (
        <div style={{ borderRadius: r.xl, overflow: "hidden", marginBottom: 12, border: `1px solid ${C.border}` }}>
          <img src={imageData} alt="coche" style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "cover" }} />
        </div>
      )}

      <div style={{ background: C.surface, borderRadius: r.xl, border: `1px solid ${C.border}`, overflow: "hidden" }}>

        {/* Status */}
        <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: fromCommunity ? "#FFF9F0" : "#F8F8F8", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: fromCommunity ? C.orange : C.muted }}>
            {fromCommunity ? <IconStar /> : <IconCheck size={12} />}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: fromCommunity ? C.orange : C.muted }}>
            {fromCommunity ? "Reconocido al instante" : "Identificado"}
          </span>
        </div>

        <CarSheet d={result} />

        {/* CTAs */}
        <div style={{ padding: "16px 20px 20px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
          {savedToGarage ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#F0FFF4", borderRadius: r.lg, padding: "13px", border: `1px solid ${C.green}` }}>
              <span style={{ color: C.green }}><IconCheck size={14} /></span>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.green }}>Guardado en tu Garage</span>
            </div>
          ) : (
            <button
              onClick={() => saveToDb(result)}
              style={{ width: "100%", background: C.primary, color: "#fff", border: "none", borderRadius: r.lg, padding: "13px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: font }}
            >
              Agregar a Garage
            </button>
          )}
          <button
            onClick={reset}
            style={{ width: "100%", background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: r.lg, padding: "12px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: font }}
          >
            Escanear otro
          </button>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div style={{ background: C.surface, borderRadius: r.xl, border: `1px solid ${C.border}`, padding: 28, textAlign: "center" }}>
      <p style={{ fontSize: 14, color: C.red, marginBottom: 18 }}>{errorMsg}</p>
      <button onClick={reset} style={{ background: C.primary, color: "#fff", border: "none", borderRadius: r.pill, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
        Reintentar
      </button>
    </div>
  );

  const renderGallery = () => {
    const profile = buildProfile(db);
    return (
      <div>
        {/* Perfil */}
        {profile && (
          <div style={{ background: C.surface, borderRadius: r.xl, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.muted, margin: "0 0 10px" }}>
              Tu perfil
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {profile.map((tag, i) => (
                <span key={i} style={{ background: C.primary, color: "#fff", borderRadius: r.pill, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
                  {tag}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 11, color: C.muted, margin: "10px 0 0" }}>
              Basado en {db.length} coche{db.length !== 1 ? "s" : ""} guardado{db.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {db.length === 0 ? (
          <div style={{ background: C.surface, borderRadius: r.xl, border: `1px solid ${C.border}`, padding: "56px 24px", textAlign: "center" }}>
            <div style={{ color: C.border, marginBottom: 12 }}><IconCar size={36} /></div>
            <p style={{ fontSize: 15, fontWeight: 500, color: C.fg, margin: "0 0 6px" }}>Garage vacío</p>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Escanea un coche y agrégalo aquí</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {db.map(d => (
              <button
                key={d.id}
                onClick={() => { setSelectedCar(d); setView("car-detail"); }}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: r.lg, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", textAlign: "left", fontFamily: font, width: "100%" }}
                onMouseEnter={e => e.currentTarget.style.background = C.accent}
                onMouseLeave={e => e.currentTarget.style.background = C.surface}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: C.fg, margin: "0 0 3px" }}>{d.make} {d.model}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                    <span>{val(d.chassis_code) !== "—" ? val(d.chassis_code) : val(d.generation)}</span>
                    {" · "}
                    <span>{val(d.year)}</span>
                    {" · "}
                    <span>{val(d.horsepower)}</span>
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}>
                  {d.confirmations > 1 && (
                    <span style={{ background: C.accent, borderRadius: r.pill, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: C.muted }}>
                      ×{d.confirmations}
                    </span>
                  )}
                  <span style={{ color: C.border, fontSize: 18 }}>›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCarDetail = () => {
    if (!selectedCar) return null;
    return (
      <div>
        <button
          onClick={() => { setSelectedCar(null); setView("gallery"); }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: C.blue, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: font, padding: "0 0 16px 0" }}
        >
          <IconBack /> Garage
        </button>
        <CarSheet d={selectedCar} />
      </div>
    );
  };

  // ── Shell ─────────────────────────────────────────────────────
  const garageLabel = view === "car-detail" ? `‹ ${selectedCar?.make || "Garage"}` : `Garage (${db.length})`;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, fontFamily: font, letterSpacing: "-0.01em", WebkitFontSmoothing: "antialiased" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "env(safe-area-inset-top, 0px) 0 0",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "14px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.fg, margin: 0, lineHeight: 1 }}>ScanCar</h1>
              <p style={{ fontSize: 12, color: C.muted, margin: "3px 0 0" }}>{scanCount} escaneos · {db.length} guardados</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setView("scan")}
                style={{ background: view === "scan" ? C.primary : "transparent", color: view === "scan" ? "#fff" : C.muted, border: view === "scan" ? "none" : `1px solid ${C.border}`, borderRadius: r.pill, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font }}
              >
                Escanear
              </button>
              <button
                onClick={() => { setSelectedCar(null); setView("gallery"); }}
                style={{ background: (view === "gallery" || view === "car-detail") ? C.primary : "transparent", color: (view === "gallery" || view === "car-detail") ? "#fff" : C.muted, border: (view === "gallery" || view === "car-detail") ? "none" : `1px solid ${C.border}`, borderRadius: r.pill, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font }}
              >
                Garage
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px calc(40px + env(safe-area-inset-bottom, 0px))" }}>
        {view === "scan" && (
          <>
            {stage === "idle" && renderScanArea()}
            {stage === "analyzing" && renderAnalyzing()}
            {stage === "question" && renderQuestion()}
            {stage === "result" && result && renderResult()}
            {stage === "error" && renderError()}
          </>
        )}
        {view === "gallery" && renderGallery()}
        {view === "car-detail" && renderCarDetail()}
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        button:active { opacity: 0.75; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
