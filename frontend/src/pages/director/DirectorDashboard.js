import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import AdminHome from '../../components/admin/AdminHome';
import StudentManagement from '../../components/admin/StudentManagement';
import CoinLeaderboard from '../../components/admin/CoinLeaderboard';
import TeacherManagement from '../../components/admin/TeacherManagement';
import ClassManagement from '../../components/admin/ClassManagement';
import SubjectManagement from '../../components/admin/SubjectManagement';
import AdminClassJournal from '../../components/admin/AdminClassJournal';
import AttendanceManagement from '../../components/admin/AttendanceManagement';
import ScheduleManagement from '../../components/admin/ScheduleManagement';
import Reports from '../../components/admin/Reports';
import Profile from '../../components/admin/Profile';
import PaymentManagement from '../../components/admin/PaymentManagement';
import DebtorsList from '../../components/admin/DebtorsList';
import FinancialOverview from '../../components/admin/FinancialOverview';
import apiService from '../../services/apiService';
import AIAssistant from '../../components/admin/AIAssistant';
import AIAvatar from '../../components/admin/AIAvatar';
import StaffPlaceholder from '../../components/admin/StaffPlaceholder';
import StaffManagement from '../../components/admin/StaffManagement';
import LeadsManagement from '../../components/admin/LeadsManagement';
import AccountantManagement from '../../components/admin/AccountantManagement';
import ReceptionManagement from '../../components/admin/ReceptionManagement';
import ParentContacts from '../../components/admin/ParentContacts';
import ChatPage from '../../components/chat/ChatPage';
import DirectorNotifications from '../../components/admin/DirectorNotifications';
import Substitutions from '../../components/common/Substitutions';
import NotificationInbox from '../../components/common/NotificationInbox';
import DirectorPermissions from '../../components/admin/DirectorPermissions';
import InventoryManagement from '../../components/admin/InventoryManagement';
import NotificationBell from '../../components/common/NotificationBell';
import './DirectorDashboard.css';
import './DirectorProfile.css';
import './DirectorStudents.css';
import './DirectorClasses.css';

// Xodimlar bo'limi: :type o'zgarganda komponent qayta yuklanishi uchun key beramiz
const StaffRoute = () => {
  const { type } = useParams();
  return <StaffManagement key={type} />;
};

const AiMenuIcon = () => (
  <svg
    className="ai-menu-icon"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="aiMenuShellGradient" x1="5" y1="8" x2="19" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.5" stopColor="#dbeafe" />
        <stop offset="1" stopColor="#60a5fa" />
      </linearGradient>
      <linearGradient id="aiMenuScreenGradient" x1="7" y1="10" x2="17" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#0f172a" />
        <stop offset="1" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="aiMenuStemGradient" x1="8" y1="4" x2="16" y2="8" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#38bdf8" />
        <stop offset="1" stopColor="#1e40af" />
      </linearGradient>
    </defs>
    <path className="ai-menu-icon-shadow" d="M6 11.5h12a4 4 0 0 1 4 4v1A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-1a4 4 0 0 1 4-4Z" />
    <path className="ai-menu-icon-stem" d="M12 7V4M8 4h8" />
    <rect className="ai-menu-icon-shell" x="4" y="8" width="16" height="12" rx="4" />
    <path className="ai-menu-icon-highlight" d="M7.1 10.4h6.6" />
    <rect className="ai-menu-icon-screen" x="6.6" y="11.2" width="10.8" height="6.4" rx="2.4" />
    <path className="ai-menu-icon-eye" d="M9 14h.01M15 14h.01" />
    <path className="ai-menu-icon-mouth" d="M9 16.6h6" />
  </svg>
);

