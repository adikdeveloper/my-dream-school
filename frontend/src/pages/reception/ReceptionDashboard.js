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
import '../director/DirectorDashboard.css';
import homeStyles from '../../components/admin/AdminHome.module.css';

// Direktor dashboardidagi SVG ikonlar to'plami bilan bir xil — dizayn 1:1 bo'lishi uchun
const ReceptionIcon = ({ name = 'grid', size = 20 }) => {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    student: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M6 11v5c3 2 9 2 12 0v-5M21 9v6" /></>,
    teacher: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4h5v10h-5M18 8h3" /></>,
    subjects: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z" /><path d="M4 6.5v13M8 7h8M8 11h6" /></>,
    leads: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /><path d="m19 5 3-3M18 6l4-4" /></>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    reception: <><path d="M3 18h18M5 18v-3a7 7 0 0 1 14 0v3M12 5V3M9 5h6M2 21h20" /></>,
    refresh: <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 9M5.5 15A7 7 0 0 0 17.8 17.8L20 15" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    activity: <path d="M3 12h4l2-6 4 12 2-6h6" />,
    empty: <><path d="M4 5h16v14H4zM4 8l8 6 8-6" /></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.grid}
    </svg>
  );
};

const menuIconName = (item = {}) => {
  if (item.iconKey) return item.iconKey;
  const iconByPath = {
    '/reception': 'grid',
    '/reception/students': 'student',
    '/reception/teachers': 'teacher',
    '/reception/subjects': 'subjects',
    '/reception/leads': 'leads',
    '/reception/chat': 'message',
    '/reception/profile': 'profile'
  };
  if (iconByPath[item.path]) return iconByPath[item.path];
  return 'grid';
};

