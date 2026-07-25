import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import apiService from '../services/apiService';

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setPermissions({});
      return;
    }
    setLoading(true);
    try {
      const data = await apiService.getMyPermissions();
      setPermissions(data.permissions || {});
    } catch (err) {
      console.error('permissions load:', err);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Foydalanuvchi tabga qaytganda ruxsatlarni qayta yuklash — admin ruxsatni
  // o'zgartirgach, boshqa foydalanuvchilar tezroq yangi holatni ko'rishi uchun.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const onFocus = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [isAuthenticated, refresh]);

  const can = useCallback((key) => {
    if (!user) return false;
    // Direktor — eng yuqori rol (boshliq): har doim hammasi (backend bilan mos)
    if (user.role === 'director') return true;
    // Admin (direktor yordamchisi) va boshqa rollar — katalog asosida (direktor boshqaradi)
    return !!permissions[key];
  }, [user, permissions]);

  const value = useMemo(() => ({
    permissions,
    loading,
    can,
    refresh
  }), [permissions, loading, can, refresh]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider');
  return ctx;
};

// Can komponent — children'ni ruxsatga qarab ko'rsatadi
export const Can = ({ perm, anyOf, fallback = null, children }) => {
  const { can } = usePermissions();
  if (anyOf && Array.isArray(anyOf)) {
    return anyOf.some((k) => can(k)) ? <>{children}</> : <>{fallback}</>;
  }
  if (perm) {
    return can(perm) ? <>{children}</> : <>{fallback}</>;
  }
  return <>{children}</>;
};

export default PermissionsContext;
