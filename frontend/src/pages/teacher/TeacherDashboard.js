import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TeacherHome from '../../components/teacher/TeacherHome';
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
import { formatUzShortDate } from '../../utils/uzDate';
import './TeacherDashboard.css';

const NAV_SECTIONS = [
  {
    label: 'Kundalik',
    items: [
      { path: '/teacher', label: 'Bosh sahifa', icon: 'home', end: true },
      { path: '/teacher/journal', label: 'Sinf jurnali', icon: 'book' },
      { path: '/teacher/schedule', label: 'Dars jadvali', icon: 'calendar' }
    ]
  },
  {
    label: "Ta'lim",
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
    label: 'Yordam',
    items: [
      { path: '/teacher/ai', label: 'AI yordamchi', icon: 'ai' },
      { path: '/teacher/chat', label: 'Chat', icon: 'chat' },
      { path: '/teacher/reports', label: 'Hisobotlar', icon: 'report' }
    ]
  },
  {
    label: 'Shaxsiy',
    items: [
      { path: '/teacher/coins', label: 'Coinlar', icon: 'coins' },
      { path: '/teacher/salary', label: 'Maosh', icon: 'salary' },
      { path: '/teacher/profile', label: 'Profil', icon: 'profile' }
    ]
  }
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.label }))
);

const PAGE_TITLES = {
  '/teacher': 'Bosh sahifa',
  '/teacher/journal': 'Sinf jurnali',
  '/teacher/schedule': 'Dars jadvali',
  '/teacher/lesson-list': "Dars ro'yxati",
  '/teacher/substitutions': 'Almashtirish',
  '/teacher/students': "O'quvchilar",
  '/teacher/tests': 'Testlar',
  '/teacher/quarters': 'Chorak baholari',
  '/teacher/assignments': 'Vazifalar',
  '/teacher/ai': 'AI yordamchi',
  '/teacher/chat': 'Chat',
  '/teacher/notifications': 'Bildirishnomalar',
  '/teacher/reports': 'Hisobotlar',
  '/teacher/coins': 'Coinlar',
  '/teacher/salary': 'Maosh',
  '/teacher/profile': 'Profil'
};

