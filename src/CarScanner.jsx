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

// ── Micro-componentes ───────────────────────────────────────────
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

// ── Helpers de render ───────────────────────────────────────────
// Siempre muestra todos los campos. "—" si el valor es null/vacío.
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
      <span style={{
        fontSize: 13, fontWeight: 500, textAlign: "right", flex: 1,
        color: val(value) === "—" ? C.border : C.fg,
      }}>
        {val(value)}
      </span>
    </div>
  ));

// Siempre renderiza la sección, aunque todos los valores sean "—".
const Section = ({ title, fields, accentColor }) => (
  <div style={{ borderTop: `1px solid ${C.border}` }}>
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.07em",
      textTransform: "uppercase", color: accentColor || C.muted,
      padding: "14px 20px 6px",
    }}>
      {title}
    </div>
    {renderRows(fields)}
  </div>
);

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
  const [view, setView] = useState("scan");
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

  const persist = (next) => {
    setDb(next);
    try { localStorage.setItem(DB_KEY, JSON.stringify(next)); } catch (e) {}
  };

  const bumpScan = () => {
    const n = scanCount + 1;
    setScanCount(n);
    try { localStorage.setItem(DB_KEY + "-count", String(n)); } catch (e) {}
  };

  const saveToDb = (car) => {
    const idx = db.findIndex(d => d.make === car.make && d.model === car.model && d.generation === car.generation);
    let next;
    if (idx >= 0) {
      next = [...db];
      next[idx] = { ...next[idx], confirmations: next[idx].confirmations + 1 };
    } else {
      next = [{ id: Date.now(), ...car, confirmations: 1 }, ...db];
    }
    persist(next);
  };

  const callAPI = async (messages) => {
    const res = await fetch("/api/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
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
    "celebrity_connection":"Piloto o celebridad específica con relación verificable (ej: Roberto Ravaglia — edición especial homologación DTM 1989). Si lo mencionas en fun_fact, DEBES incluirlo aquí. null si ninguna.",
    "naming_origin":"Origen o significado del nombre/código, null si no hay dato interesante",
    "mexico_status":"Nacional / Importado-regularizable / Chocolate común / Raro en México / Clásico-coleccionable",
    "libro_azul_estimate":"Para coches comunes: estimación MXN condición Bueno. Para clásicos/coleccionables (>30 años o >$50k USD): escribe 'No aplica — clásico coleccionable. Valor real de mercado en campo market_value.'",
    "holograma":"Holograma CDMX: vehículos >30 años califican como EXENTO (antiguo). Año 2000+ aplica 00/0/1/2 según verificación. Incluye razón breve.",
    "tenencia_note":"Nota sobre tenencia por estado (CDMX, Jalisco, Edomex, etc.)",
    "refacciones":"Disponibilidad en México: Excelente / Buena / Limitada / Difícil",
    "depreciation_mx":"Depreciación o apreciación esperada en mercado mexicano"
  }
}

══ REGLAS DE PRECISIÓN — ERRORES CRÍTICOS A EVITAR ══
1. PRODUCCIÓN TOTAL: reporta SOLO las unidades del modelo exacto identificado.
   MAL: E30 M3 → "~150,000 unidades" (esas son del E30 regular).
   BIEN: E30 M3 → "~17,970 unidades".
   Regla: variantes M, AMG, Type R, RS, Nismo tienen producción MUCHO menor que el modelo base.

2. AÑOS DE PRODUCCIÓN: usa los años de la variante específica, no del chasis base.
   MAL: E30 M3 → "1982-1994" (esos son del E30 base).
   BIEN: E30 M3 → "1986-1991".

3. DIMENSIONES: escribe SOLO el número, sin la unidad "mm". El campo la añade solo.
   MAL: "4,350 mm". BIEN: "4,350".
   Regla: width/height/length/wheelbase = número puro en mm.

4. DIMENSIONES VARIANTES M/AMG/RS: usa las medidas de LA VARIANTE, no del base.
   El E30 M3 mide 1,765 mm de ancho (ensanchamientos), no 1,645 mm del E30 base.

5. CÓDIGO DE PINTURA: incluye el código alfanumérico oficial, NO el nombre del color.
   MAL: "Schwarz". BIEN: "086 (Schwarz)" o "300 (Alpinweiß)".

6. NEUMÁTICOS: usa las medidas del modelo específico, no del base.
   E30 M3 = 205/55R15, no 195/60R15 (esas son del E30 normal).

