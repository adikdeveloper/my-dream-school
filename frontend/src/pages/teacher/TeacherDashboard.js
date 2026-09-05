import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import TeacherHome from '../../components/teacher/TeacherHome';
import ClassJournal from '../../components/teacher/ClassJournal';
import Schedule from '../../components/teacher/Schedule';
import TeacherLessonList from '../../components/teacher/TeacherLessonList';
import StudentLists from '../../components/teacher/StudentLists';
import Tests from '../../components/teacher/Tests';
import Assignments from '../../components/teacher/Assignments';
import TeacherReports from '../../components/teacher/TeacherReports';
import TeacherCoins from '../../components/teacher/TeacherCoins';
import TeacherSalary from '../../components/teacher/TeacherSalary';
import Profile from '../../components/admin/Profile';
import TeacherAI from '../../components/teacher/TeacherAI';
import Substitutions from '../../components/common/Substitutions';
import ChatPage from '../../components/chat/ChatPage';
import NotificationInbox from '../../components/common/NotificationInbox';
import NotificationBell from '../../components/common/NotificationBell';
import apiService from '../../services/apiService';
import './TeacherDashboard.css';
import '../director/DirectorDashboard.css';

const TEACHER_BLUE = '#2563eb';

const TeacherNavIcon = ({ name, size = 20 }) => {
  const paths = {
    home: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    journal: <><path d="M5 3h13a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2ZM5 3v16M9 7h7M9 11h7M9 15h5" /></>,
    schedule: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    list: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    substitution: <><path d="M7 7h11l-3-3M17 17H6l3 3" /><path d="M18 7l-3 3M6 17l3-3" /></>,
    students: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    tests: <><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h4" /><path d="m3 15 2 2 3-4" /></>,
    ai: <><rect x="4" y="7" width="16" height="13" rx="4" /><path d="M12 7V3M9 3h6M8 13h.01M16 13h.01M9 17h6" /></>,
    assignments: <><path d="M5 4h14v17H5zM9 4V2h6v2M9 10h6M9 14h6M9 18h4" /></>,
    chat: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    notifications: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    reports: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
    coins: <><circle cx="9" cy="12" r="6" /><path d="M9 9v6M7 10h3a1.5 1.5 0 0 1 0 3H8M15 7a5 5 0 1 1 0 10" /></>,
    salary: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /><circle cx="17" cy="15" r="1" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    refresh: <><path d="M20 6v5h-5M4 18v-5h5" /><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 9M5.5 15A7 7 0 0 0 17.8 17.8L20 15" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.home}</svg>;
};

const menuIconName = (item = {}) => {
  if (item.iconKey) return item.iconKey;
  const iconByPath = {
    '/teacher': 'home',
    '/teacher/journal': 'journal',
    '/teacher/schedule': 'schedule',
    '/teacher/lesson-list': 'list',
    '/teacher/substitutions': 'substitution',
    '/teacher/students': 'students',
    '/teacher/tests': 'tests',
    '/teacher/ai': 'ai',
    '/teacher/assignments': 'assignments',
    '/teacher/chat': 'chat',
    '/teacher/notifications': 'notifications',
    '/teacher/reports': 'reports',
    '/teacher/coins': 'coins',
    '/teacher/salary': 'salary',
    '/teacher/profile': 'profile'
  };
  if (iconByPath[item.path]) return iconByPath[item.path];
  return 'home';
};

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({
    pendingGrading: 0
  });

  useEffect(() => {
    fetchNotificationCounts();
    const interval = setInterval(fetchNotificationCounts, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNotificationCounts = async () => {
    try {
      const counts = await apiService.getTeacherNotificationCounts();
      setNotificationCounts(counts);
    } catch (error) {
      // Silently fail - notification counts are not critical
    }
  };

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
    { path: '/teacher',             label: 'Bosh sahifa',     iconKey: 'home', end: true, badge: null, section: null },
    { path: '/teacher/journal',     label: 'Sinf jurnali',    iconKey: 'journal', badge: null, section: null },
    { path: '/teacher/schedule',    label: 'Dars jadvali',    iconKey: 'schedule', badge: null, section: null },
    { path: '/teacher/lesson-list', label: "Dars ro'yxati",  iconKey: 'list', badge: null, section: null },
    { path: '/teacher/substitutions', label: 'Almashtirish',  iconKey: 'substitution', badge: null, section: null },
    { path: '/teacher/students',    label: "O'quvchilar",     iconKey: 'students', badge: null, section: null },
    { path: '/teacher/tests',       label: 'Testlar',         iconKey: 'tests', badge: null, section: null },
    { path: '/teacher/ai',          label: 'AI Yordamchi',    iconKey: 'ai', badge: null, section: null },
    { path: '/teacher/assignments', label: 'Vazifalar',       iconKey: 'assignments', badge: notificationCounts.pendingGrading, section: 'assignments' },
    { path: '/teacher/chat',        label: 'Chat',            iconKey: 'chat', badge: null, section: null },
    { path: '/teacher/notifications', label: 'Bildirishnomalar', iconKey: 'notifications', badge: null, section: null },
    { path: '/teacher/reports',     label: 'Hisobotlar',      iconKey: 'reports', badge: null, section: null },
    { path: '/teacher/coins',       label: 'Coinlar',         iconKey: 'coins', badge: null, section: null },
    { path: '/teacher/salary',      label: 'Maosh',           iconKey: 'salary', badge: null, section: null },
    { path: '/teacher/profile',     label: 'Profil',          iconKey: 'profile', badge: null, section: null }
  ];

  const handleMenuItemClick = async (section) => {
    setSidebarOpen(false);
    if (section && notificationCounts.pendingGrading > 0) {
      try {
        await apiService.markSectionAsViewed(section);
        await fetchNotificationCounts();
      } catch (error) {
        // Silently fail
      }
    }
  };

  const handleLogout = () => logout();
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="admin-dashboard-layout">
      {/* ─────────── HEADER — direktor bilan 1:1 ─────────── */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button
              className="sidebar-toggle"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
              aria-expanded={sidebarOpen}
            >
              <span className="hamburger" />
              <span className="hamburger" />
              <span className="hamburger" />
            </button>
            <Logo />
            <div className="page-info">
              <div className="header-page-title">O'qituvchi paneli</div>
              <p className="page-subtitle">Sinf boshqaruvi va o'qitish vositalari</p>
            </div>
          </div>
          <div className="header-right">
            <NotificationBell accent={TEACHER_BLUE} viewAllLink="/teacher/notifications" />
            <div className="user-info">
              <div
                className={`user-avatar ${profileImageUrl ? 'has-image' : 'no-image'}`}
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              >
                {!profileImageUrl && <span className="user-initials">{userInitials}</span>}
              </div>
              <div className="user-details">
                <span className="user-name">{user?.firstName} {user?.lastName}</span>
                <span className="user-role">{user?.role || "o'qituvchi"}</span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="refresh-btn"
              aria-label="Sahifani yangilash"
              title="Sahifani yangilash (Hard Refresh)"
            >
              <span className="refresh-icon"><TeacherNavIcon name="refresh" size={18} /></span>
            </button>
            <button
              onClick={handleLogout}
              className="logout-btn"
              aria-label="Tizimdan chiqish"
            >
              <span className="logout-icon"><TeacherNavIcon name="logout" size={18} /></span>
              <span className="logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─────────── DASHBOARD CONTAINER ─────────── */}
      <div className="dashboard-container">
        {/* SIDEBAR — direktor bilan 1:1 */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div
                className="brand-avatar"
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
                aria-hidden="true"
              >
                {!profileImageUrl && <span>{userInitials}</span>}
              </div>
              <span className="brand-text">{user?.firstName} {user?.lastName}</span>
            </div>
          </div>

          <nav className="sidebar-nav" role="navigation" aria-label="Asosiy navigatsiya">
            <ul className="nav-list">
              {menuItems.map((item, index) => (
                <li key={index} className="nav-item">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    end={item.end}
                    onClick={() => handleMenuItemClick(item.section)}
                    aria-label={item.label}
                  >
                    <span className="nav-icon" aria-hidden="true"><TeacherNavIcon name={menuIconName(item)} /></span>
                    <span className="nav-text">{item.label}</span>
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

        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* MAIN */}
        <main className="main-content" role="main">
          <Routes>
            <Route path="/" element={<TeacherHome />} />
            <Route path="/journal" element={<ClassJournal />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/lesson-list" element={<TeacherLessonList />} />
            <Route path="/substitutions" element={<Substitutions accent={TEACHER_BLUE} />} />
            <Route path="/students" element={<StudentLists />} />
            <Route path="/tests" element={<Tests />} />
            <Route path="/ai" element={<TeacherAI />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/notifications" element={<NotificationInbox />} />
            <Route path="/reports" element={<TeacherReports />} />
            <Route path="/coins" element={<TeacherCoins />} />
            <Route path="/salary" element={<TeacherSalary />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/teacher" replace />} />
          </Routes>
        </main>
      </div>

      <style>{`
        .admin-dashboard-layout .sidebar .brand-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: #fff;
          background: #2563eb;
          flex-shrink: 0;
          overflow: hidden;
        }
        .admin-dashboard-layout .sidebar-brand .brand-text {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default TeacherDashboard;
