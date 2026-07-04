import client from './client';

export interface RegisterRequest {
  username: string;
  email: string;
  password?: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password?: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
}

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];


export interface UserProfileResponse {
  id: string;
  username: string;
  email: string;
  role: UserRole | string;
  banned: boolean;
  createdAt: string;
}

export const authApi = {
  // Backend returns 201 Created with Void body for register
  register: async (data: RegisterRequest): Promise<void> => {
    await client.post('/api/auth/register', data);
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await client.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<UserProfileResponse> => {
    const response = await client.get<UserProfileResponse>('/api/auth/me');
    return response.data;
  }
};
