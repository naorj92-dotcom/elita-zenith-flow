import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PORTAL_URL = "https://elita-zenith-flow.lovable.app/portal";
const BUSINESS_NAME = "Elita Medical Spa";
const BUSINESS_ADDRESS = "123 Luxury Lane, Suite 100, Beverly Hills, CA 90210";
const BUSINESS_PHONE = "(310) 555-0123";

function sanitizeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function buildGoogleCalendarLink(params: { title: string; start: string; durationMin: number; location: string; description: string }): string {
  const startDate = new Date(params.start);
  const endDate = new Date(startDate.getTime() + params.durationMin * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', params.title);
  url.searchParams.set('dates', `${fmt(startDate)}/${fmt(endDate)}`);
  url.searchParams.set('location', params.location);
  url.searchParams.set('details', params.description);
  return url.toString();
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

    if (!appointment_id || typeof appointment_id !== 'string') {
      return new Response(JSON.stringify({ error: "Missing appointment_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch appointment with related data
    const { data: apt, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id, scheduled_at, duration_minutes, status, notes, total_amount,
        client_id, service_id, staff_id,
        clients (id, first_name, last_name, email, phone, sms_opt_out, email_opt_out),
        services (id, name, duration_minutes),
        staff (id, first_name, last_name)
      `)
      .eq('id', appointment_id)
      .single();

    if (aptError || !apt) {
      console.error("Appointment not found:", aptError);
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (apt.status !== 'scheduled') {
      return new Response(JSON.stringify({ message: "Appointment not in scheduled status, skipping confirmation" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = apt.clients as any;
    const service = apt.services as any;
    const provider = apt.staff as any;

    if (!client) {
      return new Response(JSON.stringify({ message: "No client linked, skipping confirmation" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceName = service?.name || 'Appointment';
    const providerFirst = provider?.first_name || 'Your provider';
    const providerFull = provider ? `${provider.first_name} ${provider.last_name}` : 'Your provider';
    const durationMin = apt.duration_minutes || service?.duration_minutes || 60;

    // Fetch aftercare/preparation tips for this service
    let prepTips: { title: string; description: string }[] = [];
    if (apt.service_id) {
      const { data: tips } = await supabase
        .from('aftercare_tips')
        .select('title, description')
        .eq('service_id', apt.service_id)
        .order('day_number', { ascending: true })
        .limit(3);
      if (tips) prepTips = tips;
    }

    const results = { sms: 'skipped', email: 'skipped', smsError: null as string | null, emailError: null as string | null };

    // ─── SMS via send-sms function ───
    if (client.phone && !client.sms_opt_out) {
      const smsBody = `Confirmed! ✨ Your ${serviceName} is booked for ${formatDay(apt.scheduled_at)}, ${formatShortDate(apt.scheduled_at)} at ${formatTime(apt.scheduled_at)} with ${providerFirst} at ${BUSINESS_NAME}.\n\nManage your appointment: ${PORTAL_URL}\n\nReply STOP to opt out.`;

      try {
        const smsRes = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            to: client.phone,
            body: smsBody,
            client_id: client.id,
            category: 'appointment_confirmation',
          }),
        });
        const smsData = await smsRes.json();
        results.sms = smsRes.ok ? 'sent' : 'failed';
        if (!smsRes.ok) results.smsError = smsData.error || 'SMS send failed';
        console.log("SMS result:", smsData);
      } catch (smsErr: any) {
        console.error("SMS call error:", smsErr);
        results.sms = 'failed';
        results.smsError = smsErr.message;
      }
    }

    // ─── Email ───
    if (client.email && !client.email_opt_out) {
      const calLink = buildGoogleCalendarLink({
        title: `${serviceName} at ${BUSINESS_NAME}`,
        start: apt.scheduled_at,
        durationMin,
        location: BUSINESS_ADDRESS,
        description: `Your ${serviceName} appointment with ${providerFull}`,
      });

      const cancelUrl = `${PORTAL_URL}/book`;

      let prepHtml = '';
      if (prepTips.length > 0) {
        prepHtml = `
          <div style="background: #fef9f0; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px; color: #92400e; font-size: 14px; font-weight: 600;">📋 Preparation Tips</h3>
            ${prepTips.map(t => `
              <div style="margin-bottom: 8px;">
                <strong style="color: #374151; font-size: 13px;">${sanitizeHtml(t.title)}</strong>
                <p style="margin: 2px 0 0; color: #6b7280; font-size: 12px;">${sanitizeHtml(t.description)}</p>
              </div>
            `).join('')}
          </div>
        `;
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f3f4f6;">
          <div style="max-width:600px;margin:0 auto;padding:20px;">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#8b5cf6 0%,#a855f7 100%);border-radius:16px 16px 0 0;padding:30px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:24px;font-weight:300;letter-spacing:2px;">ELITA MEDICAL SPA</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:18px;">Your appointment is confirmed ✨</p>
            </div>

            <!-- Content -->
            <div style="background:white;padding:30px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
              <p style="margin:0 0 20px;color:#374151;font-size:15px;">
                Hi ${sanitizeHtml(client.first_name)}, we look forward to seeing you!
              </p>

              <!-- Appointment Details Card -->
              <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;">
                <table style="width:100%;font-size:14px;">
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;width:120px;">Service</td>
                    <td style="padding:6px 0;color:#374151;font-weight:500;">${sanitizeHtml(serviceName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Duration</td>
                    <td style="padding:6px 0;color:#374151;">${durationMin} minutes</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Date</td>
                    <td style="padding:6px 0;color:#374151;font-weight:500;">${formatDay(apt.scheduled_at)}, ${formatShortDate(apt.scheduled_at)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Time</td>
                    <td style="padding:6px 0;color:#374151;font-weight:500;">${formatTime(apt.scheduled_at)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Provider</td>
                    <td style="padding:6px 0;color:#374151;">${sanitizeHtml(providerFull)}</td>
                  </tr>
                </table>
              </div>

              <!-- Location -->
              <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
                <p style="margin:0;color:#166534;font-size:13px;">📍 <strong>${BUSINESS_NAME}</strong></p>
                <p style="margin:4px 0 0;color:#6b7280;font-size:12px;">${BUSINESS_ADDRESS}</p>
              </div>

              ${prepHtml}

              <!-- Actions -->
              <div style="text-align:center;margin:24px 0;">
                <a href="${calLink}" style="display:inline-block;background:#8b5cf6;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500;margin-bottom:12px;">
                  📅 Add to Google Calendar
                </a>
              </div>

              <div style="text-align:center;margin-bottom:20px;">
                <a href="${cancelUrl}" style="color:#8b5cf6;text-decoration:underline;font-size:13px;">
                  Cancel or Reschedule (up to 24hrs before)
                </a>
              </div>

              <!-- Footer -->
              <div style="border-top:1px solid #e5e7eb;padding-top:20px;text-align:center;">
                <p style="margin:0 0 5px;color:#6b7280;font-size:12px;">${BUSINESS_ADDRESS}</p>
                <p style="margin:0;color:#6b7280;font-size:12px;">${BUSINESS_PHONE}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "Elita MedSpa <noreply@elitamedspa.com>",
          to: [client.email],
          subject: `Your Elita appointment is confirmed ✨`,
          html: emailHtml,
        });
        console.log("Confirmation email sent:", emailResponse);
        results.email = 'sent';
      } catch (emailErr: any) {
        console.error("Email send error:", emailErr);
        results.email = 'failed';
        results.emailError = emailErr.message;
      }

      // Log email
      await supabase.from('notification_logs').insert({
        client_id: client.id,
        type: 'email',
        category: 'appointment_confirmation',
        recipient: client.email,
        subject: 'Your Elita appointment is confirmed ✨',
        body: `Appointment confirmation for ${serviceName} on ${formatShortDate(apt.scheduled_at)}`,
        status: results.email === 'sent' ? 'sent' : 'failed',
        error_message: results.emailError,
        sent_at: results.email === 'sent' ? new Date().toISOString() : null,
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-appointment-confirmation:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
