import client from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatePostRequest {
  imageKey: string;
  title?: string;
  tags?: string[];
}

export interface PostResponse {
  id: string;
  posterId: string;
  posterUsername: string;
  imageKey: string;
  title: string | null;
  status: 'OPEN' | 'SETTLED';
  createdAt: string;
  lockAt: string;
  settledAt: string | null;
  winningCaptionId: string | null;
  tags: string[];
}

export interface FeedItemResponse {
  id: string;
  posterUsername: string;
  imageKey: string;
  title: string | null;
  status: 'OPEN' | 'SETTLED';
  createdAt: string;
  lockAt: string;
  settledAt: string | null;
  winningCaptionId: string | null;
  tags: string[];
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derives a public image URL from an imageKey.
 * Set VITE_S3_BASE_URL in your .env (e.g. https://your-bucket.s3.amazonaws.com)
 * If not set, falls back to proxying through the backend.
 */
export function getImageUrl(imageKey: string): string {
  const base = import.meta.env.VITE_S3_BASE_URL as string | undefined;
  if (base) {
    return `${base.replace(/\/$/, '')}/${imageKey}`;
  }
  // Fallback: serve via backend proxy (if you add one later)
  return `http://localhost:8080/api/images/${imageKey}`;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Creates a new post. Requires a valid JWT (attached automatically by client).
 * Use the objectKey returned by /api/images/presign as imageKey.
 */
export async function createPost(payload: CreatePostRequest): Promise<PostResponse> {
  const response = await client.post<PostResponse>('/api/posts', payload);
  return response.data;
}

/**
 * Fetches the open posts feed (publicly accessible, no auth required).
 * Sorted by soonest lockAt first.
 */
export async function getOpenPosts(
  page = 0,
  size = 10
): Promise<PagedResponse<FeedItemResponse>> {
  const response = await client.get<PagedResponse<FeedItemResponse>>(
    '/api/posts/open',
    { params: { page, size } }
  );
  return response.data;
}

/**
 * Fetches the settled posts feed (publicly accessible, no auth required).
 * Sorted by most recently settled first.
 */
export async function getSettledPosts(
  page = 0,
  size = 10
): Promise<PagedResponse<FeedItemResponse>> {
  const response = await client.get<PagedResponse<FeedItemResponse>>(
    '/api/posts/settled',
    { params: { page, size } }
  );
  return response.data;
}
