import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Elita Medical Spa <onboarding@resend.dev>";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { to, subject, html, client_id } = body;

    // Validate required fields
    if (!to || typeof to !== "string" || !to.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid 'to' email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject || typeof subject !== "string" || subject.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid or missing 'subject'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!html || typeof html !== "string") {
      return new Response(JSON.stringify({ error: "Invalid or missing 'html' body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let status = "failed";
    let errorMessage: string | null = null;

    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: [to],
          subject,
          html,
        }),
      });

      const resendData = await resendRes.json();

      if (resendRes.ok) {
        status = "sent";
        console.log("Email sent successfully:", resendData);
      } else {
        errorMessage = resendData?.message || resendData?.error || "Resend API error";
        console.error("Resend API error:", resendData);
      }
    } catch (e: any) {
      errorMessage = e.message;
      console.error("Resend fetch error:", e);
    }

    // Log to notification_logs
    await supabase.from("notification_logs").insert({
      client_id: client_id || null,
      type: "email",
      category: "send-email",
      recipient: to,
      subject,
      body: html.substring(0, 5000),
      status,
      error_message: errorMessage,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });

    if (status === "sent") {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    console.error("Error in send-email:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
