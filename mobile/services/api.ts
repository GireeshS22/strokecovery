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

// Therapy types
export interface TherapySession {
  id: string;
  patient_id: string;
  therapy_type: 'PT' | 'OT' | 'Speech' | 'Other';
  session_date: string;
  session_time: string | null;
  duration_minutes: number;
  notes: string | null;
  feeling_rating: number; // 1-5
  feeling_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarDayItem {
  date: string;
  sessions: TherapySession[];
  session_count: number;
  therapy_types: string[];
}

export interface CalendarMonthResponse {
  year: number;
  month: number;
  days: CalendarDayItem[];
}

export interface TherapyStats {
  total_sessions: number;
  total_minutes: number;
  sessions_by_type: Record<string, number>;
  average_feeling: number;
  this_week_sessions: number;
  this_month_sessions: number;
}

// Therapy API
export const therapyApi = {
  listSessions: (params?: {
    therapy_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.therapy_type) searchParams.append('therapy_type', params.therapy_type);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    const query = searchParams.toString();
    return request<TherapySession[]>(`/api/therapy/sessions${query ? `?${query}` : ''}`);
  },

  getSession: (id: string) =>
    request<TherapySession>(`/api/therapy/sessions/${id}`),

  createSession: (data: {
    therapy_type: string;
    session_date: string;
    session_time?: string;
    duration_minutes: number;
    notes?: string;
    feeling_rating: number;
    feeling_notes?: string;
  }) =>
    request<TherapySession>('/api/therapy/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSession: (id: string, data: {
    therapy_type?: string;
    session_date?: string;
    session_time?: string;
    duration_minutes?: number;
    notes?: string;
    feeling_rating?: number;
    feeling_notes?: string;
  }) =>
    request<TherapySession>(`/api/therapy/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSession: (id: string) =>
    request<void>(`/api/therapy/sessions/${id}`, {
      method: 'DELETE',
    }),

  getCalendarMonth: (year: number, month: number) =>
    request<CalendarMonthResponse>(`/api/therapy/calendar/${year}/${month}`),

  getStats: () =>
    request<TherapyStats>('/api/therapy/stats'),
};

// Mood types
export interface MoodEntry {
  id: string;
  patient_id: string;
  entry_date: string;
  mood_level: number; // 1-5
  notes: string | null;
  created_at: string;
  mood_emoji: string;
  mood_label: string;
}

// Mood API
export const moodApi = {
  create: (data: {
    entry_date: string;
    mood_level: number;
    notes?: string;
  }) =>
    request<MoodEntry>('/api/mood', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    const query = searchParams.toString();
    return request<MoodEntry[]>(`/api/mood${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    request<MoodEntry>(`/api/mood/${id}`),

  update: (id: string, data: {
    entry_date?: string;
    mood_level?: number;
    notes?: string;
  }) =>
    request<MoodEntry>(`/api/mood/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/mood/${id}`, {
      method: 'DELETE',
    }),
};

// Ailment types
export interface AilmentEntry {
  id: string;
  patient_id: string;
  entry_date: string;
  symptom: string;
  body_location: string | null;
  severity: number; // 1-10
  notes: string | null;
  created_at: string;
  severity_label: string;
  severity_color: string;
}

// Ailment API
export const ailmentApi = {
  create: (data: {
    entry_date: string;
    symptom: string;
    body_location?: string;
    severity: number;
    notes?: string;
  }) =>
    request<AilmentEntry>('/api/ailments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (params?: {
    start_date?: string;
    end_date?: string;
    symptom?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.symptom) searchParams.append('symptom', params.symptom);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    const query = searchParams.toString();
    return request<AilmentEntry[]>(`/api/ailments${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    request<AilmentEntry>(`/api/ailments/${id}`),

  update: (id: string, data: {
    entry_date?: string;
    symptom?: string;
    body_location?: string;
    severity?: number;
    notes?: string;
  }) =>
    request<AilmentEntry>(`/api/ailments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/ailments/${id}`, {
      method: 'DELETE',
    }),
};

// Calendar types
export interface CalendarMedicineItem {
  id: string;
  name: string;
  dosage: string | null;
  status: string;
  time_of_day: string;
  taken_at: string | null;
}

export interface CalendarTherapyItem {
  id: string;
  type: string;
  duration: number;
  feeling: number;
  feeling_emoji: string;
  notes: string | null;
}

export interface CalendarMoodItem {
  id: string;
  level: number;
  emoji: string;
  label: string;
  notes: string | null;
}

export interface CalendarAilmentItem {
  id: string;
  symptom: string;
  body_location: string | null;
  severity: number;
  severity_label: string;
  notes: string | null;
}

export interface CalendarDayEntries {
  medicines: CalendarMedicineItem[];
  therapy: CalendarTherapyItem[];
  mood: CalendarMoodItem | null;
  ailments: CalendarAilmentItem[];
}

export interface CalendarSummary {
  medicine_count: number;
  therapy_count: number;
  mood_count: number;
  ailment_count: number;
  days_with_entries: number;
}

export interface CalendarResponse {
  entries: Record<string, CalendarDayEntries>;
  summary: CalendarSummary;
}

export interface DayEntriesResponse {
  date: string;
  entries: CalendarDayEntries;
}

// Calendar API
export const calendarApi = {
  getRange: (startDate: string, endDate: string) =>
    request<CalendarResponse>(`/api/calendar?start_date=${startDate}&end_date=${endDate}`),

  getDay: (date: string) =>
    request<DayEntriesResponse>(`/api/calendar/${date}`),
};
