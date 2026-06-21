# P9 — Notifications setup (manual steps)

The code, the `push_subscriptions` table (+RLS), the service worker, the opt-in UI,
and both edge functions (`send-push`, `daily-rollover`) are already built and deployed.
Three things still need **your** hands, because they involve secrets / scheduling.

## VAPID keypair
- The **public key** is already in `.env.local` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- The **private key** is kept out of version control in **`supabase/SECRETS.local.md`**
  (gitignored). That file also has the ready-to-run `supabase secrets set` command.

> To rotate keys: `npx web-push generate-vapid-keys`, then update
> `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in `.env.local` and the values in `SECRETS.local.md`.

## 1. Set the edge-function secrets
Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` on the edge functions
(Supabase Dashboard → Project → Edge Functions → **Secrets**, or the CLI command in
`supabase/SECRETS.local.md`).
(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't set them.)

## 2. Schedule the nightly penalty job + morning reminder (pg_cron + pg_net)
Run this in the SQL editor. Replace `<SERVICE_ROLE_KEY>` with your project's service-role key
(Dashboard → Project Settings → API). Times are **UTC** — adjust to your timezone.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Nightly Penalty Zone: 00:05 IST = 18:35 UTC
select cron.schedule('daily-rollover', '35 18 * * *', $$
  select net.http_post(
    url    => 'https://blqrgyflynsgtjidoaeb.supabase.co/functions/v1/daily-rollover',
    headers => '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body   => '{}'::jsonb
  );
$$);

-- Morning "new quests have appeared" reminder: 07:00 IST = 01:30 UTC
select cron.schedule('daily-reminder', '30 1 * * *', $$
  select net.http_post(
    url    => 'https://blqrgyflynsgtjidoaeb.supabase.co/functions/v1/send-push',
    headers => '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body   => '{"title":"⚔ NEW DAILY QUESTS","body":"New Daily Quests have appeared, Hunter.","tag":"reset"}'::jsonb
  );
$$);
```

To remove later: `select cron.unschedule('daily-rollover');`

## 3. App icons (also needed for install)
`public/manifest.webmanifest` and the push notifications reference
`/icons/icon-192.png` and `/icons/icon-512.png`, which don't exist yet.
Drop two PNGs (192×192 and 512×512, maskable) into `public/icons/` before deploying
so install + notification icons render. (Tracked under P10 polish.)

## Testing
1. `npm run dev`, open the app, go to **LOG** → **REMINDERS** → **ENABLE**, allow the prompt.
2. Confirm a row appears: `select * from push_subscriptions;`
3. Manually fire a test push:
   ```bash
   curl -X POST https://blqrgyflynsgtjidoaeb.supabase.co/functions/v1/send-push \
     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "Content-Type: application/json" \
     -d '{"title":"⚠ THE SYSTEM","body":"A test notification, Hunter."}'
   ```
   You should get a System notification on that device.
> Note: Web Push needs HTTPS. `localhost` is treated as secure for dev; phones need the
> deployed HTTPS URL (P10). On iPhone, install to Home Screen first (iOS 16.4+).
