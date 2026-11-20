import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import NotificationBell from '../../components/common/NotificationBell';
import TeacherHome from '../../components/teacher/TeacherHome';
import GradingMonitor from '../../components/teacher/GradingMonitor';
import ClassJournal from '../../components/teacher/ClassJournal';
import Schedule from '../../components/teacher/Schedule';
import TeacherLessonList from '../../components/teacher/TeacherLessonList';
import StudentLists from '../../components/teacher/StudentLists';
import Tests from '../../components/teacher/Tests';
import Assignments from '../../components/teacher/Assignments';
import TeacherReports from '../../components/teacher/TeacherReports';
import QuarterGrades from '../../components/admin/QuarterGrades';
import TeacherCoins from '../../components/teacher/TeacherCoins';
import TeacherSalary from '../../components/teacher/TeacherSalary';
import TeacherProfile from '../../components/teacher/TeacherProfile';
import TeacherAI from '../../components/teacher/TeacherAI';
import Substitutions from '../../components/common/Substitutions';
import ChatPage from '../../components/chat/ChatPage';
import NotificationInbox from '../../components/common/NotificationInbox';
import TeacherUiIcon from '../../components/teacher/TeacherUiIcon';
import apiService from '../../services/apiService';
import '../director/DirectorDashboard.css';
import './TeacherDashboard.css';

// Direktor panelidagi kabi ochiladigan bo'limlar (submenu)
const NAV_SECTIONS = [
  {
    key: 'daily',
    label: 'Kundalik',
    icon: 'home',
    items: [
      { path: '/teacher', label: 'Bosh sahifa', icon: 'home', end: true },
      { path: '/teacher/grading-monitor', label: 'Baholash nazorati', icon: 'report' },
      { path: '/teacher/journal', label: 'Sinf jurnali', icon: 'book' },
      { path: '/teacher/schedule', label: 'Dars jadvali', icon: 'calendar' }
    ]
  },
  {
    key: 'education',
    label: "Ta'lim",
    icon: 'book',
    items: [
      { path: '/teacher/lesson-list', label: "Dars ro'yxati", icon: 'grid' },
      { path: '/teacher/substitutions', label: 'Almashtirish', icon: 'swap' },
      { path: '/teacher/students', label: "O'quvchilar", icon: 'users' },
      { path: '/teacher/tests', label: 'Testlar', icon: 'test' },
      { path: '/teacher/quarters', label: 'Chorak baholari', icon: 'report' },
      { path: '/teacher/assignments', label: 'Vazifalar', icon: 'assignment', badge: 'pendingGrading' }
    ]
  },
  {
    key: 'support',
    label: 'Yordam',
    icon: 'help',
    items: [
      { path: '/teacher/ai', label: 'AI yordamchi', icon: 'ai' },
      { path: '/teacher/chat', label: 'Chat', icon: 'chat' },
      { path: '/teacher/reports', label: 'Hisobotlar', icon: 'report' }
    ]
  },
  {
    key: 'personal',
    label: 'Shaxsiy',
    icon: 'profile',
    items: [
      { path: '/teacher/coins', label: 'Coinlar', icon: 'coins' },
      { path: '/teacher/salary', label: 'Maosh', icon: 'salary' },
      { path: '/teacher/profile', label: 'Profil', icon: 'profile' }
    ]
  }
];

