# The System — Solo Leveling Journal & Quest Tracker

> A PWA (installable on laptop + phone via Chrome) where real-life tasks are Quests,
> completing them grants EXP, and you level up as a Hunter — slowly, the way it should be.

---

## 1. Decisions locked in
- **Approach:** Plan fully first, then build.
- **Data/Login:** Supabase (email/password auth + Postgres cloud sync). Same data on laptop & phone.
- **Gamification:** Full RPG — Levels, EXP, Ranks (E→S), per-category stats, titles, streaks, level-up popups.
- **Leveling philosophy:** HARD to level. Your **Rank deliberately lags behind your power** (like Jinwoo staying low-rank while secretly monstrous). Reaching **S-Rank = overpowered endgame**, earned over months, not weeks.
- **Delivery:** PWA (installable, offline-capable, Chrome "Install" button).

## 2. Tech stack
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (React) + TypeScript** | PWA-friendly, one codebase, great DX |
| Styling | **Tailwind CSS** | Fast theming, the neon "System" look |
| Auth + DB | **Supabase** | Email login + Postgres + realtime, free tier |
| State | React Query (server) + Zustand (local UI) | Sync + snappy UI |
| PWA | next-pwa / manifest + service worker | Install + offline |
| Animation | Framer Motion | Level-up popups, EXP bar fills |
| Hosting | Vercel (free) | One-click deploy, HTTPS (needed for PWA) |

## 3. The RPG model (how real life maps to the game)
- **Categories → Stats.** Each task feeds a stat:
  - Gym/health → **STR**, Study/skills → **INT**, Routine/discipline → **VIT**,
    Social → **CHA**, Focus/work → **AGI**, Creativity → **PER**.
- Completing a quest grants EXP to your global level **and** to that stat.
- **Difficulty multiplier:** Easy ×1, Normal ×2, Hard ×3, Boss ×5 EXP.
- **Daily Quests = "Penalty Zone":** missing a daily quest by end of day → EXP penalty / streak reset (toggleable).
- **Streaks:** consecutive days clearing ALL daily quests → bonus EXP and they're the main path to Rank-Up trials.

### 3a. Hard leveling curve (the grind is the point)
- **EXP curve:** `expForLevel(n) = round(50 * n^2.4)`.
  - Steep on purpose. Sample cumulative EXP to reach a level:
    - Lv 5 ≈ a few days, Lv 10 ≈ a couple weeks, Lv 25 ≈ a couple months, Lv 50 ≈ half a year+, Lv 80 ≈ long-haul.
- A normal quest gives modest EXP (e.g. 10–30), so early levels feel earned and high levels are a real achievement.
- **Soft daily EXP cap** (optional) so you can't binge-grind to S-Rank in a day — consistency beats cramming. Very Solo Leveling.

### 3b. Rank lags behind power (the key mechanic you asked for)
Rank is **NOT** a simple `level → rank` lookup. You can be high-level and still stuck at D, exactly like Jinwoo. Rank only advances when you pass a **Rank-Up Trial** (a gate you must clear), and trials need BOTH power and consistency:

| Rank | Min Level | Trial requirement (must pass to promote) |
|---|---|---|
| **E** | 1 | Starting rank |
| **D** | 12 | 7-day streak + all 6 stats ≥ 10 |
| **C** | 25 | 14-day streak + 2 stats ≥ 30 |
| **B** | 40 | 30-day streak + 4 stats ≥ 50 + clear 1 Dungeon |
| **A** | 60 | 45-day streak + all stats ≥ 70 + clear 3 Dungeons |
| **S** | 85 | 60-day streak + all stats ≥ 90 + clear 5 Dungeons |

- So you'll often see **"Level 30 · D-Rank"** — strong, but the world still underestimates you. That tension is the fun.
- **S-Rank = overpowered:** unlocks the **"Monarch" UI skin** (purple/black, shadow particles), a 2× EXP "Sovereign" multiplier, exclusive titles ("Shadow Monarch"), and a flex stats page. You've basically beaten the System.
- Trials appear as a special blue **"⚠ RANK-UP TRIAL AVAILABLE"** quest when you meet the prerequisites; passing triggers a big cinematic promotion screen.

