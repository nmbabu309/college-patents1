import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));

          const decoded = JSON.parse(jsonPayload);

          // Check if token is expired
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            console.warn('Token expired, logging out');
            localStorage.removeItem('token');
          } else {
            // JWT now contains: { userEmail, role, department, adminId }
            setUser(decoded);
            setIsAuthenticated(true);
          }
        } catch (e) {
          console.error("Invalid token", e);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const decoded = JSON.parse(jsonPayload);
      setUser(decoded);
      setIsAuthenticated(true);
    } catch (e) {
      console.error("Error decoding token during login", e);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Helper functions for role checking

  const isSuperAdmin = useCallback(() => {
    return user?.role === 'super_admin';
  }, [user]);

  const isSubAdmin = useCallback(() => {
    return user?.role === 'sub_admin';
  }, [user]);

  const isAnyAdmin = useCallback(() => {
    return user?.role === 'super_admin' || user?.role === 'sub_admin';
  }, [user]);

  const getUserDepartment = useCallback(() => {
    return user?.department || null;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      login,
      logout,
      loading,
      isSuperAdmin,
      isSubAdmin,
      isAnyAdmin,
      getUserDepartment
    }}>
      {children}
    </AuthContext.Provider>
  );
};
