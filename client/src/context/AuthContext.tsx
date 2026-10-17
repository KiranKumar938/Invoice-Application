import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  phone?: string;
}

export interface Tenant {
  id: string;
  name: string;
  legalName: string;
  email: string;
  phone: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gstin: string;
  settings?: any;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  updateUserContext: (user: User, tenant: Tenant) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('klanvision_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('klanvision_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          setTenant(res.tenant);
        } catch (error) {
          console.error('Failed to restore session:', error);
          localStorage.removeItem('klanvision_token');
          setToken(null);
          setUser(null);
          setTenant(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: any) => {
    const res = await api.login(credentials);
    localStorage.setItem('klanvision_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setTenant(res.tenant);
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    localStorage.setItem('klanvision_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setTenant(res.tenant);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout network notice:', e);
    } finally {
      localStorage.removeItem('klanvision_token');
      setToken(null);
      setUser(null);
      setTenant(null);
      window.location.href = '/login';
    }
  };

  const updateUserContext = (newUser: User, newTenant: Tenant) => {
    setUser(newUser);
    setTenant(newTenant);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        token,
        isLoading,
        login,
        register,
        logout,
        updateUserContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
