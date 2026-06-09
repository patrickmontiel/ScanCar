export const config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};

export default async function handler(req, res) {
  // Endpoint temporal de diagnóstico
  if (req.method === "GET") {
    const envKeys = Object.keys(process.env).filter(k =>
      k.toLowerCase().includes("openai") || k.toLowerCase().includes("api_key")
    );
    return res.status(200).json({ envKeys, nodeEnv: process.env.NODE_ENV });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.OPENAI_API_KEY;
  console.log("KEY present:", !!key, "| length:", key?.length, "| starts:", key?.substring(0, 10));

  if (!key) {
    return res.status(500).json({ error: "Falta OPENAI_API_KEY en variables de entorno" });
  }

  try {
    const { messages } = req.body;
    console.log("Messages count:", messages?.length, "| body ok:", !!req.body);

    const openaiMessages = messages.map((msg) => ({
      role: msg.role,
      content: Array.isArray(msg.content)
        ? msg.content.map((block) => {
            if (block.type === "image") {
              return {
                type: "image_url",
                image_url: {
                  url: `data:${block.source.media_type};base64,${block.source.data}`,
                  detail: "high",
                },
              };
            }
            return { type: "text", text: block.text };
          })
        : msg.content,
    }));

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key.trim()}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 2000,
        messages: openaiMessages,
      }),
    });

    console.log("OpenAI HTTP status:", r.status);

    const rawText = await r.text();
    console.log("OpenAI response (first 300):", rawText.substring(0, 300));

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      return res.status(500).json({ error: `OpenAI devolvió respuesta no-JSON (HTTP ${r.status}): ${rawText.substring(0, 150)}` });
    }

    if (!r.ok || data.error) {
      const msg = data.error?.message || `OpenAI HTTP ${r.status}`;
      console.error("OpenAI error:", msg);
      return res.status(500).json({ error: msg });
    }

    const text = data.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ content: [{ type: "text", text }] });

  } catch (e) {
    console.error("Handler exception:", String(e));
    return res.status(500).json({ error: String(e) });
  }
}
