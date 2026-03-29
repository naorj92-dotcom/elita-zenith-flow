import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PORTAL_URL = "https://elita-zenith-flow.lovable.app/portal";
const BUSINESS_ADDRESS = "123 Luxury Lane, Suite 100, Beverly Hills, CA 90210";

function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
}
function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

async function sendSms(supabaseUrl: string, supabaseKey: string, params: { to: string; body: string; client_id?: string; category: string }) {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) console.error("send-sms error:", data);
  return data;
}

async function isTriggerEnabled(supabase: any, triggerKey: string): Promise<boolean> {
  const { data } = await supabase
    .from("notification_triggers")
    .select("is_enabled")
    .eq("trigger_key", triggerKey)
    .single();
  return data?.is_enabled ?? false;
}

async function getGoogleReviewUrl(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("notification_triggers")
    .select("google_review_url")
    .eq("trigger_key", "post_visit_followup")
    .single();
  return data?.google_review_url || "https://g.page/review";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date();
    const results: Record<string, number> = {};

    // ─── TRIGGER 2: 48-hour reminder ───
    if (await isTriggerEnabled(supabase, "48hr_appointment_reminder")) {
      const window48hStart = new Date(now.getTime() + 47 * 60 * 60 * 1000);
      const window48hEnd = new Date(now.getTime() + 49 * 60 * 60 * 1000);

      const { data: upcoming48 } = await supabase
        .from("appointments")
        .select(`
          id, scheduled_at, status,
          clients (id, first_name, phone, sms_opt_out),
          services (name),
          staff (first_name)
        `)
        .eq("status", "scheduled")
        .gte("scheduled_at", window48hStart.toISOString())
        .lte("scheduled_at", window48hEnd.toISOString());

      let count48 = 0;
      for (const apt of upcoming48 || []) {
        const client = apt.clients as any;
        if (!client?.phone || client.sms_opt_out) continue;

        // Check not already sent
        const { data: existing } = await supabase
          .from("notification_logs")
          .select("id")
          .eq("client_id", client.id)
          .eq("category", "appointment_reminder_48h")
          .eq("status", "sent")
          .gte("created_at", new Date(now.getTime() - 50 * 60 * 60 * 1000).toISOString())
          .limit(1);
        if (existing && existing.length > 0) continue;

        // Check pending forms
        const { data: pendingForms } = await supabase
          .from("client_forms")
          .select("id")
          .eq("client_id", client.id)
          .eq("status", "pending")
          .limit(1);

        const service = apt.services as any;
        const provider = apt.staff as any;
        let smsBody = `Hi ${client.first_name}! Reminder: your ${service?.name || "appointment"} is tomorrow at ${formatTime(apt.scheduled_at)} with ${provider?.first_name || "your provider"}.`;
        if (pendingForms && pendingForms.length > 0) {
          smsBody += `\n\nComplete your forms first: ${PORTAL_URL}/forms`;
        }
        smsBody += "\n\nReply STOP to opt out.";

        await sendSms(supabaseUrl, supabaseKey, {
          to: client.phone,
          body: smsBody,
          client_id: client.id,
          category: "appointment_reminder_48h",
        });
        count48++;
      }
      results.reminder_48h = count48;
    }

    // ─── TRIGGER 3: 2-hour reminder ───
    if (await isTriggerEnabled(supabase, "2hr_same_day_reminder")) {
      const window2hStart = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
      const window2hEnd = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

      const { data: upcoming2 } = await supabase
        .from("appointments")
        .select(`
          id, scheduled_at, status,
          clients (id, first_name, phone, sms_opt_out),
          services (name)
        `)
        .eq("status", "scheduled")
        .gte("scheduled_at", window2hStart.toISOString())
        .lte("scheduled_at", window2hEnd.toISOString());

      let count2 = 0;
      for (const apt of upcoming2 || []) {
        const client = apt.clients as any;
        if (!client?.phone || client.sms_opt_out) continue;

        const { data: existing } = await supabase
          .from("notification_logs")
          .select("id")
          .eq("client_id", client.id)
          .eq("category", "appointment_reminder_2h")
          .eq("status", "sent")
          .gte("created_at", new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString())
          .limit(1);
        if (existing && existing.length > 0) continue;

        const service = apt.services as any;
        const smsBody = `See you soon ${client.first_name}! Your ${service?.name || "appointment"} is today at ${formatTime(apt.scheduled_at)}. We're at ${BUSINESS_ADDRESS}.\n\nRunning late? Reply LATE and we'll hold your spot.`;

        await sendSms(supabaseUrl, supabaseKey, {
          to: client.phone,
          body: smsBody,
          client_id: client.id,
          category: "appointment_reminder_2h",
        });
        count2++;
      }
      results.reminder_2h = count2;
    }

    // ─── TRIGGER 4: Post-visit followup (24h after completed) ───
    if (await isTriggerEnabled(supabase, "24hr_post_visit_followup")) {
      const window24hStart = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      const window24hEnd = new Date(now.getTime() - 23 * 60 * 60 * 1000);
      const googleReviewUrl = await getGoogleReviewUrl(supabase);

      const { data: completed } = await supabase
        .from("appointments")
        .select(`
          id, completed_at,
          clients (id, first_name, phone, sms_opt_out)
        `)
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .gte("completed_at", window24hStart.toISOString())
        .lte("completed_at", window24hEnd.toISOString());

      let countFollowup = 0;
      for (const apt of completed || []) {
        const client = apt.clients as any;
        if (!client?.phone || client.sms_opt_out) continue;

        const { data: existing } = await supabase
          .from("notification_logs")
          .select("id")
          .eq("client_id", client.id)
          .eq("category", "post_visit_followup")
          .eq("status", "sent")
          .gte("created_at", window24hStart.toISOString())
          .limit(1);
        if (existing && existing.length > 0) continue;

        const smsBody = `Hi ${client.first_name}, hope you love your results! ✨\n\nYour aftercare notes: ${PORTAL_URL}\n\nA quick Google review means the world to us: ${googleReviewUrl}\n\nQuestions? Just reply here.`;

        await sendSms(supabaseUrl, supabaseKey, {
          to: client.phone,
          body: smsBody,
          client_id: client.id,
          category: "post_visit_followup",
        });
        countFollowup++;
      }
      results.post_visit = countFollowup;
    }

    // ─── TRIGGER 5: Package expiry reminder (7 days before) ───
    if (await isTriggerEnabled(supabase, "package_expiry_reminder")) {
      const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in7daysStart = new Date(in7days.getTime() - 12 * 60 * 60 * 1000);
      const in7daysEnd = new Date(in7days.getTime() + 12 * 60 * 60 * 1000);

      const { data: expiringPkgs } = await supabase
        .from("client_packages")
        .select(`
          id, sessions_total, sessions_used, expiry_date,
          clients (id, first_name, phone, sms_opt_out),
          packages (name)
        `)
        .eq("status", "active")
        .not("expiry_date", "is", null)
        .gte("expiry_date", in7daysStart.toISOString())
        .lte("expiry_date", in7daysEnd.toISOString());

      let countPkg = 0;
      for (const pkg of expiringPkgs || []) {
        if (pkg.sessions_used >= pkg.sessions_total) continue;
        const client = pkg.clients as any;
        if (!client?.phone || client.sms_opt_out) continue;

        const { data: existing } = await supabase
          .from("notification_logs")
          .select("id")
          .eq("client_id", client.id)
          .eq("category", "package_expiry_reminder")
          .eq("status", "sent")
          .gte("created_at", new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString())
          .limit(1);
        if (existing && existing.length > 0) continue;

        const remaining = pkg.sessions_total - pkg.sessions_used;
        const pkgName = (pkg.packages as any)?.name || "package";
        const expiryDate = formatShortDate(pkg.expiry_date);

        const smsBody = `Hi ${client.first_name}, your ${pkgName} has ${remaining} session(s) expiring on ${expiryDate}. Don't let them go! Book now: ${PORTAL_URL}/book`;

        await sendSms(supabaseUrl, supabaseKey, {
          to: client.phone,
          body: smsBody,
          client_id: client.id,
          category: "package_expiry_reminder",
        });
        countPkg++;
      }
      results.package_expiry = countPkg;
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in process-sms-reminders:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
