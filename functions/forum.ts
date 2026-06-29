// Forum — a single global Durable Object that owns the whole NonToxic Hub:
// posts (free discussions + scan denunciations), comments, reactions (likes)
// and reports. Dispatched as Forum / "global" from the entrypoint.
//
// AI moderation already ran in the Worker before any insert reaches here, so
// this object is pure storage + the report/auto-hide rule.

import { DurableObject } from "cloudflare:workers";

// A post is auto-hidden once this many DISTINCT members have reported it.
const REPORT_HIDE_THRESHOLD = 3;
// Max posts returned in a feed page.
const FEED_LIMIT = 60;

type PostKind = "discussion" | "denunciation";
type VerdictLevel = "danger" | "warning" | "moderation" | "approuve";
type ScanKind = "product" | "meal";

interface PostRow {
  id: string;
  kind: PostKind;
  author_id: string;
  author_name: string;
  title: string | null;
  body: string;
  product_name: string | null;
  verdict_level: string | null;
  verdict_label: string | null;
  image_url: string | null;
  scan_kind: string | null;
  like_count: number;
  comment_count: number;
  report_count: number;
  hidden: number;
  created_at: number;
}

interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  body: string;
  is_admin: number;
  report_count: number;
  hidden: number;
  created_at: number;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function serializePost(row: PostRow, likedByMe: boolean) {
  return {
    id: row.id,
    kind: row.kind,
    authorId: row.author_id,
    authorName: row.author_name,
    title: row.title,
    body: row.body,
    productName: row.product_name,
    verdictLevel: row.verdict_level as VerdictLevel | null,
    verdictLabel: row.verdict_label,
    imageUrl: row.image_url,
    scanKind: row.scan_kind as ScanKind | null,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    reportCount: row.report_count,
    createdAt: row.created_at,
    likedByMe,
  };
}

