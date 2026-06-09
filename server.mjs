// Dev-only API server — replica local de api/identify.js para probar sin Vercel
import express from "express";
import { config } from "dotenv";

config({ path: ".env.local" });

const app = express();
app.use(express.json({ limit: "25mb" }));

app.post("/api/identify", async (req, res) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "Falta OPENAI_API_KEY en .env.local" });
  }
  try {
    const { messages } = req.body;

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
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.choices?.[0]?.message?.content ?? "";

    return res.json({ content: [{ type: "text", text }] });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.listen(3001, () => console.log("API local lista en http://localhost:3001 (GPT-4o mini)"));
