import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: { ...action.payload.user, _updated: Date.now() },
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    case 'LOAD_USER_START':
      return {
        ...state,
        isLoading: true
      };
    case 'LOAD_USER_SUCCESS':
      const loadedUser = { ...action.payload, _updated: Date.now() };
      return {
        ...state,
        user: loadedUser,
        isAuthenticated: true,
        isLoading: false
      };
    case 'LOAD_USER_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      };
    case 'UPDATE_USER':
      const updatedUser = { ...action.payload, _updated: Date.now() };
      return {
        ...state,
        user: updatedUser
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = useCallback(async (phone, password, recaptchaToken) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const response = await authService.login(phone, password, recaptchaToken);

      localStorage.setItem('token', response.token);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response
      });

      return response;
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.response?.data?.message || 'Kirish muvaffaqiyatsiz'
      });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const loadUser = useCallback(async () => {
    try {
      dispatch({ type: 'LOAD_USER_START' });
      const user = await authService.getCurrentUser();
      dispatch({
        type: 'LOAD_USER_SUCCESS',
        payload: user
      });
    } catch (error) {
      localStorage.removeItem('token');
      dispatch({ type: 'LOAD_USER_FAILURE' });
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const updateUser = useCallback((userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      dispatch({ type: 'LOAD_USER_FAILURE' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const value = useMemo(() => ({
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    loadUser,
    updateUser,
    clearError
  }), [state, login, logout, loadUser, updateUser, clearError]);

  return (
    <AuthContext.Provider value={value}>
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
