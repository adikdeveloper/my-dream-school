import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import AccountantReports from '../../components/admin/AccountantReports';
import Profile from '../../components/admin/Profile';
import PaymentManagement from '../../components/admin/PaymentManagement';
import DebtorsList from '../../components/admin/DebtorsList';
import FinancialOverview from '../../components/admin/FinancialOverview';
import apiService from '../../services/apiService';
import StaffPlaceholder from '../../components/admin/StaffPlaceholder';
import ChatPage from '../../components/chat/ChatPage';
import NotificationInbox from '../../components/common/NotificationInbox';
import NotificationBell from '../../components/common/NotificationBell';

const AccountantDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Frozen accounts (negative balance) warnings
  const [frozenAccounts, setFrozenAccounts] = useState({
    students: [],
    totalFrozen: 0,
    totalNegativeBalance: 0,
    showToast: false
  });

  const fetchFrozenAccounts = async () => {
    try {
      const data = await apiService.getFrozenAccounts();
      setFrozenAccounts({
        students: data.frozenStudents || [],
        totalFrozen: data.totalFrozen || 0,
        totalNegativeBalance: data.totalNegativeBalance || 0,
        showToast: data.totalFrozen > 0
      });
    } catch (error) {
      // silent
    }
  };

  const dismissFrozenToast = () => {
    setFrozenAccounts(prev => ({ ...prev, showToast: false }));
  };

  useEffect(() => {
    fetchFrozenAccounts();
    const interval = setInterval(fetchFrozenAccounts, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileImageUrl = useMemo(() => {
    if (!user?.profileImage) return null;
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
    const timestamp = user._updated || 0;
    return `${baseUrl}${user.profileImage}?t=${timestamp}`;
  }, [user?.profileImage, user?._updated]);

  const userInitials = useMemo(() => {
    const firstInitial = user?.firstName?.trim()?.charAt(0) || user?.username?.trim()?.charAt(0) || 'H';
    const lastInitial = user?.lastName?.trim()?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }, [user?.firstName, user?.lastName, user?.username]);

  const menuItems = [
    { path: '/accountant',                 label: 'Bosh sahifa',   icon: '🏠', end: true },
    { path: '/accountant/payments',        label: 'To‘lovlar',     icon: '💳' },
    { path: '/accountant/finance/other',   label: 'Xarajatlar',    icon: '💸' },
    { path: '/accountant/finance/salaries', label: 'Maoshlar',     icon: '👨‍💼' },
    { path: '/accountant/debtors',         label: 'Qarzdorlar',    icon: '📉' },
    { path: '/accountant/financial',       label: 'Moliya holati', icon: '📊' },
    { path: '/accountant/reports',         label: 'Hisobotlar',    icon: '📄' },
    { path: '/accountant/chat',            label: 'Chat',          icon: '💬' },
    { path: '/accountant/notifications',   label: 'Bildirishnomalar', icon: '📥' },
    { path: '/accountant/profile',         label: 'Profil',        icon: '👤' }
  ];

  const handleLogout = () => logout();
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="acc-layout">
      {/* ─────────── HEADER ─────────── */}
      <header className="acc-header">
        <div className="acc-header-content">
          <div className="acc-header-left">
            <button
              className="acc-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
              aria-expanded={sidebarOpen}
            >
              <span className="acc-hamburger" />
              <span className="acc-hamburger" />
              <span className="acc-hamburger" />
            </button>
            <Logo />
            <div className="acc-page-info">
              <h1 className="acc-page-title">Hisobchi paneli</h1>
              <p className="acc-page-subtitle">Moliyaviy boshqaruv tizimi</p>
            </div>
          </div>
          <div className="acc-header-right">
            <NotificationBell accent="#d97706" viewAllLink="/accountant/notifications" />
            <div className="acc-user-info">
              <div
                className={`acc-user-avatar ${profileImageUrl ? 'has-image' : 'no-image'}`}
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              >
                {!profileImageUrl && <span className="acc-user-initials">{userInitials}</span>}
              </div>
              <div className="acc-user-details">
                <span className="acc-user-name">{user?.firstName} {user?.lastName}</span>
                <span className="acc-user-role">Hisobchi</span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="acc-refresh-btn"
              aria-label="Sahifani yangilash"
              title="Sahifani yangilash"
            >
              <span className="acc-refresh-icon">🔄</span>
            </button>
            <button
              onClick={handleLogout}
              className="acc-logout-btn"
              aria-label="Tizimdan chiqish"
            >
              <span className="acc-logout-icon">🚪</span>
              <span className="acc-logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─────────── DASHBOARD CONTAINER ─────────── */}
      <div className="acc-container">
        {/* SIDEBAR */}
        <aside className={`acc-sidebar ${sidebarOpen ? 'acc-sidebar-open' : ''}`}>
          <div className="acc-sidebar-header">
            <div className="acc-sidebar-brand">
              <div
                className={`acc-sidebar-profile-img ${profileImageUrl ? 'has-image' : 'no-image'}`}
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              >
                {!profileImageUrl && <span className="acc-initials">{userInitials}</span>}
              </div>
              <div className="acc-sidebar-profile-info">
                <span className="acc-profile-name">{user?.firstName} {user?.lastName}</span>
                <span className="acc-profile-role">Hisobchi</span>
              </div>
            </div>
          </div>

          <nav className="acc-sidebar-nav" role="navigation" aria-label="Asosiy navigatsiya">
            <ul className="acc-nav-list">
              {menuItems.map((item, index) => (
                <li key={index} className="acc-nav-item">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `acc-nav-link ${isActive ? 'acc-nav-active' : ''}`}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    aria-label={item.label}
                  >
                    <span className="acc-nav-icon" aria-hidden="true">{item.icon}</span>
                    <span className="acc-nav-text">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {sidebarOpen && <div className="acc-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* MAIN */}
        <main className="acc-main" role="main">
          <Routes>
            <Route path="/" element={<FinancialOverview />} />
            <Route path="/payments" element={<PaymentManagement key={location.pathname + '-students'} initialTab="students" />} />
            <Route path="/finance/salaries" element={<PaymentManagement key={location.pathname + '-teachers'} initialTab="teachers" />} />
            <Route path="/finance/other" element={<PaymentManagement key={location.pathname + '-other'} initialTab="other" />} />
            <Route path="/debtors" element={<DebtorsList />} />
            <Route path="/financial" element={<FinancialOverview />} />
            <Route path="/reports" element={<AccountantReports />} />
            <Route path="/finance/:type" element={<StaffPlaceholder />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/notifications" element={<NotificationInbox />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/accountant" replace />} />
          </Routes>
        </main>
      </div>

      {/* Frozen Accounts Toast */}
      {frozenAccounts.showToast && frozenAccounts.totalFrozen > 0 && (
        <div className="acc-frozen-toast">
          <div className="acc-frozen-toast-content">
            <span className="acc-frozen-toast-icon">🥶</span>
            <div className="acc-frozen-toast-text">
              <strong>{frozenAccounts.totalFrozen} ta o'quvchining hisobi muzlatilgan!</strong>
              <span>Iltimos hisoblarni to'ldiring (Jami: {frozenAccounts.totalNegativeBalance.toLocaleString('uz-UZ')} so'm)</span>
            </div>
            <button className="acc-frozen-toast-action" onClick={() => { dismissFrozenToast(); navigate('/accountant/debtors'); }}>
              Ko'rish
            </button>
            <button className="acc-frozen-toast-close" onClick={dismissFrozenToast}>×</button>
          </div>
        </div>
      )}

      {/* ─────────── STYLES (see DESIGN_SYSTEM.md) ─────────── */}
      <style>{`
        /* Tokens — Hisobchi yashil accent palitra */
        .acc-layout {
          --acc-primary:   #92400e;
          --acc-accent:    #d97706;
          --acc-accent-2:  #f59e0b;
          --acc-soft:      #fef3c7;
          --acc-soft-2:    #fde68a;
          --acc-deep:      #064e3b;
          --acc-text:      #78350f;

          --acc-bg-page:   #f8fafc;
          --acc-bg-card:   #ffffff;
          --acc-border:    #e2e8f0;
          --acc-text-main: #1e293b;
          --acc-text-mute: #64748b;

          --acc-shadow-sm: 0 1px 4px rgba(0,0,0,0.05);
          --acc-shadow:    0 4px 12px rgba(0,0,0,0.07);
          --acc-shadow-md: 0 4px 20px rgba(0,0,0,0.08);

          min-height: 100vh;
          background: var(--acc-bg-page);
        }

        /* ========================================================
           BASE — DESKTOP (≥1200px)
        ======================================================== */
        .acc-header {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-bottom: 1px solid var(--acc-border);
          box-shadow: var(--acc-shadow);
          position: sticky;
          top: 0;
          z-index: 100;
          height: 85px;
          backdrop-filter: blur(8px);
        }
        .acc-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          height: 100%;
        }
        .acc-header-left {
          display: flex; align-items: center; gap: 2rem;
          flex: 1; min-width: 0;
        }
        .acc-sidebar-toggle {
          display: none;
          flex-direction: column; justify-content: center; align-items: center;
          background: none; border: 1px solid transparent; cursor: pointer;
          padding: 0.625rem; border-radius: 10px;
          transition: all 0.2s ease;
        }
        .acc-sidebar-toggle:hover {
          background: var(--acc-soft); border-color: var(--acc-accent);
        }
        .acc-hamburger {
          width: 22px; height: 3px; background: #475569;
          margin: 2.5px 0; border-radius: 2px; transition: all 0.3s ease;
        }
        .acc-page-info { display: flex; flex-direction: column; gap: 0.2rem; }
        .acc-page-title {
          font-size: 1.25rem; font-weight: 800; margin: 0;
          background: linear-gradient(135deg, var(--acc-primary) 0%, var(--acc-accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.025em; line-height: 1.2;
        }
        .acc-page-subtitle {
          font-size: 0.75rem; color: var(--acc-text-mute);
          margin: 0; font-weight: 600; letter-spacing: 0.01em;
        }
        .acc-header-right {
          display: flex; align-items: center; gap: 1.25rem; flex-shrink: 0;
        }
        .acc-user-info {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.5rem 0.875rem;
          background: linear-gradient(135deg, #f8fafc 0%, #fff 100%);
          border-radius: 12px;
          border: 1px solid var(--acc-border);
          box-shadow: var(--acc-shadow-sm);
          transition: all 0.2s ease;
        }
        .acc-user-info:hover { transform: translateY(-1px); box-shadow: var(--acc-shadow); }
        .acc-user-avatar {
          width: 38px; height: 38px;
          color: #fff; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.8125rem; flex-shrink: 0;
        }
        .acc-user-avatar.no-image {
          background: linear-gradient(135deg, var(--acc-primary) 0%, var(--acc-deep) 100%);
          color: #fff;
          border: 2px solid var(--acc-soft-2);
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }
        .acc-user-avatar.has-image { background: none; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
        .acc-user-initials { color: #fff; font-weight: 800; letter-spacing: 0.02em; text-shadow: 0 1px 2px rgba(0,0,0,0.35); }
        .acc-user-details { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
        .acc-user-name { font-weight: 700; color: var(--acc-text-main); font-size: 0.8125rem; line-height: 1.2; white-space: nowrap; }
        .acc-user-role { font-size: 0.6875rem; color: var(--acc-accent); font-weight: 700; text-transform: uppercase; }

        .acc-refresh-btn {
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: #fff; border: 1px solid rgba(255,255,255,0.1);
          width: 42px; height: 42px; border-radius: 10px;
          cursor: pointer; transition: all 0.3s ease;
          box-shadow: 0 2px 6px rgba(59,130,246,0.3);
        }
        .acc-refresh-btn:hover { transform: translateY(-1px) rotate(180deg); box-shadow: 0 4px 12px rgba(59,130,246,0.4); }
        .acc-refresh-icon { font-size: 1.2rem; }

        .acc-logout-btn {
          display: flex; align-items: center; gap: 0.5rem;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff; border: 1px solid rgba(255,255,255,0.1);
          padding: 0.625rem 1rem; border-radius: 10px;
          font-weight: 700; cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.8125rem;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
        }
        .acc-logout-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); background: linear-gradient(135deg, #f87171, #ef4444); }
        .acc-logout-icon { font-size: 0.95rem; }

        /* Container */
        .acc-container {
          display: flex;
          min-height: calc(100vh - 85px);
          position: relative;
        }

        /* Sidebar */
        .acc-sidebar {
          width: 240px;
          background: #fff;
          border-right: 1px solid var(--acc-border);
          display: flex; flex-direction: column;
          position: fixed;
          left: 0; top: 85px;
          height: calc(100vh - 85px);
          z-index: 50;
          transition: all 0.3s ease;
          box-shadow: 1px 0 6px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .acc-sidebar-header {
          padding: 1rem 0.875rem;
          border-bottom: 1px solid var(--acc-border);
          background: linear-gradient(135deg, #fffbeb 0%, #f8fafc 100%);
          flex-shrink: 0;
        }
        .acc-sidebar-brand {
          display: flex; align-items: center; gap: 0.75rem;
        }
        .acc-sidebar-profile-img {
          width: 46px; height: 46px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--acc-primary) 0%, var(--acc-accent) 100%);
          color: #fff; font-weight: 800; font-size: 1rem;
          flex-shrink: 0;
          box-shadow: 0 6px 16px rgba(245, 158, 11, 0.25);
          border: 2.5px solid #fff;
          overflow: hidden;
        }
        .acc-sidebar-profile-img .acc-initials {
          color: #fff; font-weight: 800; font-size: 0.95rem;
          text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .acc-sidebar-profile-info {
          display: flex; flex-direction: column; gap: 3px;
          overflow: hidden; flex: 1; min-width: 0;
        }
        .acc-profile-name {
          font-size: 0.875rem; font-weight: 700;
          color: var(--acc-text-main);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .acc-profile-role {
          font-size: 0.68rem; font-weight: 700;
          color: var(--acc-accent);
          text-transform: uppercase; letter-spacing: 0.05em;
          background: var(--acc-soft);
          padding: 1px 7px; border-radius: 4px;
          display: inline-block; width: fit-content;
        }

        .acc-sidebar-nav { flex: 1; padding: 0; overflow-y: auto; }
        .acc-sidebar-nav::-webkit-scrollbar { width: 4px; }
        .acc-sidebar-nav::-webkit-scrollbar-track { background: #f8fafc; }
        .acc-sidebar-nav::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .acc-sidebar-nav::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        .acc-nav-list {
          list-style: none; margin: 0; padding: 0.5rem;
          display: flex; flex-direction: column; gap: 2px;
        }
        .acc-nav-item { margin: 0; }
        .acc-nav-link {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          color: var(--acc-text-mute);
          text-decoration: none;
          transition: all 0.25s ease;
          border-radius: 10px;
          font-weight: 600; font-size: 0.875rem;
          border: 1px solid transparent;
        }
        .acc-nav-link:hover {
          background: var(--acc-soft);
          color: var(--acc-text);
          transform: translateX(3px);
          border-color: var(--acc-soft-2);
        }
        .acc-nav-active {
          background: linear-gradient(135deg, var(--acc-soft) 0%, var(--acc-soft-2) 100%) !important;
          color: var(--acc-text) !important;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
          border-color: var(--acc-accent-2) !important;
          transform: translateX(3px);
        }
        .acc-nav-icon {
          font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center;
          width: 22px; flex-shrink: 0;
        }
        .acc-nav-text {
          flex: 1; white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis; line-height: 1.2;
        }

        /* Main */
        .acc-main {
          flex: 1;
          padding: 0;
          background: var(--acc-bg-page);
          min-height: calc(100vh - 85px);
          overflow-x: hidden;
          margin-left: 240px;
        }

        .acc-sidebar-overlay { display: none; }

        /* ========================================================
           NOUTBUK (992px – 1199px)
        ======================================================== */
        @media (min-width: 992px) and (max-width: 1199px) {
          .acc-header { height: 80px; }
          .acc-header-content { padding: 0 1.5rem; }
          .acc-header-left { gap: 1.5rem; }
          .acc-header-right { gap: 1rem; }
          .acc-page-title { font-size: 1.125rem; }
          .acc-page-subtitle { font-size: 0.7rem; }

          .acc-sidebar { width: 200px; top: 80px; height: calc(100vh - 80px); }
          .acc-container { min-height: calc(100vh - 80px); }
          .acc-main { margin-left: 200px; min-height: calc(100vh - 80px); }

          .acc-nav-link { padding: 9px 11px; font-size: 0.825rem; }
        }

        /* ========================================================
           PLANSHET (768px – 991px) — sidebar OVERLAY mode
        ======================================================== */
        @media (min-width: 768px) and (max-width: 991px) {
          .acc-header { height: 76px; }
          .acc-header-content { padding: 0 1.25rem; }
          .acc-header-left { gap: 1rem; }
          .acc-header-right { gap: 0.875rem; }
          .acc-page-info { display: none; }

          .acc-sidebar-toggle { display: flex; }

          .acc-container { min-height: calc(100vh - 76px); }
          .acc-sidebar {
            width: 220px;
            top: 76px;
            height: calc(100vh - 76px);
            transform: translateX(-100%);
            box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          }
          .acc-sidebar-open { transform: translateX(0); }

          .acc-sidebar-overlay {
            display: block;
            position: fixed;
            top: 76px; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 40;
            backdrop-filter: blur(2px);
          }
          .acc-main { margin-left: 0; min-height: calc(100vh - 76px); }

          .acc-user-info { padding: 0.4rem 0.625rem; }
          .acc-user-avatar { width: 34px; height: 34px; }
          .acc-user-details { display: flex; }
          .acc-user-name { font-size: 0.75rem; }
          .acc-user-role { font-size: 0.62rem; }

          .acc-refresh-btn { width: 38px; height: 38px; }
          .acc-logout-btn { padding: 0.5rem 0.75rem; font-size: 0.75rem; }
        }

        /* ========================================================
           TELEFON (481px – 767px)
        ======================================================== */
        @media (min-width: 481px) and (max-width: 767px) {
          .acc-header { height: 70px; }
          .acc-header-content { padding: 0 0.875rem; gap: 0.625rem; }
          .acc-header-left { gap: 0.75rem; }
          .acc-header-right { gap: 0.625rem; }
          .acc-page-info { display: none; }

          .acc-sidebar-toggle { display: flex; padding: 0.5rem; }
          .acc-hamburger { width: 20px; height: 2.5px; margin: 2px 0; }

          .acc-container { min-height: calc(100vh - 70px); }
          .acc-sidebar {
            width: 200px;
            top: 70px;
            height: calc(100vh - 70px);
            transform: translateX(-100%);
            box-shadow: 4px 0 20px rgba(0,0,0,0.18);
          }
          .acc-sidebar-open { transform: translateX(0); }

          .acc-sidebar-overlay {
            display: block;
            position: fixed;
            top: 70px; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.55);
            z-index: 40;
            backdrop-filter: blur(3px);
          }
          .acc-main { margin-left: 0; min-height: calc(100vh - 70px); }

          .acc-user-info { padding: 0.3rem 0.5rem; gap: 0.5rem; }
          .acc-user-avatar { width: 32px; height: 32px; font-size: 0.72rem; }
          .acc-user-details { display: none; }

          .acc-refresh-btn { width: 36px; height: 36px; }
          .acc-refresh-icon { font-size: 1.05rem; }

          .acc-logout-btn {
            min-height: 36px;
            gap: 0.4rem;
            padding: 0.45rem 0.65rem;
            font-size: 0.75rem;
          }
          .acc-logout-icon { font-size: 0.85rem; }
        }

        /* ========================================================
           KICHIK TELEFON (≤480px)
        ======================================================== */
        @media (max-width: 480px) {
          .acc-header { height: 64px; }
          .acc-header-content { padding: 0 0.625rem; gap: 0.5rem; }
          .acc-header-left { gap: 0.5rem; min-width: 0; flex: 1; }
          .acc-header-right { gap: 0.4rem; flex-shrink: 0; }
          .acc-page-info { display: none; }

          .acc-sidebar-toggle {
            display: flex;
            width: 36px; height: 36px;
            padding: 0.45rem;
            border-radius: 9px;
            flex-shrink: 0;
          }
          .acc-hamburger { width: 20px; height: 2px; margin: 2.5px 0; }

          .acc-container { min-height: calc(100vh - 64px); }
          .acc-sidebar {
            width: 175px;
            top: 64px;
            height: calc(100vh - 64px);
            transform: translateX(-100%);
            box-shadow: 4px 0 20px rgba(0,0,0,0.2);
          }
          .acc-sidebar-open { transform: translateX(0); }
          .acc-sidebar-header { padding: 0.875rem 0.75rem; }
          .acc-sidebar-profile-img { width: 40px; height: 40px; }
          .acc-profile-name { font-size: 0.78rem; }
          .acc-profile-role { font-size: 0.6rem; }
          .acc-nav-link { padding: 9px 11px; font-size: 0.8rem; }
          .acc-nav-icon { font-size: 1rem; }

          .acc-sidebar-overlay {
            display: block;
            position: fixed;
            top: 64px; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            z-index: 40;
            backdrop-filter: blur(3px);
          }
          .acc-main { margin-left: 0; min-height: calc(100vh - 64px); }

          .acc-user-info {
            padding: 0.2rem;
            border-radius: 10px;
            gap: 0;
          }
          .acc-user-avatar { width: 28px; height: 28px; font-size: 0.65rem; }
          .acc-user-details { display: none; }

          .acc-refresh-btn { width: 34px; height: 34px; border-radius: 8px; }
          .acc-refresh-icon { font-size: 0.95rem; }

          .acc-logout-btn {
            width: 36px; min-height: 36px;
            padding: 0; justify-content: center;
            border-radius: 8px;
          }
          .acc-logout-text { display: none; }
          .acc-logout-icon { font-size: 0.9rem; }
        }

        /* ========================================================
           FROZEN TOAST (responsive across all breakpoints)
        ======================================================== */
        .acc-frozen-toast {
          position: fixed;
          bottom: 20px; right: 20px;
          z-index: 1500;
          animation: acc-toast-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes acc-toast-up {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .acc-frozen-toast-content {
          display: flex; align-items: center; gap: 1rem;
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color: #fff;
          padding: 1.25rem 1.5rem;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(14, 165, 233, 0.4);
          max-width: 450px;
          border: 2px solid rgba(255,255,255,0.2);
        }
        .acc-frozen-toast-icon { font-size: 2rem; animation: acc-freeze 2s ease-in-out infinite; }
        @keyframes acc-freeze {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.1); }
        }
        .acc-frozen-toast-text { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
        .acc-frozen-toast-text strong { font-size: 0.95rem; font-weight: 700; }
        .acc-frozen-toast-text span   { font-size: 0.8rem; opacity: 0.95; }
        .acc-frozen-toast-action {
          background: #fff; color: #0284c7; border: none;
          padding: 0.55rem 1.1rem; border-radius: 10px;
          font-weight: 700; cursor: pointer;
          font-size: 0.85rem; white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transition: all 0.2s ease;
        }
        .acc-frozen-toast-action:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.25); }
        .acc-frozen-toast-close {
          background: rgba(255,255,255,0.2); color: #fff; border: none;
          width: 30px; height: 30px; border-radius: 50%;
          cursor: pointer; font-size: 1.2rem;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease; line-height: 1;
        }
        .acc-frozen-toast-close:hover { background: rgba(255,255,255,0.3); transform: scale(1.1); }

        @media (max-width: 767px) {
          .acc-frozen-toast { bottom: 14px; right: 14px; left: 14px; }
          .acc-frozen-toast-content {
            max-width: 100%;
            padding: 1rem 1.125rem;
            gap: 0.75rem;
            flex-wrap: wrap;
          }
          .acc-frozen-toast-icon { font-size: 1.5rem; }
          .acc-frozen-toast-text strong { font-size: 0.85rem; }
          .acc-frozen-toast-text span   { font-size: 0.72rem; }
          .acc-frozen-toast-action { padding: 0.5rem 0.9rem; font-size: 0.78rem; }
        }
      `}</style>
    </div>
  );
};

export default AccountantDashboard;
