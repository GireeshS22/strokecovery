import { useState, useEffect, useCallback } from 'react';
import { authApi, profileApi, getToken, setToken, removeToken } from '../services/api';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    needsOnboarding: false,
  });

  // Check if user is already logged in
  const checkAuth = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setState({ user: null, isLoading: false, isAuthenticated: false, needsOnboarding: false });
        return;
      }

      const user = await authApi.me();
      const profileStatus = await profileApi.check();

      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
        needsOnboarding: !profileStatus.onboarding_completed,
      });
    } catch (error) {
      await removeToken();
      setState({ user: null, isLoading: false, isAuthenticated: false, needsOnboarding: false });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Register
  const register = async (email: string, password: string, role: string = 'patient') => {
    const response = await authApi.register(email, password, role);
    await setToken(response.access_token);
    setState({
      user: response.user,
      isLoading: false,
      isAuthenticated: true,
      needsOnboarding: true,
    });
    return response;
  };

  // Login
  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    await setToken(response.access_token);

    const profileStatus = await profileApi.check();

    setState({
      user: response.user,
      isLoading: false,
      isAuthenticated: true,
      needsOnboarding: !profileStatus.onboarding_completed,
    });
    return response;
  };

  // Logout
  const logout = async () => {
    await removeToken();
    setState({ user: null, isLoading: false, isAuthenticated: false, needsOnboarding: false });
  };

  // Complete onboarding
  const completeOnboarding = async (data: {
    stroke_date?: string;
    stroke_type?: string;
    affected_side?: string;
    current_therapies?: string[];
  }) => {
    await profileApi.onboarding(data);
    setState((prev) => ({ ...prev, needsOnboarding: false }));
  };

  return {
    ...state,
    register,
    login,
    logout,
    completeOnboarding,
    checkAuth,
  };
}
