import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  PORTAL_URL, BUSINESS_NAME, BUSINESS_LOCATION,
  sanitizeHtml, formatDay, formatDate, formatTime,
  buildGoogleCalendarLink, wrapInElitaTemplate, elitaButton, elitaText,
  elitaHeading, elitaDivider, elitaDetailsTable, elitaSignature,
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

    const { appointment_id } = await req.json();
    if (!appointment_id || typeof appointment_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing appointment_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: apt, error: aptError } = await supabase
      .from("appointments")
      .select(`id, scheduled_at, duration_minutes, status, client_id, service_id, staff_id,
        clients (id, first_name, last_name, email, phone, sms_opt_out, email_opt_out),
        services (id, name, duration_minutes),
        staff (id, first_name, last_name)`)
      .eq("id", appointment_id)
      .single();

    if (aptError || !apt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (apt.status !== "scheduled") {
      return new Response(JSON.stringify({ message: "Not scheduled, skipping" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = apt.clients as any;
    const service = apt.services as any;
    const provider = apt.staff as any;
    if (!client) {
      return new Response(JSON.stringify({ message: "No client linked" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { sms: "skipped", email: "skipped" };
    const serviceName = service?.name || "Appointment";
    const providerFirst = provider?.first_name || "Your provider";
    const durationMin = apt.duration_minutes || service?.duration_minutes || 60;

    // SMS
    if (client.phone && !client.sms_opt_out) {
      try {
        const smsBody = `Confirmed! ✨ Your ${serviceName} is booked for ${formatDay(apt.scheduled_at)}, ${formatDate(apt.scheduled_at)} at ${formatTime(apt.scheduled_at)} with ${providerFirst} at ${BUSINESS_NAME}.\n\nManage: ${PORTAL_URL}\n\nReply STOP to opt out.`;
        const smsRes = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
          body: JSON.stringify({ to: client.phone, body: smsBody, client_id: client.id, category: "appointment_confirmation" }),
        });
        await smsRes.json();
        results.sms = smsRes.ok ? "sent" : "failed";
      } catch { results.sms = "failed"; }
    }

    // Email
    if (client.email && !client.email_opt_out) {
      const calLink = buildGoogleCalendarLink({
        title: `${serviceName} at ${BUSINESS_NAME}`,
        start: apt.scheduled_at,
        durationMin,
        location: BUSINESS_LOCATION,
        description: `Your ${serviceName} appointment with ${providerFirst}`,
      });

      const innerHtml = `
        ${elitaHeading("Your appointment is confirmed ✨")}
        ${elitaText(`Hi ${sanitizeHtml(client.first_name)},`)}
        ${elitaText("Your appointment is confirmed!")}
        ${elitaDetailsTable([
          { label: "Service", value: sanitizeHtml(serviceName) },
          { label: "Date", value: `${formatDay(apt.scheduled_at)}, ${formatDate(apt.scheduled_at)}` },
          { label: "Time", value: formatTime(apt.scheduled_at) },
          { label: "Provider", value: sanitizeHtml(providerFirst) },
          { label: "Location", value: BUSINESS_LOCATION },
        ])}
        ${elitaButton("📅 Add to Google Calendar", calLink)}
        ${elitaButton("View Your Portal →", PORTAL_URL)}
        ${elitaSignature()}
      `;

      const emailRes = await callSendEmail(supabaseUrl, supabaseKey, {
        to: client.email,
        subject: "Your Elita appointment is confirmed ✨",
        html: wrapInElitaTemplate(innerHtml),
        client_id: client.id,
      });
      results.email = emailRes.ok ? "sent" : "failed";
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
