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

async function sendEmail(resend: Resend, to: string, subject: string, body: string) {
  const htmlBody = sanitizeHtml(body).replace(/\n/g, '<br>');
  const sanitizedSubject = sanitizeHtml(subject);
  return resend.emails.send({
    from: "Elita MedSpa <noreply@elitamedspa.com>",
    to: [to],
    subject: sanitizedSubject,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #8B5CF6; margin: 0;">Elita MedSpa</h1></div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 10px;">${htmlBody}</div>
      <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} Elita MedSpa. All rights reserved.</p>
      </div>
    </div>`,
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

        const formListHtml = pendingForms.map((f: any) => {
          const form = f.forms as any;
          const typeBadge = form?.form_type === 'intake' ? '📝 Intake' :
                            form?.form_type === 'consent' ? '✍️ Consent' :
                            form?.form_type === 'contract' ? '📄 Contract' : '📋 Form';
          return `<li style="padding: 8px 0; border-bottom: 1px solid #e5e0d8;">${typeBadge} — <strong>${sanitizeHtml(form?.name || 'Required Form')}</strong></li>`;
        }).join('');

        const subject = '⏰ Reminder: Your Forms Are Still Incomplete - Appointment Tomorrow!';
        const htmlBody = `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #faf8f5;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #d4c5a9; font-size: 28px; margin: 0; letter-spacing: 2px;">ELITA MEDSPA</h1>
              <p style="color: #a39882; font-size: 12px; margin-top: 8px; letter-spacing: 3px;">LUXURY AESTHETICS</p>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #3d3929; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #5a5343; font-size: 15px; line-height: 1.7;">
                Your appointment for <strong>${serviceName}</strong> with <strong>${providerName}</strong> is <strong>tomorrow, ${apptDate} at ${apptTime}</strong>.
              </p>
              <p style="color: #5a5343; font-size: 15px; line-height: 1.7;">
                You still have <strong>${pendingForms.length} form${pendingForms.length > 1 ? 's' : ''}</strong> to complete. Taking 3 minutes now means no paperwork at the spa!
              </p>
              <div style="margin: 25px 0; background: #f0ece4; border-radius: 10px; padding: 20px;">
                <p style="font-weight: 600; color: #3d3929; margin: 0 0 10px;">Forms to complete:</p>
                <ul style="list-style: none; padding: 0; margin: 0;">${formListHtml}</ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}/forms"
                   style="display: inline-block; background: #8b5cf6; color: #ffffff; padding: 14px 36px;
                          border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;
                          letter-spacing: 0.5px;">
                  Complete Your Forms Now →
                </a>
              </div>
              <p style="color: #8a8070; font-size: 13px; text-align: center; line-height: 1.6;">
                Haven't created your client account yet?
                <a href="${portalUrl}/auth" style="color: #8b5cf6; text-decoration: underline;">Create one here</a>
                using the same email address.
              </p>
            </div>
            <div style="background: #1a1a2e; padding: 25px; text-align: center;">
              <p style="color: #a39882; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Elita MedSpa. All rights reserved.</p>
            </div>
          </div>`;

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
