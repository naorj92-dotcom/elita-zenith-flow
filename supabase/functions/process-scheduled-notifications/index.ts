import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function replaceVars(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

function sanitizeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

const BUSINESS_NAME = "Elita Medical Spa";
const BUSINESS_ADDRESS = "123 Luxury Lane, Suite 100, Beverly Hills, CA 90210";
const BUSINESS_PHONE = "(310) 555-0123";

function buildLuxuryEmail(opts: { headline: string; subheadline?: string; bodyHtml: string }): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:#f5f0e8;font-family:'Inter',Helvetica,Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;padding:32px 16px;"><div style="background:linear-gradient(160deg,#2c1810 0%,#3d2e22 40%,#4a3728 100%);border-radius:16px 16px 0 0;padding:40px 30px;text-align:center;"><p style="margin:0 0 6px;color:#c9a96e;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-family:'Inter',Helvetica,Arial,sans-serif;font-weight:500;">✦ ELITA MEDICAL SPA ✦</p><h1 style="margin:0;color:#faf6f0;font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:500;letter-spacing:0.5px;">${opts.headline}</h1>${opts.subheadline ? `<p style="margin:10px 0 0;color:#d4c5a9;font-size:14px;font-family:'Inter',Helvetica,Arial,sans-serif;font-weight:300;">${opts.subheadline}</p>` : ''}<div style="width:50px;height:1px;background:#c9a96e;margin:16px auto 0;"></div></div><div style="background:#fffdf9;padding:36px 30px;border-radius:0 0 16px 16px;box-shadow:0 8px 24px rgba(60,46,34,0.08);">${opts.bodyHtml}<div style="border-top:1px solid #e8ddd0;padding-top:24px;text-align:center;margin-top:28px;"><p style="margin:0 0 4px;color:#7a6a5e;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:'Inter',Helvetica,Arial,sans-serif;">${BUSINESS_NAME}</p><p style="margin:0 0 3px;color:#a0917f;font-size:12px;font-family:'Inter',Helvetica,Arial,sans-serif;">${BUSINESS_ADDRESS}</p><p style="margin:0;color:#a0917f;font-size:12px;font-family:'Inter',Helvetica,Arial,sans-serif;">${BUSINESS_PHONE}</p></div></div></div></body></html>`;
}

function buildFormsListHtml(pendingForms: any[]): string {
  const rows = pendingForms.map((f: any) => {
    const form = f.forms as any;
    const typeLabel = form?.form_type === 'consent' ? 'Consent Form' : form?.form_type === 'contract' ? 'Contract' : form?.form_type === 'intake' ? 'Intake Form' : 'Form';
    return `<tr><td style="padding:14px 20px;border-bottom:1px solid #f0ebe3;font-family:'Inter',Helvetica,Arial,sans-serif;"><span style="font-size:10px;color:#c9a96e;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;">✦ ${typeLabel}</span><p style="margin:4px 0 0;font-size:14px;color:#3d2e22;font-weight:500;">${sanitizeHtml(form?.name || 'Required Form')}</p></td></tr>`;
  }).join('');
  return `<div style="border:1px solid #e8ddd0;border-radius:12px;overflow:hidden;margin-bottom:24px;"><div style="background:#faf6f0;padding:12px 20px;border-bottom:1px solid #e8ddd0;"><p style="margin:0;font-size:12px;color:#7a6a5e;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-family:'Inter',Helvetica,Arial,sans-serif;">${pendingForms.length} form${pendingForms.length > 1 ? 's' : ''} required</p></div><table style="width:100%;">${rows}</table></div>`;
}

function buildCtaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0 20px;"><a href="${href}" style="display:inline-block;background:#8b5cf6;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:15px;font-weight:600;font-family:'Inter',Helvetica,Arial,sans-serif;letter-spacing:0.3px;">${label}</a></div>`;
}

function buildNewAccountNote(portalUrl: string): string {
  return `<div style="background:#f5f0e8;border-radius:8px;padding:16px 20px;margin-bottom:28px;text-align:center;"><p style="margin:0;color:#7a6a5e;font-size:13px;font-family:'Inter',Helvetica,Arial,sans-serif;line-height:1.6;">Haven't created your client account yet?<br><a href="${portalUrl}/auth" style="color:#8b5cf6;text-decoration:none;font-weight:500;border-bottom:1px solid #d4c4f7;">Create one here</a> using the same email address.</p></div>`;
}

