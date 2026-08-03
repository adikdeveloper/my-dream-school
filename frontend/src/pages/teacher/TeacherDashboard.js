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
import TeacherProfile from '../../components/teacher/TeacherProfile';
import TeacherSalary from '../../components/teacher/TeacherSalary';
import TeacherAI from '../../components/teacher/TeacherAI';
import Substitutions from '../../components/common/Substitutions';
import ChatPage from '../../components/chat/ChatPage';
import NotificationInbox from '../../components/common/NotificationInbox';
import NotificationBell from '../../components/common/NotificationBell';
import apiService from '../../services/apiService';
import './TeacherDashboard.css';

const TEACHER_BLUE = '#3b82f6';

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
    { path: '/teacher',             label: 'Bosh sahifa',     icon: '🏠', end: true, badge: null, section: null },
    { path: '/teacher/journal',     label: 'Sinf jurnali',    icon: '📖', badge: null, section: null },
    { path: '/teacher/schedule',    label: 'Dars jadvali',    icon: '📅', badge: null, section: null },
    { path: '/teacher/lesson-list', label: "Dars ro'yxati",  icon: '☷', badge: null, section: null },
    { path: '/teacher/substitutions', label: 'Almashtirish',  icon: '🔄', badge: null, section: null },
    { path: '/teacher/students',    label: "O'quvchilar",     icon: '👥', badge: null, section: null },
    { path: '/teacher/tests',       label: 'Testlar',         icon: '📋', badge: null, section: null },
    { path: '/teacher/ai',          label: 'AI Yordamchi',    icon: '🤖', badge: null, section: null },
    { path: '/teacher/assignments', label: 'Vazifalar',       icon: '📝', badge: notificationCounts.pendingGrading, section: 'assignments' },
    { path: '/teacher/chat',        label: 'Chat',            icon: '💬', badge: null, section: null },
    { path: '/teacher/notifications', label: 'Bildirishnomalar', icon: '📥', badge: null, section: null },
    { path: '/teacher/reports',     label: 'Hisobotlar',      icon: '📊', badge: null, section: null },
    { path: '/teacher/coins',       label: 'Coinlar',         icon: '🪙', badge: null, section: null },
    { path: '/teacher/salary',      label: 'Maosh',           icon: '💰', badge: null, section: null },
    { path: '/teacher/profile',     label: 'Profil',          icon: '👤', badge: null, section: null }
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
    <div className="tch-layout">
      {/* ─────────── HEADER ─────────── */}
      <header className="tch-header">
        <div className="tch-header-content">
          <div className="tch-header-left">
            <button
              className="tch-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
              aria-expanded={sidebarOpen}
            >
              <span className="tch-hamburger" />
              <span className="tch-hamburger" />
              <span className="tch-hamburger" />
            </button>
            <Logo />
            <div className="tch-page-info">
              <h1 className="tch-page-title">O'qituvchi paneli</h1>
              <p className="tch-page-subtitle">Sinf boshqaruvi va o'qitish vositalari</p>
            </div>
          </div>
          <div className="tch-header-right">
            <NotificationBell accent={TEACHER_BLUE} viewAllLink="/teacher/notifications" />
            <div className="tch-user-info">
              <div
                className={`tch-user-avatar ${profileImageUrl ? 'has-image' : 'no-image'}`}
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              >
                {!profileImageUrl && <span className="tch-user-initials">{userInitials}</span>}
              </div>
              <div className="tch-user-details">
                <span className="tch-user-name">{user?.firstName} {user?.lastName}</span>
                <span className="tch-user-role">O'qituvchi</span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="tch-refresh-btn"
              aria-label="Sahifani yangilash"
              title="Sahifani yangilash"
            >
              <span className="tch-refresh-icon">🔄</span>
            </button>
            <button
              onClick={handleLogout}
              className="tch-logout-btn"
              aria-label="Tizimdan chiqish"
            >
              <span className="tch-logout-icon">🚪</span>
              <span className="tch-logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─────────── DASHBOARD CONTAINER ─────────── */}
      <div className="tch-container">
        {/* SIDEBAR */}
        <aside className={`tch-sidebar ${sidebarOpen ? 'tch-sidebar-open' : ''}`}>
          <div className="tch-sidebar-header">
            <div className="tch-sidebar-brand">
              <div
                className={`tch-sidebar-profile-img ${profileImageUrl ? 'has-image' : 'no-image'}`}
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              >
                {!profileImageUrl && <span className="tch-initials">{userInitials}</span>}
              </div>
              <div className="tch-sidebar-profile-info">
                <span className="tch-profile-name">{user?.firstName} {user?.lastName}</span>
                <span className="tch-profile-role">O'qituvchi</span>
              </div>
            </div>
          </div>

          <nav className="tch-sidebar-nav" role="navigation" aria-label="Asosiy navigatsiya">
            <ul className="tch-nav-list">
              {menuItems.map((item, index) => (
                <li key={index} className="tch-nav-item">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `tch-nav-link ${isActive ? 'tch-nav-active' : ''}`}
                    end={item.end}
                    onClick={() => handleMenuItemClick(item.section)}
                    aria-label={item.label}
                  >
                    <span className="tch-nav-icon" aria-hidden="true">{item.icon}</span>
                    <span className="tch-nav-text">{item.label}</span>
                    {item.badge > 0 && <span className="tch-nav-badge">{item.badge}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {sidebarOpen && <div className="tch-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* MAIN */}
        <main className="tch-main" role="main">
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
            <Route path="/profile" element={<TeacherProfile />} />
            <Route path="*" element={<Navigate to="/teacher" replace />} />
          </Routes>
        </main>
      </div>

      {/* ─────────── STYLES (Hisobchi dizayni asosida — ko'k accent) ─────────── */}
      <style>{`
        /* Tokens — O'qituvchi ko'k (sky blue) accent palitra */
        .tch-layout {
          --tch-primary:   #075985;
          --tch-accent:    #0284c7;
          --tch-accent-2:  #0ea5e9;
          --tch-soft:      #e0f2fe;
          --tch-soft-2:    #bae6fd;
          --tch-deep:      #0c4a6e;
          --tch-text:      #075985;

          --tch-bg-page:   #f8fafc;
          --tch-bg-card:   #ffffff;
          --tch-border:    #e2e8f0;
          --tch-text-main: #1e293b;
          --tch-text-mute: #64748b;

          --tch-shadow-sm: 0 1px 4px rgba(0,0,0,0.05);
          --tch-shadow:    0 4px 12px rgba(0,0,0,0.07);
          --tch-shadow-md: 0 4px 20px rgba(0,0,0,0.08);

          min-height: 100vh;
          background: var(--tch-bg-page);
        }

        /* ========================================================
           BASE — DESKTOP (≥1200px)
        ======================================================== */
        .tch-header {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-bottom: 1px solid var(--tch-border);
          box-shadow: var(--tch-shadow);
          position: sticky;
          top: 0;
          z-index: 100;
          height: 85px;
          backdrop-filter: blur(8px);
        }
        .tch-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          height: 100%;
        }
        .tch-header-left {
          display: flex; align-items: center; gap: 2rem;
          flex: 1; min-width: 0;
        }
        .tch-sidebar-toggle {
          display: none;
          flex-direction: column; justify-content: center; align-items: center;
          background: none; border: 1px solid transparent; cursor: pointer;
          padding: 0.625rem; border-radius: 10px;
          transition: all 0.2s ease;
        }
        .tch-sidebar-toggle:hover {
          background: var(--tch-soft); border-color: var(--tch-accent);
        }
        .tch-hamburger {
          width: 22px; height: 3px; background: #475569;
          margin: 2.5px 0; border-radius: 2px; transition: all 0.3s ease;
        }
        .tch-page-info { display: flex; flex-direction: column; gap: 0.2rem; }
        .tch-page-title {
          font-size: 1.25rem; font-weight: 800; margin: 0;
          background: linear-gradient(135deg, var(--tch-primary) 0%, var(--tch-accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.025em; line-height: 1.2;
        }
        .tch-page-subtitle {
          font-size: 0.75rem; color: var(--tch-text-mute);
          margin: 0; font-weight: 600; letter-spacing: 0.01em;
        }
        .tch-header-right {
          display: flex; align-items: center; gap: 1.25rem; flex-shrink: 0;
        }
        .tch-user-info {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.5rem 0.875rem;
          background: linear-gradient(135deg, #f8fafc 0%, #fff 100%);
          border-radius: 12px;
          border: 1px solid var(--tch-border);
          box-shadow: var(--tch-shadow-sm);
          transition: all 0.2s ease;
        }
        .tch-user-info:hover { transform: translateY(-1px); box-shadow: var(--tch-shadow); }
        .tch-user-avatar {
          width: 38px; height: 38px;
          color: #fff; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.8125rem; flex-shrink: 0;
        }
        .tch-user-avatar.no-image {
          background: linear-gradient(135deg, var(--tch-primary) 0%, var(--tch-deep) 100%);
          color: #fff;
          border: 2px solid var(--tch-soft-2);
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
        }
        .tch-user-avatar.has-image { background: none; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
        .tch-user-initials { color: #fff; font-weight: 800; letter-spacing: 0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.35); }
        .tch-user-details { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
        .tch-user-name { font-weight: 700; color: var(--tch-text-main); font-size: 0.8125rem; line-height: 1.2; white-space: nowrap; }
        .tch-user-role { font-size: 0.6875rem; color: var(--tch-accent); font-weight: 700; text-transform: uppercase; }

        .tch-refresh-btn {
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #38bdf8, #0ea5e9);
          color: #fff; border: 1px solid rgba(255,255,255,0.1);
          width: 42px; height: 42px; border-radius: 10px;
          cursor: pointer; transition: all 0.3s ease;
          box-shadow: 0 2px 6px rgba(14,165,233,0.3);
        }
        .tch-refresh-btn:hover { transform: translateY(-1px) rotate(180deg); box-shadow: 0 4px 12px rgba(14,165,233,0.4); }
        .tch-refresh-icon { font-size: 1.2rem; }

        .tch-logout-btn {
          display: flex; align-items: center; gap: 0.5rem;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff; border: 1px solid rgba(255,255,255,0.1);
          padding: 0.625rem 1rem; border-radius: 10px;
          font-weight: 700; cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.8125rem;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
        }
        .tch-logout-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); background: linear-gradient(135deg, #f87171, #ef4444); }
        .tch-logout-icon { font-size: 0.95rem; }

        /* Container */
        .tch-container {
          display: flex;
          min-height: calc(100vh - 85px);
          position: relative;
        }

        /* Sidebar */
        .tch-sidebar {
          width: 240px;
          background: #fff;
          border-right: 1px solid var(--tch-border);
          display: flex; flex-direction: column;
          position: fixed;
          left: 0; top: 85px;
          height: calc(100vh - 85px);
          z-index: 50;
          transition: all 0.3s ease;
          box-shadow: 1px 0 6px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .tch-sidebar-header {
          padding: 1rem 0.875rem;
          border-bottom: 1px solid var(--tch-border);
          background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%);
          flex-shrink: 0;
        }
        .tch-sidebar-brand {
          display: flex; align-items: center; gap: 0.75rem;
        }
        .tch-sidebar-profile-img {
          width: 46px; height: 46px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--tch-primary) 0%, var(--tch-accent) 100%);
          color: #fff; font-weight: 800; font-size: 1rem;
          flex-shrink: 0;
          box-shadow: 0 6px 16px rgba(2, 132, 199, 0.25);
          border: 2.5px solid #fff;
          overflow: hidden;
        }
        .tch-sidebar-profile-img .tch-initials {
          color: #fff; font-weight: 800; font-size: 0.95rem;
          text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .tch-sidebar-profile-info {
          display: flex; flex-direction: column; gap: 3px;
          overflow: hidden; flex: 1; min-width: 0;
        }
        .tch-profile-name {
          font-size: 0.875rem; font-weight: 700;
          color: var(--tch-text-main);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .tch-profile-role {
          font-size: 0.68rem; font-weight: 700;
          color: var(--tch-accent);
          text-transform: uppercase; letter-spacing: 0.05em;
          background: var(--tch-soft);
          padding: 1px 7px; border-radius: 4px;
          display: inline-block; width: fit-content;
        }

        .tch-sidebar-nav { flex: 1; padding: 0; overflow-y: auto; }
        .tch-sidebar-nav::-webkit-scrollbar { width: 4px; }
        .tch-sidebar-nav::-webkit-scrollbar-track { background: #f8fafc; }
        .tch-sidebar-nav::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .tch-sidebar-nav::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        .tch-nav-list {
          list-style: none; margin: 0; padding: 0.5rem;
          display: flex; flex-direction: column; gap: 2px;
        }
        .tch-nav-item { margin: 0; }
        .tch-nav-link {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          color: var(--tch-text-mute);
          text-decoration: none;
          transition: all 0.25s ease;
          border-radius: 10px;
          font-weight: 600; font-size: 0.875rem;
          border: 1px solid transparent;
        }
        .tch-nav-link:hover {
          background: var(--tch-soft);
          color: var(--tch-text);
          transform: translateX(3px);
          border-color: var(--tch-soft-2);
        }
        .tch-nav-active {
          background: linear-gradient(135deg, var(--tch-soft) 0%, var(--tch-soft-2) 100%) !important;
          color: var(--tch-text) !important;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.15);
          border-color: var(--tch-accent-2) !important;
          transform: translateX(3px);
        }
        .tch-nav-icon {
          font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center;
          width: 22px; flex-shrink: 0;
        }
        .tch-nav-text {
          flex: 1; white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis; line-height: 1.2;
        }
        .tch-nav-badge {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff; font-size: 0.7rem; font-weight: 800;
          min-width: 20px; height: 20px; padding: 0 6px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          line-height: 1; flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(239,68,68,0.4);
        }

        /* Main */
        .tch-main {
          flex: 1;
          padding: 0;
          background: var(--tch-bg-page);
          min-height: calc(100vh - 85px);
          overflow-x: hidden;
          margin-left: 240px;
        }

        .tch-sidebar-overlay { display: none; }

        /* ========================================================
           NOUTBUK (992px – 1199px)
        ======================================================== */
        @media (min-width: 992px) and (max-width: 1199px) {
          .tch-header { height: 80px; }
          .tch-header-content { padding: 0 1.5rem; }
          .tch-header-left { gap: 1.5rem; }
          .tch-header-right { gap: 1rem; }
          .tch-page-title { font-size: 1.125rem; }
          .tch-page-subtitle { font-size: 0.7rem; }

          .tch-sidebar { width: 200px; top: 80px; height: calc(100vh - 80px); }
          .tch-container { min-height: calc(100vh - 80px); }
          .tch-main { margin-left: 200px; min-height: calc(100vh - 80px); }

          .tch-nav-link { padding: 9px 11px; font-size: 0.825rem; }
        }

        /* ========================================================
           PLANSHET (768px – 991px) — sidebar OVERLAY mode
        ======================================================== */
        @media (min-width: 768px) and (max-width: 991px) {
          .tch-header { height: 76px; }
          .tch-header-content { padding: 0 1.25rem; }
          .tch-header-left { gap: 1rem; }
          .tch-header-right { gap: 0.875rem; }
          .tch-page-info { display: none; }

          .tch-sidebar-toggle { display: flex; }

          .tch-container { min-height: calc(100vh - 76px); }
          .tch-sidebar {
            width: 220px;
            top: 76px;
            height: calc(100vh - 76px);
            transform: translateX(-100%);
            box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          }
          .tch-sidebar-open { transform: translateX(0); }

          .tch-sidebar-overlay {
            display: block;
            position: fixed;
            top: 76px; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 40;
            backdrop-filter: blur(2px);
          }
          .tch-main { margin-left: 0; min-height: calc(100vh - 76px); }

          .tch-user-info { padding: 0.4rem 0.625rem; }
          .tch-user-avatar { width: 34px; height: 34px; }
          .tch-user-details { display: flex; }
          .tch-user-name { font-size: 0.75rem; }
          .tch-user-role { font-size: 0.62rem; }

          .tch-refresh-btn { width: 38px; height: 38px; }
          .tch-logout-btn { padding: 0.5rem 0.75rem; font-size: 0.75rem; }
        }

        /* ========================================================
           TELEFON (481px – 767px)
        ======================================================== */
        @media (min-width: 481px) and (max-width: 767px) {
          .tch-header { height: 70px; }
          .tch-header-content { padding: 0 0.875rem; gap: 0.625rem; }
          .tch-header-left { gap: 0.75rem; }
          .tch-header-right { gap: 0.625rem; }
          .tch-page-info { display: none; }

          .tch-sidebar-toggle { display: flex; padding: 0.5rem; }
          .tch-hamburger { width: 20px; height: 2.5px; margin: 2px 0; }

          .tch-container { min-height: calc(100vh - 70px); }
          .tch-sidebar {
            width: 200px;
            top: 70px;
            height: calc(100vh - 70px);
            transform: translateX(-100%);
            box-shadow: 4px 0 20px rgba(0,0,0,0.18);
          }
          .tch-sidebar-open { transform: translateX(0); }

          .tch-sidebar-overlay {
            display: block;
            position: fixed;
            top: 70px; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.55);
            z-index: 40;
            backdrop-filter: blur(3px);
          }
          .tch-main { margin-left: 0; min-height: calc(100vh - 70px); }

          .tch-user-info { padding: 0.3rem 0.5rem; gap: 0.5rem; }
          .tch-user-avatar { width: 32px; height: 32px; font-size: 0.72rem; }
          .tch-user-details { display: none; }

          .tch-refresh-btn { width: 36px; height: 36px; }
          .tch-refresh-icon { font-size: 1.05rem; }

          .tch-logout-btn {
            min-height: 36px;
            gap: 0.4rem;
            padding: 0.45rem 0.65rem;
            font-size: 0.75rem;
          }
          .tch-logout-icon { font-size: 0.85rem; }
        }

        /* ========================================================
           KICHIK TELEFON (≤480px)
        ======================================================== */
        @media (max-width: 480px) {
          .tch-header { height: 64px; }
          .tch-header-content { padding: 0 0.625rem; gap: 0.5rem; }
          .tch-header-left { gap: 0.5rem; min-width: 0; flex: 1; }
          .tch-header-right { gap: 0.4rem; flex-shrink: 0; }
          .tch-page-info { display: none; }

          .tch-sidebar-toggle {
            display: flex;
            width: 36px; height: 36px;
            padding: 0.45rem;
            border-radius: 9px;
            flex-shrink: 0;
          }
          .tch-hamburger { width: 20px; height: 2px; margin: 2.5px 0; }

          .tch-container { min-height: calc(100vh - 64px); }
          .tch-sidebar {
            width: 175px;
            top: 64px;
            height: calc(100vh - 64px);
            transform: translateX(-100%);
            box-shadow: 4px 0 20px rgba(0,0,0,0.2);
          }
          .tch-sidebar-open { transform: translateX(0); }
          .tch-sidebar-header { padding: 0.875rem 0.75rem; }
          .tch-sidebar-profile-img { width: 40px; height: 40px; }
          .tch-profile-name { font-size: 0.78rem; }
          .tch-profile-role { font-size: 0.6rem; }
          .tch-nav-link { padding: 9px 11px; font-size: 0.8rem; }
          .tch-nav-icon { font-size: 1rem; }

          .tch-sidebar-overlay {
            display: block;
            position: fixed;
            top: 64px; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            z-index: 40;
            backdrop-filter: blur(3px);
          }
          .tch-main { margin-left: 0; min-height: calc(100vh - 64px); }

          .tch-user-info {
            padding: 0.2rem;
            border-radius: 10px;
            gap: 0;
          }
          .tch-user-avatar { width: 28px; height: 28px; font-size: 0.65rem; }
          .tch-user-details { display: none; }

          .tch-refresh-btn { width: 34px; height: 34px; border-radius: 8px; }
          .tch-refresh-icon { font-size: 0.95rem; }

          .tch-logout-btn {
            width: 36px; min-height: 36px;
            padding: 0; justify-content: center;
            border-radius: 8px;
          }
          .tch-logout-text { display: none; }
          .tch-logout-icon { font-size: 0.9rem; }
        }
      `}</style>
    </div>
  );
};

export default TeacherDashboard;
