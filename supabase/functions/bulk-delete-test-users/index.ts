// Bulk delete test users — Edge Function.
// Spec: docs/OPP_BULK_TEST_USER_CREATION_IMPLEMENTATION_CHECKLIST.md §11.
// Service role: SUPABASE_SERVICE_ROLE_KEY from Edge Function env only; never in client or logs.
// Request: job_id (uuid) | n_range: { start_n, end_n } | delete_all_test_users: true.
// Resolves test users, deletes players (cascade) then Auth user for each.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    return jsonResponse({ error: "Invalid JWT or missing sub claim" }, 401);
  }
  return { userId: data.claims.sub as string };
}

async function requireAdmin(
  admin: ReturnType<typeof createClient>,
  userId: string
): Promise<Response | null> {
  const { data: player, error } = await admin
    .from("players")
    .select("id, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !player || player.role !== "admin") {
    return jsonResponse({ error: "Forbidden: admin role required" }, 403);
  }
  return null;
}

type DeleteTarget =
  | { mode: "job_id"; job_id: string }
  | { mode: "n_range"; start_n: number; end_n: number }
  | { mode: "all" };

function parseBody(body: Record<string, unknown>): DeleteTarget | Response {
  if (body?.delete_all_test_users === true) {
    return { mode: "all" };
  }
  if (typeof body?.job_id === "string" && body.job_id.length > 0) {
    return { mode: "job_id", job_id: body.job_id };
  }
  const r = body?.n_range as Record<string, unknown> | undefined;
  if (r && typeof r.start_n === "number" && typeof r.end_n === "number") {
    if (r.start_n > r.end_n) {
      return jsonResponse({ error: "n_range.start_n must be <= end_n" }, 400);
    }
    return { mode: "n_range", start_n: r.start_n, end_n: r.end_n };
  }
  return jsonResponse(
    {
      error:
        "Request body must include one of: job_id (uuid), n_range: { start_n, end_n }, or delete_all_test_users: true",
    },
    400
  );
}

/** Fetch player id + user_id for test users matching the target. */
async function resolveTestUsers(
  admin: ReturnType<typeof createClient>,
  target: DeleteTarget
): Promise<{ id: string; user_id: string }[]> {
  let query = admin
    .from("players")
    .select("id, user_id")
    .eq("is_test_user", true);
  if (target.mode === "job_id") {
    query = query.eq("test_user_job_id", target.job_id);
  } else if (target.mode === "n_range") {
    query = query
      .gte("test_user_seq_n", target.start_n)
      .lte("test_user_seq_n", target.end_n);
  }
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as { id: string; user_id: string }[];
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
    const adminErr = await requireAdmin(admin, authResult.userId);
    if (adminErr) return adminErr;

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const target = parseBody(body);
    if (target instanceof Response) return target;

    const toDelete = await resolveTestUsers(admin, target);
    const errors: Array<{ user_id: string; error: string }> = [];
    let deleted_count = 0;

    for (const row of toDelete) {
      try {
        const { error: delPlayerError } = await admin
          .from("players")
          .delete()
          .eq("id", row.id);
        if (delPlayerError) {
          errors.push({ user_id: row.user_id, error: delPlayerError.message });
          continue;
        }
        const { error: delAuthError } = await admin.auth.admin.deleteUser(row.user_id);
        if (delAuthError) {
          errors.push({ user_id: row.user_id, error: delAuthError.message });
          continue;
        }
        deleted_count++;
      } catch (e) {
        errors.push({
          user_id: row.user_id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return jsonResponse({ deleted_count, errors });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: message }, 500);
  }
});
