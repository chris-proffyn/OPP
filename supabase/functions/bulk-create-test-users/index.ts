// Bulk test user creation — Edge Function.
// Spec: docs/OPP_BULK_TEST_USER_CREATION_IMPLEMENTATION_CHECKLIST.md §4–6, §15.
// Service role: SUPABASE_SERVICE_ROLE_KEY is only from Edge Function env (Supabase secrets);
// never in client bundle or frontend. Do not log password or token.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_USERS_PER_REQUEST = 200;
const MAX_USERS_PER_HOUR_PER_ADMIN = 500;
// Avoid ^ and . (domain had Pcpdev1^.) — Supabase Auth login can fail with those chars.
const TEST_USER_PASSWORD = "Pcptest1!";
const DEFAULT_OPP_LEVEL = 20;

function testUserEmail(n: number): string {
  return `proffyndev+opp${n}@gmail.com`;
}

// Embedded lists for randomised profile (§9); no external API.
// Age ranges match ProfileEditPage / OnboardingPage.
const AGE_RANGES = ["20-29", "30-39", "40-49", "50-59", "60+"];
const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Chris", "Emma", "Daniel", "Lucy",
];
const LAST_NAMES = [
  "Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies",
  "Robinson", "Wright", "Thompson", "Evans", "Walker", "White", "Roberts", "Green",
  "Hughes", "Hall", "Edwards", "Martin", "Turner", "Cooper", "Phillips", "Dev",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Random level within +/- 50% of base, clamped to 1–99. */
function randomLevelAround(base: number): number {
  const spread = 0.5 + Math.random(); // 0.5 to 1.5
  const value = Math.round(base * spread);
  return Math.max(1, Math.min(99, value));
}

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function env"
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

/** Verify JWT and return auth user id (sub claim); 401 if invalid or missing. */
async function authenticate(
  admin: ReturnType<typeof createClient>,
  req: Request
): Promise<{ userId: string } | Response> {
  const token = getBearerToken(req);
  if (!token) {
    return jsonResponse({ error: "Missing or invalid Authorization header" }, 401);
  }
  const { data, error } = await admin.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return jsonResponse(
      { error: "Invalid JWT or missing sub claim" },
      401
    );
  }
  return { userId: data.claims.sub as string };
}

/** Ensure current user is admin (players.role === 'admin'); 403 if not. */
async function requireAdmin(
  admin: ReturnType<typeof createClient>,
  userId: string
): Promise<{ adminPlayerId: string } | Response> {
  const { data: player, error } = await admin
    .from("players")
    .select("id, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    return jsonResponse({ error: "Failed to look up player" }, 500);
  }
  if (!player || player.role !== "admin") {
    return jsonResponse({ error: "Forbidden: admin role required" }, 403);
  }
  return { adminPlayerId: player.id };
}

/** Enforce hourly cap per admin; 429 if over limit. */
async function checkRateLimit(
  admin: ReturnType<typeof createClient>,
  adminPlayerId: string,
  requestedCount: number
): Promise<Response | null> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await admin
    .from("test_user_jobs")
    .select("created_count")
    .eq("created_by_admin_id", adminPlayerId)
    .gte("created_at", oneHourAgo);
  if (error) return jsonResponse({ error: "Rate limit check failed" }, 500);
  const createdLastHour = (rows ?? []).reduce((s, r) => s + (r.created_count ?? 0), 0);
  if (createdLastHour + requestedCount > MAX_USERS_PER_HOUR_PER_ADMIN) {
    return jsonResponse(
      {
        error: "Rate limit exceeded",
        detail: `Max ${MAX_USERS_PER_HOUR_PER_ADMIN} test users per hour per admin`,
      },
      429
    );
  }
  return null;
}

/** In production, require body.confirm_test_users === true. */
function requireProductionConfirmation(body: Record<string, unknown>): Response | null {
  const env = Deno.env.get("ENVIRONMENT") ?? Deno.env.get("NODE_ENV") ?? "";
  if (env.toLowerCase() !== "production") return null;
  if (body?.confirm_test_users === true) return null;
  return jsonResponse(
    {
      error: "Production safeguard: confirm_test_users must be true in request body",
    },
    400
  );
}

type BulkCreateBody = {
  count: number;
  start_n?: number;
  default_opp_level?: number;
  job_notes?: string;
};

function parseRequestBody(body: Record<string, unknown>): BulkCreateBody | Response {
  const count = Number(body?.count);
  if (!Number.isInteger(count) || count < 1 || count > MAX_USERS_PER_REQUEST) {
    return jsonResponse(
      { error: `count must be an integer 1..${MAX_USERS_PER_REQUEST}` },
      400
    );
  }
  const start_n = body?.start_n != null ? Number(body.start_n) : undefined;
  if (start_n !== undefined && (!Number.isInteger(start_n) || start_n < 0)) {
    return jsonResponse({ error: "start_n must be a non-negative integer" }, 400);
  }
  const default_opp_level =
    body?.default_opp_level != null ? Number(body.default_opp_level) : DEFAULT_OPP_LEVEL;
  const job_notes = typeof body?.job_notes === "string" ? body.job_notes : undefined;
  return { count, start_n, default_opp_level, job_notes };
}

