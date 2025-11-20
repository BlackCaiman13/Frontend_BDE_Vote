import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useJwt } from 'react-jwt';
import api from '@/lib/api';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refresh_token'));

  const { decodedToken, isExpired: tokenIsExpired, reEvaluateToken } = useJwt(accessToken);
  const isAuthenticated = !!accessToken && !tokenIsExpired;

  const clearSession = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAccessToken(null);
    setRefreshToken(null);
    reEvaluateToken(null);
  }, [reEvaluateToken]);

  // Fonction pour rafraîchir le token
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      clearSession();
      return null;
    }

    try {
      const response = await api.post('/admin/token/refresh', {
        refresh_token: refreshToken
      });
      const { access_token: newAccessToken, refresh_token: newRefreshToken } = response.data;

      if (newAccessToken) {
        localStorage.setItem('access_token', newAccessToken);
        setAccessToken(newAccessToken);
        reEvaluateToken(newAccessToken);

        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
          setRefreshToken(newRefreshToken);
        }

        return newAccessToken;
      }
      clearSession();
      return null;
    } catch (error) {
      console.error('Erreur lors du refresh du token:', error);
      clearSession();
      return null;
    }
  }, [refreshToken, clearSession, reEvaluateToken]);

  // Vérifier et rafraîchir le token automatiquement au montage et quand il expire
  useEffect(() => {
    if (accessToken && tokenIsExpired) {
      refreshAccessToken();
    }
  }, [accessToken, tokenIsExpired, refreshAccessToken]);

  // Login
  const login = useCallback((newAccessToken, newRefreshToken) => {
    if (!newAccessToken || !newRefreshToken) {
      throw new Error('Tokens manquants');
    }
    localStorage.setItem('access_token', newAccessToken);
    localStorage.setItem('refresh_token', newRefreshToken);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    reEvaluateToken(newAccessToken);
  }, [reEvaluateToken]);

  // Logout
  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await api.post('/admin/logout', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      clearSession();
    }
  }, [refreshToken, clearSession]);

  // Requête authentifiée avec gestion automatique du refresh
  const authRequest = useCallback(async (config) => {
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    let tokenToUse = accessToken;

    if (tokenIsExpired) {
      const refreshedToken = await refreshAccessToken();
      if (!refreshedToken) {
        throw new Error('Unable to refresh token');
      }
      tokenToUse = refreshedToken;
    }

    const requestWithToken = async (token) => {
      const authApi = axios.create({
        baseURL: api.defaults.baseURL,
        withCredentials: true,
      });

      return authApi.request({
        ...config,
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {}),
          'Authorization': `Bearer ${token}`,
        },
      });
    };

    try {
      return await requestWithToken(tokenToUse);
    } catch (error) {
      if (error.response?.status === 401) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          return requestWithToken(refreshedToken);
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