## 4. Screens
1. **ARISE (login)** — dark screen, glowing blue gate, email/password + sign-up.
2. **Hunter Dashboard (home)** — Name, Level, **Rank badge (often lower than your level implies)**, EXP bar, stat hexagon, today's Daily Quests, streak flame, Add Quest. Shows Rank-Up Trial banner when eligible.
3. **Quests** — tabs: Daily / Weekly / Monthly / Dungeons(projects). CRUD; states: To-Do / Done / Failed.
4. **Hunter's Log (journal)** — date-based notes, mood, reflection; notes linkable to a quest.
5. **Profile / Stats** — full stat breakdown, titles, achievements, rank history, charts.
6. **Settings** — theme, penalty toggle, daily cap toggle, categories, sign out.

## 5. Data model (Supabase tables)
```
profiles      (id=auth.uid, hunter_name, level, exp, rank, created_at)
stats         (id, user_id, stat_key STR/INT/VIT/CHA/AGI/PER, value)
quests        (id, user_id, title, notes, category, cadence daily|weekly|monthly|dungeon,
               difficulty, status todo|done|failed, due_date, created_at)
quest_logs    (id, user_id, quest_id, date, status, exp_awarded)   -- per-day completion history
journal       (id, user_id, date, body, mood)
titles        (id, user_id, title_key, unlocked_at)
streaks       (id, user_id, current, longest, last_cleared_date)
rank_trials   (id, user_id, target_rank, status locked|available|passed, passed_at)
```
- **Row Level Security (RLS):** every table filtered by `user_id = auth.uid()` so users only see their own data.

## 6. Theme / look & feel
- Pure-black background, **neon cyan/blue** accents, thin glowing borders, monospace-ish system font.
- Animated EXP bar; blue **"[ QUEST CLEARED ] +EXP"** popup with sound.
- **"LEVEL UP!"** full-screen flash on level gain; even bigger cinematic for **RANK UP**.
- **S-Rank Monarch skin:** purple/black palette + shadow-soldier particle effects.

## 7. Build phases (milestones)
1. **Scaffold** — Next.js + Tailwind + PWA manifest, base System theme, dummy data.
2. **Auth** — Supabase login/signup, protected routes.
3. **Quests core** — create/check/fail daily quests, persist to Supabase.
4. **RPG engine** — hard EXP curve, level, **rank-trial gating**, stats, level-up popups.
5. **Journal** — notes + mood.
6. **Weekly/Monthly/Dungeons** + streaks + titles + Rank-Up Trials.
7. **Polish** — animations, sounds, charts, S-Rank Monarch skin, install icons.
8. **Deploy** to Vercel → install on laptop & phone.

## 8. Decisions (locked)
- **Login:** Email/password only (no Google).
- **Notifications:** YES — daily reset reminder, penalty warning, "trial available".
- **Defaults:** Penalty mode ON, daily EXP cap ON. Hard mode is the default. The grind is the point.

---

# DEEP DIVE (the parts that get messy if not nailed now)

## D1. EXP economy — concrete numbers
Base EXP per quest = `base[difficulty]`, multiplied by an active-streak bonus, capped daily.
- `base = { Easy: 8, Normal: 18, Hard: 35, Boss: 60 }`
- **Streak bonus:** `1 + min(streak, 30) * 0.02` → up to +60% at a 30-day streak. Rewards consistency, not cramming.
- **Sovereign multiplier:** ×2 once S-Rank. (Off until then.)
- **Daily EXP cap (ON):** `cap = 120 + level * 6`. EXP beyond the cap is reduced to 10% ("diminishing returns"). You *can* overwork, but the System throttles binge-grinding — consistency wins.
- **Level curve:** `expForLevel(n) = round(50 * n^2.4)`. Cumulative-to-reach examples:
  - Lv2 ≈ 264 | Lv5 ≈ 2.4k | Lv10 ≈ 16k | Lv25 ≈ 170k | Lv50 ≈ 1.2M | Lv85 ≈ 5.5M total EXP.
  - At ~150 EXP/day that's: Lv10 in weeks, Lv25 in months, Lv50 ~year+, **Lv85/S-Rank = a true long-haul.** Exactly the brutal pacing you want.