const MOBILE_ITEMS = [
  { path: '/teacher', label: 'Bosh sahifa', icon: 'home', end: true },
  { path: '/teacher/journal', label: 'Jurnal', icon: 'book' },
  { path: '/teacher/schedule', label: 'Jadval', icon: 'calendar' },
  { path: '/teacher/assignments', label: 'Vazifalar', icon: 'assignment' },
  { path: '/teacher/profile', label: 'Profil', icon: 'profile' }
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notificationCounts, setNotificationCounts] = useState({ pendingGrading: 0 });
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const profileRef = useRef(null);

  const pageTitle = PAGE_TITLES[location.pathname] || 'O\'qituvchi paneli';
  const isFlushPage = location.pathname === '/teacher/chat';

  const fetchNotificationCounts = useCallback(async () => {
    try {
      const counts = await apiService.getTeacherNotificationCounts();
      setNotificationCounts(counts || { pendingGrading: 0 });
    } catch (error) {
      // Bildirishnoma soni kritik emas — jim o'tkazamiz.
    }
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const count = await apiService.getInboxUnreadCount();
      setUnread(Number(count) || 0);
    } catch (error) {
      // jim
    }
  }, []);

  useEffect(() => {
    fetchNotificationCounts();
    fetchUnread();
    const interval = setInterval(() => {
      fetchNotificationCounts();
      fetchUnread();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchNotificationCounts, fetchUnread]);

  useEffect(() => {
    setSidebarOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setProfileOpen(false);
        setSidebarOpen(false);
      }
      if ((event.key === '/' || (event.key === 'k' && (event.metaKey || event.ctrlKey))) &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
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
  const greeting = getGreeting();

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ALL_ITEMS;
    return ALL_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(query) || item.section.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const goToSearchResult = (item) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(item.path);
  };

  const badgeFor = (item) => {
    if (!item.badge) return 0;
    return Number(notificationCounts[item.badge]) || 0;
  };

  return (
    <div className="td-app">
      <aside className={`td-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Asosiy navigatsiya">
        <div className="td-brand">
          <span className="td-brand-mark">
            <img src="/assets/images/logo-mark.png" alt="My Dream School" />
          </span>
          <span className="td-brand-text">
            <strong>MY DREAM</strong>
            <span>SCHOOL</span>
          </span>
        </div>
        <div className="td-brand-caption">O'qituvchi paneli</div>

        <nav className="td-nav">
          {NAV_SECTIONS.map((section) => (
            <div className="td-nav-section" key={section.label}>
              <div className="td-nav-label">{section.label}</div>
              {section.items.map((item) => {
                const count = badgeFor(item);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => handleMenuItemClick(item)}
                    className={({ isActive }) => `td-nav-link ${isActive ? 'is-active' : ''}`}
                  >
                    <span className="td-nav-icon"><TeacherUiIcon name={item.icon} size={18} /></span>
                    <span className="td-nav-text">{item.label}</span>
                    {count > 0 && <span className="td-nav-badge">{count > 99 ? '99+' : count}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="td-sidebar-foot">
          <div className="td-help-card">
            <span className="td-help-icon"><TeacherUiIcon name="sparkle" size={18} /></span>
            <div>
              <strong>Yordam kerakmi?</strong>
              <p>AI yordamchi har qanday savolga javob beradi.</p>
              <button type="button" onClick={() => navigate('/teacher/ai')}>
                Suhbatlashish <TeacherUiIcon name="arrow" size={13} />
              </button>
            </div>
          </div>
          <button type="button" className="td-sidebar-user" onClick={() => navigate('/teacher/profile')}>
            <span className="td-avatar td-avatar--sm" style={profileImageUrl ? { backgroundImage: `url(${profileImageUrl})` } : undefined}>
              {!profileImageUrl && initials}
            </span>
            <span className="td-sidebar-user-text">
              <strong>{fullName}</strong>
              <span>{roleLabel}</span>
            </span>
            <TeacherUiIcon name="arrow" size={15} />
          </button>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="td-overlay" aria-label="Menyuni yopish" onClick={() => setSidebarOpen(false)} />}

      <header className="td-topbar">
        <button
          type="button"
          className="td-menu-btn"
          aria-label="Menyuni ochish"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <TeacherUiIcon name={sidebarOpen ? 'close' : 'menu'} size={20} />
        </button>

        <div className="td-page-meta">
          <span className="td-page-eyebrow">O'qituvchi paneli</span>
          <h1>{pageTitle}</h1>
        </div>

        <div className="td-search" ref={searchRef}>
          <span className="td-search-icon"><TeacherUiIcon name="search" size={17} /></span>
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Bo'lim yoki sahifa qidirish..."
            value={searchQuery}
            onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            aria-label="Qidirish"
          />
          <span className="td-search-hint">/</span>
          {searchOpen && (
            <div className="td-search-dropdown">
              <div className="td-search-dropdown-head">
                {searchQuery ? `"${searchQuery}" bo'yicha natijalar` : "Tez o'tish"}
              </div>
              {searchResults.length === 0 ? (
                <div className="td-search-empty">Sahifa topilmadi</div>
              ) : (
                searchResults.map((item) => (
                  <button type="button" key={item.path} className="td-search-result" onClick={() => goToSearchResult(item)}>
                    <span className="td-search-result-icon"><TeacherUiIcon name={item.icon} size={16} /></span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.section}</small>
                    </span>
                    <TeacherUiIcon name="arrow" size={14} />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="td-topbar-actions">
          <span className="td-today">{formatUzShortDate(new Date(), { year: true })}</span>
          <NavLink to="/teacher/notifications" className="td-icon-btn" aria-label="Bildirishnomalar">
            <TeacherUiIcon name="bell" size={18} />
            {unread > 0 && <span className="td-bell-dot">{unread > 9 ? '9+' : unread}</span>}
          </NavLink>

          <div className="td-profile" ref={profileRef}>
            <button
              type="button"
              className={`td-profile-btn ${profileOpen ? 'is-open' : ''}`}
              onClick={() => setProfileOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <span className="td-avatar" style={profileImageUrl ? { backgroundImage: `url(${profileImageUrl})` } : undefined}>
                {!profileImageUrl && initials}
              </span>
              <span className="td-profile-text">
                <strong>{fullName}</strong>
                <span>{roleLabel}</span>
              </span>
              <span className={`td-chevron ${profileOpen ? 'is-open' : ''}`}><TeacherUiIcon name="chevron" size={15} /></span>
            </button>

            {profileOpen && (
              <div className="td-profile-menu" role="menu">
                <div className="td-profile-menu-head">
                  <span className="td-avatar" style={profileImageUrl ? { backgroundImage: `url(${profileImageUrl})` } : undefined}>
                    {!profileImageUrl && initials}
                  </span>
                  <div>
                    <strong>{fullName}</strong>
                    <span>{user?.phone || user?.email || roleLabel}</span>
                  </div>
                </div>
                <button type="button" role="menuitem" onClick={() => navigate('/teacher/profile')}>
                  <TeacherUiIcon name="profile" size={17} /> Profil
                </button>
                <button type="button" role="menuitem" onClick={() => navigate('/teacher/notifications')}>
                  <TeacherUiIcon name="bell" size={17} /> Bildirishnomalar
                  {unread > 0 && <span className="td-menu-count">{unread}</span>}
                </button>
                <button type="button" role="menuitem" onClick={() => navigate('/teacher/salary')}>
                  <TeacherUiIcon name="salary" size={17} /> Maosh
                </button>
                <div className="td-profile-menu-divider" />
                <button type="button" role="menuitem" className="is-danger" onClick={handleLogout}>
                  <TeacherUiIcon name="logout" size={17} /> Tizimdan chiqish
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={`td-main ${isFlushPage ? 'is-flush' : ''}`}>
        <div className={`td-content ${isFlushPage ? 'is-flush' : ''}`}>
          <Routes>
            <Route path="/" element={<TeacherHome greeting={greeting} />} />
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

      <nav className="td-mobile-nav" aria-label="Mobil navigatsiya">
        {MOBILE_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `td-mobile-link ${isActive ? 'is-active' : ''}`}
          >
            <TeacherUiIcon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default TeacherDashboard;
