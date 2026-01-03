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
  category: string;
  type: 'email' | 'sms';
  client_id: string;
  variables: Record<string, string>;
  custom_subject?: string;
  custom_body?: string;
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
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

    const { template_id, category, type, client_id, variables, custom_subject, custom_body }: NotificationRequest = await req.json();

    console.log("Received notification request:", { template_id, category, type, client_id });

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

    // Add client name to variables
    const enrichedVariables = {
      ...variables,
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
        console.error("Template not found:", templateError);
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
      console.error(`No ${type} address for client`);
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
        // Convert plain text to HTML
        const htmlBody = body.replace(/\n/g, '<br>');
        
        const emailResponse = await resend.emails.send({
          from: "Elita MedSpa <onboarding@resend.dev>",
          to: [recipient],
          subject: subject,
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
