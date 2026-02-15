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
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Google service account key
    const saKeyJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saKeyJson) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
    }
    const saKey: ServiceAccountKey = JSON.parse(saKeyJson);
    const accessToken = await getAccessToken(saKey);

    const body = await req.json();
    const { action, appointment_id, calendar_id = "primary" } = body;

    if (action === "sync" && appointment_id) {
      // Fetch appointment with details
      const { data: appt, error: apptError } = await supabase
        .from("appointments")
        .select(`
          id, scheduled_at, duration_minutes, status, notes,
          client:clients(first_name, last_name),
          staff:staff(first_name, last_name),
          service:services(name),
          room:rooms(name),
          machine:machines(name)
        `)
        .eq("id", appointment_id)
        .maybeSingle();

      if (apptError || !appt) {
        throw new Error(`Appointment not found: ${apptError?.message}`);
      }

      const event = appointmentToEvent(appt as unknown as AppointmentDetails, calendar_id);

      // Check if already synced
      const { data: existing } = await supabase
        .from("calendar_sync")
        .select("*")
        .eq("appointment_id", appointment_id)
        .maybeSingle();

      if (appt.status === "cancelled" || appt.status === "no_show") {
        // Delete from Google Calendar if synced
        if (existing) {
          await deleteCalendarEvent(accessToken, existing.google_calendar_id, existing.google_event_id);
          await supabase.from("calendar_sync").delete().eq("id", existing.id);
        }
        return new Response(JSON.stringify({ success: true, action: "deleted" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (existing) {
        // Update existing event
        await updateCalendarEvent(accessToken, existing.google_calendar_id, existing.google_event_id, event);
        await supabase
          .from("calendar_sync")
          .update({ last_synced_at: new Date().toISOString(), sync_status: "synced", sync_error: null })
          .eq("id", existing.id);

        return new Response(JSON.stringify({ success: true, action: "updated", event_id: existing.google_event_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Create new event
        const created = await createCalendarEvent(accessToken, calendar_id, event);
        await supabase.from("calendar_sync").insert({
          appointment_id,
          google_event_id: created.id,
          google_calendar_id: calendar_id,
          sync_status: "synced",
        });

        return new Response(JSON.stringify({ success: true, action: "created", event_id: created.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
      // Sync all upcoming appointments
      const { data: appointments, error: listError } = await supabase
        .from("appointments")
        .select("id")
        .gte("scheduled_at", new Date().toISOString())
        .in("status", ["scheduled", "confirmed", "checked_in", "in_progress"])
        .order("scheduled_at", { ascending: true })
        .limit(50);

      if (listError) throw new Error(`Failed to list appointments: ${listError.message}`);

      const results = [];
      for (const appt of appointments || []) {
        try {
          // Recursive call within the function for each appointment
          const { data: fullAppt } = await supabase
            .from("appointments")
            .select(`
              id, scheduled_at, duration_minutes, status, notes,
              client:clients(first_name, last_name),
              staff:staff(first_name, last_name),
              service:services(name),
              room:rooms(name),
              machine:machines(name)
            `)
            .eq("id", appt.id)
            .maybeSingle();

          if (!fullAppt) continue;

          const event = appointmentToEvent(fullAppt as unknown as AppointmentDetails, calendar_id);

          const { data: existing } = await supabase
            .from("calendar_sync")
            .select("*")
            .eq("appointment_id", appt.id)
            .maybeSingle();

          if (existing) {
            await updateCalendarEvent(accessToken, existing.google_calendar_id, existing.google_event_id, event);
            await supabase
              .from("calendar_sync")
              .update({ last_synced_at: new Date().toISOString(), sync_status: "synced" })
              .eq("id", existing.id);
            results.push({ id: appt.id, action: "updated" });
          } else {
            const created = await createCalendarEvent(accessToken, calendar_id, event);
            await supabase.from("calendar_sync").insert({
              appointment_id: appt.id,
              google_event_id: created.id,
              google_calendar_id: calendar_id,
            });
            results.push({ id: appt.id, action: "created" });
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Unknown error";
          results.push({ id: appt.id, action: "error", error: errorMsg });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: sync, pull, sync_all" }),
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
