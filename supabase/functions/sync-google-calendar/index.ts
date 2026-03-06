import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

// --- Google Auth helpers ---

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createJWT(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import PEM private key
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, enc.encode(unsignedToken))
  );

  return `${unsignedToken}.${base64url(signature)}`;
}

async function getAccessToken(sa: ServiceAccountKey): Promise<string> {
  const jwt = await createJWT(sa);
  const resp = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to get Google access token: ${text}`);
  }
  const data = await resp.json();
  return data.access_token;
}

// --- Calendar helpers ---

interface AppointmentDetails {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  client?: { first_name: string; last_name: string } | null;
  staff?: { first_name: string; last_name: string } | null;
  service?: { name: string } | null;
  room?: { name: string } | null;
  machine?: { name: string } | null;
}

function appointmentToEvent(appt: AppointmentDetails, calendarId: string) {
  const start = new Date(appt.scheduled_at);
  const end = new Date(start.getTime() + appt.duration_minutes * 60000);

  const clientName = appt.client
    ? `${appt.client.first_name} ${appt.client.last_name}`
    : "Walk-in";
  const providerName = appt.staff
    ? `${appt.staff.first_name} ${appt.staff.last_name}`
    : "Unassigned";
  const serviceName = appt.service?.name || "Appointment";
  const roomName = appt.room?.name || "";
  const machineName = appt.machine?.name || "";

  const summary = `${serviceName} - ${clientName}`;
  const descriptionParts = [
    `👤 Client: ${clientName}`,
    `👨‍⚕️ Provider: ${providerName}`,
    `💆 Service: ${serviceName}`,
  ];
  if (roomName) descriptionParts.push(`🏠 Room: ${roomName}`);
  if (machineName) descriptionParts.push(`⚙️ Machine: ${machineName}`);
  if (appt.notes) descriptionParts.push(`📝 Notes: ${appt.notes}`);
  descriptionParts.push(`\n🔗 Status: ${appt.status}`);

  return {
    summary,
    description: descriptionParts.join("\n"),
    start: {
      dateTime: start.toISOString(),
      timeZone: "America/Los_Angeles",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "America/Los_Angeles",
    },
    location: roomName ? `Room: ${roomName}` : undefined,
    extendedProperties: {
      private: {
        elita_appointment_id: appt.id,
        elita_provider: providerName,
        elita_room: roomName,
      },
    },
  };
}

async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: ReturnType<typeof appointmentToEvent>
) {
  const resp = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Calendar create failed [${resp.status}]: ${text}`);
  }
  return resp.json();
}

async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: ReturnType<typeof appointmentToEvent>
) {
  const resp = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Calendar update failed [${resp.status}]: ${text}`);
  }
  return resp.json();
}

async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
) {
  const resp = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!resp.ok && resp.status !== 404) {
    const text = await resp.text();
    throw new Error(`Google Calendar delete failed [${resp.status}]: ${text}`);
  }
  // consume body
  await resp.text();
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth header exists
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, appointment_id } = body;
    const calendar_id = "contact@elitamedspa.com";

    // Get Google service account key
    const saKeyJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saKeyJson) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
    }
    const saKey: ServiceAccountKey = JSON.parse(saKeyJson);
    const accessToken = await getAccessToken(saKey);

    // For actions that modify data, verify authenticated user
    const requiresAuth = action === "sync" || action === "sync_all";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    if (requiresAuth) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized - login required for this action" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "sync" && appointment_id) {
      // Read-only mode: skip writing to Google Calendar
      return new Response(JSON.stringify({ success: true, action: "skipped", message: "Read-only mode — not pushing to Google Calendar" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "pull") {
      // Pull events from Google Calendar to check for external changes
      const now = new Date();
      const timeMin = body.time_min || now.toISOString();
      const timeMax = body.time_max || new Date(now.getTime() + 7 * 86400000).toISOString();

      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
      });

      const resp = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendar_id)}/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Google Calendar list failed [${resp.status}]: ${text}`);
      }
      const calData = await resp.json();

      return new Response(JSON.stringify({ success: true, events: calData.items || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync_all") {
      // Read-only mode: skip writing to Google Calendar
      return new Response(JSON.stringify({ success: true, results: [], message: "Read-only mode — not pushing to Google Calendar" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reschedule_gcal") {
      // Read-only mode: skip writing to Google Calendar
      return new Response(JSON.stringify({ success: true, action: "skipped", message: "Read-only mode — not pushing to Google Calendar" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: sync, pull, sync_all, reschedule_gcal" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Calendar sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
