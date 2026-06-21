// quest-flavor — optional AI "Quest-Master" voice for the System's Daily Quests.
// Takes today's generated quests + hunter context and returns an in-character
// System announcement plus a one-liner per quest. Provider: Groq (OpenAI-compatible).
// Fully degradable: with no GROQ_API_KEY, or on any error, it returns nulls and
// the client falls back to the built-in rule-engine text.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

interface QuestLite {
  title: string;
  category: string;
  difficulty: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const fallback = { message: null as string | null, lines: [] as string[] };
  if (req.method !== "POST" || !GROQ_API_KEY) return json(fallback);

  let body: { level?: number; rank?: string; quests?: QuestLite[] };
  try {
    body = await req.json();
  } catch {
    return json(fallback);
  }
  const level = body.level ?? 1;
  const rank = body.rank ?? "E";
  const quests = Array.isArray(body.quests) ? body.quests.slice(0, 8) : [];
  if (quests.length === 0) return json(fallback);

  const list = quests.map((q, i) => `${i + 1}. ${q.title} [${q.category}/${q.difficulty}]`).join("\n");
  const sys =
    "You are 'The System' from Solo Leveling — a terse, ominous, motivating game interface that issues mandatory quests to a Hunter. Reply ONLY with strict JSON, no markdown.";
  const user =
    `The Hunter is Level ${level}, Rank ${rank}. Today's Daily Quests:\n${list}\n\n` +
    `Return JSON exactly: {"message": string, "lines": string[]}. ` +
    `"message" = a 1-2 sentence in-character System announcement, max 160 chars. ` +
    `"lines" = exactly ${quests.length} strings, each a short (max 70 chars) ominous yet motivating one-liner for the matching quest, in order.`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.9,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) return json(fallback);
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return json({
      message: typeof parsed.message === "string" ? parsed.message : null,
      lines: Array.isArray(parsed.lines) ? parsed.lines.map(String) : [],
    });
  } catch {
    return json(fallback);
  }
});
