import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  PORTAL_URL, sanitizeHtml, formatDay, formatDate, formatTime,
  wrapInElitaTemplate, elitaButton, elitaText,
  elitaHeading, elitaDetailsTable, elitaSignature, elitaDivider,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callSendEmail(supabaseUrl: string, supabaseKey: string, payload: { to: string; subject: string; html: string; client_id?: string }) {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date();

    // Fetch enabled triggers
    const { data: triggers } = await supabase
      .from("notification_triggers")
      .select("*")
      .eq("is_enabled", true);

    if (!triggers || triggers.length === 0) {
      return new Response(JSON.stringify({ message: "No enabled triggers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggerMap = new Map(triggers.map((t: any) => [t.trigger_key, t]));
    const results: string[] = [];

    // Get google review URL
    const postVisitTrigger = triggerMap.get("24hr_post_visit_followup");
    const googleReviewUrl = postVisitTrigger?.google_review_url || "";

    // ── TRIGGER 1: 48hr Appointment Reminder ──
    const t1 = triggerMap.get("48hr_appointment_reminder");
    if (t1) {
      const windowStart = new Date(now.getTime() + 47 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(now.getTime() + 49 * 60 * 60 * 1000).toISOString();

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, scheduled_at, client_id, service_id, staff_id, clients(first_name, last_name, email, phone, sms_opt_out, email_opt_out), services(name), staff(first_name)")
        .in("status", ["scheduled", "confirmed"])
        .gte("scheduled_at", windowStart)
        .lte("scheduled_at", windowEnd);

      for (const appt of appts || []) {
        const client = appt.clients as any;
        const service = appt.services as any;
        const staff = appt.staff as any;
        if (!client) continue;

        // Check pending forms
        const { data: pendingForms } = await supabase
          .from("client_forms")
          .select("id")
          .eq("client_id", appt.client_id)
          .eq("status", "pending")
          .limit(1);

        const hasPendingForms = (pendingForms?.length || 0) > 0;
        const serviceName = service?.name || "your appointment";
        const providerFirst = staff?.first_name || "your provider";

        // Email
        if (t1.channels?.includes("email") && client.email && !client.email_opt_out) {
          const formsWarning = hasPendingForms
            ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:14px;margin:16px 0;">
                <p style="margin:0;color:#92400e;font-size:14px;">⚠️ Please complete your pre-visit forms before arriving:</p>
                ${elitaButton("Complete Forms", `${PORTAL_URL}/forms`)}
              </div>`
            : "";

          const innerHtml = `
            ${elitaHeading("Your appointment is tomorrow ✨")}
            ${elitaText(`Hi ${sanitizeHtml(client.first_name)},`)}
            ${elitaText(`Just a reminder that your <strong>${sanitizeHtml(serviceName)}</strong> is tomorrow at <strong>${formatTime(appt.scheduled_at)}</strong> at Elita Medical Spa.`)}
            ${formsWarning}
            ${elitaText("Questions? Reply to this email.")}
            ${elitaSignature()}
          `;

          await callSendEmail(supabaseUrl, supabaseKey, {
            to: client.email,
            subject: "Your appointment is tomorrow ✨",
            html: wrapInElitaTemplate(innerHtml),
            client_id: appt.client_id,
          });
        }

        // SMS
        if (t1.channels?.includes("sms") && client.phone && !client.sms_opt_out) {
          const smsBody = `Hi ${client.first_name}! Reminder: Your ${serviceName} is tomorrow at ${formatTime(appt.scheduled_at)} at Elita Medical Spa.${hasPendingForms ? ` Please complete your forms: ${PORTAL_URL}/forms` : ""} Reply STOP to opt out.`;
          console.log(`[SMS] To: ${client.phone}, Body: ${smsBody}`);
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
              body: JSON.stringify({ to: client.phone, body: smsBody, client_id: appt.client_id, category: "48hr_appointment_reminder" }),
            });
          } catch (e) { console.error("SMS error:", e); }
        }
      }
      results.push(`48hr: processed ${(appts || []).length} appointments`);
    }

    // ── TRIGGER 2: 2hr Same-Day Reminder (SMS only) ──
    const t2 = triggerMap.get("2hr_same_day_reminder");
    if (t2) {
      const windowStart = new Date(now.getTime() + 110 * 60 * 1000).toISOString();
      const windowEnd = new Date(now.getTime() + 130 * 60 * 1000).toISOString();

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, scheduled_at, client_id, clients(first_name, phone, sms_opt_out), services(name)")
        .in("status", ["scheduled", "confirmed"])
        .gte("scheduled_at", windowStart)
        .lte("scheduled_at", windowEnd);

      for (const appt of appts || []) {
        const client = appt.clients as any;
        const service = appt.services as any;
        if (!client?.phone || client.sms_opt_out) continue;

        const smsBody = `Hi ${client.first_name}! Your ${service?.name || "appointment"} is in 2 hours at ${formatTime(appt.scheduled_at)} at Elita Medical Spa. See you soon! Reply STOP to opt out.`;
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
            body: JSON.stringify({ to: client.phone, body: smsBody, client_id: appt.client_id, category: "2hr_same_day_reminder" }),
          });
        } catch (e) { console.error("SMS error:", e); }
      }
      results.push(`2hr: processed ${(appts || []).length} appointments`);
    }

    // ── TRIGGER 3: 24hr Post-Visit Follow-Up ──
    const t3 = triggerMap.get("24hr_post_visit_followup");
    if (t3) {
      const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, completed_at, client_id, clients(first_name, email, phone, sms_opt_out, email_opt_out), services(name)")
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .gte("completed_at", windowStart)
        .lte("completed_at", windowEnd);

      for (const appt of appts || []) {
        const client = appt.clients as any;
        const service = appt.services as any;
        if (!client) continue;

        // Email
        if (t3.channels?.includes("email") && client.email && !client.email_opt_out) {
          const reviewButton = googleReviewUrl
            ? elitaButton("⭐ Leave a Google Review", googleReviewUrl)
            : "";

          const innerHtml = `
            ${elitaHeading("How was your visit? ✨")}
            ${elitaText(`Hi ${sanitizeHtml(client.first_name)},`)}
            ${elitaText("Thank you for visiting Elita! We hope you love your results.")}
            ${elitaText("Your aftercare notes are ready:")}
            ${elitaButton("View Aftercare Notes", PORTAL_URL)}
            ${googleReviewUrl ? `${elitaDivider()}${elitaText("If you have 60 seconds, a Google review means everything to us:")}${reviewButton}` : ""}
            ${elitaSignature()}
          `;

          await callSendEmail(supabaseUrl, supabaseKey, {
            to: client.email,
            subject: "How was your visit? ✨",
            html: wrapInElitaTemplate(innerHtml),
            client_id: appt.client_id,
          });
        }

        // SMS
        if (t3.channels?.includes("sms") && client.phone && !client.sms_opt_out) {
          const smsBody = `Hi ${client.first_name}! Thank you for visiting Elita! Your aftercare notes: ${PORTAL_URL}${googleReviewUrl ? `\nLeave a review: ${googleReviewUrl}` : ""}\nReply STOP to opt out.`;
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
              body: JSON.stringify({ to: client.phone, body: smsBody, client_id: appt.client_id, category: "24hr_post_visit_followup" }),
            });
          } catch (e) { console.error("SMS error:", e); }
        }
      }
      results.push(`Post-visit: processed ${(appts || []).length} appointments`);
    }

    // ── TRIGGER 4: Package Expiry Warning (7 days) ──
    const t4 = triggerMap.get("package_expiry_warning");
    if (t4) {
      const targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

      const { data: packages } = await supabase
        .from("client_packages")
        .select("id, client_id, sessions_total, sessions_used, expiry_date, clients(first_name, email, phone, sms_opt_out, email_opt_out), packages(name)")
        .eq("status", "active")
        .gt("sessions_total", 0)
        .not("expiry_date", "is", null)
        .gte("expiry_date", dayStart.toISOString())
        .lte("expiry_date", dayEnd.toISOString());

      for (const pkg of packages || []) {
        const client = pkg.clients as any;
        const pkgInfo = pkg.packages as any;
        if (!client) continue;
        const remaining = pkg.sessions_total - pkg.sessions_used;
        if (remaining <= 0) continue;

        const packageName = pkgInfo?.name || "your package";
        const expiryDateStr = formatDate(pkg.expiry_date!);

        // Email
        if (t4.channels?.includes("email") && client.email && !client.email_opt_out) {
          const innerHtml = `
            ${elitaHeading("Your package is expiring soon")}
            ${elitaText(`Hi ${sanitizeHtml(client.first_name)},`)}
            ${elitaText(`Your <strong>${sanitizeHtml(packageName)}</strong> has <strong>${remaining} session(s)</strong> remaining and expires on <strong>${expiryDateStr}</strong>.`)}
            ${elitaText("Don't let them go to waste!")}
            ${elitaButton("Book Now →", PORTAL_URL)}
            ${elitaSignature()}
          `;

          await callSendEmail(supabaseUrl, supabaseKey, {
            to: client.email,
            subject: "Your Elita package is expiring soon",
            html: wrapInElitaTemplate(innerHtml),
            client_id: pkg.client_id,
          });
        }

        // SMS
        if (t4.channels?.includes("sms") && client.phone && !client.sms_opt_out) {
          const smsBody = `Hi ${client.first_name}! Your ${packageName} has ${remaining} session(s) left and expires ${expiryDateStr}. Book now: ${PORTAL_URL}\nReply STOP to opt out.`;
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
              body: JSON.stringify({ to: client.phone, body: smsBody, client_id: pkg.client_id, category: "package_expiry_warning" }),
            });
          } catch (e) { console.error("SMS error:", e); }
        }
      }
      results.push(`Package expiry: processed ${(packages || []).length} packages`);
    }

    // ── TRIGGER 5: Membership Renewal Reminder (5 days) ──
    const t5 = triggerMap.get("membership_renewal_reminder");
    if (t5) {
      const targetDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

      const { data: memberships } = await supabase
        .from("client_memberships")
        .select("id, client_id, next_billing_date, clients(first_name, email, phone, sms_opt_out, email_opt_out), memberships(name)")
        .eq("status", "active")
        .not("next_billing_date", "is", null)
        .gte("next_billing_date", dayStart.toISOString())
        .lte("next_billing_date", dayEnd.toISOString());

      for (const mem of memberships || []) {
        const client = mem.clients as any;
        if (!client) continue;
        const renewalDate = formatDate(mem.next_billing_date!);

        if (t5.channels?.includes("email") && client.email && !client.email_opt_out) {
          const innerHtml = `
            ${elitaHeading("Membership Renewal Reminder")}
            ${elitaText(`Hi ${sanitizeHtml(client.first_name)},`)}
            ${elitaText(`Your membership renewal is coming up on <strong>${renewalDate}</strong>.`)}
            ${elitaText("Your monthly treatment is included — make sure to schedule it!")}
            ${elitaButton("View Membership", PORTAL_URL)}
            ${elitaSignature()}
          `;

          await callSendEmail(supabaseUrl, supabaseKey, {
            to: client.email,
            subject: "Your Elita membership renews soon",
            html: wrapInElitaTemplate(innerHtml),
            client_id: mem.client_id,
          });
        }

        if (t5.channels?.includes("sms") && client.phone && !client.sms_opt_out) {
          const smsBody = `Hi ${client.first_name}! Your Elita membership renews on ${renewalDate}. Don't forget to schedule your monthly treatment! ${PORTAL_URL}\nReply STOP to opt out.`;
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
              body: JSON.stringify({ to: client.phone, body: smsBody, client_id: mem.client_id, category: "membership_renewal_reminder" }),
            });
          } catch (e) { console.error("SMS error:", e); }
        }
      }
      results.push(`Membership renewal: processed ${(memberships || []).length} memberships`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in process-scheduled-notifications:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
