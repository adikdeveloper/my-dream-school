import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
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

// Direktor panelidagi kabi ochiladigan bo'limlar (submenu)
const NAV_SECTIONS = [
  {
    key: 'main',
    label: 'Asosiy',
    icon: 'grid',
    items: [
      { path: '/student', label: 'Bosh sahifa', iconKey: 'grid', end: true },
      { path: '/student/ai', label: 'AI Yordamchi', iconKey: 'ai' },
      { path: '/student/schedule', label: 'Dars jadvali', iconKey: 'calendar' }
    ]
  },
  {
    key: 'education',
    label: "Ta'lim",
    icon: 'education',
    items: [
      { path: '/student/homework', label: 'Uy vazifalar', iconKey: 'journal' },
      { path: '/student/exams', label: 'Imtihonlar', iconKey: 'exams' },
      { path: '/student/my-class', label: 'Mening sinfim', iconKey: 'users' },
      { path: '/student/quarters', label: 'Chorak baholari', iconKey: 'exams' },
      { path: '/student/statistics', label: 'Mening natijalarim', iconKey: 'report' }
    ]
  },
  {
    key: 'communication',
    label: 'Aloqa',
    icon: 'message',
    items: [
      { path: '/student/chat', label: 'Chat', iconKey: 'message' },
      { path: '/student/notifications', label: 'Bildirishnomalar', iconKey: 'bell' }
    ]
  },
  {
    key: 'finance',
    label: "To'lovlar",
    icon: 'payments',
    items: [
      { path: '/student/payments', label: "To'lovlarim", iconKey: 'payments' }
    ]
  },
  {
    key: 'personal',
    label: 'Shaxsiy',
    icon: 'profile',
    items: [
      { path: '/student/profile', label: 'Profil', iconKey: 'profile' }
    ]
  }
];

// Lazy load components for code splitting and better performance
const StudentHome = lazy(() => import('../../components/student/StudentHome'));
const StudentSchedule = lazy(() => import('../../components/student/StudentSchedule'));
const Homework = lazy(() => import('../../components/student/Homework'));
const MyClass = lazy(() => import('../../components/student/MyClass'));
const Exams = lazy(() => import('../../components/student/Exams'));
const StudentStatistics = lazy(() => import('../../components/student/StudentStatistics'));
const StudentQuarterGrades = lazy(() => import('../../components/student/StudentQuarterGrades'));
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
      borderTop: '4px solid #3b82f6',
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
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState({ main: true });

  // Sahifa o'zgarganda tegishli bo'limni ochamiz
  useEffect(() => {
    setSidebarOpen(false);
    const activeSection = NAV_SECTIONS.find((section) =>
      section.items.some((item) => (
        item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
      ))
    );
    if (activeSection) {
      setOpenSubMenus((prev) => ({ ...prev, [activeSection.key]: true }));
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

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

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || "O'quvchi";

  const toggleSubMenu = (sectionKey) => {
    setOpenSubMenus((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const handleMenuItemClick = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const avatarStyle = profileImageUrl ? {
    backgroundImage: `url(${profileImageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } : undefined;

  return (
    <div className="admin-dashboard-layout student-shell">
      {/* Header — direktor paneli bilan bir xil */}
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
              <p className="page-subtitle">Maktab boshqaruv tizimi</p>
            </div>
          </div>
          <div className="header-right">
            <NotificationBell accent="#1e3a8a" viewAllLink="/student/notifications" />
            <div className="user-info">
              <div
                className={`user-avatar ${profileImageUrl ? 'has-image' : 'no-image'}`}
                style={avatarStyle}
              >
                {!profileImageUrl && (
                  <span className="user-initials">{userInitials}</span>
                )}
              </div>
              <div className="user-details">
                <span className="user-name">{fullName}</span>
                <span className="user-role">O'quvchi</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="refresh-btn"
              aria-label="Sahifani yangilash"
              title="Sahifani yangilash (Hard Refresh)"
            >
              <span className="refresh-icon"><StudentDashIcon name="refresh" size={18} /></span>
            </button>
            <button type="button" onClick={handleLogout} className="logout-btn" aria-label="Tizimdan chiqish">
              <span className="logout-icon"><StudentDashIcon name="logout" size={18} /></span>
              <span className="logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Sidebar — direktor paneli bilan bir xil */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div className="brand-avatar" style={avatarStyle} aria-hidden="true">
                {!profileImageUrl && <span>{userInitials}</span>}
              </div>
              <span className="brand-text">{fullName}</span>
            </div>
          </div>
          <nav className="sidebar-nav" role="navigation" aria-label="Asosiy navigatsiya">
            <ul className="nav-list">
              {NAV_SECTIONS.map((section) => (
                <li key={section.key} className="nav-item has-submenu">
                  <button
                    type="button"
                    className={`nav-link submenu-toggle ${openSubMenus[section.key] ? 'open' : ''}`}
                    onClick={() => toggleSubMenu(section.key)}
                    aria-expanded={Boolean(openSubMenus[section.key])}
                  >
                    <span className="nav-icon" aria-hidden="true"><StudentDashIcon name={section.icon} /></span>
                    <span className="nav-text">{section.label}</span>
                    <span className="submenu-arrow">▼</span>
                  </button>

                  <ul className={`submenu-list ${openSubMenus[section.key] ? 'expanded' : ''}`}>
                    {section.items.map((item) => (
                      <li key={item.path} className="submenu-item">
                        <NavLink
                          to={item.path}
                          end={item.end}
                          className={({ isActive }) => `submenu-link ${isActive ? 'active' : ''}`}
                          onClick={handleMenuItemClick}
                        >
                          <span className="nav-icon" aria-hidden="true"><StudentDashIcon name={item.iconKey} size={18} /></span>
                          <span className="nav-text">{item.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
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
                <Route path="/quarters" element={<StudentQuarterGrades />} />
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