// ====================== RECEPTION BOSH SAHIFA — 100% Qabulxonaga mos, direktor dizayn tizimida ======================
const ReceptionHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalStudents: 0, activeStudents: 0, totalTeachers: 0, totalLeads: 0 });
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [studentStats, teachers, subjects, leads] = await Promise.all([
          apiService.getStudentStats().catch(() => ({ total: 0, active: 0 })),
          apiService.getTeachers().catch(() => []),
          apiService.getSubjects().catch(() => []),
          apiService.getLeads().catch(() => [])
        ]);
        const leadsArr = Array.isArray(leads) ? leads : (leads?.leads ?? []);
        const teachersArr = Array.isArray(teachers) ? teachers : (teachers?.users ?? []);
        void subjects;
        if (mounted) {
          setStats({
            totalStudents: studentStats?.total ?? 0,
            activeStudents: studentStats?.active ?? 0,
            totalTeachers: teachersArr.length ?? 0,
            totalLeads: Array.isArray(leadsArr) ? leadsArr.length : (leads?.total ?? 0)
          });
          setRecentLeads((Array.isArray(leadsArr) ? leadsArr : []).slice(0, 5));
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
    { title: 'Jami o‘quvchilar', value: stats.totalStudents, iconName: 'student' },
    { title: 'Faol o‘quvchilar', value: stats.activeStudents, iconName: 'student' },
    { title: 'O‘qituvchilar', value: stats.totalTeachers, iconName: 'teacher' },
    { title: 'Lidlar (mijozlar)', value: stats.totalLeads, iconName: 'leads' }
  ];

  const quickActions = [
    { label: 'Yangi o‘quvchi qo‘shish', iconName: 'student', to: '/reception/students' },
    { label: 'Yangi lid qo‘shish', iconName: 'leads', to: '/reception/leads' },
    { label: 'O‘qituvchilar', iconName: 'teacher', to: '/reception/teachers' },
    { label: 'Fanlar', iconName: 'subjects', to: '/reception/subjects' }
  ];

  const leadName = (l) => l?.name || `${l?.firstName || ''} ${l?.lastName || ''}`.trim() || l?.fullName || 'Ismsiz lid';
  const leadPhone = (l) => l?.phone || l?.phoneNumber || '-';
  const leadStatus = (l) => l?.status || 'yangi';

  return (
    <div className={homeStyles.adminHome}>
      <div className={homeStyles.welcomeSection}>
        <div className={homeStyles.welcomeContent}>
          <h1 className={homeStyles.pageTitle}>{greeting}, {user?.firstName || 'Qabulxona'}</h1>
          <p className={homeStyles.pageDescription}>
            Qabulxona paneli — o‘quvchilarni ro‘yxatga oling, lidlarni kuzating, o‘qituvchi va fanlar bazasini yuriting.
          </p>
        </div>
        <div className={homeStyles.currentTime}>
          <div className={homeStyles.timeDisplay}>
            {currentTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className={homeStyles.dateDisplay}>
            {currentTime.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className={homeStyles.statsGrid}>
        {statCards.map((s, i) => (
          <div key={s.title} className={`${homeStyles.statCard} ${homeStyles[`statTone${i + 1}`]}`}>
            <div className={homeStyles.statIconWrapper}>
              <div className={homeStyles.statIcon}>
                <ReceptionIcon name={s.iconName} size={22} />
              </div>
            </div>
            <div className={homeStyles.statContent}>
              <div className={homeStyles.statNumber}>{loading ? '…' : s.value}</div>
              <div className={homeStyles.statLabel}>{s.title}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={homeStyles.dashboardGrid}>
        <div className={homeStyles.quickActionsCard}>
          <div className={homeStyles.cardHeader}>
            <h2 className={homeStyles.cardTitle}>
              <span className={homeStyles.titleIcon}><ReceptionIcon name="plus" size={18} /></span>
              Tezkor amallar
            </h2>
          </div>
          <div className={homeStyles.actionGrid}>
            {quickActions.map((a) => (
              <button key={a.label} className={homeStyles.actionBtn} onClick={() => navigate(a.to)} aria-label={a.label}>
                <div className={homeStyles.actionIcon}>
                  <ReceptionIcon name={a.iconName} size={20} />
                </div>
                <span className={homeStyles.actionLabel}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={homeStyles.activitiesCard}>
          <div className={homeStyles.cardHeader}>
            <h2 className={homeStyles.cardTitle}>
              <span className={homeStyles.titleIcon}><ReceptionIcon name="activity" size={18} /></span>
              So‘nggi lidlar
            </h2>
            <button className={homeStyles.viewAllBtn} onClick={() => navigate('/reception/leads')}>
              Barchasini ko‘rish
            </button>
          </div>
          <div className={homeStyles.activityList}>
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className={`${homeStyles.activityItem} ${homeStyles.skeleton}`}>
                  <div className={homeStyles.skeletonIcon} />
                  <div className={homeStyles.skeletonContent}>
                    <div className={homeStyles.skeletonText} />
                    <div className={homeStyles.skeletonTextSmall} />
                  </div>
                </div>
              ))
            ) : recentLeads.length === 0 ? (
              <div className={homeStyles.emptyState}>
                <span className={homeStyles.emptyIcon}><ReceptionIcon name="empty" size={24} /></span>
                <p className={homeStyles.emptyText}>Hozircha lidlar yo‘q — yangi mijoz qo‘shing</p>
              </div>
            ) : (
              recentLeads.map((l, idx) => (
                <div key={l._id || l.id || idx} className={homeStyles.activityItem}>
                  <div className={homeStyles.activityIconWrapper}>
                    <ReceptionIcon name="leads" size={20} />
                  </div>
                  <div className={homeStyles.activityContent}>
                    <div className={homeStyles.activityMessage}>{leadName(l)} — {leadPhone(l)}</div>
                    <div className={homeStyles.activityTime}>Holat: {leadStatus(l)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
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
    { path: '/reception', label: 'Bosh sahifa', iconKey: 'grid', end: true },
    { path: '/reception/students', label: "O'quvchilar", iconKey: 'student' },
    { path: '/reception/teachers', label: "O'qituvchilar", iconKey: 'teacher' },
    { path: '/reception/subjects', label: 'Fanlar', iconKey: 'subjects' },
    { path: '/reception/leads', label: 'Lidlar', iconKey: 'leads' },
    { path: '/reception/chat', label: 'Chat', iconKey: 'message' },
    { path: '/reception/profile', label: 'Profil', iconKey: 'profile' }
  ];

  const toggleSidebar = () => setSidebarOpen((o) => !o);

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
              <div className="header-page-title">Reception paneli</div>
              <p className="page-subtitle">Qabulxona</p>
            </div>
          </div>
          <div className="header-right">
            <NotificationBell accent="#2563eb" viewAllLink="/reception/notifications" />
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
                <span className="user-role">{user?.role || 'reception'}</span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="refresh-btn"
              aria-label="Sahifani yangilash"
              title="Sahifani yangilash (Hard Refresh)"
            >
              <span className="refresh-icon"><ReceptionIcon name="refresh" size={18} /></span>
            </button>
            <button
              onClick={logout}
              className="logout-btn"
              aria-label="Tizimdan chiqish"
            >
              <span className="logout-icon"><ReceptionIcon name="logout" size={18} /></span>
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
              <span className="brand-icon"><ReceptionIcon name="reception" size={18} /></span>
              <span className="brand-text">Reception</span>
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
                    onClick={() => setSidebarOpen(false)}
                    aria-label={item.label}
                  >
                    <span className="nav-icon" aria-hidden="true"><ReceptionIcon name={menuIconName(item)} /></span>
                    <span className="nav-text">{item.label}</span>
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
    </div>
  );
};

export default ReceptionDashboard;
