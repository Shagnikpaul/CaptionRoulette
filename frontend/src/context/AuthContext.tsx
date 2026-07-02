import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import type { LoginRequest, RegisterRequest, UserProfileResponse } from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

interface AuthContextType {
  user: UserProfileResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [token, setToken] = useState<string | null>(tokenStorage.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUser = useCallback(async () => {
    try {
      const userProfile = await authApi.getCurrentUser();
      setUser(userProfile);
    } catch (error) {
      console.error("Failed to fetch user profile", error);
      tokenStorage.removeToken();
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        await fetchUser();
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token, fetchUser]);

  const login = async (data: LoginRequest) => {
    const response = await authApi.login(data);
    tokenStorage.setToken(response.accessToken);
    setToken(response.accessToken);
    await fetchUser();
  };

  const register = async (data: RegisterRequest) => {
    await authApi.register(data);
    // Auto-login since register doesn't return a token anymore based on our finding
    await login({ usernameOrEmail: data.username, password: data.password });
  };

  const logout = () => {
    tokenStorage.removeToken();
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
