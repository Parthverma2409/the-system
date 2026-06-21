# Deploying The System (P10)

A Next.js 16 PWA backed by Supabase. Deploy target: **Vercel** (free, HTTPS —
required for installable PWA + Web Push).

## 1. Environment variables (set these on Vercel)
Project → Settings → Environment Variables (Production + Preview):

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://blqrgyflynsgtjidoaeb.supabase.co` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your publishable key | public |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | the VAPID public key | public; from `.env.local` |

These three mirror `.env.local`. No private keys go on Vercel — the VAPID
private key and `GROQ_API_KEY` live only as **Supabase edge-function secrets**.

## 2. Deploy
Either path works:

**A. GitHub → Vercel (recommended)**
1. Create a GitHub repo and push this branch (or merge to `main` first).
2. vercel.com → New Project → import the repo. Framework auto-detects Next.js.
3. Add the env vars above → Deploy.

**B. Vercel CLI**
```bash
npm i -g vercel
vercel        # first run links/creates the project
vercel --prod
```

## 3. Post-deploy checklist (the account-only steps)
- [ ] **Supabase edge secrets** — set on the project (Dashboard → Edge Functions → Secrets):
  - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — see `supabase/SECRETS.local.md`.
  - `GROQ_API_KEY` — see `supabase/SETUP-AI-QUESTMASTER.md` (optional; AI Quest-Master).
- [ ] **Cron** — schedule `daily-rollover` + the morning reminder via pg_cron/pg_net
      (`supabase/SETUP-NOTIFICATIONS.md`). Needs the service-role key.
- [ ] **Supabase Auth → URL config** — add the Vercel domain to the allowed
      redirect/site URLs so email login works in production.
- [x] **App icons** — `public/icons/icon-192.png` + `icon-512.png` are generated
      (regenerate any time with `node scripts/gen-icons.mjs`).

## 4. Install on devices
- **Desktop/Android Chrome:** visit the site → address-bar **Install** button.
- **iPhone (Safari):** Share → **Add to Home Screen** (iOS 16.4+ required for
  Web Push; push only works once installed).

## Local dev
```bash
npm install
npm run dev        # http://localhost:3000 (localhost counts as secure for PWA/push)
```
