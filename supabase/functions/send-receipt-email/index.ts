import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReceiptEmailRequest {
  receipt_id: string;
  client_email: string;
  client_name: string;
  receipt_number: string;
  provider_name: string;
  service_name?: string;
  service_price: number;
  retail_items: Array<{ name: string; quantity: number; price: number; total: number }>;
  retail_total: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  tip_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  machine_used?: string;
  treatment_summary?: {
    areaTreated?: string;
    intensity?: string;
    duration?: string;
    notes?: string;
  };
  package_status?: {
    packageName: string;
    sessionsRemaining: number;
    sessionsTotal: number;
  };
  membership_status?: {
    tierName: string;
    nextBillingDate: string;
  };
  next_recommended_booking?: string;
  created_at: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ReceiptEmailRequest = await req.json();
    console.log("Sending receipt email to:", data.client_email);

    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const formatDate = (dateStr: string) => 
      new Date(dateStr).toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });

    const formatTime = (dateStr: string) =>
      new Date(dateStr).toLocaleTimeString('en-US', { 
        hour: 'numeric', minute: '2-digit', hour12: true 
      });

    // Build retail items HTML
    let retailItemsHtml = '';
    if (data.retail_items && data.retail_items.length > 0) {
      retailItemsHtml = `
        <tr>
          <td colspan="2" style="padding: 15px 0 5px 0; border-top: 1px solid #e5e7eb;">
            <strong style="color: #374151; font-size: 14px;">Products</strong>
          </td>
        </tr>
        ${data.retail_items.map(item => `
          <tr>
            <td style="padding: 5px 0; color: #6b7280; font-size: 13px;">
              ${item.name} × ${item.quantity}
            </td>
            <td style="padding: 5px 0; text-align: right; color: #374151; font-size: 13px;">
              ${formatCurrency(item.total)}
            </td>
          </tr>
        `).join('')}
      `;
    }

    // Build treatment summary HTML
    let treatmentHtml = '';
    if (data.treatment_summary && Object.keys(data.treatment_summary).length > 0) {
      const ts = data.treatment_summary;
      treatmentHtml = `
        <div style="background: #faf5ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #7c3aed; font-size: 14px;">Treatment Summary</h3>
          <table style="width: 100%; font-size: 13px; color: #6b7280;">
            ${ts.areaTreated ? `<tr><td style="padding: 3px 0;">Area Treated:</td><td style="text-align: right;">${ts.areaTreated}</td></tr>` : ''}
            ${ts.intensity ? `<tr><td style="padding: 3px 0;">Intensity:</td><td style="text-align: right;">${ts.intensity}</td></tr>` : ''}
            ${ts.duration ? `<tr><td style="padding: 3px 0;">Duration:</td><td style="text-align: right;">${ts.duration}</td></tr>` : ''}
            ${ts.notes ? `<tr><td colspan="2" style="padding: 8px 0 0 0; font-style: italic;">${ts.notes}</td></tr>` : ''}
          </table>
        </div>
      `;
    }

    // Build status footer HTML
    let statusHtml = '';
    if (data.package_status || data.membership_status || data.next_recommended_booking) {
      statusHtml = `
        <div style="background: linear-gradient(135deg, #f3e8ff 0%, #fae8ff 100%); border-radius: 8px; padding: 15px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #7c3aed; font-size: 14px;">Your Status</h3>
          ${data.package_status ? `
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;">
              <strong>📦 Package:</strong> ${data.package_status.packageName} | 
              Sessions Remaining: ${data.package_status.sessionsRemaining} of ${data.package_status.sessionsTotal}
            </p>
          ` : ''}
          ${data.membership_status ? `
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;">
              <strong>⭐ Member Status:</strong> ${data.membership_status.tierName} | 
              Next Billing: ${data.membership_status.nextBillingDate}
            </p>
          ` : ''}
          ${data.next_recommended_booking ? `
            <p style="margin: 0; font-size: 13px; color: #7c3aed;">
              <strong>📅 Next Recommended Visit:</strong> ${data.next_recommended_booking}
            </p>
          ` : ''}
        </div>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 300; letter-spacing: 2px;">ELITE MEDSPA</h1>
            <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.9); font-size: 12px; letter-spacing: 3px;">ELEVATE YOUR BEAUTY</p>
          </div>
          
          <!-- Receipt Content -->
          <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <!-- Receipt Header -->
            <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px dashed #e5e7eb;">
              <h2 style="margin: 0 0 5px 0; color: #374151; font-size: 18px;">Receipt</h2>
              <p style="margin: 0; color: #8b5cf6; font-family: monospace; font-size: 16px; font-weight: bold;">${data.receipt_number}</p>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 13px;">${formatDate(data.created_at)}</p>
              <p style="margin: 0; color: #6b7280; font-size: 13px;">${formatTime(data.created_at)}</p>
            </div>
            
            <!-- Client & Provider -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px;">
              <div>
                <p style="margin: 0; color: #6b7280;">Client</p>
                <p style="margin: 3px 0 0 0; color: #374151; font-weight: 500;">${data.client_name}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; color: #6b7280;">Provider</p>
                <p style="margin: 3px 0 0 0; color: #374151; font-weight: 500;">${data.provider_name}</p>
              </div>
            </div>
            
            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse;">
              ${data.service_name ? `
                <tr>
                  <td style="padding: 10px 0; color: #374151; font-size: 14px;">
                    ${data.service_name}
                    ${data.machine_used ? `<span style="display: inline-block; background: #f3e8ff; color: #7c3aed; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${data.machine_used}</span>` : ''}
                  </td>
                  <td style="padding: 10px 0; text-align: right; color: #374151; font-size: 14px;">${formatCurrency(data.service_price)}</td>
                </tr>
              ` : ''}
              ${retailItemsHtml}
            </table>

            ${treatmentHtml}
            
            <!-- Totals -->
            <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
              <table style="width: 100%; font-size: 13px;">
                <tr>
                  <td style="padding: 5px 0; color: #6b7280;">Subtotal</td>
                  <td style="padding: 5px 0; text-align: right; color: #374151;">${formatCurrency(data.subtotal)}</td>
                </tr>
                ${data.discount_amount > 0 ? `
                  <tr>
                    <td style="padding: 5px 0; color: #10b981;">Discount</td>
                    <td style="padding: 5px 0; text-align: right; color: #10b981;">-${formatCurrency(data.discount_amount)}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td style="padding: 5px 0; color: #6b7280;">Tax (${data.tax_rate}%)</td>
                  <td style="padding: 5px 0; text-align: right; color: #374151;">${formatCurrency(data.tax_amount)}</td>
                </tr>
                ${data.tip_amount > 0 ? `
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">Tip</td>
                    <td style="padding: 5px 0; text-align: right; color: #374151;">${formatCurrency(data.tip_amount)}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td style="padding: 15px 0 5px 0; color: #374151; font-size: 18px; font-weight: bold;">Total</td>
                  <td style="padding: 15px 0 5px 0; text-align: right; color: #8b5cf6; font-size: 18px; font-weight: bold;">${formatCurrency(data.total_amount)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 5px; text-align: right; color: #6b7280; font-size: 12px; text-transform: capitalize;">
                    Paid via ${data.payment_method.replace('_', ' ')}
                  </td>
                </tr>
              </table>
            </div>

            ${statusHtml}
            
            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #7c3aed; font-size: 14px; font-weight: 500;">Thank you for choosing Elite MedSpa!</p>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px;">123 Luxury Lane, Suite 100 | Beverly Hills, CA 90210</p>
              <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 12px;">(310) 555-0123 | www.elitemedspa.com</p>
              <a href="https://g.page/r/elite-medspa/review" style="display: inline-block; background: #8b5cf6; color: white; text-decoration: none; padding: 10px 25px; border-radius: 20px; font-size: 13px;">Leave us a Review ⭐</a>
            </div>
          </div>
          
          <!-- Legal Footer -->
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 11px;">
            <p style="margin: 0;">This is your official receipt. Please keep for your records.</p>
            <p style="margin: 5px 0 0 0;">Receipt #${data.receipt_number}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Elite MedSpa <onboarding@resend.dev>",
      to: [data.client_email],
      subject: `Your Elite MedSpa Receipt - ${data.receipt_number}`,
      html: emailHtml,
    });

    console.log("Receipt email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Receipt email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending receipt email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
