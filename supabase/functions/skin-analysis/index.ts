import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, clientId, clientName } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check 30-day cooldown
    if (clientId) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: recent } = await supabase
        .from("skin_analyses")
        .select("id, created_at")
        .eq("client_id", clientId)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      if (recent && recent.length > 0) {
        return new Response(
          JSON.stringify({ error: "You can only run one analysis per 30 days.", cooldown: true, lastAnalysis: recent[0].created_at }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const systemPrompt = `You are an aesthetic skincare analysis AI for Elita Medical Spa in Maryland. Analyze the uploaded facial photo and identify the top 3 visible skin concerns from: fine lines/wrinkles, forehead lines, crow's feet, volume loss (cheeks/lips), skin laxity/sagging, hyperpigmentation/dark spots, enlarged pores, skin texture/roughness, under-eye concerns (hollowing/circles), lip thinning, jawline definition loss. For each concern: name, severity (Mild/Moderate/Significant), one warm non-alarming sentence describing what you see, and which facial area. Then recommend 2-3 treatments from this list: Botox Full Face, Botox Targeted, Lip Filler, Cheek Filler, Jawline Filler, Under Eye Filler, HydraGlow Facial, Chemical Peel, Microneedling, Vacuum + RF, CryoSculpt, LED Therapy. Return ONLY valid JSON, no markdown, in this exact format: { "overall_summary": "string", "skin_score": 75, "concerns": [{"name": "string", "severity": "Mild|Moderate|Significant", "description": "string", "area": "string"}], "recommendations": [{"service_name": "string", "reason": "string", "priority": "high|medium", "cta": "string"}], "next_steps": "string" }`;

    const userContent: any[] = [
      {
        type: "text",
        text: `Please analyze this facial photo for skin concerns and recommend treatments.${clientName ? ` Client name: ${clientName}` : ""}`,
      },
      {
        type: "image_url",
        image_url: { url: imageBase64 },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ error: "Analysis service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      analysis = { overall_summary: content, skin_score: 0, concerns: [], recommendations: [], next_steps: "" };
    }

    // Save to DB
    if (clientId && analysis) {
      await supabase.from("skin_analyses").insert({
        client_id: clientId,
        skin_score: analysis.skin_score || 0,
        overall_summary: analysis.overall_summary || "",
        concerns: analysis.concerns || [],
        recommendations: analysis.recommendations || [],
        next_steps: analysis.next_steps || "",
      });
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Skin analysis error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
