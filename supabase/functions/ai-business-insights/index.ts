import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { startDate, endDate } = await req.json();

    // Fetch key business data in parallel
    const [txRes, aptRes, clockRes, productRes, clientRes] = await Promise.all([
      supabase.from("transactions").select("amount, transaction_type, transaction_date, staff_id")
        .gte("transaction_date", startDate).lte("transaction_date", endDate),
      supabase.from("appointments").select("id, status, scheduled_at, total_amount, client_id, rebooked_to_id")
        .gte("scheduled_at", startDate).lte("scheduled_at", endDate),
      supabase.from("time_clock").select("clock_in, clock_out, staff_id, staff(hourly_rate)")
        .gte("clock_in", startDate).lte("clock_in", endDate),
      supabase.from("products").select("name, quantity_in_stock, reorder_level, price")
        .lte("quantity_in_stock", 10),
      supabase.from("clients").select("id, created_at, visit_count, total_spent")
        .gte("created_at", startDate).lte("created_at", endDate),
    ]);

    const transactions = txRes.data || [];
    const appointments = aptRes.data || [];
    const timeClock = clockRes.data || [];
    const lowStockProducts = productRes.data || [];
    const newClients = clientRes.data || [];

    // Calculate summary metrics
    const totalRevenue = transactions.filter(t => t.transaction_type !== 'refund')
      .reduce((s, t) => s + Number(t.amount), 0);
    const serviceRevenue = transactions.filter(t => t.transaction_type === 'service')
      .reduce((s, t) => s + Number(t.amount), 0);
    const retailRevenue = transactions.filter(t => t.transaction_type === 'retail')
      .reduce((s, t) => s + Number(t.amount), 0);
    const completedApts = appointments.filter(a => a.status === 'completed');
    const cancelledApts = appointments.filter(a => a.status === 'cancelled');
    const noShowApts = appointments.filter(a => a.status === 'no_show');
    const rebookedApts = completedApts.filter(a => a.rebooked_to_id);
    
    const totalLaborHours = timeClock.reduce((s, tc) => {
      const staff = tc.staff as { hourly_rate: number } | null;
      const hours = tc.clock_out 
        ? (new Date(tc.clock_out).getTime() - new Date(tc.clock_in).getTime()) / 3600000 
        : 0;
      return s + hours;
    }, 0);
    const totalLaborCost = timeClock.reduce((s, tc) => {
      const staff = tc.staff as { hourly_rate: number } | null;
      const rate = staff?.hourly_rate || 0;
      const hours = tc.clock_out 
        ? (new Date(tc.clock_out).getTime() - new Date(tc.clock_in).getTime()) / 3600000 
        : 0;
      return s + (hours * rate);
    }, 0);

    // Build hourly distribution
    const hourCounts: Record<number, number> = {};
    appointments.forEach(a => {
      const h = new Date(a.scheduled_at).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });

    const dayCounts: Record<number, number> = {};
    appointments.forEach(a => {
      const d = new Date(a.scheduled_at).getDay();
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    });

    const summaryPrompt = `You are a business analyst for a medical aesthetics spa. Analyze these metrics and provide 4-5 actionable recommendations.

PERIOD: ${startDate} to ${endDate}

REVENUE:
- Total: $${totalRevenue.toFixed(0)}
- Service: $${serviceRevenue.toFixed(0)} (${totalRevenue > 0 ? ((serviceRevenue/totalRevenue)*100).toFixed(0) : 0}%)
- Retail: $${retailRevenue.toFixed(0)} (${totalRevenue > 0 ? ((retailRevenue/totalRevenue)*100).toFixed(0) : 0}%)
- Avg ticket: $${completedApts.length > 0 ? (totalRevenue / completedApts.length).toFixed(0) : 0}

APPOINTMENTS:
- Total scheduled: ${appointments.length}
- Completed: ${completedApts.length}
- Cancelled: ${cancelledApts.length} (${appointments.length > 0 ? ((cancelledApts.length/appointments.length)*100).toFixed(0) : 0}%)
- No-shows: ${noShowApts.length} (${appointments.length > 0 ? ((noShowApts.length/appointments.length)*100).toFixed(0) : 0}%)
- Rebooked: ${rebookedApts.length} (${completedApts.length > 0 ? ((rebookedApts.length/completedApts.length)*100).toFixed(0) : 0}%)

LABOR:
- Total hours: ${totalLaborHours.toFixed(0)}
- Total cost: $${totalLaborCost.toFixed(0)}
- Revenue per labor hour: $${totalLaborHours > 0 ? (totalRevenue / totalLaborHours).toFixed(0) : 0}

CLIENTS:
- New clients this period: ${newClients.length}

LOW STOCK PRODUCTS: ${lowStockProducts.map(p => `${p.name} (${p.quantity_in_stock} left)`).join(', ') || 'None'}

BUSIEST HOURS: ${Object.entries(hourCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([h, c]) => `${h}:00 (${c} appts)`).join(', ')}
SLOWEST HOURS: ${Object.entries(hourCounts).sort((a,b) => a[1] - b[1]).slice(0, 3).map(([h, c]) => `${h}:00 (${c} appts)`).join(', ')}
BUSIEST DAYS: ${Object.entries(dayCounts).sort((a,b) => b[1] - a[1]).map(([d, c]) => `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][Number(d)]} (${c})`).join(', ')}

Respond in JSON format:
{
  "recommendations": [
    {
      "title": "short title",
      "description": "1-2 sentence actionable recommendation",
      "impact": "high" | "medium" | "low",
      "category": "revenue" | "operations" | "retention" | "inventory" | "marketing"
    }
  ],
  "summary": "1 sentence overall business health summary"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: summaryPrompt }],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[1] || jsonMatch?.[0] || content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
