import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if any owner already exists — if so, block bootstrap
    const { data: existingOwners, error: checkError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "owner")
      .eq("is_active", true)
      .limit(1);

    if (checkError) throw checkError;

    if (existingOwners && existingOwners.length > 0) {
      return new Response(
        JSON.stringify({ error: "Owner account already exists. Bootstrap is disabled." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, staffId } = await req.json();

    if (!email || !password || !staffId) {
      return new Response(
        JSON.stringify({ error: "email, password, and staffId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the staff record exists and is admin
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("id, first_name, last_name, role")
      .eq("id", staffId)
      .single();

    if (staffError || !staff) {
      return new Response(
        JSON.stringify({ error: "Staff member not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // Create user_role as owner
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "owner",
        staff_id: staffId,
        is_active: true,
      });

    if (roleError) {
      // Cleanup: delete the auth user if role creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw roleError;
    }

    // Update staff email to match
    await supabaseAdmin
      .from("staff")
      .update({ email })
      .eq("id", staffId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Owner account created for ${staff.first_name} ${staff.last_name}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Bootstrap error:", err);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
