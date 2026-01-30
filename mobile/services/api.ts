import * as SecureStore from 'expo-secure-store';
import { Config } from '../constants/config';

const TOKEN_KEY = 'auth_token';

// Get stored token
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Store token
export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

// Remove token
export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// API request helper
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const url = token
    ? `${Config.API_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${token}`
    : `${Config.API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: (email: string, password: string, role: string = 'patient') =>
    request<{
      access_token: string;
      user: { id: string; email: string; role: string };
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    }),

  login: (email: string, password: string) =>
    request<{
      access_token: string;
      user: { id: string; email: string; role: string };
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<{ id: string; email: string; role: string }>('/api/auth/me'),
};

// Profile API
export const profileApi = {
  check: () =>
    request<{ has_profile: boolean; onboarding_completed: boolean }>(
      '/api/profile/check'
    ),

  get: () =>
    request<{
      id: string;
      stroke_date: string;
      stroke_type: string;
      affected_side: string;
      current_therapies: string[];
      onboarding_completed: boolean;
    }>('/api/profile/'),

  onboarding: (data: {
    stroke_date?: string;
    stroke_type?: string;
    affected_side?: string;
    current_therapies?: string[];
  }) =>
    request<{ id: string; onboarding_completed: boolean }>(
      '/api/profile/onboarding',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
};
