import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import NotificationBell from '../../components/common/NotificationBell';
import './StudentDashboard.css';

// Lazy load components for code splitting and better performance
const StudentHome = lazy(() => import('../../components/student/StudentHome'));
const StudentSchedule = lazy(() => import('../../components/student/StudentSchedule'));
const Homework = lazy(() => import('../../components/student/Homework'));
const MyClass = lazy(() => import('../../components/student/MyClass'));
const Exams = lazy(() => import('../../components/student/Exams'));
const StudentStatistics = lazy(() => import('../../components/student/StudentStatistics'));
const StudentPayments = lazy(() => import('../../components/student/StudentPayments'));
const StudentProfile = lazy(() => import('../../components/student/StudentProfile'));
const ChatPage = lazy(() => import('../../components/chat/ChatPage'));
const NotificationInbox = lazy(() => import('../../components/common/NotificationInbox'));
const StudentAIAssistant = lazy(() => import('../../components/student/StudentAIAssistant'));

// Loading component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    flexDirection: 'column',
    gap: '1rem'
  }}>
    <div style={{
      width: '50px',
      height: '50px',
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #10b981',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Yuklanmoqda...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const GREEN = '#10b981';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Generate profile image URL with cache busting
  const profileImageUrl = useMemo(() => {
    if (!user?.profileImage) return null;
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
    const timestamp = user._updated || Date.now();
    return `${baseUrl}${user.profileImage}?t=${timestamp}`;
  }, [user?.profileImage, user?._updated]);

  const menuItems = [
    {
      path: '/student',
      label: 'Bosh sahifa',
      icon: '🏠',
      end: true,
      badge: null,
      section: null
    },
    {
      path: '/student/ai',
      label: 'AI Yordamchi',
      icon: '🤖',
      badge: null,
      section: null
    },
    {
      path: '/student/schedule',
      label: 'Dars jadvali',
      icon: '📅',
      badge: null,
      section: null
    },
    {
      path: '/student/homework',
      label: 'Uy vazifalar',
      icon: '📝',
      badge: null,
      section: null
    },
    {
      path: '/student/exams',
      label: 'Imtihonlar',
      icon: '📋',
      badge: null,
      section: null
    },
    {
      path: '/student/my-class',
      label: 'Mening sinfim',
      icon: '🎓',
      badge: null,
      section: null
    },
    {
      path: '/student/chat',
      label: 'Chat',
      icon: '💬',
      badge: null,
      section: null
    },
    {
      path: '/student/notifications',
      label: 'Bildirishnomalar',
      icon: '📥',
      badge: null,
      section: null
    },
    {
      path: '/student/statistics',
      label: 'Mening natijalarim',
      icon: '📊',
      badge: null,
      section: null
    },
    {
      path: '/student/payments',
      label: "To'lovlarim",
      icon: '💳',
      badge: null,
      section: null
    },
    {
      path: '/student/profile',
      label: 'Profil',
      icon: '👤',
      badge: null,
      section: null
    }
  ];

  const handleMenuItemClick = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="student-dashboard-layout">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
              aria-expanded={sidebarOpen}
            >
              <span className="hamburger" aria-hidden="true"></span>
              <span className="hamburger" aria-hidden="true"></span>
              <span className="hamburger" aria-hidden="true"></span>
            </button>
            <Logo />
            <div className="page-info">
              <h1 className="header-page-title">O'quvchi paneli</h1>
              <p className="page-subtitle">O'quv jarayoningizni kuzatib boring</p>
            </div>
          </div>
          <div className="header-right">
            <NotificationBell accent={GREEN} viewAllLink="/student/notifications" />
            <div className="user-info">
              <div
                className={`user-avatar ${profileImageUrl ? 'has-image' : ''}`}
                style={{
                  backgroundImage: profileImageUrl ? `url(${profileImageUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {!profileImageUrl && (
                  <>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</>
                )}
              </div>
              <div className="user-details">
                <span className="user-name">{user?.firstName} {user?.lastName}</span>
                <span className="user-role">O'quvchi</span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="refresh-btn"
              aria-label="Sahifani yangilash"
              title="Sahifani yangilash"
            >
              <span className="refresh-icon">🔄</span>
            </button>
            <button onClick={handleLogout} className="logout-btn" aria-label="Tizimdan chiqish">
              <span className="logout-icon">🚪</span>
              <span className="logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <span className="brand-icon">🎓</span>
              <span className="brand-text">O'quvchi Paneli</span>
            </div>
          </div>
          <nav className="sidebar-nav">
            <ul className="nav-list">
              {menuItems.map((item) => (
                <li key={item.path} className="nav-item">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                    end={item.end}
                    onClick={handleMenuItemClick}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-text">
                      {item.label}
                    </span>
                    {item.badge > 0 && (
                      <span className="notification-badge">
                        <span className="notification-icon">🔔</span>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Sidebar Overlay for mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

        {/* Main Content */}
        <main className="main-content">
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<StudentHome />} />
                <Route path="/ai" element={<StudentAIAssistant />} />
                <Route path="/schedule" element={<StudentSchedule />} />
                <Route path="/homework" element={<Homework />} />
                <Route path="/exams" element={<Exams />} />
                <Route path="/my-class" element={<MyClass />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/notifications" element={<NotificationInbox />} />
                <Route path="/statistics" element={<StudentStatistics />} />
                <Route path="/payments" element={<StudentPayments />} />
                <Route path="/profile" element={<StudentProfile />} />
                <Route path="*" element={<Navigate to="/student" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