function buildTimeNote(): string {
  return `<div style="background:#fdf8f0;border-left:3px solid #c9a96e;border-radius:6px;padding:14px 20px;margin-bottom:24px;"><p style="margin:0;color:#5c4a3a;font-size:14px;font-family:'Inter',Helvetica,Arial,sans-serif;line-height:1.5;">⏱ <strong>Taking 3 minutes now means no paperwork at the spa!</strong></p><p style="margin:6px 0 0;color:#7a6a5e;font-size:13px;font-family:'Inter',Helvetica,Arial,sans-serif;line-height:1.5;">Complete your forms from your phone, tablet, or computer — then simply walk in and relax.</p></div>`;
}

async function sendEmail(resend: Resend, to: string, subject: string, body: string) {
  const htmlBody = sanitizeHtml(body).replace(/\n/g, '<br>');
  const sanitizedSubject = sanitizeHtml(subject);
  const html = buildLuxuryEmail({
    headline: sanitizedSubject,
    bodyHtml: `<div style="color:#5a5343;font-size:14px;line-height:1.7;font-family:'Inter',Helvetica,Arial,sans-serif;">${htmlBody}</div>`,
  });
  return resend.emails.send({
    from: "Elita MedSpa <noreply@elitamedspa.com>",
    to: [to],
    subject: sanitizedSubject,
    html,
  });
}

