import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const results = { sms: 'skipped', email: 'skipped', formsEmail: 'skipped', smsError: null as string | null, emailError: null as string | null, formsEmailError: null as string | null };

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

    // ─── Confirmation Email ───
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
          <div style="background:#fdf8f0;border-left:3px solid #c9a96e;border-radius:6px;padding:18px 20px;margin:24px 0;">
            <h3 style="margin:0 0 12px;color:#5c4a3a;font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:600;">Preparation Tips</h3>
            ${prepTips.map(t => `
              <div style="margin-bottom:10px;">
                <strong style="color:#3d2e22;font-size:13px;font-family:'Inter',Helvetica,Arial,sans-serif;">${sanitizeHtml(t.title)}</strong>
                <p style="margin:3px 0 0;color:#7a6a5e;font-size:12px;line-height:1.5;font-family:'Inter',Helvetica,Arial,sans-serif;">${sanitizeHtml(t.description)}</p>
              </div>
            `).join('')}
          </div>
        `;
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Helvetica,Arial,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
            <!-- Elegant Header -->
            <div style="background:linear-gradient(160deg,#2c1810 0%,#3d2e22 40%,#4a3728 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
              <p style="margin:0 0 6px;color:#c9a96e;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-family:'Inter',Helvetica,Arial,sans-serif;font-weight:500;">✦ ELITA MEDICAL SPA ✦</p>
              <h1 style="margin:0;color:#faf6f0;font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:500;letter-spacing:1px;">Your Appointment<br>is Confirmed</h1>
              <div style="width:50px;height:1px;background:#c9a96e;margin:16px auto 0;"></div>
            </div>

            <!-- Body -->
            <div style="background:#fffdf9;padding:36px 30px;border-radius:0 0 16px 16px;box-shadow:0 8px 24px rgba(60,46,34,0.08);">
              <p style="margin:0 0 24px;color:#3d2e22;font-size:15px;line-height:1.6;font-family:'Inter',Helvetica,Arial,sans-serif;">
                Dear ${sanitizeHtml(client.first_name)}, we look forward to welcoming you.
              </p>

              <!-- Appointment Card -->
              <div style="background:#faf6f0;border:1px solid #e8ddd0;border-radius:12px;padding:24px;margin-bottom:24px;">
                <table style="width:100%;font-size:14px;font-family:'Inter',Helvetica,Arial,sans-serif;">
                  <tr><td style="padding:8px 0;color:#7a6a5e;width:110px;vertical-align:top;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Service</td><td style="padding:8px 0;color:#3d2e22;font-weight:500;">${sanitizeHtml(serviceName)}</td></tr>
                  <tr><td style="padding:8px 0;color:#7a6a5e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Duration</td><td style="padding:8px 0;color:#3d2e22;">${durationMin} minutes</td></tr>
                  <tr><td style="padding:8px 0;color:#7a6a5e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Date</td><td style="padding:8px 0;color:#3d2e22;font-weight:500;">${formatDay(apt.scheduled_at)}, ${formatShortDate(apt.scheduled_at)}</td></tr>
                  <tr><td style="padding:8px 0;color:#7a6a5e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Time</td><td style="padding:8px 0;color:#3d2e22;font-weight:500;">${formatTime(apt.scheduled_at)}</td></tr>
                  <tr><td style="padding:8px 0;color:#7a6a5e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Provider</td><td style="padding:8px 0;color:#3d2e22;">${sanitizeHtml(providerFull)}</td></tr>
                </table>
              </div>

              <!-- Location -->
              <div style="background:#faf6f0;border:1px solid #e8ddd0;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0;color:#3d2e22;font-size:13px;font-weight:500;font-family:'Inter',Helvetica,Arial,sans-serif;">📍 ${BUSINESS_NAME}</p>
                <p style="margin:4px 0 0;color:#7a6a5e;font-size:12px;font-family:'Inter',Helvetica,Arial,sans-serif;">${BUSINESS_ADDRESS}</p>
              </div>

              ${prepHtml}

              <!-- CTA -->
              <div style="text-align:center;margin:28px 0 16px;">
                <a href="${calLink}" style="display:inline-block;background:#8b5cf6;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:500;font-family:'Inter',Helvetica,Arial,sans-serif;letter-spacing:0.3px;">Add to Google Calendar</a>
              </div>
              <div style="text-align:center;margin-bottom:24px;">
                <a href="${cancelUrl}" style="color:#8b5cf6;text-decoration:none;font-size:13px;font-family:'Inter',Helvetica,Arial,sans-serif;border-bottom:1px solid #d4c4f7;">Cancel or Reschedule</a>
              </div>

              <!-- Divider & Footer -->
              <div style="border-top:1px solid #e8ddd0;padding-top:24px;text-align:center;">
                <p style="margin:0 0 4px;color:#7a6a5e;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:'Inter',Helvetica,Arial,sans-serif;">Elita Medical Spa</p>
                <p style="margin:0 0 3px;color:#a0917f;font-size:12px;font-family:'Inter',Helvetica,Arial,sans-serif;">${BUSINESS_ADDRESS}</p>
                <p style="margin:0;color:#a0917f;font-size:12px;font-family:'Inter',Helvetica,Arial,sans-serif;">${BUSINESS_PHONE}</p>
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

      // Log confirmation email
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

      // ─── "Complete Your Forms" Email ───
      // Check for pending forms linked to this client
      const { data: pendingForms } = await supabase
        .from('client_forms')
        .select(`
          id, status,
          forms (id, name, form_type, description)
        `)
        .eq('client_id', client.id)
        .eq('status', 'pending')
        .limit(10);

      if (pendingForms && pendingForms.length > 0) {
        const formsUrl = `${PORTAL_URL}/forms`;

        const formsList = pendingForms.map((pf: any) => {
          const form = pf.forms;
          const typeLabel = form?.form_type === 'consent' ? 'Consent Form' : 'Intake Form';
          const typeIcon = form?.form_type === 'consent' ? '✦' : '✦';
          return `
            <tr>
              <td style="padding:14px 20px;border-bottom:1px solid #f0ebe3;font-family:'Inter',Helvetica,Arial,sans-serif;">
                <span style="font-size:10px;color:#c9a96e;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;">${typeIcon} ${typeLabel}</span>
                <p style="margin:4px 0 0;font-size:14px;color:#3d2e22;font-weight:500;">${sanitizeHtml(form?.name || 'Required Form')}</p>
                ${form?.description ? `<p style="margin:3px 0 0;font-size:12px;color:#7a6a5e;line-height:1.4;">${sanitizeHtml(form.description)}</p>` : ''}
              </td>
            </tr>
          `;
        }).join('');

        const formsEmailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
          </head>
          <body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Helvetica,Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
              <!-- Header -->
              <div style="background:linear-gradient(160deg,#2c1810 0%,#3d2e22 40%,#4a3728 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;">
                <p style="margin:0 0 6px;color:#c9a96e;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-family:'Inter',Helvetica,Arial,sans-serif;font-weight:500;">✦ ELITA MEDICAL SPA ✦</p>
                <h1 style="margin:0;color:#faf6f0;font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:500;letter-spacing:0.5px;">Complete Your Forms<br>Before Your Visit</h1>
                <div style="width:50px;height:1px;background:#c9a96e;margin:16px auto 0;"></div>
              </div>

              <!-- Body -->
              <div style="background:#fffdf9;padding:36px 30px;border-radius:0 0 16px 16px;box-shadow:0 8px 24px rgba(60,46,34,0.08);">
                <p style="margin:0 0 8px;color:#3d2e22;font-size:16px;font-family:'Playfair Display',Georgia,serif;font-weight:500;">
                  Dear ${sanitizeHtml(client.first_name)},
                </p>
                <p style="margin:0 0 20px;color:#7a6a5e;font-size:14px;line-height:1.7;font-family:'Inter',Helvetica,Arial,sans-serif;">
                  You have an upcoming appointment — here are the details:
                </p>

                <!-- Appointment Summary -->
                <div style="background:#faf6f0;border:1px solid #e8ddd0;border-radius:12px;padding:20px;margin-bottom:24px;">
                  <table style="width:100%;font-size:14px;font-family:'Inter',Helvetica,Arial,sans-serif;">
                    <tr><td style="padding:6px 0;color:#7a6a5e;width:100px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Service</td><td style="padding:6px 0;color:#3d2e22;font-weight:500;">${sanitizeHtml(serviceName)}</td></tr>
                    <tr><td style="padding:6px 0;color:#7a6a5e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Date</td><td style="padding:6px 0;color:#3d2e22;font-weight:500;">${formatDay(apt.scheduled_at)}, ${formatShortDate(apt.scheduled_at)}</td></tr>
                    <tr><td style="padding:6px 0;color:#7a6a5e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Time</td><td style="padding:6px 0;color:#3d2e22;font-weight:500;">${formatTime(apt.scheduled_at)}</td></tr>
                    <tr><td style="padding:6px 0;color:#7a6a5e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Provider</td><td style="padding:6px 0;color:#3d2e22;">${sanitizeHtml(providerFull)}</td></tr>
                  </table>
                </div>

                <p style="margin:0 0 20px;color:#7a6a5e;font-size:14px;line-height:1.7;font-family:'Inter',Helvetica,Arial,sans-serif;">
                  To ensure a seamless experience, please complete the following form${pendingForms.length > 1 ? 's' : ''} before your visit:
                </p>

                <!-- Forms List -->
                <div style="border:1px solid #e8ddd0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                  <div style="background:#faf6f0;padding:12px 20px;border-bottom:1px solid #e8ddd0;">
                    <p style="margin:0;font-size:12px;color:#7a6a5e;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-family:'Inter',Helvetica,Arial,sans-serif;">
                      ${pendingForms.length} form${pendingForms.length > 1 ? 's' : ''} required
                    </p>
                  </div>
                  <table style="width:100%;">
                    ${formsList}
                  </table>
                </div>

                <!-- Primary CTA -->
                <div style="text-align:center;margin:28px 0 20px;">
                  <a href="${formsUrl}" style="display:inline-block;background:#8b5cf6;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:15px;font-weight:600;font-family:'Inter',Helvetica,Arial,sans-serif;letter-spacing:0.3px;">
                    Complete Your Forms Now →
                  </a>
                </div>

                <!-- Time note -->
                <div style="background:#fdf8f0;border-left:3px solid #c9a96e;border-radius:6px;padding:14px 20px;margin-bottom:24px;">
                  <p style="margin:0;color:#5c4a3a;font-size:14px;font-family:'Inter',Helvetica,Arial,sans-serif;line-height:1.5;">
                    ⏱ <strong>Taking 3 minutes now means no paperwork at the spa!</strong>
                  </p>
                  <p style="margin:6px 0 0;color:#7a6a5e;font-size:13px;font-family:'Inter',Helvetica,Arial,sans-serif;line-height:1.5;">
                    Complete your forms from your phone, tablet, or computer — then simply walk in and relax.
                  </p>
                </div>

                <!-- New account note -->
                <div style="background:#f5f0e8;border-radius:8px;padding:16px 20px;margin-bottom:28px;text-align:center;">
                  <p style="margin:0;color:#7a6a5e;font-size:13px;font-family:'Inter',Helvetica,Arial,sans-serif;line-height:1.6;">
                    Haven't created your client account yet?<br>
                    <a href="${PORTAL_URL}/auth" style="color:#8b5cf6;text-decoration:none;font-weight:500;border-bottom:1px solid #d4c4f7;">Create one here</a>
                    using the same email address.
                  </p>
                </div>

                <!-- Footer -->
                <div style="border-top:1px solid #e8ddd0;padding-top:24px;text-align:center;">
                  <p style="margin:0 0 4px;color:#7a6a5e;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:'Inter',Helvetica,Arial,sans-serif;">Elita Medical Spa</p>
                  <p style="margin:0 0 3px;color:#a0917f;font-size:12px;font-family:'Inter',Helvetica,Arial,sans-serif;">${BUSINESS_ADDRESS}</p>
                  <p style="margin:0;color:#a0917f;font-size:12px;font-family:'Inter',Helvetica,Arial,sans-serif;">${BUSINESS_PHONE}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        try {
          const formsEmailResponse = await resend.emails.send({
            from: "Elita MedSpa <noreply@elitamedspa.com>",
            to: [client.email],
            subject: `📋 Complete Your Forms – ${sanitizeHtml(serviceName)} on ${formatShortDate(apt.scheduled_at)}`,
            html: formsEmailHtml,
          });
          console.log("Forms reminder email sent:", formsEmailResponse);
          results.formsEmail = 'sent';
        } catch (formsErr: any) {
          console.error("Forms email error:", formsErr);
          results.formsEmail = 'failed';
          results.formsEmailError = formsErr.message;
        }

        // Log forms email
        await supabase.from('notification_logs').insert({
          client_id: client.id,
          type: 'email',
          category: 'forms_reminder',
          recipient: client.email,
          subject: `Complete Your Forms – ${serviceName} on ${formatShortDate(apt.scheduled_at)}`,
          body: `Forms reminder: ${pendingForms.length} pending form(s) for ${serviceName} on ${formatShortDate(apt.scheduled_at)}`,
          status: results.formsEmail === 'sent' ? 'sent' : 'failed',
          error_message: results.formsEmailError,
          sent_at: results.formsEmail === 'sent' ? new Date().toISOString() : null,
        });
      } else {
        console.log("No pending forms for client, skipping forms email");
      }
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
