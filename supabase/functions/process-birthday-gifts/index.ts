import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'BDAY-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch birthday campaign settings
    const { data: settings } = await supabase
      .from('business_settings')
      .select('value')
      .eq('key', 'birthday_campaign')
      .maybeSingle();

    const config = settings?.value as any;
    if (!config?.enabled) {
      return new Response(JSON.stringify({ message: 'Birthday campaign disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const daysBefore = config.days_before || 7;
    const giftType = config.gift_type || 'discount';
    const discountPercent = config.discount_percent || 20;
    const freeAddonServiceId = config.free_addon_service_id || null;
    const messageTemplate = config.message_template || 'Happy Birthday, [first_name]! Use code [code] for your birthday gift.';

    const currentYear = new Date().getFullYear();

    // Calculate target birthday date (today + daysBefore)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBefore);
    const targetMonth = targetDate.getMonth() + 1;
    const targetDay = targetDate.getDate();

    // Find clients with birthdays on target date who haven't received gift this year
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone, date_of_birth, birthday_gift_sent_year')
      .not('date_of_birth', 'is', null);

    if (clientsError) throw clientsError;

    const eligibleClients = (clients || []).filter(c => {
      if (!c.date_of_birth) return false;
      if (c.birthday_gift_sent_year === currentYear) return false;
      const dob = new Date(c.date_of_birth);
      return (dob.getMonth() + 1) === targetMonth && dob.getDate() === targetDay;
    });

    let processed = 0;

    for (const client of eligibleClients) {
      const code = generateCode();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // Insert birthday gift
      const { error: giftError } = await supabase.from('birthday_gifts').insert({
        client_id: client.id,
        code,
        gift_type: giftType,
        discount_percent: giftType === 'discount' ? discountPercent : null,
        free_addon_service_id: giftType === 'free_addon' ? freeAddonServiceId : null,
        expiry_date: expiryDate.toISOString().split('T')[0],
      });

      if (giftError) {
        console.error(`Failed to create gift for ${client.id}:`, giftError);
        continue;
      }

      // Build gift details string
      let giftDetails = '';
      if (giftType === 'discount') {
        giftDetails = `${discountPercent}% off your next visit`;
      } else if (giftType === 'free_addon') {
        giftDetails = 'a complimentary add-on service';
      } else {
        giftDetails = 'a special birthday treat';
      }

      // Render message
      const portalUrl = `${supabaseUrl.replace('.supabase.co', '')}/portal`;
      let message = messageTemplate
        .replace(/\[first_name\]/g, client.first_name)
        .replace(/\[gift_details\]/g, giftDetails)
        .replace(/\[code\]/g, code)
        .replace(/\[portal_url\]/g, portalUrl);

      // Log message
      await supabase.from('messages').insert({
        client_id: client.id,
        sender_type: 'staff',
        subject: '🎂 Birthday Gift',
        body: message,
      });

      // Send notification via send-notification function
      if (client.email || client.phone) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: client.email ? 'email' : 'sms',
              recipient: client.email || client.phone,
              subject: '🎂 Happy Birthday from Elita MedSpa!',
              body: message,
              category: 'birthday',
              client_id: client.id,
            }),
          });
        } catch (e) {
          console.error('Notification send error:', e);
        }
      }

      // Notify client in-app
      const { data: profile } = await supabase
        .from('client_profiles')
        .select('user_id')
        .eq('client_id', client.id)
        .maybeSingle();

      if (profile?.user_id) {
        await supabase.from('in_app_notifications').insert({
          user_id: profile.user_id,
          recipient_type: 'client',
          category: 'birthday',
          title: '🎂 Happy Birthday!',
          body: `Your birthday gift is waiting — use code ${code}`,
          icon: 'cake',
          action_url: '/portal',
        });
      }

      // Mark as sent for this year
      await supabase
        .from('clients')
        .update({ birthday_gift_sent_year: currentYear })
        .eq('id', client.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed, total: eligibleClients.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Birthday campaign error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
