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
  winningCaptionText: string | null;
  winningCaptionAuthor: string | null;
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
  winningCaptionText: string | null;
  winningCaptionAuthor: string | null;
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


export interface CaptionRequest {
  text: string;
}

export interface CaptionResponse {
  id: string;
  text: string;
  authorUsername: string;
  createdAt: string;
  /** Net vote score (SUM of all votes). Always present, never null. */
  score: number;
  /** The authenticated caller's current vote: 1, -1, or null (not voted / not logged in). */
  myVote: 1 | -1 | null;
}

export interface VoteRequest {
  /** 1 = upvote, -1 = downvote, 0 = remove existing vote */
  value: 1 | -1 | 0;
}

export interface VoteResponse {
  captionId: string;
  netScore: number;
  myVote: 1 | -1 | null;
}

export async function getPostById(id: string) {
  const response = await client.get<PostResponse>(`/api/posts/${id}`);
  return response.data;
}

/**
 * Fetches captions for a post (paginated, sorted by top/new/old).
 */
export async function getCaptions(
  postId: string,
  sort = 'new',
  page = 0,
  size = 10
): Promise<PagedResponse<CaptionResponse>> {
  const response = await client.get<PagedResponse<CaptionResponse>>(
    `/api/posts/${postId}/captions`,
    { params: { sort, page, size } }
  );
  return response.data;
}

/**
 * Submits a caption for a post.
 */
export async function submitCaption(
  postId: string,
  payload: CaptionRequest
): Promise<CaptionResponse> {
  const response = await client.post<CaptionResponse>(
    `/api/posts/${postId}/captions`,
    payload
  );
  return response.data;
}

/**
 * Casts, changes, or removes a vote on a caption.
 * value: 1 = upvote | -1 = downvote | 0 = remove vote
 */
export async function voteOnCaption(
  captionId: string,
  payload: VoteRequest
): Promise<VoteResponse> {
  const response = await client.post<VoteResponse>(
    `/api/captions/${captionId}/vote`,
    payload
  );
  return response.data;
}

/**
 * Manually selects a winning caption for a post. Owner only.
 */
export async function selectWinner(
  postId: string,
  captionId: string
): Promise<PostResponse> {
  const response = await client.post<PostResponse>(
    `/api/posts/${postId}/select-winner`,
    { captionId }
  );
  return response.data;
}

export async function deletePost(id: string): Promise<void> {
  await client.delete(`/api/posts/${id}`);
}

export async function deleteCaption(id: string): Promise<void> {
  await client.delete(`/api/captions/${id}`);
}