// Shared Elita email template utilities
// Warm beige/cream design matching Elita brand

export const PORTAL_URL = "https://elita-zenith-flow.lovable.app/portal";
export const BUSINESS_NAME = "Elita Medical Spa";
export const BUSINESS_LOCATION = "Elita Medical Spa, Severn MD";

export function sanitizeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

export function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function buildGoogleCalendarLink(params: { title: string; start: string; durationMin: number; location: string; description: string }): string {
  const startDate = new Date(params.start);
  const endDate = new Date(startDate.getTime() + params.durationMin * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', params.title);
  url.searchParams.set('dates', `${fmt(startDate)}/${fmt(endDate)}`);
  url.searchParams.set('location', params.location);
  url.searchParams.set('details', params.description);
  return url.toString();
}

// Elita brand colors
const BRAND = {
  bg: '#faf8f5',       // warm cream background
  card: '#ffffff',
  accent: '#b8977e',   // warm beige/gold accent
  accentDark: '#96775e',
  text: '#3d3229',     // warm dark brown
  textLight: '#7a6b5d',
  border: '#e8ddd1',
  buttonText: '#ffffff',
};

export function wrapInElitaTemplate(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Georgia','Times New Roman',serif;background:${BRAND.bg};">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <!-- Logo / Header -->
    <div style="text-align:center;padding:32px 0 24px;">
      <h1 style="margin:0;font-size:28px;font-weight:400;letter-spacing:4px;color:${BRAND.text};text-transform:uppercase;">Elita</h1>
      <p style="margin:4px 0 0;font-size:11px;letter-spacing:3px;color:${BRAND.textLight};text-transform:uppercase;">Medical Spa</p>
    </div>

    <!-- Card -->
    <div style="background:${BRAND.card};border-radius:12px;padding:32px;border:1px solid ${BRAND.border};box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      ${innerHtml}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0 8px;">
      <p style="margin:0 0 4px;color:${BRAND.textLight};font-size:12px;">${BUSINESS_LOCATION}</p>
      <p style="margin:0 0 12px;color:${BRAND.textLight};font-size:12px;">&copy; ${new Date().getFullYear()} ${BUSINESS_NAME}. All rights reserved.</p>
      <p style="margin:0;font-size:11px;color:#a39585;">
        To unsubscribe, reply STOP or <a href="${PORTAL_URL}/profile" style="color:${BRAND.accent};text-decoration:underline;">update your preferences</a>.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function elitaButton(text: string, href: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:${BRAND.accent};color:${BRAND.buttonText};text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:1px;font-family:Arial,sans-serif;">${text}</a>
  </div>`;
}

export function elitaText(text: string): string {
  return `<p style="margin:0 0 16px;color:${BRAND.text};font-size:15px;line-height:1.7;">${text}</p>`;
}

export function elitaHeading(text: string): string {
  return `<h2 style="margin:0 0 20px;color:${BRAND.text};font-size:20px;font-weight:400;letter-spacing:1px;text-align:center;">${text}</h2>`;
}

export function elitaDivider(): string {
  return `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:20px 0;">`;
}

export function elitaDetailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:${BRAND.textLight};font-size:14px;width:120px;font-family:Arial,sans-serif;">${label}</td>
    <td style="padding:8px 0;color:${BRAND.text};font-size:14px;font-weight:500;font-family:Arial,sans-serif;">${value}</td>
  </tr>`;
}

export function elitaDetailsTable(rows: { label: string; value: string }[]): string {
  return `<table style="width:100%;margin:16px 0;">
    ${rows.map(r => elitaDetailRow(r.label, r.value)).join('')}
  </table>`;
}

export function elitaSignature(): string {
  return `<p style="margin:24px 0 0;color:${BRAND.textLight};font-size:14px;font-style:italic;">See you soon,<br>The Elita Team</p>`;
}
