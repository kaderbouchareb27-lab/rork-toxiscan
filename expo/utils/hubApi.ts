import { Platform } from 'react-native';
import { compressImageNative, compressImageWeb } from '@/utils/imageCompression';

/**
 * NonToxic Hub API client. Talks to the shared Cloudflare backend
 * (functions/) that owns the community forum. AI moderation and report-based
 * auto-hiding run on that server, so they cannot be bypassed from the device.
 */

const BASE_URL = (process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL ?? '').replace(/\/$/, '');

export type HubPostKind = 'discussion' | 'denunciation';
export type HubVerdictLevel = 'danger' | 'warning' | 'moderation' | 'approuve';
export type HubScanKind = 'product' | 'meal';

export type ModerationCategory =
  | 'none'
  | 'harassment'
  | 'sexual'
  | 'spam'
  | 'medical_misinfo'
  | 'hate'
  | 'other';

export interface HubPost {
  id: string;
  kind: HubPostKind;
  authorId: string;
  authorName: string;
  title: string | null;
  body: string;
  productName: string | null;
  verdictLevel: HubVerdictLevel | null;
  verdictLabel: string | null;
  imageUrl: string | null;
  scanKind: HubScanKind | null;
  likeCount: number;
  commentCount: number;
  reportCount: number;
  createdAt: number;
  likedByMe: boolean;
}

export interface HubComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  isAdmin: boolean;
  createdAt: number;
}

export interface CreatePostInput {
  kind: HubPostKind;
  authorId: string;
  authorName: string;
  title?: string | null;
  body: string;
  productName?: string | null;
  verdictLevel?: HubVerdictLevel | null;
  verdictLabel?: string | null;
  imageUrl?: string | null;
  scanKind?: HubScanKind | null;
}

/** Thrown when the server's AI moderation blocks a post or comment. */
export class HubModerationError extends Error {
  category: ModerationCategory;
  constructor(category: ModerationCategory) {
    super(`Content blocked by moderation: ${category}`);
    this.name = 'HubModerationError';
    this.category = category;
  }
}

function ensureBaseUrl(): string {
  if (!BASE_URL) {
    throw new Error('Hub backend URL is not configured (EXPO_PUBLIC_RORK_FUNCTIONS_URL).');
  }
  return BASE_URL;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const base = ensureBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
  try {
    const res = await fetch(`${base}${path}`, {
      method: options.method ?? 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (res.status === 422) {
      const data = (await res.json().catch(() => ({}))) as { category?: ModerationCategory };
      throw new HubModerationError(data.category ?? 'other');
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Hub request failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPosts(
  filter: 'all' | 'denunciation' | 'discussion',
  userId: string,
): Promise<HubPost[]> {
  const data = await request<{ posts: HubPost[] }>(
    `/posts?filter=${filter}&userId=${encodeURIComponent(userId)}`,
  );
  return data.posts;
}

export async function fetchPostDetail(
  postId: string,
  userId: string,
): Promise<{ post: HubPost; comments: HubComment[] }> {
  return request<{ post: HubPost; comments: HubComment[] }>(
    `/posts/${encodeURIComponent(postId)}?userId=${encodeURIComponent(userId)}`,
  );
}

export async function createPost(input: CreatePostInput): Promise<HubPost> {
  // Moderation adds an AI round-trip — allow extra time.
  const data = await request<{ post: HubPost }>(`/posts`, {
    method: 'POST',
    body: input,
    timeoutMs: 30000,
  });
  return data.post;
}

export async function createComment(
  postId: string,
  input: {
    authorId: string;
    authorName: string;
    body: string;
    asAdmin?: boolean;
    adminSecret?: string;
  },
): Promise<{ comment: HubComment; commentCount: number }> {
  return request<{ comment: HubComment; commentCount: number }>(
    `/posts/${encodeURIComponent(postId)}/comments`,
    { method: 'POST', body: input, timeoutMs: 30000 },
  );
}

/** Admin-only: permanently delete any comment. Server validates the admin secret. */
export async function deleteComment(
  commentId: string,
  adminSecret: string,
): Promise<{ ok: boolean; postId: string; commentCount: number }> {
  return request<{ ok: boolean; postId: string; commentCount: number }>(
    `/comments/${encodeURIComponent(commentId)}/delete`,
    { method: 'POST', body: { adminSecret } },
  );
}

/** Checks an admin secret against the server before unlocking admin mode on a device. */
export async function verifyAdminSecret(adminSecret: string): Promise<boolean> {
  const data = await request<{ valid: boolean }>(`/admin/verify`, {
    method: 'POST',
    body: { adminSecret },
  });
  return data.valid === true;
}

export async function reactToPost(
  postId: string,
  userId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  return request<{ liked: boolean; likeCount: number }>(
    `/posts/${encodeURIComponent(postId)}/react`,
    { method: 'POST', body: { userId } },
  );
}

export async function reportPost(
  postId: string,
  reporterId: string,
): Promise<{ ok: boolean; reportCount: number; hidden: boolean }> {
  return request<{ ok: boolean; reportCount: number; hidden: boolean }>(
    `/posts/${encodeURIComponent(postId)}/report`,
    { method: 'POST', body: { reporterId } },
  );
}

export async function reportComment(
  commentId: string,
  reporterId: string,
): Promise<{ ok: boolean; reportCount: number; hidden: boolean }> {
  return request<{ ok: boolean; reportCount: number; hidden: boolean }>(
    `/comments/${encodeURIComponent(commentId)}/report`,
    { method: 'POST', body: { reporterId } },
  );
}

/**
 * Turns whatever image reference a scan holds (local file URI, data URL, or remote
 * URL) into a portable string other members can load. Local file URIs are
 * compressed to a small base64 data URL; data/http URLs are returned as-is.
 */
export async function buildPortableScanImage(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith('data:') || uri.startsWith('http')) return uri;
  try {
    const base64 =
      Platform.OS === 'web'
        ? await compressImageWeb(uri, 480)
        : await compressImageNative(uri, 480, 0.45);
    return `data:image/jpeg;base64,${base64}`;
  } catch (e) {
    console.log('[hubApi] Could not build portable scan image:', e);
    return null;
  }
}
