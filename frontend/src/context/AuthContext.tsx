import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import type { LoginRequest, RegisterRequest, UserProfileResponse, UpdateProfileRequest, UpdateProfileResponse } from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

interface AuthContextType {
  user: UserProfileResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEditProfileOpen: boolean;
  openEditProfile: () => void;
  closeEditProfile: () => void;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateUserProfile: (data: UpdateProfileRequest) => Promise<UpdateProfileResponse>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [token, setToken] = useState<string | null>(tokenStorage.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);

  const openEditProfile = () => setIsEditProfileOpen(true);
  const closeEditProfile = () => setIsEditProfileOpen(false);

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
    await login({ usernameOrEmail: data.username, password: data.password });
  };

  const logout = () => {
    tokenStorage.removeToken();
    setToken(null);
    setUser(null);
    setIsEditProfileOpen(false);
  };

  const updateUserProfile = async (data: UpdateProfileRequest): Promise<UpdateProfileResponse> => {
    const res = await authApi.updateProfile(data);
    if (res.accessToken) {
      tokenStorage.setToken(res.accessToken);
      setToken(res.accessToken);
    }
    setUser(res.user);
    return res;
  };

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        isEditProfileOpen,
        openEditProfile,
        closeEditProfile,
        login,
        register,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
