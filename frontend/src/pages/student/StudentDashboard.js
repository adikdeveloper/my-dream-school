import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import NotificationBell from '../../components/common/NotificationBell';
import './StudentDashboard.css';
import '../director/DirectorDashboard.css';

// Direktor dashboardidagi SVG ikonlar bilan bir xil — dizayn 1:1 bo'lishi uchun
const StudentDashIcon = ({ name = 'grid', size = 20 }) => {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    ai: <><rect x="4" y="7" width="16" height="13" rx="4" /><path d="M12 7V3M9 3h6M8 13h.01M16 13h.01M9 17h6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    journal: <><path d="M5 3h13a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2ZM5 3v16M9 7h7M9 11h7M9 15h5" /></>,
    exams: <><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h4" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    report: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
    payments: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /><circle cx="17" cy="15" r="1" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    education: <><path d="m3 10 9-5 9 5-9 5-9-5Z" /><path d="M7 12.5V17c3 2 7 2 10 0v-4.5" /></>,
    refresh: <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 9M5.5 15A7 7 0 0 0 17.8 17.8L20 15" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.grid}
    </svg>
  );
};

const menuIconName = (item = {}) => {
  if (item.iconKey) return item.iconKey;
  const iconByPath = {
    '/student': 'grid',
    '/student/ai': 'ai',
    '/student/schedule': 'calendar',
    '/student/homework': 'journal',
    '/student/exams': 'exams',
    '/student/my-class': 'users',
    '/student/chat': 'message',
    '/student/notifications': 'bell',
    '/student/statistics': 'report',
    '/student/payments': 'payments',
    '/student/profile': 'profile'
  };
  if (iconByPath[item.path]) return iconByPath[item.path];
  return 'grid';
};

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

  const userInitials = useMemo(() => {
    const firstInitial = user?.firstName?.trim()?.charAt(0) || user?.username?.trim()?.charAt(0) || 'O';
    const lastInitial = user?.lastName?.trim()?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }, [user?.firstName, user?.lastName, user?.username]);

  const menuItems = [
    {
      path: '/student',
      label: 'Bosh sahifa',
      iconKey: 'grid',
      end: true,
      badge: null,
      section: null
    },
    {
      path: '/student/ai',
      label: 'AI Yordamchi',
      iconKey: 'ai',
      badge: null,
      section: null
    },
    {
      path: '/student/schedule',
      label: 'Dars jadvali',
      iconKey: 'calendar',
      badge: null,
      section: null
    },
    {
      path: '/student/homework',
      label: 'Uy vazifalar',
      iconKey: 'journal',
      badge: null,
      section: null
    },
    {
      path: '/student/exams',
      label: 'Imtihonlar',
      iconKey: 'exams',
      badge: null,
      section: null
    },
    {
      path: '/student/my-class',
      label: 'Mening sinfim',
      iconKey: 'users',
      badge: null,
      section: null
    },
    {
      path: '/student/chat',
      label: 'Chat',
      iconKey: 'message',
      badge: null,
      section: null
    },
    {
      path: '/student/notifications',
      label: 'Bildirishnomalar',
      iconKey: 'bell',
      badge: null,
      section: null
    },
    {
      path: '/student/statistics',
      label: 'Mening natijalarim',
      iconKey: 'report',
      badge: null,
      section: null
    },
    {
      path: '/student/payments',
      label: "To'lovlarim",
      iconKey: 'payments',
      badge: null,
      section: null
    },
    {
      path: '/student/profile',
      label: 'Profil',
      iconKey: 'profile',
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
    <div className="admin-dashboard-layout">
      {/* Header — direktor bilan 1:1 */}
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
              <div className="header-page-title">O'quvchi paneli</div>
              <p className="page-subtitle">O'quv jarayoningizni kuzatib boring</p>
            </div>
          </div>
          <div className="header-right">
            <NotificationBell accent="#2563eb" viewAllLink="/student/notifications" />
            <div className="user-info">
              <div
                className={`user-avatar ${profileImageUrl ? 'has-image' : 'no-image'}`}
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              >
                {!profileImageUrl && (
                  <span className="user-initials">{userInitials}</span>
                )}
              </div>
              <div className="user-details">
                <span className="user-name">{user?.firstName} {user?.lastName}</span>
                <span className="user-role">{user?.role || "o'quvchi"}</span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="refresh-btn"
              aria-label="Sahifani yangilash"
              title="Sahifani yangilash (Hard Refresh)"
            >
              <span className="refresh-icon"><StudentDashIcon name="refresh" size={18} /></span>
            </button>
            <button onClick={handleLogout} className="logout-btn" aria-label="Tizimdan chiqish">
              <span className="logout-icon"><StudentDashIcon name="logout" size={18} /></span>
              <span className="logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Sidebar — direktor bilan 1:1 */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <span className="brand-icon"><StudentDashIcon name="education" size={18} /></span>
              <span className="brand-text">O'quvchi</span>
            </div>
          </div>
          <nav className="sidebar-nav" role="navigation" aria-label="Asosiy navigatsiya">
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
                    aria-label={item.label}
                  >
                    <span className="nav-icon" aria-hidden="true"><StudentDashIcon name={menuIconName(item)} /></span>
                    <span className="nav-text">
                      {item.label}
                    </span>
                    {item.badge > 0 && (
                      <span className="notification-badge" aria-label={`${item.badge} ta yangi bildirishnoma`}>
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
