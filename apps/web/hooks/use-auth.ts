'use client';

import { useState, useEffect, useCallback } from 'react';
import { login as loginApi, logout as logoutFn, register as registerApi, getStoredUser, isAuthenticated } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
}

interface UseAuthReturn {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; passwordConfirm: string; name: string }) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser && isAuthenticated()) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginApi({ email, password });
    setUser(response.user);
  }, []);

  const register = useCallback(async (data: { email: string; password: string; passwordConfirm: string; name: string }) => {
    const response = await registerApi(data);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    logoutFn();
  }, []);

  return {
    user,
    isLoggedIn: !!user,
    isLoading,
    login,
    register,
    logout,
  };
}
