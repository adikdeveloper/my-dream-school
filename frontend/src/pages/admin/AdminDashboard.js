import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';

const AdminDashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="admin-dashboard-layout">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <Logo />
            <div className="page-info">
              <h1 className="header-page-title">Administrator paneli</h1>
              <p className="page-subtitle">Tez kunda ishga tushadi</p>
            </div>
          </div>
          <div className="header-right">
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
            <button onClick={handleLogout} className="logout-btn">
              <span className="logout-icon">🚪</span>
              <span className="logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 85px)', flexDirection: 'column', gap: '1rem', background: '#f8fafc' }}>
        <h2 style={{ fontSize: '2rem', color: '#1e293b', textAlign: 'center' }}>Tez kunda qo'shiladi 🚀</h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '500px', textAlign: 'center' }}>
          Yangi Admin paneli hozirda ishlab chiqilmoqda. Barcha boshqaruv funksiyalari (eski Admin imkoniyatlari) vaqtincha Direktor paneliga o'tkazildi.
        </p>
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
