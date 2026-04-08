import { apiClient } from './api-client';

interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

interface LoginResponse {
  accessToken: string;
  user: User;
}

interface RegisterRequest {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
}

interface RegisterResponse {
  accessToken: string;
  user: User;
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    '/auth/login',
    credentials,
  );
  const { accessToken, user } = response;
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
  return response;
}

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/auth/register', data);
  const { accessToken, user } = response;
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
  return response;
}

export async function verifyIdentity(email: string, name: string): Promise<{ verified: boolean }> {
  return apiClient.post('/auth/verify-identity', { email, name });
}

export async function resetPassword(data: {
  email: string;
  name: string;
  newPassword: string;
  newPasswordConfirm: string;
}): Promise<void> {
  return apiClient.post('/auth/reset-password', data);
}

export function logout(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export function getStoredUser(): { id: string; email: string; name: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
}
