import client from './client';
import type { FeedItemResponse, PagedResponse } from './posts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchUser {
  username: string;
  /** Raw S3 object key, or null — show a placeholder avatar when null */
  profileImage: string | null;
}

export interface SearchResult {
  /** Tags are already prefixed with '#' by the backend */
  tags: string[];
  users: SearchUser[];
}

export interface UserProfile {
  username: string;
  /** Raw S3 object key, or null */
  profileImage: string | null;
  /** ISO-8601 local date-time string */
  joinedAt: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Global search — returns up to 10 matching tags and 10 matching users.
 * Empty/blank q → both arrays are empty (never throws for empty results).
 */
export async function searchGlobal(q: string): Promise<SearchResult> {
  const response = await client.get<SearchResult>('/api/search', {
    params: { q },
  });
  return response.data;
}

/**
 * Fetches a paginated list of posts for a given tag.
 * tagName should be WITHOUT the '#' prefix.
 * Throws with status 404 if the tag does not exist.
 */
export async function getTagPosts(
  tagName: string,
  page = 0,
  size = 10
): Promise<PagedResponse<FeedItemResponse>> {
  const response = await client.get<PagedResponse<FeedItemResponse>>(
    `/api/tags/${encodeURIComponent(tagName)}/posts`,
    { params: { page, size } }
  );
  return response.data;
}

/**
 * Fetches a user's public profile.
 * Throws with status 404 if the user does not exist.
 */
export async function getUserProfile(username: string): Promise<UserProfile> {
  const response = await client.get<UserProfile>(
    `/api/users/${encodeURIComponent(username)}`
  );
  return response.data;
}

/**
 * Fetches a paginated list of posts created by the given user.
 * Throws with status 404 if the user does not exist.
 */
export async function getUserPosts(
  username: string,
  page = 0,
  size = 12
): Promise<PagedResponse<FeedItemResponse>> {
  const response = await client.get<PagedResponse<FeedItemResponse>>(
    `/api/users/${encodeURIComponent(username)}/posts`,
    { params: { page, size } }
  );
  return response.data;
}
