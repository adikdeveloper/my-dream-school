import React from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import NotificationBell from '../../components/common/NotificationBell';
import NotificationInbox from '../../components/common/NotificationInbox';
import DirectorNotifications from '../../components/admin/DirectorNotifications';
import Substitutions from '../../components/common/Substitutions';
import CoinLeaderboard from '../../components/admin/CoinLeaderboard';

const Home = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 85px)', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '2rem' }}>
    <div style={{ fontSize: '3rem' }}>🛡️</div>
    <h2 style={{ fontSize: '1.75rem', color: '#1e293b', textAlign: 'center', margin: 0 }}>Administrator paneli</h2>
    <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '560px', textAlign: 'center', lineHeight: 1.6 }}>
      Bildirishnoma yuborish va qabul qilish faollashtirildi. Chap menyudagi{' '}
      <b>"Bildirishnoma yuborish"</b> orqali foydalanuvchilarga xabar jo'nating.
      Boshqa boshqaruv funksiyalari bosqichma-bosqich qo'shilmoqda.
    </p>
  </div>
);

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const menuItems = [
    { path: '/admin', label: 'Bosh sahifa', icon: '🏠', end: true },
    { path: '/admin/communication/notifications', label: 'Bildirishnoma yuborish', icon: '📣' },
    { path: '/admin/substitutions', label: 'Dars almashtirish', icon: '🔄' },
    { path: '/admin/coins', label: 'Coin reytingi', icon: '🪙' },
    { path: '/admin/notifications', label: 'Bildirishnomalar', icon: '📥' },
  ];

  return (
    <div className="admin-dashboard-layout">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <Logo />
            <div className="page-info">
              <h1 className="header-page-title">Administrator paneli</h1>
              <p className="page-subtitle">Direktor yordamchisi</p>
            </div>
          </div>
          <div className="header-right">
            <NotificationBell accent="#3b82f6" viewAllLink="/admin/notifications" />
            <div className="user-info">
              <div className="user-avatar">
                <span className="user-initials">
                  {user?.firstName?.charAt(0) || 'A'}
                  {user?.lastName?.charAt(0) || ''}
                </span>
              </div>
              <div className="user-details">
                <span className="user-name">{user?.firstName} {user?.lastName}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            </div>
            <button onClick={logout} className="logout-btn">
              <span className="logout-icon">🚪</span>
              <span className="logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 85px)' }}>
        <aside style={{ width: 240, background: '#fff', borderRight: '1px solid #e2e8f0', padding: '1rem 0' }}>
          <nav>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.875rem 1.25rem', textDecoration: 'none',
                  color: isActive ? '#fff' : '#475569',
                  background: isActive ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'none',
                  fontWeight: isActive ? 600 : 500,
                  margin: '0 0.5rem', borderRadius: 8
                })}
              >
                <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main style={{ flex: 1, background: '#f8fafc', overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/communication/notifications" element={<DirectorNotifications />} />
            <Route path="/substitutions" element={<Substitutions accent="#3b82f6" />} />
            <Route path="/coins" element={<CoinLeaderboard />} />
            <Route path="/notifications" element={<NotificationInbox />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>

      <style>{`
        .admin-dashboard-layout { min-height: 100vh; background: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
        .header { background: #fff; border-bottom: 1px solid #e2e8f0; height: 85px; position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .header-content { display: flex; justify-content: space-between; align-items: center; padding: 0 2rem; height: 100%; }
        .header-left, .header-right { display: flex; align-items: center; gap: 1.5rem; }
        .page-info { display: flex; flex-direction: column; }
        .header-page-title { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
        .page-subtitle { margin: 0; font-size: 0.85rem; color: #64748b; }
        .user-info { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .user-avatar { width: 32px; height: 32px; background: #3b82f6; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .user-details { display: flex; flex-direction: column; }
        .user-name { font-size: 0.875rem; font-weight: 600; color: #1e293b; }
        .user-role { font-size: 0.75rem; color: #3b82f6; font-weight: 500; text-transform: capitalize; }
        .logout-btn { background: #ef4444; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; gap: 0.5rem; transition: background 0.2s; }
        .logout-btn:hover { background: #dc2626; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
