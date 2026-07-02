import { isAxiosError } from 'axios';

export interface ApiError {
  message: string;
  fieldErrors?: Record<string, string>;
}

export function parseApiError(error: unknown): ApiError {
  if (isAxiosError(error)) {
    if (error.response?.data) {
      const data = error.response.data as { message?: string, details?: Record<string, string> };
      
      const message = data.message || error.response.statusText || 'An error occurred';
      const fieldErrors = data.details || undefined;
      
      return { message, fieldErrors };
    }
    return { message: error.message };
  }
  
  if (error instanceof Error) {
    return { message: error.message };
  }
  
  return { message: 'An unknown error occurred' };
}
