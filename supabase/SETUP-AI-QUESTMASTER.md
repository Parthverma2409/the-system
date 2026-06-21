# AI Quest-Master (optional) — setup

The `quest-flavor` edge function gives the System an in-character voice on the
Daily Quest arrival screen (a System announcement + a one-liner per quest). It's
**optional and fully degradable**: with no key set, the app silently uses the
built-in rule-engine text. Nothing breaks.

Provider: **Groq** (OpenAI-compatible, free, fast).

## 1. Get a Groq API key
Sign in at <https://console.groq.com> → API Keys → create one (starts with `gsk_…`).

## 2. Set it as an edge-function secret
Supabase Dashboard → Project → Edge Functions → **Secrets**, or via CLI:

```bash
supabase secrets set GROQ_API_KEY=gsk_your_key_here
# optional — override the default model (llama-3.3-70b-versatile):
supabase secrets set GROQ_MODEL=llama-3.3-70b-versatile
```

That's it — the `quest-flavor` function (already deployed) picks the key up on
its next invocation. The client calls it when you open the "⚠ DAILY QUEST HAS
ARRIVED" screen on the Quest Board.

## Cost / privacy
- Only the generated quest titles + your level/rank are sent — no journal, no
  personal records.
- Groq's free tier is generous; this is a few hundred tokens once per day.
- To rotate or disable: change/remove the `GROQ_API_KEY` secret. Removing it
  returns the app to the offline rule-engine flavor.
