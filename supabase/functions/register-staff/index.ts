import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with caller's token to verify role
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is owner
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('is_active', true)
      .single();

    if (!roleData || roleData.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Only owners can register staff' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, staff_id } = await req.json();

    if (!email || !password || !staff_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, staff_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify staff exists
    const { data: staffData } = await adminClient
      .from('staff')
      .select('id, role, first_name, last_name')
      .eq('id', staff_id)
      .single();

    if (!staffData) {
      return new Response(JSON.stringify({ error: 'Staff member not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if staff already has an auth account
    const { data: existingRole } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('staff_id', staff_id)
      .eq('is_active', true)
      .single();

    if (existingRole) {
      return new Response(JSON.stringify({ error: 'Staff member already has an account' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create auth user with admin client (auto-confirms email)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: staffData.first_name,
        last_name: staffData.last_name,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map staff role to app role
    let appRole: string;
    let empType: string | null = null;

    if (staffData.role === 'admin') {
      appRole = 'owner';
    } else if (staffData.role === 'front_desk') {
      appRole = 'employee';
      empType = 'front_desk';
    } else {
      appRole = 'employee';
      empType = 'provider';
    }

    // Create user_roles entry
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: appRole,
        employee_type: empType,
        staff_id: staff_id,
      });

    if (roleError) {
      // Rollback: delete the created auth user
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: 'Failed to create role: ' + roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update staff email if different
    await adminClient
      .from('staff')
      .update({ email })
      .eq('id', staff_id);

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: newUser.user.id,
      message: `Account created for ${staffData.first_name} ${staffData.last_name}` 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Register staff error:', err);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
