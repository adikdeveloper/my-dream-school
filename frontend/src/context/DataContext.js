import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';

const DataContext = createContext();

const initialState = {
  users: [],
  classes: [],
  subjects: [],
  grades: [],
  attendance: [],
  announcements: [],
  isLoading: false,
  error: null
};

const dataReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    case 'SET_USERS':
      return {
        ...state,
        users: action.payload,
        isLoading: false
      };
    case 'ADD_USER':
      return {
        ...state,
        users: [...state.users, action.payload]
      };
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(user =>
          user._id === action.payload._id ? action.payload : user
        )
      };
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(user => user._id !== action.payload)
      };
    case 'SET_CLASSES':
      return {
        ...state,
        classes: action.payload,
        isLoading: false
      };
    case 'ADD_CLASS':
      return {
        ...state,
        classes: [...state.classes, action.payload]
      };
    case 'UPDATE_CLASS':
      return {
        ...state,
        classes: state.classes.map(cls =>
          cls._id === action.payload._id ? action.payload : cls
        )
      };
    case 'SET_SUBJECTS':
      return {
        ...state,
        subjects: action.payload,
        isLoading: false
      };
    case 'ADD_SUBJECT':
      return {
        ...state,
        subjects: [...state.subjects, action.payload]
      };
    case 'SET_GRADES':
      return {
        ...state,
        grades: action.payload,
        isLoading: false
      };
    case 'ADD_GRADE':
      return {
        ...state,
        grades: [...state.grades, action.payload]
      };
    case 'SET_ATTENDANCE':
      return {
        ...state,
        attendance: action.payload,
        isLoading: false
      };
    case 'ADD_ATTENDANCE':
      return {
        ...state,
        attendance: [...state.attendance, action.payload]
      };
    case 'SET_ANNOUNCEMENTS':
      return {
        ...state,
        announcements: action.payload,
        isLoading: false
      };
    case 'ADD_ANNOUNCEMENT':
      return {
        ...state,
        announcements: [...state.announcements, action.payload]
      };
    default:
      return state;
  }
};

export const DataProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  const setLoading = useCallback((loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // User actions
  const setUsers = useCallback((users) => {
    dispatch({ type: 'SET_USERS', payload: users });
  }, []);

  const addUser = useCallback((user) => {
    dispatch({ type: 'ADD_USER', payload: user });
  }, []);

  const updateUser = useCallback((user) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  }, []);

  const deleteUser = useCallback((userId) => {
    dispatch({ type: 'DELETE_USER', payload: userId });
  }, []);

  // Class actions
  const setClasses = useCallback((classes) => {
    dispatch({ type: 'SET_CLASSES', payload: classes });
  }, []);

  const addClass = useCallback((classData) => {
    dispatch({ type: 'ADD_CLASS', payload: classData });
  }, []);

  const updateClass = useCallback((classData) => {
    dispatch({ type: 'UPDATE_CLASS', payload: classData });
  }, []);

  // Subject actions
  const setSubjects = useCallback((subjects) => {
    dispatch({ type: 'SET_SUBJECTS', payload: subjects });
  }, []);

  const addSubject = useCallback((subject) => {
    dispatch({ type: 'ADD_SUBJECT', payload: subject });
  }, []);

  // Grade actions
  const setGrades = useCallback((grades) => {
    dispatch({ type: 'SET_GRADES', payload: grades });
  }, []);

  const addGrade = useCallback((grade) => {
    dispatch({ type: 'ADD_GRADE', payload: grade });
  }, []);

  // Attendance actions
  const setAttendance = useCallback((attendance) => {
    dispatch({ type: 'SET_ATTENDANCE', payload: attendance });
  }, []);

  const addAttendance = useCallback((attendance) => {
    dispatch({ type: 'ADD_ATTENDANCE', payload: attendance });
  }, []);

  // Announcement actions
  const setAnnouncements = useCallback((announcements) => {
    dispatch({ type: 'SET_ANNOUNCEMENTS', payload: announcements });
  }, []);

  const addAnnouncement = useCallback((announcement) => {
    dispatch({ type: 'ADD_ANNOUNCEMENT', payload: announcement });
  }, []);

  const value = useMemo(() => ({
    ...state,
    setLoading,
    setError,
    clearError,
    setUsers,
    addUser,
    updateUser,
    deleteUser,
    setClasses,
    addClass,
    updateClass,
    setSubjects,
    addSubject,
    setGrades,
    addGrade,
    setAttendance,
    addAttendance,
    setAnnouncements,
    addAnnouncement
  }), [
    state,
    setLoading,
    setError,
    clearError,
    setUsers,
    addUser,
    updateUser,
    deleteUser,
    setClasses,
    addClass,
    updateClass,
    setSubjects,
    addSubject,
    setGrades,
    addGrade,
    setAttendance,
    addAttendance,
    setAnnouncements,
    addAnnouncement
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};