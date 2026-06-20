import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      localStorage.setItem('token', token);
      const res = await api.get('/me');
      setUser({
        token,
        username: res.data.username,
        email: res.data.email,
        profileImageUrl: res.data.profileImageUrl,
        id: res.data.id,
      });
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      // Token may be expired/invalid
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } else {
        // Still set basic user so app doesn't break
        setUser({ token });
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      const newToken = typeof response.data === 'string' ? response.data : response.data.token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const refreshProfile = () => {
    fetchUserProfile();
  };

  const contextValue = {
    user,
    token,
    login,
    logout,
    loading,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
