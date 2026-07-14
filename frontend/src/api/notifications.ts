import client from './client';
import type { PagedResponse } from './posts';

export interface NotificationResponse {
  id: string;
  type: 'CAPTION_WON';
  referencePostId: string;
  read: boolean;
  createdAt: string;
}

export async function getNotifications(
  page = 0,
  size = 10
): Promise<PagedResponse<NotificationResponse>> {
  const response = await client.get<PagedResponse<NotificationResponse>>('/api/notifications', {
    params: { page, size },
  });
  return response.data;
}

export async function markNotificationRead(id: string): Promise<NotificationResponse> {
  const response = await client.post<NotificationResponse>(`/api/notifications/${id}/read`);
  return response.data;
}
