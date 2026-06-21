// send-push — generic Web Push sender for The System (PLAN D3).
// Powers all three notifications: daily reset, penalty warning, trial available.
// Callers MUST present the service-role key (verify_jwt is on); used both by the
// nightly cron jobs and internally by daily-rollover.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

interface PushBody {
  user_id?: string; // omit to broadcast to every subscription
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hunter@thesystem.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

async function sendToSubscriptions(
  supabase: ReturnType<typeof admin>,
  payload: PushBody,
  userId?: string
): Promise<{ sent: number; pruned: number }> {
  let q = supabase.from("push_subscriptions").select("id,endpoint,p256dh,auth");
  if (userId) q = q.eq("user_id", userId);
  const { data: subs } = await q;

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    url: payload.url ?? "/",
    tag: payload.tag ?? "system",
  });

  let sent = 0;
  const stale: string[] = [];
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        message
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) stale.push(s.id); // gone — prune it
    }
  }
  if (stale.length) await supabase.from("push_subscriptions").delete().in("id", stale);
  return { sent, pruned: stale.length };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let payload: PushBody;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  if (!payload?.title) return new Response("Missing title", { status: 400 });

  const result = await sendToSubscriptions(admin(), payload, payload.user_id);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