const DirectorIcon = ({ name = 'grid', size = 20 }) => {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    education: <><path d="m3 10 9-5 9 5-9 5-9-5Z" /><path d="M7 12.5V17c3 2 7 2 10 0v-4.5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    finance: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    report: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    substitution: <><path d="M7 7h11l-3-3M17 17H6l3 3" /><path d="M18 7l-3 3M6 17l3-3" /></>,
    chatAdmin: <><path d="M18 14a4 4 0 0 1-4 4H7l-4 3V8a4 4 0 0 1 4-4h7a4 4 0 0 1 4 4Z" /><path d="M18 8h1a3 3 0 0 1 3 3v8l-3-2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-4L10 6a8 8 0 0 0-1.7 1L6 6.1 4 9.5 6 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3.1h4l.4-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4L19 13a7 7 0 0 0 .1-1Z" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    ai: <><rect x="4" y="7" width="16" height="13" rx="4" /><path d="M12 7V3M9 3h6M8 13h.01M16 13h.01M9 17h6" /></>,
    refresh: <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 9M5.5 15A7 7 0 0 0 17.8 17.8L20 15" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>,
    teacher: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 4h5v10h-5M18 8h3" /></>,
    student: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M6 11v5c3 2 9 2 12 0v-5M21 9v6" /></>,
    classes: <><path d="M4 21V5l8-3 8 3v16M9 21v-4h6v4M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01" /></>,
    subjects: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z" /><path d="M4 6.5v13M8 7h8M8 11h6" /></>,
    grading: <><path d="M4 4h16v16H4zM8 9l2 2 5-5M8 15h8" /></>,
    exams: <><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h4" /><path d="m4 15-2 2 2 2" /></>,
    attendance: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 15l2 2 5-5" /></>,
    schedule: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M4 4l2 2M20 4l-2 2" /></>,
    journal: <><path d="M5 3h13a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2ZM5 3v16M9 7h7M9 11h7M9 15h5" /></>,
    coins: <><circle cx="9" cy="12" r="6" /><path d="M9 9v6M7 10h3a1.5 1.5 0 0 1 0 3H8M15 7a5 5 0 1 1 0 10" /></>,
    management: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></>,
    hr: <><circle cx="8" cy="8" r="3" /><path d="M2 20a6 6 0 0 1 12 0M17 8v6M14 11h6M17 17v4" /></>,
    admin: <><path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6Z" /><path d="m9 12 2 2 4-5" /></>,
    accountant: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2" /></>,
    hrStaff: <><path d="M5 3h14v18H5zM9 3v4h6V3M8 11h8M8 15h5" /></>,
    reception: <><path d="M3 18h18M5 18v-3a7 7 0 0 1 14 0v3M12 5V3M9 5h6M2 21h20" /></>,
    callCenter: <><path d="M4 4h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4c0 1-1 2-2 2C9 21 3 15 2 6c0-1 1-2 2-2Z" /></>,
    permissions: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M15 8l2 2M18 5l2 2" /><path d="M5 15h6" /></>,
    inventory: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
    branches: <><path d="M4 21V8h7v13M13 21V3h7v18M2 21h20M7 12h1M7 16h1M16 7h1M16 11h1M16 15h1" /></>,
    applications: <><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h4" /><path d="M3 8h6M6 5v6" /></>,
    financeSection: <><path d="M3 10h18L12 3 3 10ZM5 10v8M9 10v8M15 10v8M19 10v8M3 21h18" /></>,
    payments: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /><circle cx="17" cy="15" r="1" /></>,
    studentPayments: <><circle cx="7" cy="8" r="3" /><path d="M2 20a5 5 0 0 1 10 0M14 7h7v10h-7zM16 11h3M17.5 9.5v3" /></>,
    salaries: <><path d="M4 5h16v14H4zM8 9h8M8 13h5" /><path d="M17 12v5M15 14.5h4" /></>,
    transactions: <><path d="M4 7h14l-3-3M20 17H6l3 3M18 7l-3 3M6 17l3-3" /></>,
    debtors: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2Z" /><path d="M9 8h6M9 12h4M16 15h.01" /></>,
    financial: <><path d="M3 20h18M6 17V9M12 17V4M18 17v-6" /><path d="m4 7 6-4 5 3 5-3" /></>,
    communication: <><path d="M4 4h12a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H9l-5 3Z" /><path d="M8 9h8M8 13h5" /></>,
    leads: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /><path d="m19 5 3-3M18 6l4-4" /></>,
    parents: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2 20a6 6 0 0 1 12 0M13 20a5 5 0 0 1 9 0" /></>,
    broadcast: <><path d="m3 11 15-6v14L3 13ZM8 14l2 7h3l-1-8M18 9a4 4 0 0 1 0 6" /></>,
    reminders: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6M12 2v3" /></>
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
    '/director': 'grid',
    '/director/ai': 'ai',
    '/director/teachers': 'teacher',
    '/director/users': 'student',
    '/director/classes': 'classes',
    '/director/subjects': 'subjects',
    '/director/education/grading': 'grading',
    '/director/education/exams': 'exams',
    '/director/attendance': 'attendance',
    '/director/schedule': 'schedule',
    '/director/journal': 'journal',
    '/director/coins': 'coins',
    '/director/substitutions': 'substitution',
    '/director/staff/admin': 'admin',
    '/director/staff/accountant': 'accountant',
    '/director/staff/hr': 'hrStaff',
    '/director/staff/reception': 'reception',
    '/director/staff/call-center': 'callCenter',
    '/director/management/chats': 'chatAdmin',
    '/director/management/permissions': 'permissions',
    '/director/inventory': 'inventory',
    '/director/management/branches': 'branches',
    '/director/management/applications': 'applications',
    '/director/payments': 'studentPayments',
    '/director/finance/salaries': 'salaries',
    '/director/finance/other': 'transactions',
    '/director/debtors': 'debtors',
    '/director/financial': 'financial',
    '/director/reports': 'report',
    '/director/chat': 'message',
    '/director/inbox': 'bell',
    '/director/communication/leads': 'leads',
    '/director/communication/parents': 'parents',
    '/director/communication/notifications': 'broadcast',
    '/director/communication/reminders': 'reminders',
    '/director/profile': 'profile'
  };
  const iconBySection = {
    education: 'education',
    management: 'management',
    hr: 'hr',
    finance: 'financeSection',
    payments: 'payments',
    communication: 'communication'
  };
  if (iconByPath[item.path]) return iconByPath[item.path];
  if (iconBySection[item.section]) return iconBySection[item.section];
  return 'grid';
};

const DirectorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({
    pendingUsers: 0
  });

  // Schedule expiry warnings
  const [scheduleWarnings, setScheduleWarnings] = useState({
    expiring: [],
    expired: [],
    showWarningModal: false,
    showExpiredToast: false
  });

  // Frozen accounts (negative balance) warnings
  const [frozenAccounts, setFrozenAccounts] = useState({
    students: [],
    totalFrozen: 0,
    totalNegativeBalance: 0,
    showToast: false
  });

  const [openSubMenus, setOpenSubMenus] = useState({
    staff: false,
    education: false,
    finance: false,
    payments: false,
    management: false,
    hr: false,
    communication: false
  });

  const fetchNotificationCounts = async () => {
    try {
      const counts = await apiService.getAdminNotificationCounts();
      setNotificationCounts(counts);
    } catch (error) {
      // Silently fail - notification counts are not critical
    }
  };

  // Fetch schedule expiry warnings
  const fetchScheduleWarnings = async () => {
    try {
      // Auto-extend expired schedules first (silently)
      try {
        await apiService.autoExtendExpiredSchedules();
      } catch (err) {
        // Silently fail
      }

      // Then fetch current status
      const data = await apiService.getExpiringSchedules();

      // Filter out schedules that were just auto-extended (daysRemaining === 0 means today)
      // Only show warnings for schedules expiring in 1-3 days, not today (auto-extended ones)
      const reallyExpiring = (data.expiring || []).filter(s => s.daysRemaining >= 1);
      const hasExpiring = reallyExpiring.length > 0;
      const hasExpired = data.expired && data.expired.length > 0;

      setScheduleWarnings(prev => ({
        expiring: reallyExpiring,
        expired: data.expired || [],
        showWarningModal: hasExpiring && !prev.warningDismissed,
        showExpiredToast: hasExpired
      }));
    } catch (error) {
      // Silently fail
    }
  };

  const dismissWarningModal = () => {
    setScheduleWarnings(prev => ({
      ...prev,
      showWarningModal: false,
      warningDismissed: true
    }));
  };

  const dismissExpiredToast = () => {
    setScheduleWarnings(prev => ({
      ...prev,
      showExpiredToast: false
    }));
  };

  // Fetch frozen accounts
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
      // Silently fail
    }
  };

  const dismissFrozenToast = () => {
    setFrozenAccounts(prev => ({
      ...prev,
      showToast: false
    }));
  };

  useEffect(() => {
    fetchNotificationCounts();
    fetchScheduleWarnings();
    fetchFrozenAccounts();
    const interval = setInterval(() => {
      fetchNotificationCounts();
      fetchFrozenAccounts();
    }, 60000); // Check every minute
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate profile image URL with cache busting
  const profileImageUrl = useMemo(() => {
    if (!user?.profileImage) return null;
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com';
    // Use _updated timestamp if available, otherwise use a stable default
    const timestamp = user._updated || 0;
    return `${baseUrl}${user.profileImage}?t=${timestamp}`;
  }, [user?.profileImage, user?._updated]);

  const userInitials = useMemo(() => {
    const firstInitial = user?.firstName?.trim()?.charAt(0) || user?.username?.trim()?.charAt(0) || 'A';
    const lastInitial = user?.lastName?.trim()?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }, [user?.firstName, user?.lastName, user?.username]);

  const isAdminHome = location.pathname === '/director' || location.pathname === '/director/';

  useEffect(() => {
    const currentPath = location.pathname;
    const isManagementRoute =
      currentPath === '/director/substitutions' ||
      currentPath === '/director/inventory' ||
      currentPath.startsWith('/director/management/') ||
      currentPath.startsWith('/director/staff/');
    const isCommunicationRoute =
      currentPath === '/director/chat' ||
      currentPath === '/director/inbox' ||
      currentPath.startsWith('/director/communication/');

    if (isManagementRoute || isCommunicationRoute) {
      setOpenSubMenus(prev => ({
        ...prev,
        management: isManagementRoute ? true : prev.management,
        communication: isCommunicationRoute ? true : prev.communication,
        hr: currentPath.startsWith('/director/staff/') ? true : prev.hr
      }));
    }
  }, [location.pathname]);

  const menuItems = [
    {
      path: '/director',
      label: 'Bosh sahifa',
      iconKey: 'grid',
      icon: '📊',
      end: true,
      badge: null,
      section: null
    },
    {
      path: '/director/ai',
      label: 'AI Yordamchi',
      icon: <AiMenuIcon />,
      badge: null,
      section: null
    },
    {
      label: 'Ta\'lim',
      icon: '🎓',
      section: 'education',
      isParent: true,
      children: [
        {
          path: '/director/teachers',
          label: 'O‘qituvchi',
          icon: '👨‍🏫'
        },
        {
          path: '/director/users',
          label: 'O\'quvchilar',
          icon: '👨‍🎓',
          section: 'users',
          badge: notificationCounts.pendingUsers
        },
        {
          path: '/director/classes',
          label: 'Sinflar',
          icon: '🏫'
        },
        {
          path: '/director/subjects',
          label: 'Fanlar',
          icon: '📚'
        },
        {
          path: '/director/education/grading',
          label: 'Baholash',
          icon: '📝'
        },
        {
          path: '/director/education/exams',
          label: 'Imtihonlar',
          icon: '✍️'
        },
        {
          path: '/director/attendance',
          label: 'Davomat',
          icon: '📋'
        },
        {
          path: '/director/schedule',
          label: 'Dars jadvali',
          icon: '📅'
        },
        {
          path: '/director/journal',
          label: 'Sinf jurnali',
          icon: '📖'
        },
        {
          path: '/director/coins',
          label: 'Coin reytingi',
          icon: '🪙'
        }
      ]
    },
    {
      label: 'Boshqaruv',
      icon: '⚙️',
      section: 'management',
      isParent: true,
      children: [
        {
          path: '/director/substitutions',
          label: 'Dars almashtirish',
          iconKey: 'substitution'
        },
        {
          label: 'HR / xodimlar',
          icon: '👥',
          section: 'hr',
          isParent: true,
          children: [
            {
              path: '/director/staff/admin',
              label: 'Admin',
              icon: '🛡️'
            },
            {
              path: '/director/staff/supervisor',
              label: 'Ta\'lim nazoratchisi',
              icon: '👨‍💼'
            },
            {
              path: '/director/staff/accountant',
              label: 'Hisobchi',
              icon: '💰'
            },
            {
              path: '/director/staff/hr',
              label: 'HR',
              icon: '📋'
            },
            {
              path: '/director/staff/reception',
              label: 'Reception',
              icon: '🛎️'
            },
            {
              path: '/director/staff/call-center',
              label: 'Call markaz',
              icon: '📞'
            }
          ]
        },
        {
          path: '/director/management/chats',
          label: 'Chatlar boshqaruvi',
          iconKey: 'chatAdmin',
          icon: '💬'
        },
        {
          path: '/director/management/permissions',
          label: 'Ruxsatnomalar',
          icon: '🔑'
        },
        {
          path: '/director/inventory',
          label: 'Jihozlar',
          icon: '🪑'
        },
        {
          path: '/director/management/branches',
          label: 'Filiallar boshqaruvi',
          icon: '🏢'
        },
        {
          path: '/director/management/applications',
          label: 'Arizalar',
          icon: '📥'
        }
      ]
    },
    {
      label: 'Moliya va hisbot',
      icon: '💰',
      section: 'finance',
      isParent: true,
      children: [
        {
          label: 'To\'lovlar',
          icon: '💸',
          section: 'payments',
          isParent: true,
          children: [
            {
              path: '/director/payments',
              label: 'O\'quvchi to\'lovlari',
              icon: '👨‍🎓'
            },
            {
              path: '/director/finance/salaries',
              label: 'Maoshlar',
              icon: '💳'
            },
            {
              path: '/director/finance/other',
              label: 'Boshqa kirim chiqimlar',
              icon: '🔄'
            }
          ]
        },
        {
          path: '/director/debtors',
          label: 'Qarzdorlar',
          icon: '📉'
        },
        {
          path: '/director/financial',
          label: 'Moliyaviy holat',
          icon: '📊'
        },
        {
          path: '/director/reports',
          label: 'Hisobotlar',
          icon: '📈'
        }
      ]
    },
    {
      label: 'Aloqa',
      icon: '📞',
      section: 'communication',
      isParent: true,
      children: [
        {
          path: '/director/chat',
          label: 'Chat xabarlar',
          iconKey: 'message'
        },
        {
          path: '/director/inbox',
          label: 'Bildirishnomalarim',
          iconKey: 'bell'
        },
        {
          path: '/director/communication/leads',
          label: 'Lidlar',
          icon: '🎯'
        },
        {
          path: '/director/communication/parents',
          label: 'Ota-onalar bilan aloqa',
          icon: '👨‍👩‍👧‍👦'
        },
        {
          path: '/director/communication/notifications',
          label: 'Bildirishnomalar',
          icon: '📢'
        },
        {
          path: '/director/communication/reminders',
          label: 'Eslatmalar',
          icon: '⏰'
        }
      ]
    },
    {
      path: '/director/profile',
      label: 'Profil',
      icon: '👤',
      badge: null,
      section: null
    }
  ];

  const handleMenuItemClick = async (section) => {
    if (section && section !== 'staff' && section !== 'education' && section !== 'finance' && section !== 'payments' && section !== 'management' && section !== 'hr' && section !== 'communication') {
      setSidebarOpen(false);
    }
    
    if (section && section === 'users' && notificationCounts.pendingUsers > 0) {
      try {
        await apiService.markSectionAsViewed(section);
        // Refresh notification counts after marking as viewed
        await fetchNotificationCounts();
      } catch (error) {
        // Silently fail - not critical
      }
    }
  };

  const toggleSubMenu = (section) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="admin-dashboard-layout">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button
              className="sidebar-toggle"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? "Menyuni yopish" : "Menyuni ochish"}
              aria-expanded={sidebarOpen}
            >
              <span className="hamburger"></span>
              <span className="hamburger"></span>
              <span className="hamburger"></span>
            </button>
            <Logo />
            <div className="page-info">
              <div className="header-page-title">Direktor paneli</div>
              <p className="page-subtitle">Maktab boshqaruv tizimi</p>
            </div>
          </div>
          <div className="header-right">
            <NotificationBell accent="#1e3a8a" viewAllLink="/director/inbox" />
            <div className="user-info">
              <div
                className={`user-avatar ${profileImageUrl ? 'has-image' : 'no-image'}`}
                style={profileImageUrl ? {
                  backgroundImage: `url(${profileImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              >
                {!profileImageUrl && (
                  <span className="user-initials">{userInitials}</span>
                )}
              </div>
              <div className="user-details">
                <span className="user-name">{user?.firstName} {user?.lastName}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="refresh-btn"
              aria-label="Sahifani yangilash"
              title="Sahifani yangilash (Hard Refresh)"
            >
              <span className="refresh-icon"><DirectorIcon name="refresh" size={18} /></span>
            </button>
            <button
              onClick={handleLogout}
              className="logout-btn"
              aria-label="Tizimdan chiqish"
            >
              <span className="logout-icon"><DirectorIcon name="logout" size={18} /></span>
              <span className="logout-text">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <span className="brand-icon"><DirectorIcon name="profile" size={18} /></span>
              <span className="brand-text">Direktor</span>
            </div>
          </div>
          <nav className="sidebar-nav" role="navigation" aria-label="Asosiy navigatsiya">
            <ul className="nav-list">
              {menuItems.map((item, index) => (
                <li key={index} className={`nav-item ${item.isParent ? 'has-submenu' : ''}`}>
                  {item.isParent ? (
                    <>
                      <button
                        className={`nav-link submenu-toggle ${openSubMenus[item.section] ? 'open' : ''}`}
                        onClick={() => toggleSubMenu(item.section)}
                      >
                        <span className="nav-icon"><DirectorIcon name={menuIconName(item)} /></span>
                        <span className="nav-text">{item.label}</span>
                        <span className="submenu-arrow">▼</span>
                      </button>
                      <ul className={`submenu-list ${openSubMenus[item.section] ? 'expanded' : ''}`}>
                        {item.children.map((child, childIndex) => (
                          <li key={childIndex} className={`submenu-item ${child.isParent ? 'has-nested-submenu' : ''}`}>
                            {child.isParent ? (
                              <>
                                <button
                                  className={`submenu-link nested-toggle ${openSubMenus[child.section] ? 'open' : ''}`}
                                  onClick={() => toggleSubMenu(child.section)}
                                >
                                  <span className="nav-icon"><DirectorIcon name={menuIconName(child)} size={18} /></span>
                                  <span className="nav-text">{child.label}</span>
                                  <span className="submenu-arrow">▼</span>
                                </button>
                                <ul className={`nested-submenu-list ${openSubMenus[child.section] ? 'expanded' : ''}`}>
                                  {child.children.map((nestedChild, nestedIndex) => (
                                    <li key={nestedIndex} className="nested-submenu-item">
                                      <NavLink
                                        to={nestedChild.path}
                                        className={({ isActive }) =>
                                          `nested-submenu-link ${isActive ? 'active' : ''}`
                                        }
                                        onClick={() => handleMenuItemClick(nestedChild.section)}
                                      >
                                        <span className="nav-icon"><DirectorIcon name={menuIconName(nestedChild)} size={17} /></span>
                                        <span className="nav-text">{nestedChild.label}</span>
                                      </NavLink>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <NavLink
                                to={child.path}
                                className={({ isActive }) =>
                                  `submenu-link ${isActive ? 'active' : ''}`
                                }
                                onClick={() => handleMenuItemClick(child.section)}
                              >
                                <span className="nav-icon"><DirectorIcon name={menuIconName(child)} size={18} /></span>
                                <span className="nav-text">{child.label}</span>
                              </NavLink>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`
                      }
                      end={item.end}
                      onClick={() => handleMenuItemClick(item.section)}
                      aria-label={item.label}
                    >
                      <span className="nav-icon"><DirectorIcon name={menuIconName(item)} /></span>
                      <span className="nav-text">
                        {item.label}
                      </span>
                      {item.badge > 0 && (
                        <span className="notification-badge" aria-label={`${item.badge} ta yangi bildirishnoma`}>
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Sidebar Overlay for mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

        {/* Main Content */}
        <main className="main-content" role="main">
          <Routes>
            <Route path="/" element={<AdminHome />} />
            <Route path="/users" element={<StudentManagement />} />
            <Route path="/coins" element={<CoinLeaderboard />} />
            <Route path="/teachers" element={<TeacherManagement />} />
            <Route path="/staff/accountant" element={<AccountantManagement />} />
            <Route path="/staff/reception" element={<ReceptionManagement />} />
            <Route path="/staff/:type" element={<StaffRoute />} />
            <Route path="/education/:type" element={<StaffPlaceholder />} />
            <Route path="/finance/:type" element={<StaffPlaceholder />} />
            <Route path="/management/permissions" element={<DirectorPermissions />} />
            <Route path="/inventory" element={<InventoryManagement />} />
            <Route path="/management/:type" element={<StaffPlaceholder />} />
            <Route path="/communication/leads" element={<LeadsManagement />} />
            <Route path="/communication/parents" element={<ParentContacts />} />
            <Route path="/communication/notifications" element={<DirectorNotifications />} />
            <Route path="/communication/:type" element={<StaffPlaceholder />} />
            <Route path="/classes" element={<ClassManagement />} />
            <Route path="/subjects" element={<SubjectManagement />} />
            <Route path="/journal" element={<AdminClassJournal />} />
            <Route path="/attendance" element={<AttendanceManagement />} />
            <Route path="/schedule" element={<ScheduleManagement />} />
            <Route path="/payments" element={<PaymentManagement />} />
            <Route path="/debtors" element={<DebtorsList />} />
            <Route path="/financial" element={<FinancialOverview />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/ai" element={<AIAssistant />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/inbox" element={<NotificationInbox />} />
            <Route path="/substitutions" element={<Substitutions accent="#1e3a8a" />} />
            <Route path="/profile" element={<Profile designSystemVariant="director" />} />
            <Route path="*" element={<Navigate to="/director" replace />} />
          </Routes>
        </main>
      </div>

      {/* Schedule Expiry Warning Modal */}
      {scheduleWarnings.showWarningModal && scheduleWarnings.expiring.length > 0 && (
        <div className="schedule-warning-overlay">
          <div className="schedule-warning-modal">
            <div className="warning-modal-header">
              <span className="warning-icon-large">⏰</span>
              <h3>Dars jadvallari muddati tugayapti!</h3>
            </div>
            <div className="warning-modal-body">
              {scheduleWarnings.expiring.map((schedule, index) => (
                <div key={index} className={`warning-item ${schedule.daysRemaining <= 1 ? 'critical' : schedule.daysRemaining <= 2 ? 'urgent' : 'warning'}`}>
                  <div className="warning-item-icon">
                    {schedule.daysRemaining <= 1 ? '🔴' : schedule.daysRemaining <= 2 ? '🟠' : '🟡'}
                  </div>
                  <div className="warning-item-content">
                    <strong>{schedule.className}</strong>
                    <span>{schedule.name}</span>
                  </div>
                  <div className="warning-item-days">
                    {schedule.daysRemaining === 0 ? 'Bugun tugaydi!' :
                      schedule.daysRemaining === 1 ? '1 kun qoldi!' :
                        `${schedule.daysRemaining} kun qoldi`}
                  </div>
                </div>
              ))}
            </div>
            <div className="warning-modal-footer">
              <button className="btn-warning-action" onClick={() => { dismissWarningModal(); navigate('/director/schedule'); }}>
                📅 Jadvallarni boshqarish
              </button>
              <button className="btn-warning-dismiss" onClick={dismissWarningModal}>
                Keyinroq
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expired Schedule Toast */}
      {scheduleWarnings.showExpiredToast && scheduleWarnings.expired.length > 0 && (
        <div className="expired-toast">
          <div className="expired-toast-content">
            <span className="expired-toast-icon">⚠️</span>
            <div className="expired-toast-text">
              <strong>{scheduleWarnings.expired.length} ta jadval muddati o'tgan!</strong>
              <span>Vaqtni uzaytiring yoki yangi jadval qo'shing</span>
            </div>
            <button className="expired-toast-action" onClick={() => { dismissExpiredToast(); navigate('/director/schedule'); }}>
              Boshqarish
            </button>
            <button className="expired-toast-close" onClick={dismissExpiredToast}>×</button>
          </div>
        </div>
      )}

      {/* Frozen Accounts Toast */}
      {frozenAccounts.showToast && frozenAccounts.totalFrozen > 0 && (
        <div className="frozen-toast">
          <div className="frozen-toast-content">
            <span className="frozen-toast-icon">🥶</span>
            <div className="frozen-toast-text">
              <strong>{frozenAccounts.totalFrozen} ta o'quvchining hisobi muzlatilgan!</strong>
              <span>Iltimos hisoblarni to'ldiring (Jami: {frozenAccounts.totalNegativeBalance.toLocaleString('uz-UZ')} so'm)</span>
            </div>
            <button className="frozen-toast-action" onClick={() => { dismissFrozenToast(); navigate('/director/users'); }}>
              Ko'rish
            </button>
            <button className="frozen-toast-close" onClick={dismissFrozenToast}>×</button>
          </div>
        </div>
      )}

      {/* Floating AI robot is only shown on the admin home page. */}
      {isAdminHome && <AIAvatar />}

      <style>{`
        .admin-dashboard-layout {
          min-height: 100vh;
          background: #f8fafc;
        }

        /* Header Styles - Base (Desktop Computer 1200px+) */
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          letter-spacing: 0.01em;
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
          color: #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8125rem;
          box-shadow: 0 1px 4px rgba(245, 158, 11, 0.25);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .user-avatar.no-image {
          background: linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%);
          color: #ffffff;
          border: 2px solid #bfdbfe;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }

        .user-avatar.has-image {
          background: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .user-avatar .user-initials {
          color: #ffffff;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0.02em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
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
          color: #64748b;
          text-transform: capitalize;
          font-weight: 500;
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
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logout-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
          background: linear-gradient(135deg, #f87171, #ef4444);
        }

        .logout-btn:active {
          transform: translateY(0);
        }

        .logout-icon {
          font-size: 0.9375rem;
        }

        .logout-text {
          line-height: 1;
          white-space: nowrap;
        }

        /* Refresh Button Styles */
        .refresh-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          width: 42px;
          height: 42px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 1px 4px rgba(59, 130, 246, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .refresh-btn:hover {
          transform: translateY(-1px) rotate(180deg);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
          background: linear-gradient(135deg, #60a5fa, #3b82f6);
        }

        .refresh-btn:active {
          transform: translateY(0) rotate(360deg);
        }

        .refresh-icon {
          font-size: 1.25rem;
          transition: transform 0.3s ease;
        }

        .refresh-btn:hover .refresh-icon {
          animation: spin 0.5s ease-in-out;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Dashboard Container */
        .dashboard-container {
          display: flex;
          min-height: calc(100vh - 85px);
          position: relative;
        }

        /* Sidebar Styles - Kompakt Dizayn */
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
          color: #3b82f6;
        }

        .brand-text {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #1e293b;
          letter-spacing: -0.025em;
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
          border-radius: 2px;
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }

        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
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
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: white;
          position: relative;
          font-weight: 700;
          transform: translateX(2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.28);
        }

        .nav-link.active::before {
          content: '';
          position: absolute;
          left: -0.75rem;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: #3b82f6;
          border-radius: 2px;
        }

        .nav-icon {
          font-size: 0.9375rem;
          min-width: 20px;
          text-align: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .nav-icon svg {
          width: 18px;
          height: 18px;
        }

        .ai-menu-icon {
          width: 20px;
          height: 20px;
          overflow: visible;
          filter: drop-shadow(0 2px 2px rgba(15, 23, 42, 0.18));
          transform-origin: 50% 50%;
          transition: transform 0.2s ease, filter 0.2s ease;
        }

        .ai-menu-icon-shadow {
          fill: rgba(15, 23, 42, 0.14);
          transform: translate(0.75px, 0.75px);
        }

        .ai-menu-icon-stem {
          stroke: url(#aiMenuStemGradient);
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .ai-menu-icon-shell {
          fill: url(#aiMenuShellGradient);
          stroke: #2563eb;
          stroke-width: 1.45;
          filter: drop-shadow(0 1px 1px rgba(255, 255, 255, 0.75));
        }

        .ai-menu-icon-highlight {
          stroke: rgba(255, 255, 255, 0.9);
          stroke-width: 1.35;
          stroke-linecap: round;
        }

        .ai-menu-icon-screen {
          fill: url(#aiMenuScreenGradient);
          stroke: rgba(255, 255, 255, 0.5);
          stroke-width: 0.7;
        }

        .ai-menu-icon-eye {
          stroke: #67e8f9;
          stroke-width: 2.6;
          stroke-linecap: round;
          filter: drop-shadow(0 0 2px rgba(56, 189, 248, 0.9));
        }

        .ai-menu-icon-mouth {
          stroke: #bfdbfe;
          stroke-width: 1.7;
          stroke-linecap: round;
        }

        .nav-link:hover .ai-menu-icon {
          transform: translateY(-1px) scale(1.04);
          filter: drop-shadow(0 3px 3px rgba(37, 99, 235, 0.22));
        }

        .nav-link.active .ai-menu-icon {
          filter: drop-shadow(0 3px 3px rgba(30, 58, 138, 0.4));
        }

        .nav-link.active .ai-menu-icon-shell {
          stroke: #ffffff;
        }

        .nav-text {
          font-weight: 500;
          font-size: 0.75rem;
        }

        .main-content {
          flex: 1;
          padding: 1.5rem;
          background: #f8fafc;
          min-height: calc(100vh - 85px);
          overflow-x: hidden;
        }

        .sidebar-overlay {
          display: none;
        }

        /* Laptop Screens (768px - 1199px) */
        @media (max-width: 1199px) and (min-width: 768px) {
          .header {
            height: 80px;
          }

          .header-content {
            padding: 0 1.5rem;
          }

          .header-left {
            gap: 1.75rem;
          }

          .header-right {
            gap: 1.5rem;
          }

          .header-page-title {
            font-size: 1.125rem;
          }

          .page-subtitle {
            font-size: 0.6875rem;
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
          .header-content {
            padding: 0 1rem;
          }

          .page-info {
            display: none;
          }
        }

        /* Tablet Screens (481px - 767px) */
        @media (max-width: 767px) and (min-width: 481px) {
          .header {
            height: 75px;
          }

          .header-content {
            padding: 0 1rem;
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

        /* Mobile Phone Screens (320px - 480px) */
        @media (max-width: 480px) {
          .header {
            height: 70px;
          }

          .header-content {
            padding: 0 0.75rem;
          }

          .header-left {
            gap: 1rem;
          }

          .header-right {
            gap: 1rem;
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

        /* Telefon */
        @media (max-width: 575px) {
          .header {
            height: 64px;
          }

          .header-content {
            gap: 0.375rem;
            padding: 0 0.5rem;
          }

          .header-left {
            flex: 1 1 auto;
            gap: 0.5rem;
            min-width: 0;
          }

          .sidebar-toggle {
            display: flex;
            flex: 0 0 36px;
            width: 36px;
            height: 36px;
            padding: 0.4375rem;
            border-radius: 9px;
          }

          .hamburger {
            width: 20px;
            height: 2px;
            margin: 2.5px 0;
          }

          .header .logo {
            flex: 1 1 auto;
            justify-content: flex-start;
            gap: 0.45rem;
            min-width: 0;
            overflow: hidden;
          }

          .header .logo-image {
            width: 34px;
            height: 34px !important;
            border-radius: 9px;
            flex-shrink: 0;
          }

          .header .logo-text {
            min-width: 0;
            overflow: hidden;
          }

          .header .logo-main,
          .header .logo-sub {
            white-space: nowrap;
          }

          .header .logo-main {
            font-size: 0.72rem;
            line-height: 1;
            letter-spacing: 0.04em;
          }

          .header .logo-sub {
            font-size: 0.55rem;
            line-height: 1;
            letter-spacing: 0.1em;
          }

          .page-info,
          .user-details {
            display: none;
          }

          .header-right {
            flex: 0 0 auto;
            gap: 0.4rem;
          }

          .user-info {
            padding: 0.2rem;
            border-radius: 10px;
          }

          .user-avatar {
            width: 28px;
            height: 28px;
            font-size: 0.625rem;
          }

          .refresh-btn {
            width: 34px;
            height: 34px;
            border-radius: 8px;
          }

          .refresh-icon {
            font-size: 1rem;
          }

          .logout-btn {
            min-height: 34px;
            gap: 0.25rem;
            padding: 0.45rem 0.55rem;
            border-radius: 8px;
            font-size: 0.7rem;
          }

          .logout-icon {
            font-size: 0.75rem;
          }

          .logout-btn span.logout-text {
            display: inline;
          }

          .dashboard-container {
            min-height: calc(100vh - 64px);
          }

          .sidebar {
            top: 64px;
            height: calc(100vh - 64px);
          }

          .sidebar-overlay {
            top: 64px;
          }

          .main-content {
            min-height: calc(100vh - 64px);
          }
        }

        @media (max-width: 420px) {
          .header .logo-image {
            width: 30px;
            height: 30px !important;
          }

          .header .logo-main {
            font-size: 0.66rem;
          }

          .header .logo-sub,
          .logout-btn span.logout-text {
            display: none;
          }

          .user-avatar {
            width: 26px;
            height: 26px;
          }

          .logout-btn {
            width: 34px;
            justify-content: center;
            padding: 0;
          }
        }

        @media (min-width: 576px) and (max-width: 767px) {
          .header {
            height: 70px;
          }

          .header-content {
            padding: 0 0.75rem;
          }

          .header-left {
            gap: 0.75rem;
          }

          .header .logo {
            gap: 0.65rem;
            min-width: 0;
          }

          .header .logo-image {
            width: 40px;
            height: 40px !important;
            border-radius: 10px;
          }

          .header .logo-main {
            font-size: 0.82rem;
            white-space: nowrap;
          }

          .header .logo-sub {
            font-size: 0.64rem;
            white-space: nowrap;
          }

          .header-right {
            gap: 0.65rem;
          }

          .user-info {
            padding: 0.25rem;
          }

          .user-avatar {
            width: 30px;
            height: 30px;
          }

          .refresh-btn {
            width: 36px;
            height: 36px;
          }

          .logout-btn {
            min-height: 36px;
            padding: 0.45rem 0.65rem;
            font-size: 0.72rem;
          }

          .logout-btn span.logout-text {
            display: inline;
          }

          .dashboard-container {
            min-height: calc(100vh - 70px);
          }

          .sidebar {
            top: 70px;
            height: calc(100vh - 70px);
          }

          .sidebar-overlay {
            top: 70px;
          }

          .main-content {
            min-height: calc(100vh - 70px);
          }
        }

        /* Tablet */
        @media (min-width: 768px) and (max-width: 991px) {
          .header {
            height: 76px;
          }

          .header-content {
            padding: 0 1rem;
          }

          .header-left {
            gap: 1rem;
          }

          .header .logo {
            gap: 0.75rem;
          }

          .header .logo-image {
            width: 44px;
            height: 44px !important;
            border-radius: 11px;
          }

          .header .logo-main {
            font-size: 0.9rem;
          }

          .header .logo-sub {
            font-size: 0.7rem;
          }

          .header-right {
            gap: 0.75rem;
          }

          .user-info {
            padding: 0.35rem 0.5rem;
          }

          .user-avatar {
            width: 32px;
            height: 32px;
          }

          .refresh-btn {
            width: 38px;
            height: 38px;
          }

          .logout-btn {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
          }

          .dashboard-container {
            min-height: calc(100vh - 76px);
          }

          .sidebar {
            top: 76px;
            height: calc(100vh - 76px);
          }

          .main-content {
            min-height: calc(100vh - 76px);
          }
        }

        /* Laptop */
        @media (min-width: 992px) and (max-width: 1199px) {
          .header-left {
            gap: 1.25rem;
          }

          .header-right {
            gap: 1rem;
          }

          .header .logo-image {
            width: 48px;
            height: 48px !important;
            border-radius: 12px;
          }

          .user-info {
            padding: 0.5rem 0.75rem;
          }
        }

        /* Desktop */
        @media (min-width: 1200px) {
          .header .logo-image {
            width: 56px;
            height: 56px !important;
          }
        }

        /* Schedule Warning Modal Styles */
        .schedule-warning-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.3s ease;
          backdrop-filter: blur(4px);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .schedule-warning-modal {
          background: white;
          border-radius: 20px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        @keyframes modalSlideIn {
          from {
            transform: scale(0.8) translateY(-30px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .warning-modal-header {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          padding: 1.5rem;
          text-align: center;
          color: white;
        }

        .warning-icon-large {
          font-size: 3rem;
          display: block;
          margin-bottom: 0.5rem;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .warning-modal-header h3 {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .warning-modal-body {
          padding: 1.5rem;
          max-height: 300px;
          overflow-y: auto;
        }

        .warning-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 0.75rem;
          transition: transform 0.2s ease;
        }

        .warning-item:hover {
          transform: translateX(5px);
        }

        .warning-item.critical {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 1px solid #fecaca;
        }

        .warning-item.urgent {
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
          border: 1px solid #fed7aa;
        }

        .warning-item.warning {
          background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
          border: 1px solid #fde047;
        }

        .warning-item-icon {
          font-size: 1.5rem;
        }

        .warning-item-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .warning-item-content strong {
          color: #1e3a8a;
          font-size: 1rem;
        }

        .warning-item-content span {
          color: #64748b;
          font-size: 0.875rem;
        }

        .warning-item-days {
          font-weight: 700;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.85rem;
          white-space: nowrap;
        }

        .warning-item.critical .warning-item-days {
          background: #ef4444;
          color: white;
        }

        .warning-item.urgent .warning-item-days {
          background: #f97316;
          color: white;
        }

        .warning-item.warning .warning-item-days {
          background: #eab308;
          color: white;
        }

        .warning-modal-footer {
          padding: 1.25rem 1.5rem;
          background: #f8fafc;
          display: flex;
          gap: 1rem;
          justify-content: center;
          border-top: 1px solid #e2e8f0;
        }

        .btn-warning-action {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          color: white;
          border: none;
          padding: 0.875rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 1rem;
        }

        .btn-warning-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(30, 58, 138, 0.3);
        }

        .btn-warning-dismiss {
          background: transparent;
          color: #64748b;
          border: 1px solid #e2e8f0;
          padding: 0.875rem 1.5rem;
          border-radius: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-warning-dismiss:hover {
          background: #f1f5f9;
          color: #475569;
        }

        /* Expired Toast Styles */
        .expired-toast {
          position: fixed;
          top: 100px;
          right: 20px;
          z-index: 1500;
          animation: toastSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes toastSlideIn {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .expired-toast-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          padding: 1rem 1.25rem;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(239, 68, 68, 0.4);
          max-width: 400px;
        }

        .expired-toast-icon {
          font-size: 1.75rem;
          animation: shake 0.5s ease-in-out infinite;
        }

        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }

        .expired-toast-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .expired-toast-text strong {
          font-size: 0.95rem;
        }

        .expired-toast-text span {
          font-size: 0.8rem;
          opacity: 0.9;
        }

        .expired-toast-action {
          background: white;
          color: #dc2626;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.85rem;
          white-space: nowrap;
        }

        .expired-toast-action:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .expired-toast-close {
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .expired-toast-close:hover {
          background: rgba(255,255,255,0.3);
          transform: scale(1.1);
        }

        /* Frozen Accounts Toast */
        .frozen-toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1500;
          animation: toastSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes toastSlideUp {
          from {
            transform: translateY(120%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .frozen-toast-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          color: white;
          padding: 1.25rem 1.5rem;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(14, 165, 233, 0.4);
          max-width: 450px;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .frozen-toast-icon {
          font-size: 2rem;
          animation: freeze 2s ease-in-out infinite;
        }

        @keyframes freeze {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .frozen-toast-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .frozen-toast-text strong {
          font-size: 1rem;
          font-weight: 700;
        }

        .frozen-toast-text span {
          font-size: 0.85rem;
          opacity: 0.95;
        }

        .frozen-toast-action {
          background: white;
          color: #0284c7;
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .frozen-toast-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        }

        .frozen-toast-close {
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          font-weight: 300;
          line-height: 1;
        }

        .frozen-toast-close:hover {
          background: rgba(255,255,255,0.3);
          transform: scale(1.15);
        }

        @media (max-width: 480px) {
          .frozen-toast {
            bottom: 10px;
            right: 10px;
            left: 10px;
          }

          .frozen-toast-content {
            max-width: 100%;
            padding: 1rem 1.25rem;
          }

          .frozen-toast-icon {
            font-size: 1.5rem;
          }

          .frozen-toast-text strong {
            font-size: 0.9rem;
          }

          .frozen-toast-text span {
            font-size: 0.75rem;
          }

          .frozen-toast-action {
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .schedule-warning-modal {
            width: 95%;
            margin: 1rem;
          }

          .warning-modal-body {
            padding: 1rem;
          }

          .warning-item {
            padding: 0.75rem;
            flex-wrap: wrap;
          }

          .warning-item-days {
            width: 100%;
            text-align: center;
            margin-top: 0.5rem;
          }

          .warning-modal-footer {
            flex-direction: column;
          }

          .expired-toast {
            right: 10px;
            left: 10px;
            top: 90px;
          }

          .expired-toast-content {
            max-width: 100%;
            flex-wrap: wrap;
          }
        }

        /* Submenu Styles */
        .submenu-toggle {
          width: 100%;
          background: none;
          cursor: pointer;
          text-align: left;
          justify-content: flex-start;
          border: 1px solid transparent;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.75rem;
          color: #64748b;
          transition: all 0.2s ease;
        }

        .submenu-toggle:hover {
          background: #f8fafc;
          color: #1e293b;
        }

        .submenu-arrow {
          margin-left: auto;
          font-size: 0.6rem;
          transition: transform 0.3s ease;
          color: #94a3b8;
        }

        .submenu-toggle.open .submenu-arrow {
          transform: rotate(180deg);
        }

        .submenu-list {
          list-style: none;
          padding: 0;
          margin: 0;
          max-height: 0;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: #f8fafc;
          border-radius: 0 0 8px 8px;
        }

        .submenu-list.expanded {
          max-height: 500px;
          padding: 0.25rem 0;
          margin-bottom: 0.5rem;
        }

        .submenu-item {
          margin: 0.125rem 0.5rem;
        }

        .submenu-link {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.4rem 0.75rem;
          color: #64748b;
          text-decoration: none;
          transition: all 0.2s ease;
          border-radius: 6px;
          font-size: 0.75rem;
        }

        .submenu-link:hover {
          background: #f1f5f9;
          color: #1e293b;
          transform: translateX(2px);
        }

        .submenu-link.active {
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          color: #1e40af;
          font-weight: 700;
          box-shadow: 0 1px 4px rgba(59, 130, 246, 0.15);
          border: 1px solid #bfdbfe;
        }

        /* Nested Submenu Styles */
        .nested-submenu-list {
          list-style: none;
          padding: 0;
          margin: 0;
          max-height: 0;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: #f1f5f9;
        }

        .nested-submenu-list.expanded {
          max-height: 500px;
          padding: 0.2rem 0;
        }

        .nested-submenu-item {
          margin: 0.125rem 0.5rem 0.125rem 1rem;
        }

        .nested-submenu-link {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.35rem 0.75rem;
          color: #64748b;
          text-decoration: none;
          transition: all 0.2s ease;
          border-radius: 6px;
          font-size: 0.7rem;
          border: 1px solid transparent;
        }

        .nested-submenu-link:hover {
          background: #e2e8f0;
          color: #0f172a;
          transform: translateX(2px);
        }

        .nested-submenu-link.active {
          background: #ffffff;
          color: #3b82f6;
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid #cbd5e1;
        }

        .nested-toggle {
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
        }

        .nested-toggle.open {
          color: #1e293b;
          font-weight: 600;
        }

        .submenu-link .nav-icon {
          font-size: 0.8rem;
        }

        @media (max-width: 575px) {
          .submenu-link .nav-text {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
};

export default DirectorDashboard;
