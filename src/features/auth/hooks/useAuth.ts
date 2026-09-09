import { useState, useEffect, useCallback } from 'react';
import { User, LoginDTO } from '../types/auth.types';
import { authApi } from '../services/auth.api';

// Simplified global state for demo purposes.
// In production, use Context API, Redux, or Zustand.
let globalUser: User | null = null;
const listeners = new Set<(user: User | null) => void>();

const setGlobalUser = (user: User | null) => {
  globalUser = user;
  listeners.forEach(l => l(user));
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(globalUser);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    listeners.add(setUser);
    
    const handleLogoutEvent = () => setGlobalUser(null);
    window.addEventListener('auth:logout', handleLogoutEvent);
    
    return () => {
      listeners.delete(setUser);
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  const login = useCallback(async (payload: LoginDTO) => {
    setIsLoading(true);
    try {
      const { user } = await authApi.login(payload);
      setGlobalUser(user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setGlobalUser(null);
  }, []);

  return { user, isLoading, login, logout, isAuthenticated: !!user };
}
