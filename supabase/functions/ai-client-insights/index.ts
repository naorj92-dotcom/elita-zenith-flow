import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { clientId } = await req.json();

    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all client data in parallel
    const [clientRes, aptsRes, pkgsRes, membRes, formsRes, journeyRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase.from("appointments").select("id, status, scheduled_at, total_amount, service_id, rebooked_to_id, services(name, price)").eq("client_id", clientId).order("scheduled_at", { ascending: false }),
      supabase.from("client_packages").select("*, packages(name)").eq("client_id", clientId).eq("status", "active"),
      supabase.from("client_memberships").select("*, memberships(name)").eq("client_id", clientId),
      supabase.from("client_forms").select("id, status").eq("client_id", clientId),
      supabase.from("client_treatment_progress").select("*").eq("client_id", clientId),
    ]);

    const client = clientRes.data;
    const appointments = aptsRes.data || [];
    const packages = pkgsRes.data || [];
    const memberships = membRes.data || [];
    const forms = formsRes.data || [];
    const journey = journeyRes.data || [];

    if (!client) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completedApts = appointments.filter((a: any) => a.status === "completed");
    const visitHistory = completedApts.slice(0, 20).map((a: any) => ({
      service: a.services?.name || "Unknown",
      date: a.scheduled_at,
      amount: a.total_amount,
    }));

    const activeMembership = memberships.find((m: any) => m.status === "active");
    const currentJourney = journey.length > 0 ? journey.sort((a: any, b: any) => b.sessions_completed - a.sessions_completed)[0] : null;
    const formsCompleted = forms.length > 0 && forms.every((f: any) => f.status === "completed");

    const clientDataPrompt = JSON.stringify({
      visit_history: visitHistory,
      current_packages: packages.map((p: any) => ({
        name: p.packages?.name || "Package",
        sessions_remaining: p.sessions_total - p.sessions_used,
        sessions_total: p.sessions_total,
        expiry_date: p.expiry_date,
      })),
      membership_status: activeMembership ? "active" : "inactive",
      membership_name: activeMembership?.memberships?.name || null,
      last_visit_date: client.last_visit_date,
      total_spend: client.total_spent,
      journey_stage: currentJourney?.category || "not started",
      journey_progress: currentJourney ? `${currentJourney.sessions_completed}/${currentJourney.sessions_target}` : null,
      forms_completed: formsCompleted,
      birthday: client.date_of_birth,
      visit_count: client.visit_count,
      client_name: `${client.first_name} ${client.last_name}`,
    }, null, 2);

    const systemPrompt = `You are a medspa client success assistant for Elita Medical Spa.
Based on this client's history and data, provide:
1. ONE personalized rebooking recommendation with specific timing
2. ONE upsell opportunity that makes sense for their journey stage
3. ONE retention risk flag if applicable (e.g. hasn't visited in 60+ days, package expiring soon, hasn't progressed to next journey stage). If no risk, set retention_flag to null.
4. A suggested talking point for the provider to open the conversation

Keep each insight to 1-2 sentences. Be specific, warm, and actionable.

Respond as JSON with this exact structure:
{
  "rebooking": "your recommendation",
  "upsell": "your upsell opportunity",
  "retention_flag": "risk description or null if no risk",
  "conversation_starter": "talking point"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the client data:\n${clientDataPrompt}` },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[1] || jsonMatch?.[0] || content);

    return new Response(JSON.stringify({
      insights: parsed,
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate insights" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
