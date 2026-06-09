export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ error: "Supabase no configurado" });
  }

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    if (req.method === "GET") {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/sightings?select=*&order=created_at.desc&limit=500`,
        { headers }
      );
      const data = await r.json();
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    if (req.method === "POST") {
      const { car_make, car_model, car_year, rarity_score, rarity_label, chassis_code, trim, lat, lng } = req.body;
      if (!car_make || lat == null || lng == null) {
        return res.status(400).json({ error: "Faltan datos requeridos" });
      }
      const r = await fetch(`${SUPABASE_URL}/rest/v1/sightings`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ car_make, car_model, car_year, rarity_score, rarity_label, chassis_code, trim, lat, lng }),
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "id requerido" });
      await fetch(`${SUPABASE_URL}/rest/v1/sightings?id=eq.${id}`, { method: "DELETE", headers });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