function serializeComment(row: CommentRow) {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    isAdmin: row.is_admin === 1,
    createdAt: row.created_at,
  };
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class Forum extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    const sql = this.ctx.storage.sql;
    sql.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        title TEXT,
        body TEXT NOT NULL,
        product_name TEXT,
        verdict_level TEXT,
        verdict_label TEXT,
        image_url TEXT,
        scan_kind TEXT,
        like_count INTEGER NOT NULL DEFAULT 0,
        comment_count INTEGER NOT NULL DEFAULT 0,
        report_count INTEGER NOT NULL DEFAULT 0,
        hidden INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    sql.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        body TEXT NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 0,
        report_count INTEGER NOT NULL DEFAULT 0,
        hidden INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
    // Migration for forums created before admin replies existed.
    try {
      sql.exec("ALTER TABLE comments ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
    } catch {
      // Column already exists — nothing to do.
    }
    sql.exec(`
      CREATE TABLE IF NOT EXISTS reactions (
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (post_id, user_id)
      )
    `);
    sql.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        reporter_id TEXT NOT NULL,
        reason TEXT,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (target_type, target_id, reporter_id)
      )
    `);
  }

  private get sql() {
    return this.ctx.storage.sql;
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (method === "GET" && path === "/posts") {
        return this.listPosts(url);
      }
      const postMatch = path.match(/^\/posts\/([^/]+)$/);
      if (method === "GET" && postMatch) {
        return this.getPost(postMatch[1], url);
      }
      if (method === "POST" && path === "/posts") {
        return await this.createPost(request);
      }
      const commentsMatch = path.match(/^\/posts\/([^/]+)\/comments$/);
      if (method === "POST" && commentsMatch) {
        return await this.createComment(commentsMatch[1], request);
      }
      const reactMatch = path.match(/^\/posts\/([^/]+)\/react$/);
      if (method === "POST" && reactMatch) {
        return await this.toggleReaction(reactMatch[1], request);
      }
      const reportPostMatch = path.match(/^\/posts\/([^/]+)\/report$/);
      if (method === "POST" && reportPostMatch) {
        return await this.report("post", reportPostMatch[1], request);
      }
      const reportCommentMatch = path.match(/^\/comments\/([^/]+)\/report$/);
      if (method === "POST" && reportCommentMatch) {
        return await this.report("comment", reportCommentMatch[1], request);
      }
      const deleteCommentMatch = path.match(/^\/comments\/([^/]+)\/delete$/);
      if (method === "POST" && deleteCommentMatch) {
        return await this.deleteComment(deleteCommentMatch[1]);
      }
      return jsonResponse({ error: "not_found" }, 404);
    } catch (e) {
      console.error("[Forum] handler error", e);
      return jsonResponse({ error: "server_error" }, 500);
    }
  }

  private likedPostIds(userId: string, postIds: string[]): Set<string> {
    if (!userId || postIds.length === 0) return new Set();
    const placeholders = postIds.map(() => "?").join(",");
    const rows = this.sql
      .exec<{ post_id: string }>(
        `SELECT post_id FROM reactions WHERE user_id = ? AND post_id IN (${placeholders})`,
        userId,
        ...postIds,
      )
      .toArray();
    return new Set(rows.map((r) => r.post_id));
  }

  private listPosts(url: URL): Response {
    const filter = url.searchParams.get("filter") ?? "all";
    const userId = url.searchParams.get("userId") ?? "";

    let where = "WHERE hidden = 0";
    if (filter === "denunciation") where += " AND kind = 'denunciation'";
    else if (filter === "discussion") where += " AND kind = 'discussion'";

    const rows = this.sql
      .exec<PostRow>(
        `SELECT * FROM posts ${where} ORDER BY created_at DESC LIMIT ?`,
        FEED_LIMIT,
      )
      .toArray();

    const liked = this.likedPostIds(userId, rows.map((r) => r.id));
    return jsonResponse({ posts: rows.map((r) => serializePost(r, liked.has(r.id))) });
  }

  private getPost(id: string, url: URL): Response {
    const userId = url.searchParams.get("userId") ?? "";
    const row = this.sql.exec<PostRow>("SELECT * FROM posts WHERE id = ?", id).toArray()[0];
    if (!row || row.hidden === 1) {
      return jsonResponse({ error: "not_found" }, 404);
    }
    const liked = this.likedPostIds(userId, [id]);
    const comments = this.sql
      .exec<CommentRow>(
        "SELECT * FROM comments WHERE post_id = ? AND hidden = 0 ORDER BY created_at ASC",
        id,
      )
      .toArray();
    return jsonResponse({
      post: serializePost(row, liked.has(id)),
      comments: comments.map(serializeComment),
    });
  }

  private async createPost(request: Request): Promise<Response> {
    const b = (await request.json()) as Record<string, unknown>;
    const kind = b.kind === "denunciation" ? "denunciation" : "discussion";
    const authorId = String(b.authorId ?? "").slice(0, 80);
    const authorName = String(b.authorName ?? "").slice(0, 60) || "Anonyme";
    const title = b.title != null ? String(b.title).slice(0, 140) : null;
    const body = String(b.body ?? "").slice(0, 5000);

    if (!authorId) return jsonResponse({ error: "missing_author" }, 400);
    if (kind === "discussion" && body.trim().length === 0) {
      return jsonResponse({ error: "empty_body" }, 400);
    }

    const id = newId("post");
    const now = Date.now();
    this.sql.exec(
      `INSERT INTO posts (id, kind, author_id, author_name, title, body, product_name, verdict_level, verdict_label, image_url, scan_kind, like_count, comment_count, report_count, hidden, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?)`,
      id,
      kind,
      authorId,
      authorName,
      title,
      body,
      b.productName != null ? String(b.productName).slice(0, 160) : null,
      b.verdictLevel != null ? String(b.verdictLevel).slice(0, 20) : null,
      b.verdictLabel != null ? String(b.verdictLabel).slice(0, 40) : null,
      b.imageUrl != null ? String(b.imageUrl).slice(0, 2_000_000) : null,
      b.scanKind != null ? String(b.scanKind).slice(0, 20) : null,
      now,
    );

    const row = this.sql.exec<PostRow>("SELECT * FROM posts WHERE id = ?", id).toArray()[0];
    return jsonResponse({ post: serializePost(row, false) }, 201);
  }

  private async createComment(postId: string, request: Request): Promise<Response> {
    const post = this.sql.exec<PostRow>("SELECT * FROM posts WHERE id = ?", postId).toArray()[0];
    if (!post || post.hidden === 1) return jsonResponse({ error: "not_found" }, 404);

    const b = (await request.json()) as Record<string, unknown>;
    // The Worker only sets isAdmin after validating the admin secret, so the DO can trust it.
    const isAdmin = b.isAdmin === true;
    const authorId = isAdmin ? "admin_toxiscan" : String(b.authorId ?? "").slice(0, 80);
    const authorName = isAdmin
      ? "Équipe ToxiScan"
      : String(b.authorName ?? "").slice(0, 60) || "Anonyme";
    const body = String(b.body ?? "").slice(0, 3000);
    if (!authorId) return jsonResponse({ error: "missing_author" }, 400);
    if (body.trim().length === 0) return jsonResponse({ error: "empty_body" }, 400);

    const id = newId("cmt");
    const now = Date.now();
    this.sql.exec(
      `INSERT INTO comments (id, post_id, author_id, author_name, body, is_admin, report_count, hidden, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`,
      id,
      postId,
      authorId,
      authorName,
      body,
      isAdmin ? 1 : 0,
      now,
    );
    this.sql.exec(
      "UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?",
      postId,
    );

    const row = this.sql.exec<CommentRow>("SELECT * FROM comments WHERE id = ?", id).toArray()[0];
    const updated = this.sql.exec<PostRow>("SELECT comment_count FROM posts WHERE id = ?", postId).toArray()[0];
    return jsonResponse(
      { comment: serializeComment(row), commentCount: updated.comment_count },
      201,
    );
  }

  // Admin-only hard delete (the Worker validates the admin secret first). Removes the
  // comment entirely and keeps the parent post's comment_count in sync.
  private deleteComment(commentId: string): Response {
    const row = this.sql
      .exec<CommentRow>("SELECT * FROM comments WHERE id = ?", commentId)
      .toArray()[0];
    if (!row) return jsonResponse({ error: "not_found" }, 404);

    this.sql.exec("DELETE FROM comments WHERE id = ?", commentId);
    this.sql.exec(
      "UPDATE posts SET comment_count = MAX(0, comment_count - 1) WHERE id = ?",
      row.post_id,
    );
    const updated = this.sql
      .exec<PostRow>("SELECT comment_count FROM posts WHERE id = ?", row.post_id)
      .toArray()[0];
    return jsonResponse({
      ok: true,
      postId: row.post_id,
      commentCount: updated?.comment_count ?? 0,
    });
  }

  private async toggleReaction(postId: string, request: Request): Promise<Response> {
    const post = this.sql.exec<PostRow>("SELECT * FROM posts WHERE id = ?", postId).toArray()[0];
    if (!post || post.hidden === 1) return jsonResponse({ error: "not_found" }, 404);

    const b = (await request.json()) as Record<string, unknown>;
    const userId = String(b.userId ?? "").slice(0, 80);
    if (!userId) return jsonResponse({ error: "missing_user" }, 400);

    const existing = this.sql
      .exec<{ user_id: string }>(
        "SELECT user_id FROM reactions WHERE post_id = ? AND user_id = ?",
        postId,
        userId,
      )
      .toArray();

    let liked: boolean;
    if (existing.length > 0) {
      this.sql.exec("DELETE FROM reactions WHERE post_id = ? AND user_id = ?", postId, userId);
      this.sql.exec(
        "UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id = ?",
        postId,
      );
      liked = false;
    } else {
      this.sql.exec(
        "INSERT INTO reactions (post_id, user_id, created_at) VALUES (?, ?, ?)",
        postId,
        userId,
        Date.now(),
      );
      this.sql.exec("UPDATE posts SET like_count = like_count + 1 WHERE id = ?", postId);
      liked = true;
    }

    const updated = this.sql.exec<PostRow>("SELECT like_count FROM posts WHERE id = ?", postId).toArray()[0];
    return jsonResponse({ liked, likeCount: updated.like_count });
  }

  private async report(
    targetType: "post" | "comment",
    targetId: string,
    request: Request,
  ): Promise<Response> {
    const table = targetType === "post" ? "posts" : "comments";
    const target = this.sql.exec(`SELECT id FROM ${table} WHERE id = ?`, targetId).toArray()[0];
    if (!target) return jsonResponse({ error: "not_found" }, 404);

    const b = (await request.json()) as Record<string, unknown>;
    const reporterId = String(b.reporterId ?? "").slice(0, 80);
    const reason = b.reason != null ? String(b.reason).slice(0, 200) : null;
    if (!reporterId) return jsonResponse({ error: "missing_reporter" }, 400);

    // Dedup: one report per member per target (INSERT OR IGNORE on the PK).
    this.sql.exec(
      "INSERT OR IGNORE INTO reports (target_type, target_id, reporter_id, reason, created_at) VALUES (?, ?, ?, ?, ?)",
      targetType,
      targetId,
      reporterId,
      reason,
      Date.now(),
    );

    const distinct = this.sql
      .exec<{ c: number }>(
        "SELECT COUNT(*) AS c FROM reports WHERE target_type = ? AND target_id = ?",
        targetType,
        targetId,
      )
      .toArray()[0].c;

    const hidden = distinct >= REPORT_HIDE_THRESHOLD ? 1 : 0;
    this.sql.exec(
      `UPDATE ${table} SET report_count = ?, hidden = ? WHERE id = ?`,
      distinct,
      hidden,
      targetId,
    );

    return jsonResponse({ ok: true, reportCount: distinct, hidden: hidden === 1 });
  }
}
