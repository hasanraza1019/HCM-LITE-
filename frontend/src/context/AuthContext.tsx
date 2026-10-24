import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Employee } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  companyName: string;
  isInitialized: boolean | null;
  isLoading: boolean;
  login: (token: string, user: User, employee: Employee | null) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  checkSystemStatus: () => Promise<boolean>;
  updatePasswordCompleted: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [companyName, setCompanyName] = useState<string>('HCM Lite');
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkSystemStatus = async (): Promise<boolean> => {
    try {
      const data = await api.get('/auth/status');
      setIsInitialized(data.initialized);
      if (data.companyName) setCompanyName(data.companyName);
      return data.initialized;
    } catch (err) {
      console.error('Failed to check system status:', err);
      setIsInitialized(false);
      return false;
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('hcm_token');
    if (!token) {
      setUser(null);
      setEmployee(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
      setEmployee(data.employee);
      if (data.companyName) setCompanyName(data.companyName);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('hcm_token');
        setUser(null);
        setEmployee(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      await checkSystemStatus();
      await refreshUser();
    }
    init();
  }, []);

  const login = (token: string, newUser: User, newEmployee: Employee | null) => {
    localStorage.setItem('hcm_token', token);
    setUser(newUser);
    setEmployee(newEmployee);
  };

  const logout = () => {
    localStorage.removeItem('hcm_token');
    setUser(null);
    setEmployee(null);
  };

  const updatePasswordCompleted = () => {
    if (user) {
      setUser({ ...user, mustChangePassword: false });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        companyName,
        isInitialized,
        isLoading,
        login,
        logout,
        refreshUser,
        checkSystemStatus,
        updatePasswordCompleted
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

