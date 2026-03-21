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

    const { imageBase64, clientName, concerns, analysisArea } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch real services from the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: services } = await supabase
      .from("services")
      .select("id, name, description, category, price, duration_minutes")
      .eq("is_active", true)
      .order("name");

    const serviceList = (services || [])
      .map((s: any) => `- ${s.name} ($${s.price}, ${s.duration_minutes}min, category: ${s.category})${s.description ? `: ${s.description}` : ""}`)
      .join("\n");

    const area = analysisArea || "face";
    const areaLabel = area === "body" ? "body skin" : "facial skin";

    const systemPrompt = `You are a professional MedSpa skin analysis consultant at Elita MedSpa.
Analyze the provided photo of the client's ${areaLabel} and give personalized skincare/treatment recommendations.

IMPORTANT: You MUST only recommend treatments from our actual service menu below. Match the client's concerns to the most relevant services we offer. Use the exact service names from our menu.

OUR SERVICE MENU:
${serviceList || "No services configured yet — recommend general MedSpa treatments."}

Respond in this exact JSON format:
{
  "analysis_area": "${area}",
  "skin_type": "oily/dry/combination/normal/sensitive",
  "concerns": ["list of observed concerns"],
  "score": 75,
  "recommendations": [
    {
      "treatment": "Exact Service Name from our menu",
      "reason": "Why this treatment helps this specific concern",
      "priority": "high/medium/low",
      "price": 150
    }
  ],
  "daily_tips": ["tip 1", "tip 2", "tip 3"],
  "summary": "A friendly, encouraging 2-3 sentence summary about the ${areaLabel} analysis"
}

Guidelines:
- For FACE: Focus on facial concerns like wrinkles, acne, pigmentation, pores, hydration, fine lines, sagging
- For BODY: Focus on body concerns like cellulite, stretch marks, skin texture, body contouring, scarring, uneven tone, hair removal
- Keep recommendations to 3-5 max, prioritized by urgency
- Use exact service names and prices from our menu
- Be encouraging, professional, and specific about what you observe
- The score should reflect overall skin health (100 = excellent)`;

    const userContent: any[] = [
      {
        type: "text",
        text: `Please analyze this ${areaLabel} photo for skin concerns and recommend treatments from our service menu.${concerns ? ` The client mentioned these concerns: ${concerns}` : ""}${clientName ? ` Client name: ${clientName}` : ""}`,
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
      analysis = { summary: content, recommendations: [], concerns: [], daily_tips: [], analysis_area: area };
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
