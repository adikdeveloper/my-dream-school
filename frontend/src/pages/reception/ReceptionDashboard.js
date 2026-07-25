import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import StudentManagement from '../../components/admin/StudentManagement';
import TeacherManagement from '../../components/admin/TeacherManagement';
import SubjectManagement from '../../components/admin/SubjectManagement';
import LeadsManagement from '../../components/admin/LeadsManagement';
import Profile from '../../components/admin/Profile';
import ChatPage from '../../components/chat/ChatPage';
import NotificationInbox from '../../components/common/NotificationInbox';
import NotificationBell from '../../components/common/NotificationBell';
import apiService from '../../services/apiService';

const TEAL = '#0d9488';

// ====================== RECEPTION BOSH SAHIFA ======================
const ReceptionHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, active: 0, leads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [studentStats, leads] = await Promise.all([
          apiService.getStudentStats().catch(() => ({ total: 0, active: 0 })),
          apiService.getLeads().catch(() => [])
        ]);
        const leadsCount = Array.isArray(leads)
          ? leads.length
          : (leads?.leads?.length ?? leads?.total ?? 0);
        if (mounted) {
          setStats({
            total: studentStats?.total ?? 0,
            active: studentStats?.active ?? 0,
            leads: leadsCount
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli kech';

  const statCards = [
    { label: 'Jami o‘quvchilar', value: stats.total, icon: '👨‍🎓', color: '#0d9488' },
    { label: 'Faol o‘quvchilar', value: stats.active, icon: '✅', color: '#2563eb' },
    { label: 'Lidlar (mijozlar)', value: stats.leads, icon: '📞', color: '#d97706' }
  ];

  const quickActions = [
    { label: 'Yangi o‘quvchi kiritish', desc: 'Tizimga o‘quvchi qo‘shish', icon: '➕', to: '/reception/students' },
    { label: 'O‘qituvchilar', desc: 'O‘qituvchi qo‘shish va fanga biriktirish', icon: '👨‍🏫', to: '/reception/teachers' },
    { label: 'Fanlar', desc: 'Yangi fan yaratish va boshqarish', icon: '📚', to: '/reception/subjects' },
    { label: 'Lidlar bazasi', desc: 'Yangi mijoz / ariza', icon: '📞', to: '/reception/leads' }
  ];

  return (
    <div className="rc-home">
      <div className="rc-welcome">
        <div>
          <h2>{greeting}, {user?.firstName || 'Qabulxona'} 👋</h2>
          <p>Qabulxona paneli — o‘quvchi, o‘qituvchi, fanlar va mijozlar bazasini yuriting.</p>
        </div>
      </div>

      <div className="rc-stats">
        {statCards.map((c) => (
          <div className="rc-stat-card" key={c.label}>
            <div className="rc-stat-icon" style={{ background: `${c.color}1a`, color: c.color }}>{c.icon}</div>
            <div>
              <div className="rc-stat-value">{loading ? '…' : c.value}</div>
              <div className="rc-stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 className="rc-section-title">Tezkor amallar</h3>
      <div className="rc-actions">
        {quickActions.map((a) => (
          <button className="rc-action-card" key={a.label} onClick={() => navigate(a.to)}>
            <span className="rc-action-icon">{a.icon}</span>
            <span className="rc-action-text">
              <span className="rc-action-label">{a.label}</span>
              <span className="rc-action-desc">{a.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <style>{`
        .rc-home { padding: 1.75rem; max-width: 1200px; margin: 0 auto; }
        .rc-welcome { background: linear-gradient(135deg, #0f766e, #0d9488); color: #fff; border-radius: 16px; padding: 1.75rem 2rem; margin-bottom: 1.5rem; box-shadow: 0 8px 24px rgba(13,148,136,0.25); }
        .rc-welcome h2 { margin: 0 0 .35rem; font-size: 1.5rem; font-weight: 700; }
        .rc-welcome p { margin: 0; opacity: .9; font-size: .95rem; }
        .rc-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .rc-stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.25rem 1.5rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .rc-stat-icon { width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
        .rc-stat-value { font-size: 1.7rem; font-weight: 800; color: #0f172a; line-height: 1; }
        .rc-stat-label { font-size: .85rem; color: #64748b; margin-top: .35rem; }
        .rc-section-title { font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0 0 1rem; }
        .rc-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
        .rc-action-card { display: flex; align-items: center; gap: 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 1.1rem 1.25rem; cursor: pointer; text-align: left; transition: transform .15s, box-shadow .15s, border-color .15s; }
        .rc-action-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(13,148,136,0.15); border-color: #0d9488; }
        .rc-action-icon { width: 44px; height: 44px; border-radius: 10px; background: #0d94881a; color: #0d9488; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
        .rc-action-text { display: flex; flex-direction: column; }
        .rc-action-label { font-weight: 600; color: #1e293b; font-size: .95rem; }
        .rc-action-desc { font-size: .8rem; color: #94a3b8; margin-top: .15rem; }
      `}</style>
    </div>
  );
};

// ====================== RECEPTION DASHBOARD ======================
const ReceptionDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const profileImageUrl = useMemo(() => {
    if (!user?.profileImage) return null;
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
    const timestamp = user._updated || 0;
    return `${baseUrl}${user.profileImage}?t=${timestamp}`;
  }, [user?.profileImage, user?._updated]);

  const userInitials = useMemo(() => {
    const firstInitial = user?.firstName?.trim()?.charAt(0) || user?.username?.trim()?.charAt(0) || 'R';
    const lastInitial = user?.lastName?.trim()?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }, [user?.firstName, user?.lastName, user?.username]);

  const menuItems = [
    { path: '/reception', label: 'Bosh sahifa', icon: '🏠', end: true },
    { path: '/reception/students', label: "O'quvchilar", icon: '👨‍🎓' },
    { path: '/reception/teachers', label: "O'qituvchilar", icon: '👨‍🏫' },
    { path: '/reception/subjects', label: 'Fanlar', icon: '📚' },
    { path: '/reception/leads', label: 'Lidlar', icon: '📞' },
    { path: '/reception/chat', label: 'Chat', icon: '💬' },
    { path: '/reception/profile', label: 'Profil', icon: '👤' }
  ];

  const toggleSidebar = () => setSidebarOpen((o) => !o);

  return (
    <div className="rc-layout">
      {/* ─────────── HEADER ─────────── */}
      <header className="rc-header">
        <div className="rc-header-content">
          <div className="rc-header-left">
            <button
              className="rc-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
              aria-expanded={sidebarOpen}
            >
              <span className="rc-hamburger" />
              <span className="rc-hamburger" />
              <span className="rc-hamburger" />
            </button>
            <Logo />
            <div className="rc-page-info">
              <h1 className="rc-page-title">Reception paneli</h1>
              <p className="rc-page-subtitle">Qabulxona</p>
            </div>
          </div>
          <div className="rc-header-right">
            <NotificationBell accent={TEAL} viewAllLink="/reception/notifications" />
            <div className="rc-user-info">
              <div
                className={`rc-user-avatar ${profileImageUrl ? 'has-image' : 'no-image'}`}
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              >
                {!profileImageUrl && <span className="rc-user-initials">{userInitials}</span>}
              </div>
              <div className="rc-user-details">
                <span className="rc-user-name">{user?.firstName} {user?.lastName}</span>
                <span className="rc-user-role">Reception</span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="rc-refresh-btn"
              aria-label="Sahifani yangilash"
              title="Sahifani yangilash"
            >
              <span className="rc-refresh-icon">🔄</span>
            </button>
            <button
              onClick={logout}
              className="rc-logout-btn"
              aria-label="Tizimdan chiqish"
            >
              <span className="rc-logout-icon">🚪</span>
              <span className="rc-logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─────────── DASHBOARD CONTAINER ─────────── */}
      <div className="rc-container">
        {/* SIDEBAR */}
        <aside className={`rc-sidebar ${sidebarOpen ? 'rc-sidebar-open' : ''}`}>
          <div className="rc-sidebar-header">
            <div className="rc-sidebar-brand">
              <div
                className={`rc-sidebar-profile-img ${profileImageUrl ? 'has-image' : 'no-image'}`}
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              >
                {!profileImageUrl && <span className="rc-initials">{userInitials}</span>}
              </div>
              <div className="rc-sidebar-profile-info">
                <span className="rc-profile-name">{user?.firstName} {user?.lastName}</span>
                <span className="rc-profile-role">Reception</span>
              </div>
            </div>
          </div>

          <nav className="rc-sidebar-nav" role="navigation" aria-label="Asosiy navigatsiya">
            <ul className="rc-nav-list">
              {menuItems.map((item, index) => (
                <li key={index} className="rc-nav-item">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `rc-nav-link ${isActive ? 'rc-nav-active' : ''}`}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    aria-label={item.label}
                  >
                    <span className="rc-nav-icon" aria-hidden="true">{item.icon}</span>
                    <span className="rc-nav-text">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {sidebarOpen && <div className="rc-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* MAIN */}
        <main className="rc-main" role="main">
          <Routes>
            <Route path="/" element={<ReceptionHome />} />
            <Route path="/students" element={<StudentManagement />} />
            <Route path="/teachers" element={<TeacherManagement />} />
            <Route path="/subjects" element={<SubjectManagement />} />
            <Route path="/leads" element={<LeadsManagement />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/notifications" element={<NotificationInbox />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/reception" replace />} />
          </Routes>
        </main>
      </div>

      {/* ─────────── STYLES (Hisobchi dashboard tuzilishi, teal palitra) ─────────── */}
      <style>{`
        /* Tokens — Reception teal accent palitra */
        .rc-layout {
          --rc-primary:   #0f766e;
          --rc-accent:    #0d9488;
          --rc-accent-2:  #14b8a6;
          --rc-soft:      #ccfbf1;
          --rc-soft-2:    #99f6e4;
          --rc-deep:      #134e4a;
          --rc-text:      #115e59;

          --rc-bg-page:   #f8fafc;
          --rc-bg-card:   #ffffff;
          --rc-border:    #e2e8f0;
          --rc-text-main: #1e293b;
          --rc-text-mute: #64748b;

          --rc-shadow-sm: 0 1px 4px rgba(0,0,0,0.05);
          --rc-shadow:    0 4px 12px rgba(0,0,0,0.07);

          min-height: 100vh;
          background: var(--rc-bg-page);
        }

        /* ========================================================
           BASE — DESKTOP (≥1200px)
        ======================================================== */
        .rc-header {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-bottom: 1px solid var(--rc-border);
          box-shadow: var(--rc-shadow);
          position: sticky;
          top: 0;
          z-index: 100;
          height: 85px;
          backdrop-filter: blur(8px);
        }
        .rc-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          height: 100%;
        }
        .rc-header-left {
          display: flex; align-items: center; gap: 2rem;
          flex: 1; min-width: 0;
        }
        .rc-sidebar-toggle {
          display: none;
          flex-direction: column; justify-content: center; align-items: center;
          background: none; border: 1px solid transparent; cursor: pointer;
          padding: 0.625rem; border-radius: 10px;
          transition: all 0.2s ease;
        }
        .rc-sidebar-toggle:hover {
          background: var(--rc-soft); border-color: var(--rc-accent);
        }
        .rc-hamburger {
          width: 22px; height: 3px; background: #475569;
          margin: 2.5px 0; border-radius: 2px; transition: all 0.3s ease;
        }
        .rc-page-info { display: flex; flex-direction: column; gap: 0.2rem; }
        .rc-page-title {
          font-size: 1.25rem; font-weight: 800; margin: 0;
          background: linear-gradient(135deg, var(--rc-primary) 0%, var(--rc-accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.025em; line-height: 1.2;
        }
        .rc-page-subtitle {
          font-size: 0.75rem; color: var(--rc-text-mute);
          margin: 0; font-weight: 600; letter-spacing: 0.01em;
        }
        .rc-header-right {
          display: flex; align-items: center; gap: 1rem; flex-shrink: 0;
        }
        .rc-user-info {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.5rem 0.875rem;
          background: linear-gradient(135deg, #f8fafc 0%, #fff 100%);
          border-radius: 12px;
          border: 1px solid var(--rc-border);
          box-shadow: var(--rc-shadow-sm);
          transition: all 0.2s ease;
        }
        .rc-user-info:hover { transform: translateY(-1px); box-shadow: var(--rc-shadow); }
        .rc-user-avatar {
          width: 38px; height: 38px;
          color: #fff; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.8125rem; flex-shrink: 0;
        }
        .rc-user-avatar.no-image {
          background: linear-gradient(135deg, var(--rc-primary) 0%, var(--rc-deep) 100%);
          color: #fff;
          border: 2px solid var(--rc-soft-2);
          box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
        }
        .rc-user-avatar.has-image { background: none; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
        .rc-user-initials { color: #fff; font-weight: 800; letter-spacing: 0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.35); }
        .rc-user-details { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
        .rc-user-name { font-weight: 700; color: var(--rc-text-main); font-size: 0.8125rem; line-height: 1.2; white-space: nowrap; }
        .rc-user-role { font-size: 0.6875rem; color: var(--rc-accent); font-weight: 700; text-transform: uppercase; }

        .rc-refresh-btn {
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: #fff; border: 1px solid rgba(255,255,255,0.1);
          width: 42px; height: 42px; border-radius: 10px;
          cursor: pointer; transition: all 0.3s ease;
          box-shadow: 0 2px 6px rgba(59,130,246,0.3);
        }
        .rc-refresh-btn:hover { transform: translateY(-1px) rotate(180deg); box-shadow: 0 4px 12px rgba(59,130,246,0.4); }
        .rc-refresh-icon { font-size: 1.2rem; }

        .rc-logout-btn {
          display: flex; align-items: center; gap: 0.5rem;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff; border: 1px solid rgba(255,255,255,0.1);
          padding: 0.625rem 1rem; border-radius: 10px;
          font-weight: 700; cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.8125rem;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
        }
        .rc-logout-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); background: linear-gradient(135deg, #f87171, #ef4444); }
        .rc-logout-icon { font-size: 0.95rem; }

        /* Container */
        .rc-container {
          display: flex;
          min-height: calc(100vh - 85px);
          position: relative;
        }

        /* Sidebar */
        .rc-sidebar {
          width: 240px;
          background: #fff;
          border-right: 1px solid var(--rc-border);
          display: flex; flex-direction: column;
          position: fixed;
          left: 0; top: 85px;
          height: calc(100vh - 85px);
          z-index: 50;
          transition: all 0.3s ease;
          box-shadow: 1px 0 6px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .rc-sidebar-header {
          padding: 1rem 0.875rem;
          border-bottom: 1px solid var(--rc-border);
          background: linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%);
          flex-shrink: 0;
        }
        .rc-sidebar-brand {
          display: flex; align-items: center; gap: 0.75rem;
        }
        .rc-sidebar-profile-img {
          width: 46px; height: 46px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--rc-primary) 0%, var(--rc-accent) 100%);
          color: #fff; font-weight: 800; font-size: 1rem;
          flex-shrink: 0;
          box-shadow: 0 6px 16px rgba(13, 148, 136, 0.25);
          border: 2.5px solid #fff;
          overflow: hidden;
        }
        .rc-sidebar-profile-img .rc-initials {
          color: #fff; font-weight: 800; font-size: 0.95rem;
          text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .rc-sidebar-profile-info {
          display: flex; flex-direction: column; gap: 3px;
          overflow: hidden; flex: 1; min-width: 0;
        }
        .rc-profile-name {
          font-size: 0.875rem; font-weight: 700;
          color: var(--rc-text-main);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .rc-profile-role {
          font-size: 0.68rem; font-weight: 700;
          color: var(--rc-accent);
          text-transform: uppercase; letter-spacing: 0.05em;
          background: var(--rc-soft);
          padding: 1px 7px; border-radius: 4px;
          display: inline-block; width: fit-content;
        }

        .rc-sidebar-nav { flex: 1; padding: 0; overflow-y: auto; }
        .rc-sidebar-nav::-webkit-scrollbar { width: 4px; }
        .rc-sidebar-nav::-webkit-scrollbar-track { background: #f8fafc; }
        .rc-sidebar-nav::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .rc-sidebar-nav::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        .rc-nav-list {
          list-style: none; margin: 0; padding: 0.5rem;
          display: flex; flex-direction: column; gap: 2px;
        }
        .rc-nav-item { margin: 0; }
        .rc-nav-link {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          color: var(--rc-text-mute);
          text-decoration: none;
          transition: all 0.25s ease;
          border-radius: 10px;
          font-weight: 600; font-size: 0.875rem;
          border: 1px solid transparent;
        }
        .rc-nav-link:hover {
          background: var(--rc-soft);
          color: var(--rc-text);
          transform: translateX(3px);
          border-color: var(--rc-soft-2);
        }
        .rc-nav-active {
          background: linear-gradient(135deg, var(--rc-soft) 0%, var(--rc-soft-2) 100%) !important;
          color: var(--rc-text) !important;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(13, 148, 136, 0.15);
          border-color: var(--rc-accent-2) !important;
          transform: translateX(3px);
        }
        .rc-nav-icon {
          font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center;
          width: 22px; flex-shrink: 0;
        }
        .rc-nav-text {
          flex: 1; white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis; line-height: 1.2;
        }

        /* Main */
        .rc-main {
          flex: 1;
          padding: 0;
          background: var(--rc-bg-page);
          min-height: calc(100vh - 85px);
          overflow-x: hidden;
          margin-left: 240px;
        }

        .rc-sidebar-overlay { display: none; }

        /* ========================================================
           NOUTBUK (992px – 1199px)
        ======================================================== */
        @media (min-width: 992px) and (max-width: 1199px) {
          .rc-header { height: 80px; }
          .rc-header-content { padding: 0 1.5rem; }
          .rc-header-left { gap: 1.5rem; }
          .rc-header-right { gap: 0.875rem; }
          .rc-page-title { font-size: 1.125rem; }
          .rc-page-subtitle { font-size: 0.7rem; }

          .rc-sidebar { width: 200px; top: 80px; height: calc(100vh - 80px); }
          .rc-container { min-height: calc(100vh - 80px); }
          .rc-main { margin-left: 200px; min-height: calc(100vh - 80px); }

          .rc-nav-link { padding: 9px 11px; font-size: 0.825rem; }
        }

        /* ========================================================
           PLANSHET (768px – 991px) — sidebar OVERLAY mode
        ======================================================== */
        @media (min-width: 768px) and (max-width: 991px) {
          .rc-header { height: 76px; }
          .rc-header-content { padding: 0 1.25rem; }
          .rc-header-left { gap: 1rem; }
          .rc-header-right { gap: 0.75rem; }
          .rc-page-info { display: none; }

          .rc-sidebar-toggle { display: flex; }

          .rc-container { min-height: calc(100vh - 76px); }
          .rc-sidebar {
            width: 220px;
            top: 76px;
            height: calc(100vh - 76px);
            transform: translateX(-100%);
            box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          }
          .rc-sidebar-open { transform: translateX(0); }

          .rc-sidebar-overlay {
            display: block;
            position: fixed;
            top: 76px; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 40;
            backdrop-filter: blur(2px);
          }
          .rc-main { margin-left: 0; min-height: calc(100vh - 76px); }

          .rc-user-info { padding: 0.4rem 0.625rem; }
          .rc-user-avatar { width: 34px; height: 34px; }
          .rc-user-details { display: flex; }
          .rc-user-name { font-size: 0.75rem; }
          .rc-user-role { font-size: 0.62rem; }

          .rc-refresh-btn { width: 38px; height: 38px; }
          .rc-logout-btn { padding: 0.5rem 0.75rem; font-size: 0.75rem; }
        }

        /* ========================================================
           TELEFON (481px – 767px)
        ======================================================== */
        @media (min-width: 481px) and (max-width: 767px) {
          .rc-header { height: 70px; }
          .rc-header-content { padding: 0 0.875rem; gap: 0.625rem; }
          .rc-header-left { gap: 0.75rem; }
          .rc-header-right { gap: 0.5rem; }
          .rc-page-info { display: none; }

          .rc-sidebar-toggle { display: flex; padding: 0.5rem; }
          .rc-hamburger { width: 20px; height: 2.5px; margin: 2px 0; }

          .rc-container { min-height: calc(100vh - 70px); }
          .rc-sidebar {
            width: 200px;
            top: 70px;
            height: calc(100vh - 70px);
            transform: translateX(-100%);
            box-shadow: 4px 0 20px rgba(0,0,0,0.18);
          }
          .rc-sidebar-open { transform: translateX(0); }

          .rc-sidebar-overlay {
            display: block;
            position: fixed;
            top: 70px; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.55);
            z-index: 40;
            backdrop-filter: blur(3px);
          }
          .rc-main { margin-left: 0; min-height: calc(100vh - 70px); }

          .rc-user-info { padding: 0.3rem 0.5rem; gap: 0.5rem; }
          .rc-user-avatar { width: 32px; height: 32px; font-size: 0.72rem; }
          .rc-user-details { display: none; }

          .rc-refresh-btn { width: 36px; height: 36px; }
          .rc-refresh-icon { font-size: 1.05rem; }

          .rc-logout-btn {
            min-height: 36px;
            gap: 0.4rem;
            padding: 0.45rem 0.65rem;
            font-size: 0.75rem;
          }
          .rc-logout-icon { font-size: 0.85rem; }
        }

        /* ========================================================
           KICHIK TELEFON (≤480px)
        ======================================================== */
        @media (max-width: 480px) {
          .rc-header { height: 64px; }
          .rc-header-content { padding: 0 0.625rem; gap: 0.5rem; }
          .rc-header-left { gap: 0.5rem; min-width: 0; flex: 1; }
          .rc-header-right { gap: 0.35rem; flex-shrink: 0; }
          .rc-page-info { display: none; }

          .rc-sidebar-toggle {
            display: flex;
            width: 36px; height: 36px;
            padding: 0.45rem;
            border-radius: 9px;
            flex-shrink: 0;
          }
          .rc-hamburger { width: 20px; height: 2px; margin: 2.5px 0; }

          .rc-container { min-height: calc(100vh - 64px); }
          .rc-sidebar {
            width: 175px;
            top: 64px;
            height: calc(100vh - 64px);
            transform: translateX(-100%);
            box-shadow: 4px 0 20px rgba(0,0,0,0.2);
          }
          .rc-sidebar-open { transform: translateX(0); }
          .rc-sidebar-header { padding: 0.875rem 0.75rem; }
          .rc-sidebar-profile-img { width: 40px; height: 40px; }
          .rc-profile-name { font-size: 0.78rem; }
          .rc-profile-role { font-size: 0.6rem; }
          .rc-nav-link { padding: 9px 11px; font-size: 0.8rem; }
          .rc-nav-icon { font-size: 1rem; }

          .rc-sidebar-overlay {
            display: block;
            position: fixed;
            top: 64px; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            z-index: 40;
            backdrop-filter: blur(3px);
          }
          .rc-main { margin-left: 0; min-height: calc(100vh - 64px); }

          .rc-user-info {
            padding: 0.2rem;
            border-radius: 10px;
            gap: 0;
          }
          .rc-user-avatar { width: 28px; height: 28px; font-size: 0.65rem; }
          .rc-user-details { display: none; }

          .rc-refresh-btn { width: 34px; height: 34px; border-radius: 8px; }
          .rc-refresh-icon { font-size: 0.95rem; }

          .rc-logout-btn {
            width: 36px; min-height: 36px;
            padding: 0; justify-content: center;
            border-radius: 8px;
          }
          .rc-logout-text { display: none; }
          .rc-logout-icon { font-size: 0.9rem; }
        }
      `}</style>
    </div>
  );
};

export default ReceptionDashboard;
