export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { make, model, year } = req.query;
  if (!make || !model) {
    return res.status(400).json({ error: "make y model requeridos" });
  }

  try {
    const cleanYear = String(year || "").split(/[-–]/)[0].trim();
    const cleanModel = String(model).split(/[/&,]/)[0].trim().split(" ").slice(0, 2).join(" ");
    const q = `${make} ${cleanModel} ${cleanYear}`.trim();

    const r = await fetch(
      `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(q)}&limit=50`,
      { headers: { Accept: "application/json" } }
    );

    if (!r.ok) return res.status(200).json({ count: 0 });

    const data = await r.json();

    const prices = (data.results || [])
      .filter(item => item.currency_id === "MXN" && item.price >= 80000)
      .map(item => item.price)
      .sort((a, b) => a - b);

    if (prices.length === 0) return res.status(200).json({ count: 0 });

    const median = prices[Math.floor(prices.length / 2)];
    const min = prices[0];
    const max = prices[prices.length - 1];
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    return res.status(200).json({ median, min, max, avg, count: prices.length });
  } catch (e) {
    return res.status(200).json({ count: 0 });
  }
}
