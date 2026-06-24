import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('splitwise_user');
    const token = localStorage.getItem('splitwise_token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('splitwise_token', data.token);
    localStorage.setItem('splitwise_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (name, email, phone, password) => {
    const { data } = await api.post('/auth/register', { name, email, phone, password });
    localStorage.setItem('splitwise_token', data.token);
    localStorage.setItem('splitwise_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('splitwise_token');
    localStorage.removeItem('splitwise_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
