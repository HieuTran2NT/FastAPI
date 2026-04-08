import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // On mount: restore session from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedCompanyId = localStorage.getItem('company_id');

    if (!storedToken || !storedCompanyId) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);

    apiClient
      .get<User>(`/companies/${storedCompanyId}/users/me`)
      .then((res) => {
        setUser(res.data);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('company_id');
          setToken(null);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  async function login(username: string, password: string): Promise<void> {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    const loginRes = await apiClient.post<{ access_token: string; token_type: string }>(
      '/auth/login',
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const accessToken = loginRes.data.access_token;
    localStorage.setItem('token', accessToken);
    setToken(accessToken);

    const companyId = getCompanyIdFromToken(accessToken);
    if (companyId === null) {
      localStorage.removeItem('token');
      setToken(null);
      throw new Error('Unable to determine company from token');
    }

    localStorage.setItem('company_id', String(companyId));

    const meRes = await apiClient.get<User>(`/companies/${companyId}/users/me`);
    setUser(meRes.data);

    navigate('/tasks');
  }

  function logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('company_id');
    setToken(null);
    setUser(null);
    navigate('/login');
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { AuthContext };

/**
 * Decode the JWT payload to extract company_id without a library.
 * JWTs are base64url-encoded; the payload is the second segment.
 */
function getCompanyIdFromToken(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.company_id === 'number' ? decoded.company_id : null;
  } catch {
    return null;
  }
}
