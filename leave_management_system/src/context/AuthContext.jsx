import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../utils/api';

const AuthContext = createContext(null);
const MOCK_PASSWORD = 'admin123';
const MOCK_USER_KEY = 'mockUser';
const mockAuthEnv = import.meta.env.VITE_MOCK_AUTH;
const MOCK_AUTH_ENABLED = mockAuthEnv === 'true' || (import.meta.env.DEV && mockAuthEnv !== 'false');

const MOCK_USERS_BY_EMAIL = {
  'admin@abc.com': {
    id: 1,
    employee_id: 'ADM001',
    name: 'Aung Min',
    email: 'admin@abc.com',
    role: 'admin',
    department: 'Administration',
  },
  'manager@abc.com': {
    id: 2,
    employee_id: 'MGR001',
    name: 'May Thu',
    email: 'manager@abc.com',
    role: 'manager',
    department: 'Engineering',
  },
  'priya@abc.com': {
    id: 3,
    employee_id: 'EMP001',
    name: 'Priya Sharma',
    email: 'priya@abc.com',
    role: 'employee',
    department: 'Engineering',
  },
};

function getMockUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (password !== MOCK_PASSWORD) return null;
  return MOCK_USERS_BY_EMAIL[normalizedEmail] ?? null;
}

function restoreMockUser() {
  const rawUser = localStorage.getItem(MOCK_USER_KEY);
  if (!rawUser) return null;
  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(MOCK_USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (MOCK_AUTH_ENABLED) {
      const mockUser = restoreMockUser();
      if (mockUser) {
        setUser(mockUser);
      }
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (token) {
      authApi.me()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    if (MOCK_AUTH_ENABLED) {
      const mockUser = getMockUser(email, password);
      if (!mockUser) throw new Error('Invalid credentials');

      localStorage.setItem('token', `mock-token-${mockUser.id}`);
      localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
      return mockUser;
    }

    const res = await authApi.login({ email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem(MOCK_USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, mockAuthEnabled: MOCK_AUTH_ENABLED }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);