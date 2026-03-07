import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { imageBase64, clientName, concerns } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a professional MedSpa skin analysis consultant at Elita MedSpa. 
Analyze the provided selfie and give personalized skincare recommendations.

Respond in this exact JSON format:
{
  "skin_type": "oily/dry/combination/normal/sensitive",
  "concerns": ["list of observed concerns"],
  "score": 75,
  "recommendations": [
    {
      "treatment": "Treatment Name",
      "reason": "Why this treatment helps",
      "priority": "high/medium/low"
    }
  ],
  "daily_tips": ["tip 1", "tip 2", "tip 3"],
  "summary": "A friendly, encouraging 2-3 sentence summary"
}

Be encouraging and professional. Focus on treatments a luxury MedSpa would offer like:
- Hydrafacials, Chemical Peels, Microneedling
- LED Light Therapy, RF Skin Tightening
- Cryotherapy, Laser treatments
- Botox/fillers (if appropriate)
Keep recommendations to 3-4 max. Be specific but kind.`;

    const userContent: any[] = [
      {
        type: "text",
        text: `Please analyze this selfie for skin concerns and recommend treatments.${concerns ? ` The client mentioned these concerns: ${concerns}` : ""}${clientName ? ` Client name: ${clientName}` : ""}`,
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

    // Parse JSON from the response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      analysis = { summary: content, recommendations: [], concerns: [], daily_tips: [] };
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