const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return 'Xayrli tong';
  if (hour < 18) return 'Xayrli kun';
  return 'Xayrli kech';
};

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState({ daily: true });
  const [notificationCounts, setNotificationCounts] = useState({ pendingGrading: 0 });

  const isFlushPage = location.pathname === '/teacher/chat';

  const fetchNotificationCounts = useCallback(async () => {
    try {
      const counts = await apiService.getTeacherNotificationCounts();
      setNotificationCounts(counts || { pendingGrading: 0 });
    } catch (error) {
      // Bildirishnoma soni kritik emas — jim o'tkazamiz.
    }
  }, []);

  useEffect(() => {
    fetchNotificationCounts();
    const interval = setInterval(fetchNotificationCounts, 60000);
    return () => clearInterval(interval);
  }, [fetchNotificationCounts]);

  // Sahifa o'zgarganda mobil menyuni yopamiz va tegishli bo'limni ochamiz
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

  const profileImageUrl = useMemo(() => {
    if (!user?.profileImage) return null;
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
    return `${baseUrl}${user.profileImage}?t=${user._updated || Date.now()}`;
  }, [user?.profileImage, user?._updated]);

  const initials = useMemo(() => {
    const first = user?.firstName?.trim()?.charAt(0) || user?.username?.trim()?.charAt(0) || 'O';
    const last = user?.lastName?.trim()?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  }, [user?.firstName, user?.lastName, user?.username]);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || "O'qituvchi";
  const roleLabel = user?.role === 'teacher' ? "O'qituvchi" : (user?.role || "O'qituvchi");

  const toggleSubMenu = (sectionKey) => {
    setOpenSubMenus((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const handleMenuItemClick = async (item) => {
    setSidebarOpen(false);
    if (item?.badge && notificationCounts[item.badge] > 0) {
      try {
        await apiService.markSectionAsViewed(item.badge === 'pendingGrading' ? 'assignments' : item.badge);
        await fetchNotificationCounts();
      } catch (error) {
        // jim
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const badgeFor = (item) => {
    if (!item.badge) return 0;
    return Number(notificationCounts[item.badge]) || 0;
  };

  const avatarStyle = profileImageUrl
    ? { backgroundImage: `url(${profileImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  return (
    <div className="td-app admin-dashboard-layout teacher-shell">
      {/* Header — direktor paneli bilan bir xil dizayn */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
              aria-expanded={sidebarOpen}
            >
              <span className="hamburger"></span>
              <span className="hamburger"></span>
              <span className="hamburger"></span>
            </button>
            <Logo />
            <div className="page-info">
              <div className="header-page-title">O'qituvchi paneli</div>
              <p className="page-subtitle">Maktab boshqaruv tizimi</p>
            </div>
          </div>
          <div className="header-right">
            <NotificationBell accent="#1e3a8a" viewAllLink="/teacher/notifications" />
            <div className="user-info">
              <div
                className={`user-avatar ${profileImageUrl ? 'has-image' : 'no-image'}`}
                style={avatarStyle}
              >
                {!profileImageUrl && <span className="user-initials">{initials}</span>}
              </div>
              <div className="user-details">
                <span className="user-name">{fullName}</span>
                <span className="user-role">{roleLabel}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="refresh-btn"
              aria-label="Sahifani yangilash"
              title="Sahifani yangilash (Hard Refresh)"
            >
              <span className="refresh-icon"><TeacherUiIcon name="refresh" size={18} /></span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="logout-btn"
              aria-label="Tizimdan chiqish"
            >
              <span className="logout-icon"><TeacherUiIcon name="logout" size={18} /></span>
              <span className="logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Sidebar — direktor paneli bilan bir xil dizayn */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div className="brand-avatar" style={avatarStyle} aria-hidden="true">
                {!profileImageUrl && <span>{initials}</span>}
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
                    <span className="nav-icon"><TeacherUiIcon name={section.icon} size={20} /></span>
                    <span className="nav-text">{section.label}</span>
                    <span className="submenu-arrow">▼</span>
                  </button>

                  <ul className={`submenu-list ${openSubMenus[section.key] ? 'expanded' : ''}`}>
                    {section.items.map((item) => {
                      const count = badgeFor(item);
                      return (
                        <li key={item.path} className="submenu-item">
                          <NavLink
                            to={item.path}
                            end={item.end}
                            onClick={() => handleMenuItemClick(item)}
                            className={({ isActive }) => `submenu-link ${isActive ? 'active' : ''}`}
                          >
                            <span className="nav-icon"><TeacherUiIcon name={item.icon} size={18} /></span>
                            <span className="nav-text">{item.label}</span>
                            {count > 0 && (
                              <span className="notification-badge" aria-label={`${count} ta yangi bildirishnoma`}>
                                {count > 99 ? '99+' : count}
                              </span>
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Main Content */}
        <main className="main-content" role="main">
          <div className={`td-content ${isFlushPage ? 'is-flush' : ''}`}>
            <Routes>
              <Route path="/" element={<TeacherHome greeting={getGreeting()} />} />
              <Route path="/grading-monitor" element={<GradingMonitor />} />
              <Route path="/journal" element={<ClassJournal />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/lesson-list" element={<TeacherLessonList />} />
              <Route path="/substitutions" element={<Substitutions accent="#d9a441" />} />
              <Route path="/students" element={<StudentLists />} />
              <Route path="/tests" element={<Tests />} />
              <Route path="/quarters" element={<QuarterGrades />} />
              <Route path="/ai" element={<TeacherAI />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/notifications" element={<NotificationInbox />} />
              <Route path="/reports" element={<TeacherReports />} />
              <Route path="/coins" element={<TeacherCoins />} />
              <Route path="/salary" element={<TeacherSalary />} />
              <Route path="/profile" element={<TeacherProfile />} />
              <Route path="*" element={<Navigate to="/teacher" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;