7. MSRP: usa el precio real de lanzamiento de la variante, no una estimación del año del chasis base.
   E30 M3 se lanzó en EE.UU. en 1988 a ~$35,000-38,000 USD.

8. CONSISTENCIA fun_fact ↔ campos:
   Si mencionas una película en fun_fact → DEBES incluirla en movie_appearances.
   Si mencionas una celebridad en fun_fact → DEBES incluirla en celebrity_connection.
   Si fun_fact menciona "varios videojuegos" → NOMBRA cuáles en movie_appearances.

9. fun_fact NUNCA GENÉRICO: no escribas "apareció en varios videojuegos y películas".
   Escribe el dato específico: qué juego, qué película, qué récord exacto, qué año, qué número.

10. COLECCIONABLES vs LIBRO AZUL: coches +30 años o valor >$50,000 USD son coleccionables.
    Para esos: libro_azul_estimate = "No aplica — clásico coleccionable." y holograma = "EXENTO — vehículo antiguo (+30 años en CDMX)".

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
    setStage("analyzing"); setErrorMsg(""); setFromCommunity(false);
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
      setErrorMsg("No pude leer la respuesta. Intenta con otra foto.");
      setStage("error");
    }
  };

  const handleParsed = (parsed) => {
    if (parsed.type === "result") {
      setResult(parsed.car);
      setFromCommunity(!!parsed.fromCommunity);
      saveToDb(parsed.car);
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

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const full = reader.result;
      setImageData(full);
      startAnalysis(full.split(",")[1], file.type);
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setStage("idle"); setImageData(null); setCandidates([]);
    setQuestion(null); setResult(null); setHistory([]);
    setErrorMsg(""); setFromCommunity(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Views ───────────────────────────────────────────────────

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
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
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

  const renderResult = () => {
    const d = result;
    // Quita "mm" si el modelo ya lo incluyó en el valor, para evitar "4,350 mm mm"
    const stripMm = (v) => v ? String(v).replace(/\s*mm\s*$/i, "").trim() : v;
    const addMm = (v) => {
      if (!v || String(v).toLowerCase() === "null") return v;
      return String(v).toLowerCase().includes("mm") ? v : v + " mm";
    };
    const hasVal = (v) => v != null && v !== "" && String(v).toLowerCase() !== "null";
    const dims = [d.length, d.width, d.height].every(hasVal)
      ? `${stripMm(d.length)} × ${stripMm(d.width)} × ${stripMm(d.height)} mm`
      : null;

    return (
      <div>
        {imageData && (
          <div style={{ borderRadius: r.xl, overflow: "hidden", marginBottom: 12, border: `1px solid ${C.border}` }}>
            <img src={imageData} alt="coche" style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "cover" }} />
          </div>
        )}

        <div style={{ background: C.surface, borderRadius: r.xl, border: `1px solid ${C.border}`, overflow: "hidden" }}>

          {/* Status */}
          <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: fromCommunity ? "#FFF9F0" : "#F0FFF4", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: fromCommunity ? C.orange : C.green }}>
              {fromCommunity ? <IconStar /> : <IconCheck size={12} />}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: fromCommunity ? C.orange : C.green }}>
              {fromCommunity ? "Reconocido al instante" : "Identificado · guardado"}
            </span>
          </div>

          {/* Identity hero */}
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

          {/* Motor */}
          <Section title="Motor y potencia" fields={[
            ["Código de motor", d.engine_code],
            ["Decodificación", d.engine_code_full],
            ["Cilindrada", d.engine_displacement],
            ["Configuración", d.engine_config],
            ["Aspiración", d.aspiration],
            ["Potencia", d.horsepower],
            ["Torque", d.torque],
            ["Redline", d.redline],
          ]} />

          {/* Rendimiento */}
          <Section title="Rendimiento" fields={[
            ["0 – 100 km/h", d.zero_to_100],
            ["Velocidad máxima", d.top_speed],
            ["Transmisión", d.transmission],
            ["Tracción", d.drivetrain],
            ["Potencia / Peso", d.power_to_weight],
          ]} />

          {/* Medidas */}
          <Section title="Medidas y consumo" fields={[
            ["Peso en vacío", d.weight],
            ["Consumo mixto", d.fuel_economy],
            ["Largo × Ancho × Alto", dims],
            ["Distancia entre ejes", addMm(d.wheelbase)],
          ]} />

          {/* Fábrica */}
          <Section title="De fábrica" fields={[
            ["Años de producción", d.production_years],
            ["Total producidos", d.production_total],
            ["Ediciones especiales", d.special_editions],
            ["Colores originales", d.factory_colors],
            ["Código de pintura", d.paint_code],
            ["Rines OEM", d.oem_wheels],
            ["Neumáticos OEM", d.oem_tires],
          ]} />

          {/* Valor */}
          <Section title="Valor" fields={[
            ["MSRP original", d.msrp_original],
            ["Valor de mercado", d.market_value],
          ]} />

          {/* Fiabilidad */}
          <Section title="Fiabilidad y potencial" fields={[
            ["Problemas conocidos", d.known_issues],
            ["Potencial de mod", d.mod_potential],
          ]} />

          {/* Fun fact — siempre visible */}
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>
              Dato de fan
            </div>
            {d.fun_fact && String(d.fun_fact).toLowerCase() !== "null" ? (
              <div style={{ background: C.accent, borderRadius: r.md, padding: "14px 16px" }}>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: C.fg, margin: 0 }}>{d.fun_fact}</p>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: C.border }}>—</span>
            )}
          </div>

          {/* Cultura */}
          <Section title="Cultura" fields={[
            ["Películas / series", d.movie_appearances],
            ["Celebridades", d.celebrity_connection],
            ["Origen del nombre", d.naming_origin],
          ]} />

          {/* México — siempre visible */}
          <div style={{ borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.mxGreen, padding: "14px 20px 6px" }}>
              Mercado México 🇲🇽
            </div>
            {renderRows([
              ["Estatus", d.mexico_status],
              ["Valor Libro Azul", d.libro_azul_estimate],
              ["Holograma CDMX", d.holograma],
              ["Tenencia", d.tenencia_note],
              ["Refacciones", d.refacciones],
              ["Depreciación MX", d.depreciation_mx],
            ])}
            <p style={{ fontSize: 11, color: C.muted, padding: "8px 20px 14px", margin: 0 }}>
              * Estimaciones. Consulta Libro Azul oficial y SEDEMA para valores exactos.
            </p>
          </div>

          {/* CTA */}
          <div style={{ padding: "16px 20px 20px", borderTop: `1px solid ${C.border}` }}>
            <button onClick={reset} style={{ width: "100%", background: C.primary, color: "#fff", border: "none", borderRadius: r.lg, padding: "13px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
              Escanear otro
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderError = () => (
    <div style={{ background: C.surface, borderRadius: r.xl, border: `1px solid ${C.border}`, padding: 28, textAlign: "center" }}>
      <p style={{ fontSize: 14, color: C.red, marginBottom: 18 }}>{errorMsg}</p>
      <button onClick={reset} style={{ background: C.primary, color: "#fff", border: "none", borderRadius: r.pill, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: font }}>
        Reintentar
      </button>
    </div>
  );

  const renderGallery = () => (
    db.length === 0 ? (
      <div style={{ background: C.surface, borderRadius: r.xl, border: `1px solid ${C.border}`, padding: "56px 24px", textAlign: "center" }}>
        <div style={{ color: C.border, marginBottom: 12 }}><IconCar size={36} /></div>
        <p style={{ fontSize: 15, fontWeight: 500, color: C.fg, margin: "0 0 6px" }}>Garage vacío</p>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Escanea tu primer coche</p>
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {db.map(d => (
          <div key={d.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: r.lg, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: C.fg, margin: "0 0 3px" }}>{d.make} {d.model}</p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                <span style={{ color: val(d.chassis_code) === "—" ? C.border : C.muted }}>{val(d.chassis_code)}</span>
                {" · "}
                <span>{val(d.year)}</span>
                {" · "}
                <span style={{ color: val(d.horsepower) === "—" ? C.border : C.muted }}>{val(d.horsepower)}</span>
              </p>
            </div>
            <div style={{ background: C.accent, borderRadius: r.pill, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: C.muted, flexShrink: 0, marginLeft: 12 }}>
              ×{d.confirmations}
            </div>
          </div>
        ))}
      </div>
    )
  );

  // ── Shell ────────────────────────────────────────────────────
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
              <button onClick={() => setView("scan")} style={{ background: view === "scan" ? C.primary : "transparent", color: view === "scan" ? "#fff" : C.muted, border: view === "scan" ? "none" : `1px solid ${C.border}`, borderRadius: r.pill, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font }}>
                Escanear
              </button>
              <button onClick={() => setView("gallery")} style={{ background: view === "gallery" ? C.primary : "transparent", color: view === "gallery" ? "#fff" : C.muted, border: view === "gallery" ? "none" : `1px solid ${C.border}`, borderRadius: r.pill, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: font }}>
                Garage ({db.length})
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
