import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import StudentManagement from '../../components/admin/StudentManagement';
import LeadsManagement from '../../components/admin/LeadsManagement';
import Profile from '../../components/admin/Profile';
import ChatPage from '../../components/chat/ChatPage';
import NotificationInbox from '../../components/common/NotificationInbox';
import apiService from '../../services/apiService';

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
    { label: 'O‘quvchilar ro‘yxati', desc: 'Ko‘rish va tahrirlash', icon: '📋', to: '/reception/students' },
    { label: 'Lidlar bazasi', desc: 'Yangi mijoz / ariza', icon: '📞', to: '/reception/leads' },
    { label: 'Chat', desc: 'Xodimlar bilan muloqot', icon: '💬', to: '/reception/chat' }
  ];

  return (
    <div className="rc-home">
      <div className="rc-welcome">
        <div>
          <h2>{greeting}, {user?.firstName || 'Qabulxona'} 👋</h2>
          <p>Qabulxona paneli — o‘quvchilarni kiritish va mijozlar bazasini yuriting.</p>
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

  const menuItems = [
    { path: '/reception', label: 'Bosh sahifa', icon: '🏠', end: true },
    { path: '/reception/students', label: "O'quvchilar", icon: '👨‍🎓' },
    { path: '/reception/leads', label: 'Lidlar', icon: '📞' },
    { path: '/reception/chat', label: 'Chat', icon: '💬' },
    { path: '/reception/notifications', label: 'Bildirishnomalar', icon: '📥' },
    { path: '/reception/profile', label: 'Profil', icon: '👤' }
  ];

  return (
    <div className="reception-dashboard-layout">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen((o) => !o)} aria-label="Menyu">☰</button>
            <Logo />
            <div className="page-info">
              <h1 className="header-page-title">Reception paneli</h1>
              <p className="page-subtitle">Qabulxona</p>
            </div>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                <span className="user-initials">{user?.firstName?.charAt(0) || 'R'}{user?.lastName?.charAt(0) || ''}</span>
              </div>
              <div className="user-details">
                <span className="user-name">{user?.firstName} {user?.lastName}</span>
                <span className="user-role">Reception</span>
              </div>
            </div>
            <button onClick={logout} className="logout-btn">
              <span className="logout-icon">🚪</span><span className="logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      <div className="reception-body">
        <aside className={`reception-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        <main className="reception-main">
          <Routes>
            <Route path="/" element={<ReceptionHome />} />
            <Route path="/students" element={<StudentManagement />} />
            <Route path="/leads" element={<LeadsManagement />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/notifications" element={<NotificationInbox />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/reception" replace />} />
          </Routes>
        </main>
      </div>

      <style>{`
        .reception-dashboard-layout { min-height: 100vh; background: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
        .header { background: #fff; border-bottom: 1px solid #e2e8f0; height: 85px; position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .header-content { display: flex; justify-content: space-between; align-items: center; padding: 0 1.5rem; height: 100%; }
        .header-left, .header-right { display: flex; align-items: center; gap: 1.25rem; }
        .menu-toggle { display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #334155; }
        .page-info { display: flex; flex-direction: column; }
        .header-page-title { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
        .page-subtitle { margin: 0; font-size: 0.85rem; color: #64748b; }
        .user-info { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .user-avatar { width: 32px; height: 32px; background: #0d9488; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .user-details { display: flex; flex-direction: column; }
        .user-name { font-size: 0.875rem; font-weight: 600; color: #1e293b; }
        .user-role { font-size: 0.75rem; color: #0d9488; font-weight: 500; }
        .logout-btn { background: #ef4444; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; gap: 0.5rem; transition: background 0.2s; }
        .logout-btn:hover { background: #dc2626; }

        .reception-body { display: flex; min-height: calc(100vh - 85px); }
        .reception-sidebar { width: 250px; background: #fff; border-right: 1px solid #e2e8f0; padding: 1.25rem 0; flex-shrink: 0; }
        .reception-sidebar nav { display: flex; flex-direction: column; gap: 0.25rem; }
        .nav-link { display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 1.5rem; text-decoration: none; color: #475569; font-weight: 500; border-left: 3px solid transparent; transition: background .15s, color .15s; }
        .nav-link:hover { background: #f1f5f9; color: #0d9488; }
        .nav-link.active { background: linear-gradient(90deg, #0d948815, transparent); color: #0d9488; border-left-color: #0d9488; font-weight: 600; }
        .nav-icon { font-size: 1.25rem; width: 24px; text-align: center; }
        .reception-main { flex: 1; background: #f8fafc; min-width: 0; }
        .sidebar-overlay { display: none; }

        @media (max-width: 900px) {
          .menu-toggle { display: block; }
          .reception-sidebar { position: fixed; top: 85px; left: 0; bottom: 0; transform: translateX(-100%); transition: transform .25s; z-index: 90; box-shadow: 2px 0 12px rgba(0,0,0,0.08); }
          .reception-sidebar.open { transform: translateX(0); }
          .sidebar-overlay { display: block; position: fixed; inset: 85px 0 0 0; background: rgba(15,23,42,0.4); z-index: 80; }
          .user-details { display: none; }
          .logout-text { display: none; }
        }
      `}</style>
    </div>
  );
};

export default ReceptionDashboard;