async function logNotification(supabase: any, data: {
  client_id: string; type: string; category: string; recipient: string;
  subject: string; body: string; status: string; error_message?: string; sent_at?: string;
}) {
  await supabase.from('notification_logs').insert(data);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendKey ? new Resend(resendKey) : null;

    const portalUrl = "https://elita-zenith-flow.lovable.app/portal";
    const now = new Date();

    // Fetch enabled triggers
    const { data: triggers } = await supabase
      .from('notification_triggers')
      .select('*')
      .eq('is_enabled', true);

    if (!triggers || triggers.length === 0) {
      return new Response(JSON.stringify({ message: 'No enabled triggers' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const triggerMap = new Map(triggers.map((t: any) => [t.trigger_key, t]));
    const results: string[] = [];

    // Get google review URL from the post-visit trigger
    const postVisitTrigger = triggerMap.get('24hr_post_visit_followup');
    const googleReviewUrl = postVisitTrigger?.google_review_url || '';

    // ── TRIGGER 1: 48hr Appointment Reminder ──
    const t1 = triggerMap.get('48hr_appointment_reminder');
    if (t1) {
      const windowStart = new Date(now.getTime() + 47 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(now.getTime() + 49 * 60 * 60 * 1000).toISOString();

      const { data: appts } = await supabase
        .from('appointments')
        .select('id, scheduled_at, client_id, service_id, staff_id, clients(first_name, last_name, email, phone, sms_opt_out, email_opt_out), services(name), staff(first_name)')
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_at', windowStart)
        .lte('scheduled_at', windowEnd);

      for (const appt of appts || []) {
        const client = appt.clients as any;
        const service = appt.services as any;
        const staff = appt.staff as any;
        if (!client) continue;

        // Check for pending forms
        const { data: pendingForms } = await supabase
          .from('client_forms')
          .select('id')
          .eq('client_id', appt.client_id)
          .eq('status', 'pending')
          .limit(1);

        const hasPendingForms = (pendingForms?.length || 0) > 0;
        const schedDate = new Date(appt.scheduled_at);
        const vars: Record<string, string> = {
          first_name: client.first_name,
          service_name: service?.name || 'your appointment',
          weekday: schedDate.toLocaleDateString('en-US', { weekday: 'long' }),
          time: schedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          provider_first_name: staff?.first_name || 'your provider',
          forms_message: hasPendingForms ? `Complete your pre-visit forms: ${portalUrl}/forms` : '',
          portal_url: portalUrl,
        };

        // Send email
        if (resend && t1.channels?.includes('email') && client.email && !client.email_opt_out) {
          try {
            const subject = replaceVars(t1.email_subject || '', vars);
            const body = replaceVars(t1.email_body || '', vars);
            await sendEmail(resend, client.email, subject, body);
            await logNotification(supabase, {
              client_id: appt.client_id, type: 'email', category: '48hr_appointment_reminder',
              recipient: client.email, subject, body, status: 'sent', sent_at: new Date().toISOString(),
            });
          } catch (e: any) {
            await logNotification(supabase, {
              client_id: appt.client_id, type: 'email', category: '48hr_appointment_reminder',
              recipient: client.email, subject: '', body: '', status: 'failed', error_message: e.message,
            });
          }
        }

        // SMS placeholder
        if (t1.channels?.includes('sms') && client.phone && !client.sms_opt_out) {
          const smsBody = replaceVars(t1.sms_body || '', vars);
          console.log(`[SMS PLACEHOLDER] To: ${client.phone}, Body: ${smsBody}`);
          await logNotification(supabase, {
            client_id: appt.client_id, type: 'sms', category: '48hr_appointment_reminder',
            recipient: client.phone, subject: '', body: smsBody, status: 'sent',
            sent_at: new Date().toISOString(),
          });
        }
      }
      results.push(`48hr: processed ${(appts || []).length} appointments`);
    }

    // ── TRIGGER 2: 2hr Same-Day Reminder (SMS only) ──
    const t2 = triggerMap.get('2hr_same_day_reminder');
    if (t2) {
      const windowStart = new Date(now.getTime() + 110 * 60 * 1000).toISOString();
      const windowEnd = new Date(now.getTime() + 130 * 60 * 1000).toISOString();

      const { data: appts } = await supabase
        .from('appointments')
        .select('id, scheduled_at, client_id, clients(first_name, phone, sms_opt_out), services(name)')
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_at', windowStart)
        .lte('scheduled_at', windowEnd);

      for (const appt of appts || []) {
        const client = appt.clients as any;
        const service = appt.services as any;
        if (!client?.phone || client.sms_opt_out) continue;

        const schedDate = new Date(appt.scheduled_at);
        const vars = {
          first_name: client.first_name,
          service_name: service?.name || 'your appointment',
          time: schedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
        const smsBody = replaceVars(t2.sms_body || '', vars);
        console.log(`[SMS PLACEHOLDER] To: ${client.phone}, Body: ${smsBody}`);
        await logNotification(supabase, {
          client_id: appt.client_id, type: 'sms', category: '2hr_same_day_reminder',
          recipient: client.phone, subject: '', body: smsBody, status: 'sent',
          sent_at: new Date().toISOString(),
        });
      }
      results.push(`2hr: processed ${(appts || []).length} appointments`);
    }

    // ── TRIGGER 3: 24hr Post-Visit Follow-Up ──
    const t3 = triggerMap.get('24hr_post_visit_followup');
    if (t3) {
      const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();

      const { data: appts } = await supabase
        .from('appointments')
        .select('id, completed_at, client_id, clients(first_name, email, phone, sms_opt_out, email_opt_out), services(name)')
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .gte('completed_at', windowStart)
        .lte('completed_at', windowEnd);

      for (const appt of appts || []) {
        const client = appt.clients as any;
        const service = appt.services as any;
        if (!client) continue;

        const vars = {
          first_name: client.first_name,
          service_name: service?.name || 'your treatment',
          portal_url: portalUrl,
          google_review_url: googleReviewUrl,
        };

        if (resend && t3.channels?.includes('email') && client.email && !client.email_opt_out) {
          try {
            const subject = replaceVars(t3.email_subject || '', vars);
            const body = replaceVars(t3.email_body || '', vars);
            await sendEmail(resend, client.email, subject, body);
            await logNotification(supabase, {
              client_id: appt.client_id, type: 'email', category: '24hr_post_visit_followup',
              recipient: client.email, subject, body, status: 'sent', sent_at: new Date().toISOString(),
            });
          } catch (e: any) {
            await logNotification(supabase, {
              client_id: appt.client_id, type: 'email', category: '24hr_post_visit_followup',
              recipient: client.email, subject: '', body: '', status: 'failed', error_message: e.message,
            });
          }
        }

        if (t3.channels?.includes('sms') && client.phone && !client.sms_opt_out) {
          const smsBody = replaceVars(t3.sms_body || '', vars);
          console.log(`[SMS PLACEHOLDER] To: ${client.phone}, Body: ${smsBody}`);
          await logNotification(supabase, {
            client_id: appt.client_id, type: 'sms', category: '24hr_post_visit_followup',
            recipient: client.phone, subject: '', body: smsBody, status: 'sent',
            sent_at: new Date().toISOString(),
          });
        }
      }
      results.push(`Post-visit: processed ${(appts || []).length} appointments`);
    }

    // ── TRIGGER 4: Package Expiry Warning (7 days) ──
    const t4 = triggerMap.get('package_expiry_warning');
    if (t4) {
      const targetDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: packages } = await supabase
        .from('client_packages')
        .select('id, client_id, sessions_total, sessions_used, expiry_date, clients(first_name, email, phone, sms_opt_out, email_opt_out), packages(name)')
        .eq('status', 'active')
        .gt('sessions_total', 0)
        .not('expiry_date', 'is', null)
        .gte('expiry_date', dayStart.toISOString())
        .lte('expiry_date', dayEnd.toISOString());

      for (const pkg of packages || []) {
        const client = pkg.clients as any;
        const pkgInfo = pkg.packages as any;
        if (!client) continue;
        const remaining = pkg.sessions_total - pkg.sessions_used;
        if (remaining <= 0) continue;

        const vars = {
          first_name: client.first_name,
          package_name: pkgInfo?.name || 'your package',
          sessions_remaining: String(remaining),
          expiry_date: new Date(pkg.expiry_date!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          portal_url: portalUrl,
        };

        if (resend && t4.channels?.includes('email') && client.email && !client.email_opt_out) {
          try {
            const subject = replaceVars(t4.email_subject || '', vars);
            const body = replaceVars(t4.email_body || '', vars);
            await sendEmail(resend, client.email, subject, body);
            await logNotification(supabase, {
              client_id: pkg.client_id, type: 'email', category: 'package_expiry_warning',
              recipient: client.email, subject, body, status: 'sent', sent_at: new Date().toISOString(),
            });
          } catch (e: any) {
            await logNotification(supabase, {
              client_id: pkg.client_id, type: 'email', category: 'package_expiry_warning',
              recipient: client.email, subject: '', body: '', status: 'failed', error_message: e.message,
            });
          }
        }

        if (t4.channels?.includes('sms') && client.phone && !client.sms_opt_out) {
          const smsBody = replaceVars(t4.sms_body || '', vars);
          console.log(`[SMS PLACEHOLDER] To: ${client.phone}, Body: ${smsBody}`);
          await logNotification(supabase, {
            client_id: pkg.client_id, type: 'sms', category: 'package_expiry_warning',
            recipient: client.phone, subject: '', body: smsBody, status: 'sent',
            sent_at: new Date().toISOString(),
          });
        }
      }
      results.push(`Package expiry: processed ${(packages || []).length} packages`);
    }

    // ── TRIGGER 6: Forms Incomplete — Appointment Tomorrow ──
    {
      const tomorrowStart = new Date(now);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const { data: appts } = await supabase
        .from('appointments')
        .select('id, scheduled_at, client_id, service_id, staff_id, clients(first_name, last_name, email, email_opt_out), services(name), staff(first_name)')
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_at', tomorrowStart.toISOString())
        .lte('scheduled_at', tomorrowEnd.toISOString());

      let formsReminderCount = 0;
      for (const appt of appts || []) {
        const client = appt.clients as any;
        if (!client?.email || client.email_opt_out) continue;

        const { data: pendingForms } = await supabase
          .from('client_forms')
          .select('id, form_id, forms(name, form_type)')
          .eq('client_id', appt.client_id)
          .eq('status', 'pending');

        if (!pendingForms || pendingForms.length === 0) continue;

        const service = appt.services as any;
        const staff = appt.staff as any;
        const schedDate = new Date(appt.scheduled_at);
        const firstName = sanitizeHtml(client.first_name || 'there');
        const serviceName = sanitizeHtml(service?.name || 'your appointment');
        const providerName = sanitizeHtml(staff?.first_name || 'your provider');
        const apptTime = schedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const apptDate = schedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        const formListHtml = buildFormsListHtml(pendingForms);

        const subject = `⏰ Don't forget! Forms needed before tomorrow's appointment`;
        const htmlBody = buildLuxuryEmail({
          headline: 'Your Forms Are<br>Still Incomplete',
          subheadline: 'Appointment Tomorrow',
          bodyHtml: `
            <p style="margin:0 0 8px;color:#3d2e22;font-size:16px;font-family:'Playfair Display',Georgia,serif;font-weight:500;">Dear ${firstName},</p>
            <p style="margin:0 0 20px;color:#7a6a5e;font-size:14px;line-height:1.7;font-family:'Inter',Helvetica,Arial,sans-serif;">
              Your appointment for <strong style="color:#3d2e22;">${serviceName}</strong> with <strong style="color:#3d2e22;">${providerName}</strong> is <strong style="color:#3d2e22;">tomorrow, ${apptDate} at ${apptTime}</strong>.
            </p>
            <p style="margin:0 0 20px;color:#7a6a5e;font-size:14px;line-height:1.7;font-family:'Inter',Helvetica,Arial,sans-serif;">
              You still have <strong style="color:#3d2e22;">${pendingForms.length} form${pendingForms.length > 1 ? 's' : ''}</strong> to complete before your visit:
            </p>
            ${formListHtml}
            ${buildCtaButton(`${portalUrl}/forms`, 'Complete Your Forms Now →')}
            ${buildTimeNote()}
            ${buildNewAccountNote(portalUrl)}
          `,
        });

        if (resend) {
          try {
            await resend.emails.send({
              from: "Elita MedSpa <noreply@elitamedspa.com>",
              to: [client.email],
              subject,
              html: htmlBody,
            });
            await logNotification(supabase, {
              client_id: appt.client_id, type: 'email', category: 'forms_incomplete_tomorrow',
              recipient: client.email, subject, body: `${pendingForms.length} pending forms reminder`,
              status: 'sent', sent_at: new Date().toISOString(),
            });
            formsReminderCount++;
          } catch (e: any) {
            await logNotification(supabase, {
              client_id: appt.client_id, type: 'email', category: 'forms_incomplete_tomorrow',
              recipient: client.email, subject, body: '', status: 'failed', error_message: e.message,
            });
          }
        }
      }
      results.push(`Forms incomplete tomorrow: sent ${formsReminderCount} reminders`);
    }
    const t5 = triggerMap.get('membership_renewal_reminder');
    if (t5) {
      const targetDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: memberships } = await supabase
        .from('client_memberships')
        .select('id, client_id, next_billing_date, clients(first_name, email, phone, sms_opt_out, email_opt_out), memberships(name)')
        .eq('status', 'active')
        .not('next_billing_date', 'is', null)
        .gte('next_billing_date', dayStart.toISOString())
        .lte('next_billing_date', dayEnd.toISOString());

      for (const mem of memberships || []) {
        const client = mem.clients as any;
        const memInfo = mem.memberships as any;
        if (!client) continue;

        const vars = {
          first_name: client.first_name,
          renewal_date: new Date(mem.next_billing_date!).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          included_service: 'monthly treatment',
          portal_url: portalUrl,
        };

        if (resend && t5.channels?.includes('email') && client.email && !client.email_opt_out) {
          try {
            const subject = replaceVars(t5.email_subject || '', vars);
            const body = replaceVars(t5.email_body || '', vars);
            await sendEmail(resend, client.email, subject, body);
            await logNotification(supabase, {
              client_id: mem.client_id, type: 'email', category: 'membership_renewal_reminder',
              recipient: client.email, subject, body, status: 'sent', sent_at: new Date().toISOString(),
            });
          } catch (e: any) {
            await logNotification(supabase, {
              client_id: mem.client_id, type: 'email', category: 'membership_renewal_reminder',
              recipient: client.email, subject: '', body: '', status: 'failed', error_message: e.message,
            });
          }
        }

        if (t5.channels?.includes('sms') && client.phone && !client.sms_opt_out) {
          const smsBody = replaceVars(t5.sms_body || '', vars);
          console.log(`[SMS PLACEHOLDER] To: ${client.phone}, Body: ${smsBody}`);
          await logNotification(supabase, {
            client_id: mem.client_id, type: 'sms', category: 'membership_renewal_reminder',
            recipient: client.phone, subject: '', body: smsBody, status: 'sent',
            sent_at: new Date().toISOString(),
          });
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
