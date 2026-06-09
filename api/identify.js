// api/identify.js — Vercel serverless function.
// Llama a OpenAI GPT-4o mini (visión) y devuelve respuesta
// en formato Anthropic-compatible para que el frontend no cambie.

export const config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "Falta OPENAI_API_KEY en variables de entorno" });
  }
  try {
    const { messages } = req.body;

    // Traducir mensajes del formato Anthropic al formato OpenAI
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
        : msg.content, // string (mensajes de seguimiento)
    }));

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 2000,
        messages: openaiMessages,
      }),
    });

    const data = await r.json();

    if (data.error) {
      console.error("OpenAI error:", JSON.stringify(data.error));
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.choices?.[0]?.message?.content ?? "";

    // Devolver en formato Anthropic para que el frontend no cambie
    return res.status(200).json({
      content: [{ type: "text", text }],
    });
  } catch (e) {
    console.error("Handler exception:", String(e));
    return res.status(500).json({ error: String(e) });
  }
}
