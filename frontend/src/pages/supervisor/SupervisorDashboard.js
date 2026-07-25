import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import AdminHome from '../../components/admin/AdminHome';
import StudentManagement from '../../components/admin/StudentManagement';
import TeacherManagement from '../../components/admin/TeacherManagement';
import ClassManagement from '../../components/admin/ClassManagement';
import SubjectManagement from '../../components/admin/SubjectManagement';
import AdminClassJournal from '../../components/admin/AdminClassJournal';
import AttendanceManagement from '../../components/admin/AttendanceManagement';
import ScheduleManagement from '../../components/admin/ScheduleManagement';
import Reports from '../../components/admin/Reports';
import Profile from '../../components/admin/Profile';
import ChatPage from '../../components/chat/ChatPage';
import NotificationInbox from '../../components/common/NotificationInbox';
import NotificationBell from '../../components/common/NotificationBell';
import apiService from '../../services/apiService';

const SupervisorDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationCounts, setNotificationCounts] = useState({
        pendingUsers: 0
    });

    const fetchNotificationCounts = async () => {
        try {
            const counts = await apiService.getAdminNotificationCounts();
            setNotificationCounts(counts);
        } catch (error) {
            // Silently fail
        }
    };

    useEffect(() => {
        fetchNotificationCounts();
        const interval = setInterval(fetchNotificationCounts, 60000);
        return () => clearInterval(interval);
    }, []);

    const profileImageUrl = useMemo(() => {
        if (!user?.profileImage) return null;
        const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
        const timestamp = user._updated || 0;
        return `${baseUrl}${user.profileImage}?t=${timestamp}`;
    }, [user?.profileImage, user?._updated]);

    // Menu items WITHOUT financial sections (To'lovlar, Qarzdorlar, Moliyaviy holat)
    const menuItems = [
        {
            path: '/supervisor',
            label: 'Bosh sahifa',
            icon: '📊',
            end: true,
            badge: null,
            section: null
        },
        {
            path: '/supervisor/users',
            label: 'O\'quvchilar',
            icon: '👨‍🎓',
            badge: notificationCounts.pendingUsers,
            section: 'users'
        },
        {
            path: '/supervisor/teachers',
            label: 'O\'qituvchilar',
            icon: '👨‍🏫',
            badge: null,
            section: null
        },
        {
            path: '/supervisor/classes',
            label: 'Sinflar',
            icon: '🏫',
            badge: null,
            section: null
        },
        {
            path: '/supervisor/subjects',
            label: 'Fanlar',
            icon: '📚',
            badge: null,
            section: null
        },
        {
            path: '/supervisor/journal',
            label: 'Sinf jurnali',
            icon: '📖',
            badge: null,
            section: null
        },
        {
            path: '/supervisor/attendance',
            label: 'Davomat',
            icon: '📋',
            badge: null,
            section: null
        },
        {
            path: '/supervisor/schedule',
            label: 'Dars jadvali',
            icon: '📅',
            badge: null,
            section: null
        },
        {
            path: '/supervisor/chat',
            label: 'Chat',
            icon: '💬',
            badge: null,
            section: null
        },
        {
            path: '/supervisor/notifications',
            label: 'Bildirishnomalar',
            icon: '📥',
            badge: null,
            section: null
        },
        {
            path: '/supervisor/reports',
            label: 'Hisobotlar',
            icon: '📈',
            badge: null,
            section: null
        },
        {
            path: '/supervisor/profile',
            label: 'Profil',
            icon: '👤',
            badge: null,
            section: null
        }
    ];

    const handleMenuItemClick = async (section) => {
        setSidebarOpen(false);
        if (section && section === 'users' && notificationCounts.pendingUsers > 0) {
            try {
                await apiService.markSectionAsViewed(section);
                await fetchNotificationCounts();
            } catch (error) {
                // Silently fail
            }
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="admin-dashboard-layout">
            {/* Header */}
            <header className="header" role="banner">
                <div className="header-content">
                    <div className="header-left">
                        <button
                            className="sidebar-toggle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label="Toggle sidebar"
                        >
                            <span className="hamburger"></span>
                            <span className="hamburger"></span>
                            <span className="hamburger"></span>
                        </button>
                        <Logo />
                        <div className="page-info">
                            <h1 className="header-page-title">Ta'lim nazoratchisi paneli</h1>
                            <p className="page-subtitle">Monitoring va nazorat</p>
                        </div>
                    </div>
                    <div className="header-right">
                        <NotificationBell accent="#10b981" viewAllLink="/supervisor/notifications" />
                        <div className="user-info">
                            <div
                                className={`user-avatar ${profileImageUrl ? 'has-image' : ''}`}
                                style={profileImageUrl ? {
                                    backgroundImage: `url(${profileImageUrl})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                } : {}}
                            >
                                {!profileImageUrl && (
                                    <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                                )}
                            </div>
                            <div className="user-details">
                                <span className="user-name">{user?.firstName} {user?.lastName}</span>
                                <span className="user-role">Ta'lim nazoratchisi</span>
                            </div>
                        </div>
                        <button className="logout-btn" onClick={handleLogout}>
                            <span className="logout-icon">🚪</span>
                            <span>Chiqish</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="dashboard-container">
                {/* Sidebar */}
                <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} role="navigation">
                    <div className="sidebar-header">
                        <div className="sidebar-brand">
                            <span className="brand-icon">🎓</span>
                            <span className="brand-text">Nazorat</span>
                        </div>
                    </div>
                    <nav className="sidebar-nav">
                        <ul className="nav-list">
                            {menuItems.map((item) => (
                                <li key={item.path} className="nav-item">
                                    <NavLink
                                        to={item.path}
                                        end={item.end}
                                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                        onClick={() => handleMenuItemClick(item.section)}
                                    >
                                        <span className="nav-icon">{item.icon}</span>
                                        <span className="nav-text">{item.label}</span>
                                        {item.badge > 0 && (
                                            <span className="notification-badge">
                                                <span className="notification-icon">🔔</span>
                                                {item.badge}
                                            </span>
                                        )}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

                {/* Main Content - NO financial routes */}
                <main className="main-content" role="main">
                    <Routes>
                        <Route path="/" element={<AdminHome />} />
                        <Route path="/users" element={<StudentManagement />} />
                        <Route path="/teachers" element={<TeacherManagement />} />
                        <Route path="/classes" element={<ClassManagement />} />
                        <Route path="/subjects" element={<SubjectManagement />} />
                        <Route path="/journal" element={<AdminClassJournal />} />
                        <Route path="/attendance" element={<AttendanceManagement />} />
                        <Route path="/schedule" element={<ScheduleManagement />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/chat" element={<ChatPage />} />
                        <Route path="/notifications" element={<NotificationInbox />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="*" element={<Navigate to="/supervisor" replace />} />
                    </Routes>
                </main>
            </div>

            <style>{`
        .admin-dashboard-layout {
          min-height: 100vh;
          background: #f8fafc;
        }

        .header {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          position: sticky;
          top: 0;
          z-index: 100;
          height: 85px;
          backdrop-filter: blur(8px);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          height: 100%;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 2rem;
          flex: 1;
          min-width: 0;
        }

        .sidebar-toggle {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.75rem;
          border-radius: 12px;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .sidebar-toggle:hover {
          background: #f1f5f9;
          border-color: #e2e8f0;
          transform: scale(1.05);
        }

        .hamburger {
          width: 22px;
          height: 3px;
          background: #64748b;
          margin: 3px 0;
          transition: all 0.3s ease;
          border-radius: 2px;
        }

        .page-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .header-page-title {
          font-size: 1.25rem;
          font-weight: 700;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          line-height: 1.2;
          letter-spacing: -0.025em;
        }

        .page-subtitle {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 2rem;
          flex-shrink: 0;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.625rem 1rem;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
        }

        .user-info:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8125rem;
          box-shadow: 0 1px 4px rgba(16, 185, 129, 0.25);
        }

        .user-avatar.has-image {
          background: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .user-avatar span {
          color: #ffffff;
        }

        .user-details {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .user-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.8125rem;
          line-height: 1.2;
        }

        .user-role {
          font-size: 0.6875rem;
          color: #10b981;
          font-weight: 600;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          border: none;
          padding: 0.625rem 1rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.8125rem;
          box-shadow: 0 1px 4px rgba(239, 68, 68, 0.25);
        }

        .logout-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
        }

        .logout-icon {
          font-size: 0.9375rem;
        }

        .dashboard-container {
          display: flex;
          min-height: calc(100vh - 85px);
          position: relative;
        }

        .sidebar {
          width: 200px;
          background: white;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 85px;
          height: calc(100vh - 85px);
          z-index: 50;
          transition: all 0.3s ease;
          box-shadow: 1px 0 4px rgba(0, 0, 0, 0.05);
        }

        .sidebar-header {
          padding: 0 0.75rem 0.625rem;
          border-bottom: 1px solid #f1f5f9;
          background: #fafbfc;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          justify-content: flex-start;
        }

        .brand-icon {
          font-size: 1rem;
          color: #10b981;
        }

        .brand-text {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #1e293b;
        }

        .sidebar-nav {
          flex: 1;
          padding: 0;
          overflow-y: auto;
        }

        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-nav::-webkit-scrollbar-track {
          background: #f8fafc;
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }

        .nav-list {
          list-style: none;
          margin: 0;
          padding: 0.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .nav-item {
          margin: 0 0.375rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.75rem;
          color: #64748b;
          text-decoration: none;
          transition: all 0.2s ease;
          border-radius: 6px;
          position: relative;
          border: 1px solid transparent;
        }

        .nav-link:hover {
          background: #f8fafc;
          color: #1e293b;
          transform: translateX(1px);
          border-color: #e2e8f0;
        }

        .nav-link.active {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 600;
          transform: translateX(2px);
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
        }

        .nav-link.active::before {
          content: '';
          position: absolute;
          left: -0.75rem;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: #10b981;
          border-radius: 2px;
        }

        .nav-icon {
          font-size: 0.9375rem;
          min-width: 20px;
          text-align: center;
        }

        .nav-text {
          font-weight: 500;
          font-size: 0.75rem;
        }

        .notification-badge {
          margin-left: auto;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          font-size: 0.5rem;
          font-weight: 700;
          padding: 0.0625rem 0.25rem;
          border-radius: 6px;
          min-width: 16px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.125rem;
          box-shadow: 0 1px 4px rgba(239, 68, 68, 0.25);
        }

        .notification-icon {
          font-size: 0.5rem;
        }

        .nav-link.active .notification-badge {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
        }

        .main-content {
          flex: 1;
          margin-left: 200px;
          background: #f8fafc;
          min-height: calc(100vh - 85px);
          overflow-x: hidden;
        }

        .sidebar-overlay {
          display: none;
        }

        @media (max-width: 1199px) and (min-width: 768px) {
          .header {
            height: 80px;
          }

          .header-content {
            padding: 0 1.5rem;
          }

          .dashboard-container {
            min-height: calc(100vh - 80px);
          }

          .sidebar {
            width: 180px;
            top: 80px;
            height: calc(100vh - 80px);
          }

          .main-content {
            margin-left: 180px;
            min-height: calc(100vh - 80px);
          }
        }

        @media (max-width: 1024px) {
          .page-info {
            display: none;
          }
        }

        @media (max-width: 767px) and (min-width: 481px) {
          .header {
            height: 75px;
          }

          .sidebar-toggle {
            display: flex;
          }

          .dashboard-container {
            min-height: calc(100vh - 75px);
          }

          .sidebar {
            width: 180px;
            transform: translateX(-100%);
            top: 75px;
            height: calc(100vh - 75px);
          }

          .sidebar-open {
            transform: translateX(0);
          }

          .sidebar-overlay {
            display: block;
            position: fixed;
            top: 75px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 40;
            backdrop-filter: blur(2px);
          }

          .main-content {
            margin-left: 0;
            min-height: calc(100vh - 75px);
          }

          .user-details {
            display: none;
          }

          .logout-btn span:not(.logout-icon) {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .header {
            height: 70px;
          }

          .header-content {
            padding: 0 0.75rem;
          }

          .sidebar-toggle {
            display: flex;
          }

          .dashboard-container {
            min-height: calc(100vh - 70px);
          }

          .sidebar {
            width: 170px;
            transform: translateX(-100%);
            top: 70px;
            height: calc(100vh - 70px);
          }

          .sidebar-open {
            transform: translateX(0);
          }

          .sidebar-overlay {
            display: block;
            position: fixed;
            top: 70px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 40;
            backdrop-filter: blur(3px);
          }

          .main-content {
            margin-left: 0;
            min-height: calc(100vh - 70px);
          }

          .user-info {
            padding: 0.5rem;
          }

          .user-details {
            display: none;
          }

          .logout-btn {
            padding: 0.625rem;
          }

          .logout-btn span:not(.logout-icon) {
            display: none;
          }
        }
      `}</style>
        </div>
    );
};

export default SupervisorDashboard;
