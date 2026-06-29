// functions/index.ts — NonToxic Hub backend entrypoint.
//
// A vanilla Cloudflare Worker that owns the public API and runs AI moderation
// (in the Worker, where outbound fetch is guaranteed) BEFORE forwarding writes
// to the global Forum Durable Object. Reads are forwarded straight through.

import { moderateText } from "./moderation";

export { Forum } from "./forum";

type Env = {
  DO: Fetcher;
  EXPO_PUBLIC_OPEN_AI?: string;
  ADMIN_SECRET?: string;
};

// True only when a real admin secret is configured AND the caller sent the exact match.
function isValidAdmin(env: Env, secret: unknown): boolean {
  const configured = (env.ADMIN_SECRET ?? "").trim();
  if (!configured) return false;
  return typeof secret === "string" && secret === configured;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

function json(payload: unknown, status = 200): Response {
  return withCors(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

// Dispatch into the single global Forum DO.
function forumFetch(env: Env, pathWithSearch: string, init?: { method?: string; body?: string }): Promise<Response> {
  const req = new Request(`https://internal${pathWithSearch}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Rork-DO-Class": "Forum",
      "X-Rork-DO-Id": "global",
    },
    body: init?.body,
  });
  return env.DO.fetch(req);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path === "/ping") {
      return json({ ok: true, service: "nontoxic-hub", now: new Date().toISOString() });
    }

    try {
      // ---- Reads: forward straight to the Forum DO ----
      if (method === "GET" && (path === "/posts" || /^\/posts\/[^/]+$/.test(path))) {
        const res = await forumFetch(env, path + url.search);
        return withCors(res);
      }

      // ---- Create a post (free discussion OR scan denunciation) — moderated ----
      if (method === "POST" && path === "/posts") {
        const body = (await request.json()) as Record<string, unknown>;
        const moderationInput = [
          typeof body.title === "string" ? body.title : "",
          typeof body.body === "string" ? body.body : "",
        ]
          .filter(Boolean)
          .join("\n");

        // Denunciations may carry an empty note; only moderate when there is text.
        if (moderationInput.trim().length > 0) {
          const verdict = await moderateText(
            moderationInput,
            body.kind === "denunciation" ? "A product denunciation post" : "A free discussion topic",
            env,
          );
          if (!verdict.allowed) {
            return json({ error: "blocked", category: verdict.category }, 422);
          }
        }

        const res = await forumFetch(env, "/posts", {
          method: "POST",
          body: JSON.stringify(body),
        });
        return withCors(res);
      }

      // ---- Admin: verify the secret (used to unlock admin mode on a device) ----
      if (method === "POST" && path === "/admin/verify") {
        const body = (await request.json()) as Record<string, unknown>;
        return json({ valid: isValidAdmin(env, body.adminSecret) });
      }

      // ---- Comment on a post — moderated (admin replies skip moderation) ----
      const commentsMatch = path.match(/^\/posts\/([^/]+)\/comments$/);
      if (method === "POST" && commentsMatch) {
        const body = (await request.json()) as Record<string, unknown>;
        const wantsAdmin = body.asAdmin === true;
        const admin = wantsAdmin && isValidAdmin(env, body.adminSecret);
        if (wantsAdmin && !admin) {
          return json({ error: "forbidden" }, 403);
        }

        const text = typeof body.body === "string" ? body.body : "";
        // Official ToxiScan replies are trusted and bypass AI moderation.
        if (!admin && text.trim().length > 0) {
          const verdict = await moderateText(text, "A comment on a forum post", env);
          if (!verdict.allowed) {
            return json({ error: "blocked", category: verdict.category }, 422);
          }
        }

        // Never forward the raw secret to the DO; pass a clean isAdmin flag instead.
        const forwardBody = {
          authorId: body.authorId,
          authorName: body.authorName,
          body: body.body,
          isAdmin: admin,
        };
        const res = await forumFetch(env, path, {
          method: "POST",
          body: JSON.stringify(forwardBody),
        });
        return withCors(res);
      }

      // ---- Admin: hard-delete any comment ----
      const deleteCommentMatch = path.match(/^\/comments\/([^/]+)\/delete$/);
      if (method === "POST" && deleteCommentMatch) {
        const body = (await request.json()) as Record<string, unknown>;
        if (!isValidAdmin(env, body.adminSecret)) {
          return json({ error: "forbidden" }, 403);
        }
        const res = await forumFetch(env, path, {
          method: "POST",
          body: JSON.stringify({}),
        });
        return withCors(res);
      }

      // ---- Reactions & reports: no moderation, forward with body ----
      if (
        method === "POST" &&
        (/^\/posts\/[^/]+\/react$/.test(path) ||
          /^\/posts\/[^/]+\/report$/.test(path) ||
          /^\/comments\/[^/]+\/report$/.test(path))
      ) {
        const rawBody = await request.text();
        const res = await forumFetch(env, path, { method: "POST", body: rawBody });
        return withCors(res);
      }

      return json({ error: "not_found" }, 404);
    } catch (e) {
      console.error("[entrypoint] error", e);
      return json({ error: "server_error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
