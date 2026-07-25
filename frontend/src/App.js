import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { PermissionsProvider } from './context/PermissionsContext';
import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import DirectorDashboard from './pages/director/DirectorDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import AccountantDashboard from './pages/accountant/AccountantDashboard';
import HRDashboard from './pages/hr/HRDashboard';
import ReceptionDashboard from './pages/reception/ReceptionDashboard';
import CallCenterDashboard from './pages/callcenter/CallCenterDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
      <DataProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/director/*"
                element={
                  <ProtectedRoute allowedRoles={['director']}>
                    <DirectorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supervisor/*"
                element={
                  <ProtectedRoute allowedRoles={['supervisor']}>
                    <SupervisorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/*"
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/*"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accountant/*"
                element={
                  <ProtectedRoute allowedRoles={['accountant']}>
                    <AccountantDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hr/*"
                element={
                  <ProtectedRoute allowedRoles={['hr']}>
                    <HRDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reception/*"
                element={
                  <ProtectedRoute allowedRoles={['reception']}>
                    <ReceptionDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/call-center/*"
                element={
                  <ProtectedRoute allowedRoles={['callcenter']}>
                    <CallCenterDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </DataProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}

export default App;