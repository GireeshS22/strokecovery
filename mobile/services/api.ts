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
  register: (email: string, password: string, role: string = 'patient', name?: string) =>
    request<{
      access_token: string;
      user: { id: string; email: string; name: string | null; role: string };
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role, name }),
    }),

  login: (email: string, password: string) =>
    request<{
      access_token: string;
      user: { id: string; email: string; name: string | null; role: string };
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<{ id: string; email: string; name: string | null; role: string }>('/api/auth/me'),

  updateMe: (data: { name?: string }) =>
    request<{ id: string; email: string; name: string | null; role: string }>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
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

  update: (data: {
    stroke_date?: string;
    stroke_type?: string;
    affected_side?: string;
    current_therapies?: string[];
  }) =>
    request<{
      id: string;
      stroke_date: string | null;
      stroke_type: string | null;
      affected_side: string | null;
      current_therapies: string[] | null;
      onboarding_completed: boolean;
    }>('/api/profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Medicine types
export interface Medicine {
  id: string;
  patient_id: string;
  name: string;
  dosage: string | null;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  timing: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MedicineTodayItem {
  log_id: string | null;
  medicine_id: string;
  medicine_name: string;
  dosage: string | null;
  time_of_day: string;
  timing: string;
  scheduled_time: string;
  status: string;
  taken_at: string | null;
}

export interface MedicineTodayResponse {
  date: string;
  morning: MedicineTodayItem[];
  afternoon: MedicineTodayItem[];
  night: MedicineTodayItem[];
  total_pending: number;
  total_taken: number;
  total_missed: number;
}

export interface MedicineLog {
  id: string;
  medicine_id: string;
  scheduled_time: string;
  time_of_day: string;
  taken_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

// Medicines API
export const medicinesApi = {
  list: (includeInactive: boolean = false) =>
    request<Medicine[]>(`/api/medicines?include_inactive=${includeInactive}`),

  get: (id: string) =>
    request<Medicine>(`/api/medicines/${id}`),

  create: (data: {
    name: string;
    dosage?: string;
    morning: boolean;
    afternoon: boolean;
    night: boolean;
    timing: string;
    start_date: string;
    end_date?: string;
    notes?: string;
  }) =>
    request<Medicine>('/api/medicines/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: {
    name?: string;
    dosage?: string;
    morning?: boolean;
    afternoon?: boolean;
    night?: boolean;
    timing?: string;
    start_date?: string;
    end_date?: string;
    notes?: string;
    is_active?: boolean;
  }) =>
    request<Medicine>(`/api/medicines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/medicines/${id}`, {
      method: 'DELETE',
    }),

  getToday: () =>
    request<MedicineTodayResponse>('/api/medicines/today'),

  logMedicine: (medicineId: string, data: {
    scheduled_time: string;
    time_of_day: string;
    status: string;
    notes?: string;
  }) =>
    request<MedicineLog>(`/api/medicines/${medicineId}/log`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLogs: (medicineId: string, limit: number = 30) =>
    request<MedicineLog[]>(`/api/medicines/${medicineId}/logs?limit=${limit}`),
};
