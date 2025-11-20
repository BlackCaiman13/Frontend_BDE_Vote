import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import axios from 'axios';
import { useJwt, isExpired, decodeToken } from 'react-jwt';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refresh_token'));
  
  // Utiliser react-jwt pour décoder et vérifier le token
  const { decodedToken, isExpired: tokenIsExpired, reEvaluateToken } = useJwt(accessToken);
  const isAuthenticated = !!accessToken && !tokenIsExpired;

  // Fonction pour rafraîchir le token
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      logout();
      return false;
    }

    try {
      const response = await api.post('/admin/token/refresh', { 
        refresh_token: refreshToken 
      });
      const { access_token: newAccessToken } = response.data;
      
      if (newAccessToken) {
        localStorage.setItem('access_token', newAccessToken);
        setAccessToken(newAccessToken);
        reEvaluateToken(newAccessToken);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Erreur lors du refresh du token:', error);
      logout();
      return false;
    }
  }, [refreshToken, reEvaluateToken]);

  // Vérifier et rafraîchir le token automatiquement au montage et quand il expire
  useEffect(() => {
    if (accessToken && tokenIsExpired) {
      refreshAccessToken();
    }
  }, [accessToken, tokenIsExpired, refreshAccessToken]);

  // Login
  const login = useCallback((newAccessToken, newRefreshToken) => {
    localStorage.setItem('access_token', newAccessToken);
    localStorage.setItem('refresh_token', newRefreshToken);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    reEvaluateToken(newAccessToken);
  }, [reEvaluateToken]);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    reEvaluateToken(null);
  }, [reEvaluateToken]);

  // Requête authentifiée avec gestion automatique du refresh
  const authRequest = useCallback(async (config) => {
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    // Si le token est expiré, le rafraîchir d'abord
    if (tokenIsExpired) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        throw new Error('Unable to refresh token');
      }
    }

    try {
      const authApi = axios.create({
        baseURL: api.defaults.baseURL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const response = await authApi.request(config);
      return response;
    } catch (error) {
      // Si 401, tenter le refresh une fois
      if (error.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          try {
            const retryApi = axios.create({
              baseURL: api.defaults.baseURL,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
            });
            return await retryApi.request(config);
          } catch (retryError) {
            throw retryError;
          }
        }
      }
      throw error;
    }
  }, [accessToken, tokenIsExpired, refreshAccessToken]);

  // Extraire l'email depuis le token décodé
  const adminEmail = decodedToken?.email || decodedToken?.sub || decodedToken?.username || 'Admin';

  const value = {
    isAuthenticated,
    login,
    logout,
    authRequest,
    accessToken,
    refreshToken,
    decodedToken,
    refreshAccessToken,
    adminEmail,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};
