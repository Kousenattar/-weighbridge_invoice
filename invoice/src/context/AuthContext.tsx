import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { authApi } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGSTPanel: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('gst_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('gst_token');
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          setUser(res.user);
          setToken(savedToken);
        } catch {
          localStorage.removeItem('gst_token');
          localStorage.removeItem('gst_user');
          setToken(null);
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    localStorage.setItem('gst_token', res.token);
    localStorage.setItem('gst_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('gst_token');
    localStorage.removeItem('gst_user');
    setToken(null);
    setUser(null);
  };

  const isGSTPanel = !user || user.panel !== 'non_gst';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, isAuthenticated: !!user, isGSTPanel }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