## D2. Penalty system (Penalty Zone, ON by default)
- At local midnight, any **Daily** quest still `todo` is auto-marked `failed`.
- Each failed daily: `-15 EXP` (never drops you below the current level floor — you don't de-level, you just stall). Streak resets to 0.
- A nightly **rollover job** does this. Two-layer so it's reliable offline:
  1. **Client catch-up:** on app open, compute missed days since `last_seen` and apply penalties locally.
  2. **Server cron (Supabase scheduled Edge Function):** runs 00:05 user-local-ish, applies penalties + sends the penalty push.
- Idempotent: each day's rollover is keyed by date so it can't double-apply.

## D3. Notifications (PWA Web Push)
- **Mechanism:** Service Worker + Web Push API + VAPID keys. Subscriptions stored in a `push_subscriptions` table.
- **Sender:** Supabase Edge Functions on a schedule (pg_cron / scheduled functions).
- **Three notifications:**
  1. **Daily reset** (morning) — "New Daily Quests have appeared, Hunter."
  2. **Penalty warning** (e.g. 9pm) — "⚠ Daily Quests incomplete. Penalty Zone in 3h."
  3. **Trial available** — fires the moment prerequisites are met.
- **iOS caveat (write it down):** iPhone Web Push only works when the PWA is **installed to home screen** (iOS 16.4+). Android/desktop Chrome work normally. We'll surface an "Install for reminders" nudge.

## D4. Offline-first sync
- Service worker caches the app shell (works with no internet).
- Writes go to a local queue (IndexedDB) and flush to Supabase when back online; React Query handles refetch/merge.
- Conflict rule: last-write-wins per quest-day (simple, fine for a single-user journal).

## D5. Repo / folder structure (target)
```
planner/
  PLAN.md
  package.json
  next.config.js            # PWA config
  public/
    manifest.webmanifest
    icons/                  # 192/512 maskable, monarch variants
    sw.js                   # service worker (push + offline)
    sounds/                 # quest-clear, level-up, rank-up
  src/
    app/                    # Next.js App Router
      (auth)/login/
      (app)/dashboard/
      (app)/quests/
      (app)/journal/
      (app)/profile/
      (app)/settings/
      layout.tsx
    components/             # ExpBar, RankBadge, StatHexagon, QuestCard, LevelUpModal...
    lib/
      supabase/             # client + server helpers
      rpg/                  # expForLevel, rankTrials, applyExp, penalties  (PURE, unit-tested)
      push/                 # subscribe + VAPID helpers
    store/                  # zustand UI state
    styles/                 # tailwind + theme tokens (system blue / monarch purple)
  supabase/
    migrations/             # SQL tables + RLS
    functions/              # edge functions: daily-rollover, send-push
```
- **`lib/rpg/` is pure functions with tests** — the EXP/rank/penalty math is the heart of the game, so it gets unit tests and never touches the network. This is the single most important architectural call.

## D6. Build order (revised, test-driven on the core)
1. Scaffold Next.js + Tailwind + PWA manifest + System theme.  ← **starting now**
2. `lib/rpg/` pure engine + unit tests (curve, ranks, penalties, caps).
3. Supabase project + schema + RLS + auth (login/signup).
4. Quests core (daily) wired to engine + Supabase.
5. Dashboard UI (EXP bar, rank badge, stat hexagon, level-up modal).
6. Journal.
7. Weekly/Monthly/Dungeons + streaks + titles + Rank-Up Trials.
8. Notifications (SW push + edge functions + cron).
9. Offline queue + sync.
10. Polish (sounds, animations, Monarch S-skin) → deploy to Vercel → install on devices.

## D7. Is this enough planning?
Yes — this is the right depth to *start*. The risky unknowns (EXP economy, penalties, push, offline, rank-gating) now have concrete answers. Anything finer (exact pixel UI, copy text) is cheaper to decide while building than on paper. We plan the math hard, then iterate the visuals live.

---

# ============================================================
# PLAN v2 — Reference-driven design + Stat pages + Inventory + Attire
# ============================================================
> Added after studying 7 Solo Leveling System reference screens and researching
> evidence-based methods for raising each real-life stat. Three big new pillars:
> (A) a faithful visual design system, (B) tappable Stat detail pages that teach you
> how to actually raise each stat, (C) an Inventory holding Digital Records + an
> Attire/Equipment system with camera scanning.

## V2.1 Design system (derived from the reference screens)
Observed across the references — we copy these exactly:
- **Frames:** angular **notched/chamfered corners**, thin **double-line** borders, faint inner scanlines, soft outer glow. (notification + status screens)
- **Layout:** **nested rounded panels** — an outer window with a `[ HEADER ]` chip, then inner sub-panels for HP/MP and for Stats (ref image 2 is our north star).
- **Vitals bars:** add **HP / MP / FATIGUE** read-outs with little icons above the stat grid. In our app these are *derived*, not invented (see V2.2).
- **Stat rows:** icon + `LABEL: value`, two-column grid, plus an **"Available Ability Points"** number (ref 2 & 4).
- **Two skins / themes** (toggle by rank):
  - **System (default):** cyan `#36c5ff` on near-black, blue glow.
  - **Monarch (S-Rank unlock):** **gold `#ffd166` on black** (ref image 4 — Sung Jin-Woo Shadow Monarch status). Already half-built; this is the visual payoff for S-Rank.
- **Popups:** two reusable angular modals with **Yes/No**:
  - **NOTIFICATION** (ref 1) — quest fail / penalty / trial prompts.
  - **QUEST REWARDS** (ref 5) — on quest/dungeon clear: "You got rewards — +EXP, +Ability Points, Loot". Adds a dopamine beat.
- **Decorative corner filigree** (ref images.jpg) — optional ornate variant for the Status card header.

### Derived vitals (so HP/MP/Fatigue mean something real)
- **HP = consistency/health** → based on streak + VIT + completion rate. Drops when you fail dailies.
- **MP = mental energy** → based on INT + focus quests done today.
- **FATIGUE** → rises with many Hard/Boss quests in a day; high fatigue gently warns against burnout (ties into the daily cap from D1). Honest, not just flavor.
- **Ability Points (AP):** earned on level-up; **manually spend** to boost a stat (ref 1's +/- spinners). Gives agency beyond auto-stat-gain.

## V2.2 Stat detail pages — "How to raise this stat" (researched)
Tapping any stat on the radar/status opens a **full Stat page**: current value, recent growth chart, the quests that feed it, and an **evidence-based "Training Protocol"** card. Content below is grounded in research (sources at end of section).

| Stat | Real domain | How to raise it (evidence-based protocol) | Feeds from category |
|---|---|---|---|
| **STR** Strength | Physical training | **Progressive overload**: add ≤10%/week (weight, reps, sets, or range of motion); linear progression for beginners; recovery + sleep + protein are required for gains. | `health` |
| **INT** Intelligence | Learning | **Spaced repetition** (distributed practice can ~2× long-term retention vs cramming) + **deliberate practice** (target weaknesses, immediate feedback) + retrieval practice/interleaving. | `study` |
| **VIT** Vitality | Discipline/health habits | **Atomic/identity-based habits**: tiny, consistent actions ("1% better daily"), consistency > intensity, implementation intentions ("specific plan" → 2–3× success), sleep regularity. | `routine` |
| **CHA** Charisma | Social skill | Charisma is **learnable**: train **Presence, Power, Warmth**; practice **active listening** (people feel more understood → stronger connection); build emotional attunement / "read the room". | `social` |
| **AGI** Agility | Focus/execution speed | **Pomodoro** (25/5, longer break each 4) + **deep work**: single-task, kill distractions; brain sustains intense focus ~90 min max → structured bursts beat marathons. | `focus` |
| **PER** Perception | Awareness | **Mindfulness meditation**: improves interoception/body awareness (meta-analytic g≈0.31–0.41), attention/working memory, calmer decision-making; daily mindful breathing / body scan. | `creative` |

Each Stat page = **Header (icon + value + rank-of-stat)** → **growth sparkline** → **"Training Protocol" steps** → **"Quests that train this" list** with a quick "+ Add a {stat} quest" button. Turns the tracker into a coach.

**Research sources:**
- Progressive overload — [Muscle&Strength](https://www.muscleandstrength.com/articles/progressive-overload), [NASM](https://blog.nasm.org/progressive-overload-explained), [Gold's Gym](https://www.goldsgym.com/blog/progressive-overload-beginners-guide/)
- Spaced repetition / deliberate practice — [Spacing effect PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8759977/), [Cognitive science of spacing](https://www.justinmath.com/cognitive-science-of-learning-spaced-repetition/), [Deliberate practice](https://www.structural-learning.com/post/deliberate-practice)
- Habits / discipline / sleep — [James Clear, Atomic Habits](https://jamesclear.com/atomic-habits), [Science of habit formation (PDF)](https://powertechjournal.com/index.php/journal/article/download/1198/845/2221)
- Charisma / active listening — [Science of charisma](https://richard-reid.com/the-science-of-charisma-insights-and-findings/), [High-quality listening & connection (Nature)](https://www.nature.com/articles/s44271-025-00342-2)
- Focus / Pomodoro / deep work — [Pomodoro scoping review (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12532815/)
- Mindfulness / perception — [Interoception meta-analysis (Nature Sci Reports)](https://www.nature.com/articles/s41598-025-22661-4), [APA: benefits of mindfulness](https://www.apa.org/monitor/2012/07-08/ce-corner)

## V2.3 Inventory + Digital Records (the "useful" pillar)
A real, practical vault styled as the **System Inventory** (ref image 6 — glowing slot grid).
- **Holders = folders.** User creates any number of typed holders: e.g. **Contracts, IDs & Documents, Certificates, Receipts, Warranties, Medical, Notes**. Each holder is a "pouch" in the inventory.
- **Records = items inside a holder.** Each record = an uploaded file (PDF/image) + metadata (title, tags, date, optional expiry, note). Rendered as inventory **slots** with a thumbnail; tap = item detail (preview, download, edit, delete).
- **Capture:** upload from device **or** **scan with camera** (mobile `getUserMedia` / `<input capture>`), multi-page for documents.
- **Search & expiry:** search across records; optional **expiry reminders** (passport/contract/warranty) reuse the push system from D3. Genuinely useful.
- **Storage:** **Supabase Storage**, one **private bucket per concern**, RLS so only the owner reads. Files are not public; signed URLs for viewing. (Sensitive data → keep buckets private, never `public`.)

## V2.4 Attire / Equipment system (camera scan → today's outfit)
Styled as the **Equipment mannequin** (ref image 3 — slots wired to a body silhouette).
- **Wardrobe = scanned clothes.** Add a garment by **photographing it** (camera); optional background removal later. Each item: name, **slot** (Head / Top / Outer / Bottom / Footwear / Accessory), color tag, photo.
- **Equip "Today's Attire":** drag/tap wardrobe items into the mannequin slots to set what you're wearing today. Saves a dated **outfit log** (great for "what did I wear", laundry rotation, packing).
- **Optional RPG flavor:** equipping a full outfit can grant a tiny cosmetic **set bonus** (e.g. "Gym Fit equipped → +1 STR quest EXP today"), echoing ref 3's "+INT/+MAN" gear bonuses. Kept cosmetic/small so it never breaks the hard-leveling economy.
- **Mechanism:** same camera + Storage pipeline as records; a separate `wardrobe` bucket.

## V2.5 New data model (additions)
```
ability_points (user_id, available int, spent int)            -- AP from level-ups
stat_history   (id, user_id, stat_key, value, recorded_at)    -- for sparklines
holders        (id, user_id, name, kind, icon, created_at)    -- folders
records        (id, user_id, holder_id, title, file_path, mime, tags text[],
                issued_date, expiry_date, note, created_at)   -- documents
wardrobe       (id, user_id, name, slot, color, photo_path, created_at)
outfits        (id, user_id, date, item_ids uuid[], note)     -- today's attire log
```
- **Storage buckets (private + RLS):** `records`, `wardrobe`. Path convention `{user_id}/{uuid}` so policies match on the leading folder = `auth.uid()`.

## V2.6 New screens
7. **Stat Detail** `/stats/[key]` — value, growth chart, Training Protocol, related quests.
8. **Inventory** `/inventory` — grid of holders; open holder → record slots; add/scan record.
9. **Equipment / Wardrobe** `/equipment` — mannequin slots + wardrobe grid; set today's attire; scan new garment.
- Add a bottom **System nav** (Status · Quests · Inventory · Equipment · Log) styled as glowing tabs.

## V2.7 Updated roadmap (revised)
- ✅ P1 Scaffold · ✅ UI overhaul · ✅ P3 Auth + cloud data
- ✅ **P4 — Design system v2:** HP/MP/Fatigue vitals panel, Ability-Point readout, QUEST REWARDS / LEVEL UP modal, Monarch gold skin, bottom System nav.
- ✅ **P5 — Stat detail pages:** `stat_history` + `ability_points` tables (RLS clean), `/stats/[key]` with growth sparkline, researched Training Protocols, and AP spend spinners.
- ✅ **P6 — Inventory & Digital Records:** `holders` + `records` tables + private `records` Storage bucket (path-scoped RLS, advisor clean), `/inventory` holder grid, `/inventory/[holderId]` with upload + camera scan, signed-URL previews, tags/dates/notes, and in-app expiry warnings. (Push-based expiry reminders ride on P9.)
- ✅ **P7 — Attire/Equipment:** `wardrobe` + `outfits` tables + private `wardrobe` Storage bucket (RLS, advisor clean), `/equipment` with mannequin slots, camera-scan garments, tap-to-equip today's attire (one per slot, upserted per day), and a cosmetic "Geared Up" set bonus.
- ✅ **P8 — Journal** (Hunter's Log): date-based entries with a 6-mood state-of-mind picker, one-per-day upsert, a "cleared today" quest read-out, and a timeline of past records (each showing the quests conquered that day). `journal` table RLS clean.
- 🔧 **P9 — Notifications** (code+DB done, needs secret/cron): `push_subscriptions` table (+RLS), service worker (Web Push + offline app-shell cache), registered on load; LOG → REMINDERS opt-in (subscribe/unsubscribe, iOS-install nudge); deployed edge functions `send-push` (generic sender) + `daily-rollover` (D2 penalty job — fails todo dailies, floors EXP, resets streak, pushes warning). **Remaining manual steps in `supabase/SETUP-NOTIFICATIONS.md`:** set VAPID secret, schedule pg_cron, add app icons.
- ✅ **Quest Board** (`/quests`): full screen-3 build — Daily/Weekly/Monthly/Dungeons tabs, create/edit/delete, todo→done/failed states with reset, due dates + notes. Completion runs the shared engine award path (`lib/rpg/award.ts`, reused with the dashboard): EXP + stat + level-up/AP, and dungeon clears increment `dungeons_cleared` toward Rank-Up Trials. Open-count badges per tab.
- ✅ **"Cooler" feature pack** (post-P9, pre-deploy):
  - **System Quest-Giver** — `lib/rpg/questgen.ts` deterministic, level-scaled, weakest-stat-aware daily quest set; gold arrival NOTIFICATION modal; `quests.source`/`system_date`.
  - **AI Quest-Master** — optional Groq edge function `quest-flavor` gives the System an in-character voice on the arrival screen; degrades to rule-engine text with no key (`supabase/SETUP-AI-QUESTMASTER.md`).
  - **Cinematics + sound** — Web Audio SFX (no assets), LEVEL UP / RANK UP full-screen flash, haptics, mute toggle.
  - **Rank-Up Trial flow** — Attempt-Trial → gold RANK UP cinematic → promote rank + unlock title (S = Shadow Monarch).
  - **Skills** — `user_abilities`/`active_effects`; spend AP on Focus Surge (2× next EXP) and Iron Will (negates next penalty, honoured by daily-rollover v2).
  - **Shadow Army** — `shadows` table; Dungeon clears ARISE tiered shadow soldiers with Army Power; roster on the Dungeons tab.
- **P10 — Deploy to Vercel** → install on phone + laptop.

## V2.8 Privacy & safety note (because this now holds real documents)
Records can include IDs, contracts, medical files. Therefore: **private buckets only**, strict **RLS by `auth.uid()`**, signed short-lived URLs for viewing, no public links, and a clear in-app note that files are stored in the user's own Supabase project. We will run the security advisor after every storage/RLS change (as we did for the schema).
