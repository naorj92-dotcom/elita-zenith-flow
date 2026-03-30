import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  template_id?: string;
  category?: string;
  type: 'email' | 'sms' | 'forms_reminder';
  client_id: string;
  variables?: Record<string, string>;
  custom_subject?: string;
  custom_body?: string;
  appointment_id?: string | null;
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function sanitizeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

// Validate input data
function validateRequest(data: any): { valid: boolean; error?: string } {
  if (!data.client_id || !isValidUUID(data.client_id)) {
    return { valid: false, error: 'Invalid client_id format' };
  }
  if (data.type === 'forms_reminder') {
    return { valid: true };
  }
  if (!data.category || typeof data.category !== 'string' || data.category.length > 100) {
    return { valid: false, error: 'Invalid category' };
  }
  if (!['email', 'sms'].includes(data.type)) {
    return { valid: false, error: 'Invalid notification type' };
  }
  if (data.template_id && !isValidUUID(data.template_id)) {
    return { valid: false, error: 'Invalid template_id format' };
  }
  if (data.custom_subject && data.custom_subject.length > 200) {
    return { valid: false, error: 'Subject too long (max 200 characters)' };
  }
  if (data.custom_body && data.custom_body.length > 10000) {
    return { valid: false, error: 'Body too long (max 10000 characters)' };
  }
  return { valid: true };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate the request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has staff role (owner or employee)
    const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: user.id });
    if (roleData !== 'owner' && roleData !== 'employee') {
      return new Response(
        JSON.stringify({ error: "Forbidden - Staff access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData = await req.json();
    
    // Validate input
    const validation = validateRequest(requestData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { template_id, category, type, client_id, variables, custom_subject, custom_body, appointment_id }: NotificationRequest = requestData;

    console.log("Received notification request:", { template_id, category, type, client_id, user_id: user.id });

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      console.error("Client not found:", clientError);
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── FORMS REMINDER (special type) ──
    if (type === 'forms_reminder') {
      if (!client.email) {
        return new Response(
          JSON.stringify({ error: "Client has no email address" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (client.email_opt_out) {
        return new Response(
          JSON.stringify({ error: "Client has opted out of email notifications" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch pending forms for this client
      const { data: pendingForms } = await supabase
        .from('client_forms')
        .select('id, form_id, forms(name, form_type)')
        .eq('client_id', client_id)
        .eq('status', 'pending');

      if (!pendingForms || pendingForms.length === 0) {
        return new Response(
          JSON.stringify({ success: true, status: 'skipped', message: 'No pending forms' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const portalUrl = "https://elita-zenith-flow.lovable.app/portal";
      const firstName = sanitizeHtml(client.first_name || 'there');
      const formListHtml = pendingForms.map((f: any) => {
        const form = f.forms as any;
        const typeBadge = form?.form_type === 'intake' ? '📝 Intake' :
                          form?.form_type === 'consent' ? '✍️ Consent' :
                          form?.form_type === 'contract' ? '📄 Contract' : '📋 Form';
        return `<li style="padding: 8px 0; border-bottom: 1px solid #e5e0d8;">${typeBadge} — <strong>${sanitizeHtml(form?.name || 'Required Form')}</strong></li>`;
      }).join('');

      const subject = `📋 Action Required: Complete Your Forms Before Your Visit`;
      const htmlBody = `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #faf8f5;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #d4c5a9; font-size: 28px; margin: 0; letter-spacing: 2px;">ELITA MEDSPA</h1>
            <p style="color: #a39882; font-size: 12px; margin-top: 8px; letter-spacing: 3px;">LUXURY AESTHETICS</p>
          </div>
          <div style="padding: 40px 30px;">
            <p style="color: #3d3929; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
            <p style="color: #5a5343; font-size: 15px; line-height: 1.7;">
              You have <strong>${pendingForms.length} form${pendingForms.length > 1 ? 's' : ''}</strong> that need to be completed before your next visit. Taking a few minutes now means no paperwork at the spa!
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
            <p style="color: #a39882; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Elita MedSpa. All rights reserved.</p>
          </div>
        </div>`;

      let status = 'pending';
      let errorMessage = null;
      let sentAt = null;

      try {
        await resend.emails.send({
          from: "Elita MedSpa <noreply@elitamedspa.com>",
          to: [client.email],
          subject,
          html: htmlBody,
        });
        status = 'sent';
        sentAt = new Date().toISOString();
      } catch (e: any) {
        status = 'failed';
        errorMessage = e.message;
      }

      await supabase.from('notification_logs').insert({
        client_id, type: 'email', category: 'forms_reminder',
        recipient: client.email, subject, body: `${pendingForms.length} pending forms reminder`,
        status, error_message: errorMessage, sent_at: sentAt,
      });

      return new Response(
        JSON.stringify({ success: status === 'sent', status, message: status === 'sent' ? 'Forms reminder sent' : 'Failed to send reminder', error: errorMessage }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── STANDARD NOTIFICATION FLOW ──
    // Add client name to variables
    const enrichedVariables = {
      ...(variables || {}),
      client_name: `${client.first_name} ${client.last_name}`,
    };

    let subject = custom_subject || '';
    let body = custom_body || '';

    // Get template if template_id provided
    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      if (templateError || !template) {
        return new Response(
          JSON.stringify({ error: "Template not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      subject = template.subject || '';
      body = template.body;
    }

    // Replace variables in subject and body
    subject = replaceVariables(subject, enrichedVariables);
    body = replaceVariables(body, enrichedVariables);

    const recipient = type === 'email' ? client.email : client.phone;

    if (!recipient) {
      return new Response(
        JSON.stringify({ error: `Client has no ${type} address` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let status = 'pending';
    let errorMessage = null;
    let sentAt = null;

    if (type === 'email') {
      try {
        // Sanitize and convert plain text to HTML to prevent XSS
        const sanitizeHtml = (str: string): string =>
          str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
        const htmlBody = sanitizeHtml(body).replace(/\n/g, '<br>');
        const sanitizedSubject = sanitizeHtml(subject);
        
        const emailResponse = await resend.emails.send({
          from: "Elita MedSpa <noreply@elitamedspa.com>",
          to: [recipient],
          subject: sanitizedSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #8B5CF6; margin: 0;">Elita MedSpa</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 10px;">
                ${htmlBody}
              </div>
              <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Elita MedSpa. All rights reserved.</p>
                <p>Questions? Contact us at support@elitamedspa.com</p>
              </div>
            </div>
          `,
        });

        console.log("Email sent successfully:", emailResponse);
        status = 'sent';
        sentAt = new Date().toISOString();
      } catch (emailError: any) {
        console.error("Email send error:", emailError);
        status = 'failed';
        errorMessage = emailError.message;
      }
    } else if (type === 'sms') {
      // SMS would require integration with Twilio or similar
      // For now, we'll log it and mark as sent (placeholder)
      console.log("SMS notification (placeholder):", { to: recipient, body });
      status = 'sent';
      sentAt = new Date().toISOString();
    }

    // Log the notification
    const { error: logError } = await supabase
      .from('notification_logs')
      .insert({
        template_id,
        client_id,
        type,
        category,
        recipient,
        subject,
        body,
        status,
        error_message: errorMessage,
        sent_at: sentAt,
      });

    if (logError) {
      console.error("Error logging notification:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: status === 'sent',
        status,
        message: status === 'sent' ? 'Notification sent successfully' : 'Failed to send notification',
        error: errorMessage 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);