/** Allocate N range: from body.start_n or via RPC. Returns { start_n, end_n }. */
async function allocateNRange(
  admin: ReturnType<typeof createClient>,
  count: number,
  startNFromBody: number | undefined
): Promise<{ start_n: number; end_n: number } | Response> {
  if (startNFromBody !== undefined) {
    return { start_n: startNFromBody, end_n: startNFromBody + count - 1 };
  }
  const { data: start_n, error } = await admin.rpc("allocate_test_user_n", {
    p_count: count,
  });
  if (error) {
    return jsonResponse(
      { error: "Failed to allocate N range", detail: error.message },
      500
    );
  }
  if (typeof start_n !== "number") {
    return jsonResponse({ error: "allocate_test_user_n returned invalid value" }, 500);
  }
  return { start_n, end_n: start_n + count - 1 };
}

/** Bootstrap players row for a test user (§9). Idempotent: upsert by user_id so safe to call twice (e.g. if trigger also creates a row); avoids duplicate key errors. Test users are created with completed ITA. */
async function bootstrapTestUser(
  admin: ReturnType<typeof createClient>,
  authUserId: string,
  email: string,
  opts: {
    jobId: string;
    adminPlayerId: string;
    n: number;
    defaultOppLevel: number;
  }
): Promise<{ error?: string }> {
  const displayName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  const level = randomLevelAround(opts.defaultOppLevel);
  const { error } = await admin.from("players").upsert(
    {
      user_id: authUserId,
      email,
      display_name: displayName,
      nickname: displayName,
      full_name: displayName,
      gender: Math.random() < 0.5 ? "m" : "f",
      age_range: pick(AGE_RANGES),
      baseline_rating: level,
      training_rating: level,
      ita_score: level,
      ita_completed_at: nowIso,
      role: "player",
      date_joined: today,
      is_test_user: true, // §12 marking: exclude from analytics by default
      test_user_job_id: opts.jobId,
      created_by_admin_id: opts.adminPlayerId,
      test_user_seq_n: opts.n,
    },
    { onConflict: "user_id" }
  );
  if (error) return { error: error.message };
  return {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const admin = createAdminClient();

    const authResult = await authenticate(admin, req);
    if (authResult instanceof Response) return authResult;
    const { userId } = authResult;

    const adminResult = await requireAdmin(admin, userId);
    if (adminResult instanceof Response) return adminResult;
    const { adminPlayerId } = adminResult;

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      // No body or invalid JSON; required for bulk-create in §6
    }

    const confirmErr = requireProductionConfirmation(body);
    if (confirmErr) return confirmErr;

    const parsed = parseRequestBody(body);
    if (parsed instanceof Response) return parsed;
    const { count, start_n: startNFromBody, default_opp_level: defaultOppLevel, job_notes } = parsed;

    const rateLimitRes = await checkRateLimit(admin, adminPlayerId, count);
    if (rateLimitRes) return rateLimitRes;

    // Create job row (§7)
    const { data: jobRow, error: jobInsertError } = await admin
      .from("test_user_jobs")
      .insert({
        created_by_admin_id: adminPlayerId,
        requested_count: count,
        status: "RUNNING",
        notes: job_notes ?? null,
      })
      .select("id")
      .single();
    if (jobInsertError || !jobRow?.id) {
      return jsonResponse(
        { error: "Failed to create job", detail: jobInsertError?.message },
        500
      );
    }
    const jobId = jobRow.id;
    console.log(JSON.stringify({ event: "bulk_create_job_start", job_id: jobId, requested_count: count }));

    const alloc = await allocateNRange(admin, count, startNFromBody);
    if (alloc instanceof Response) return alloc;
    const { start_n, end_n } = alloc;

    await admin
      .from("test_user_jobs")
      .update({ start_n, end_n })
      .eq("id", jobId);
    console.log(JSON.stringify({ event: "bulk_create_n_allocated", job_id: jobId, start_n, end_n }));

    const errors: Array<{ n: number; email: string; error: string }> = [];
    const emails_created: string[] = [];
    let created_count = 0;

    for (let n = start_n; n <= end_n; n++) {
      const email = testUserEmail(n);
      const { data: userData, error: createError } = await admin.auth.admin.createUser({
        email,
        password: TEST_USER_PASSWORD,
        email_confirm: true,
        user_metadata: {
          is_test_user: true, // §12 marking: auth and players both flagged
          test_user_seq_n: n,
          test_user_job_id: jobId,
        },
      });

      if (createError || !userData?.user?.id) {
        const errMsg = createError?.message ?? "Unknown error";
        errors.push({ n, email, error: errMsg });
        console.log(JSON.stringify({ event: "bulk_create_user_error", job_id: jobId, n, email, error: errMsg }));
        continue;
      }

      const bootstrapResult = await bootstrapTestUser(admin, userData.user.id, email, {
        jobId,
        adminPlayerId,
        n,
        defaultOppLevel,
      });
      if (bootstrapResult.error) {
        errors.push({ n, email, error: bootstrapResult.error });
        console.log(JSON.stringify({ event: "bulk_create_user_error", job_id: jobId, n, email, error: bootstrapResult.error }));
        continue;
      }
      console.log(JSON.stringify({ event: "bulk_create_user_created", job_id: jobId, user_id: userData.user.id, email, n }));
      emails_created.push(email);
      created_count++;
    }

    const status =
      created_count === 0 ? "FAILED" : errors.length > 0 ? "PARTIAL" : "COMPLETED";
    console.log(JSON.stringify({ event: "bulk_create_job_done", job_id: jobId, created_count, error_count: errors.length, status }));
    await admin
      .from("test_user_jobs")
      .update({
        status,
        created_count,
        error_count: errors.length,
        errors_json: errors.length > 0 ? errors : null,
      })
      .eq("id", jobId);

    return jsonResponse({
      job_id: jobId,
      created_count,
      errors,
      emails_created,
      start_n,
      end_n,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: message }, 500);
  }
});
