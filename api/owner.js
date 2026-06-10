const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "Supabase no configurado" });
  }

  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  if (req.method === "GET") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id requerido" });
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/owner_profiles?id=eq.${id}&select=*`,
      { headers }
    );
    const data = await r.json();
    if (!Array.isArray(data) || !data.length)
      return res.status(404).json({ error: "No encontrado" });
    return res.status(200).json(data[0]);
  }

  if (req.method === "POST") {
    const { car_data, owner_notes, mods } = req.body;
    if (!car_data) return res.status(400).json({ error: "car_data requerido" });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/owner_profiles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        car_data,
        owner_notes: owner_notes || "",
        mods: mods || "",
      }),
    });
    const data = await r.json();
    return res.status(200).json(data[0]);
  }

  if (req.method === "PATCH") {
    const { id, increment, owner_notes, mods } = req.body;
    if (!id) return res.status(400).json({ error: "id requerido" });

    if (increment) {
      const getR = await fetch(
        `${SUPABASE_URL}/rest/v1/owner_profiles?id=eq.${id}&select=scan_count`,
        { headers }
      );
      const getData = await getR.json();
      const current = getData[0]?.scan_count || 0;
      await fetch(`${SUPABASE_URL}/rest/v1/owner_profiles?id=eq.${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ scan_count: current + 1 }),
      });
      return res.status(200).json({ scan_count: current + 1 });
    }

    await fetch(`${SUPABASE_URL}/rest/v1/owner_profiles?id=eq.${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ owner_notes, mods }),
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Método no permitido" });
}
