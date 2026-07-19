import client from './client';

export interface ReportRequest {
  targetType: 'POST' | 'CAPTION';
  targetId: string;
  reason: string;
}

export interface ReportResponse {
  id: string;
  targetType: 'POST' | 'CAPTION';
  targetId: string;
  reporterUsername: string;
  reason: string;
  status: 'OPEN';
  createdAt: string;
}

export async function submitReport(
  targetType: 'POST' | 'CAPTION',
  targetId: string,
  reason: string
): Promise<ReportResponse> {
  const response = await client.post<ReportResponse>('/api/reports', {
    targetType,
    targetId,
    reason,
  });
  return response.data;
}
