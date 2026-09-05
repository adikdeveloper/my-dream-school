import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import StudentManagement from '../../components/admin/StudentManagement';
import StudentProfile from '../../components/admin/StudentProfile';
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
    empty: <><path d="M4 5h16v14H4zM4 8l8 6 8-6" /></>,
    attendance: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18M8 15l2 2 5-5" /></>,
    phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2Z" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>
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
    '/reception/attendance': 'attendance',
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
    { label: 'Davomat', iconName: 'attendance', to: '/reception/attendance' },
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
            Qabulxona paneli — o‘quvchilarni ro‘yxatga oling, davomatni kuzating, lidlarni yuriting, o‘qituvchi va fanlar bazasini boshqaring.
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

// ====================== RECEPTION DAVOMAT (faqat ko'rish — davomatni o'qituvchi belgilaydi) ======================
const toDayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dayStatusOf = (status) => {
  if (status === 'present' || status === 'keldi' || status === 'late') return 'present';
  if (status === 'excused' || status === 'sababli') return 'excused';
  if (status === 'absent' || status === 'kelmadi') return 'absent';
  return null;
};

const ReceptionAttendance = () => {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [period, setPeriod] = useState('1');
  const [sort, setSort] = useState('streak');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const todayKey = useMemo(() => toDayKey(new Date()), []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 29);
        const [att, studs, cls] = await Promise.all([
          apiService.getAttendance({ startDate: toDayKey(start), endDate: toDayKey(end) }).catch(() => []),
          apiService.getUsers('student', 1, 1000, '').catch(() => ({ users: [] })),
          apiService.getClasses().catch(() => ({ classes: [] }))
        ]);
        if (!mounted) return;
        setRecords(Array.isArray(att) ? att : (att?.attendance ?? []));
        const studArr = Array.isArray(studs) ? studs : (studs?.users ?? []);
        setStudents(studArr);
        const clsArr = Array.isArray(cls) ? cls : (cls?.classes ?? []);
        setClasses(clsArr);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const studentMeta = useMemo(() => {
    const m = {};
    students.forEach((s) => { m[String(s._id)] = s; });
    return m;
  }, [students]);

  const classNameOf = (rec) => {
    const c = rec?.class;
    if (!c) {
      const meta = rec?.student?._id ? studentMeta[String(rec.student._id)] : null;
      const cid = meta?.classId;
      if (cid && typeof cid === 'object') {
        if (cid.grade !== null && cid.grade !== undefined && cid.grade !== '') return `${cid.grade}-${cid.section || ''}`;
        return cid.name || '-';
      }
      return 'Biriktirilmagan';
    }
    if (typeof c === 'object') {
      if (c.grade !== null && c.grade !== undefined && c.grade !== '') return `${c.grade}-${c.section || ''}`;
      return c.name || '-';
    }
    return '-';
  };

  // Har bir o'quvchi bo'yicha kunlik holat + ketma-ket kelmagan kunlar
  const absentees = useMemo(() => {
    const byStudent = {};
    records.forEach((r) => {
      const sid = r?.student?._id ? String(r.student._id) : null;
      if (!sid) return;
      const d = new Date(r.date);
      if (Number.isNaN(d.getTime())) return;
      const key = toDayKey(d);
      const st = dayStatusOf(r.status);
      if (!st) return;
      if (!byStudent[sid]) byStudent[sid] = { rec: r, days: {} };
      const cur = byStudent[sid].days[key];
      if (cur === 'present' || st === cur) return;
      if (st === 'present' || cur !== 'present') byStudent[sid].days[key] = st === 'present' ? 'present' : (cur === 'excused' || st === 'excused' ? 'excused' : 'absent');
      byStudent[sid].rec = r;
    });

    const list = [];
    Object.entries(byStudent).forEach(([sid, { rec, days }]) => {
      const meta = studentMeta[sid];
      if (meta && meta.isActive === false) return;
      let streak = 0;
      const cursor = new Date();
      for (let i = 0; i < 30; i++) {
        const key = toDayKey(cursor);
        const st = days[key];
        if (st === 'absent') { streak += 1; }
        else if (st === 'present' || st === 'excused') { break; }
        cursor.setDate(cursor.getDate() - 1);
      }
      if (streak === 0) return;
      const s = rec.student || {};
      list.push({
        id: sid,
        firstName: s.firstName || meta?.firstName || '',
        lastName: s.lastName || meta?.lastName || '',
        studentId: s.studentId || meta?.studentId || '-',
        phone: meta?.phone || '-',
        className: classNameOf(rec),
        classId: typeof rec.class === 'object' ? String(rec.class?._id || '') : '',
        streak,
        todayStatus: days[todayKey] || null,
        profile: meta || { _id: sid, firstName: s.firstName, lastName: s.lastName }
      });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, studentMeta, todayKey]);

  const stats = useMemo(() => {
    const inClass = classFilter === 'all' ? absentees : absentees.filter((a) => a.classId === classFilter);
    return {
      d1: inClass.filter((a) => a.todayStatus === 'absent').length,
      d3: inClass.filter((a) => a.streak >= 3).length,
      d7: inClass.filter((a) => a.streak >= 7).length,
      d8: inClass.filter((a) => a.streak > 7).length
    };
  }, [absentees, classFilter]);

  const todayMarked = useMemo(() => records.some((r) => {
    const d = new Date(r.date);
    return !Number.isNaN(d.getTime()) && toDayKey(d) === todayKey;
  }), [records, todayKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = absentees.filter((a) => {
      if (period === '1' && a.todayStatus !== 'absent') return false;
      if (period === '3' && a.streak < 3) return false;
      if (period === '7' && a.streak < 7) return false;
      if (period === '8' && a.streak <= 7) return false;
      if (classFilter !== 'all' && a.classId !== classFilter) return false;
      if (q) {
        const hay = `${a.firstName} ${a.lastName} ${a.studentId} ${a.phone} ${a.className}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    rows = [...rows].sort((x, y) => {
      if (sort === 'name') return `${x.firstName} ${x.lastName}`.localeCompare(`${y.firstName} ${y.lastName}`);
      if (sort === 'class') return `${x.className} ${x.firstName}`.localeCompare(`${y.className} ${y.firstName}`);
      return y.streak - x.streak || `${x.firstName}`.localeCompare(`${y.firstName}`);
    });
    return rows;
  }, [absentees, period, classFilter, search, sort]);

  const periodTabs = [
    { key: '1', label: '1 kun', hint: 'Faqat bugun kelmaganlar' },
    { key: '3', label: '3 kun', hint: '3 kun va undan ortiq kelmaganlar' },
    { key: '7', label: '7 kun', hint: '7 kun va undan ortiq kelmaganlar' },
    { key: '8', label: '7 kun+', hint: '7 kundan ham ko‘p kelmaganlar' }
  ];

  const streakBadge = (s) => {
    if (s > 7) return 'ra-streak s8';
    if (s >= 7) return 'ra-streak s7';
    if (s >= 3) return 'ra-streak s3';
    return 'ra-streak s1';
  };

  return (
    <div className={homeStyles.adminHome}>
      <div className={homeStyles.welcomeSection}>
        <div className={homeStyles.welcomeContent}>
          <h1 className={homeStyles.pageTitle}>Davomat</h1>
          <p className={homeStyles.pageDescription}>
            Kelmasdan yurgan o‘quvchilar ro‘yxati. Davomatni o‘qituvchi belgilaydi — bu yerda faqat kuzatuv.
          </p>
        </div>
        <div className={homeStyles.currentTime}>
          <div className={homeStyles.timeDisplay}>{new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div className={homeStyles.dateDisplay}>So‘nggi 30 kunlik davomat asosida</div>
        </div>
      </div>

      {!loading && !todayMarked && (
        <div className="ra-notice">
          <ReceptionIcon name="attendance" size={18} />
          <span>Bugungi davomat hali belgilanmagan — davomatni o‘qituvchi belgilaydi. 1 kun ro‘yxati bo‘sh bo‘lishi mumkin.</span>
        </div>
      )}

      <div className={homeStyles.statsGrid}>
        {[
          { title: 'Bugun kelmagan (1 kun)', value: stats.d1 },
          { title: '3+ kun kelmagan', value: stats.d3 },
          { title: '7+ kun kelmagan', value: stats.d7 },
          { title: '7 kundan ko‘p', value: stats.d8 }
        ].map((s, i) => (
          <div key={s.title} className={`${homeStyles.statCard} ${homeStyles[`statTone${i + 1}`]}`}>
            <div className={homeStyles.statIconWrapper}>
              <div className={homeStyles.statIcon}><ReceptionIcon name="attendance" size={22} /></div>
            </div>
            <div className={homeStyles.statContent}>
              <div className={homeStyles.statNumber}>{loading ? '…' : s.value}</div>
              <div className={homeStyles.statLabel}>{s.title}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ra-filter-card">
        <div className="ra-filter-row">
          <div className="ra-search">
            <span className="ra-search-icon"><ReceptionIcon name="search" size={15} /></span>
            <input
              type="text"
              placeholder="Ism, familiya, ID, telefon, sinf..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="ra-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="ra-select" aria-label="Sinf bo'yicha saralash">
            <option value="all">Barcha sinflar</option>
            {classes.map((c) => (
              <option key={c._id} value={String(c._id)}>
                {c.grade !== null && c.grade !== undefined && c.grade !== '' ? `${c.grade}-${c.section || ''}` : (c.name || 'Sinf')}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="ra-select" aria-label="Saralash">
            <option value="streak">Avval ko‘p kelmaganlar</option>
            <option value="name">Ism (A–Z)</option>
            <option value="class">Sinf bo‘yicha</option>
          </select>
          <div className="ra-count"><b>{filtered.length}</b><span>ta natija</span></div>
        </div>
        <div className="ra-tabs">
          {periodTabs.map((t) => (
            <button
              key={t.key}
              className={`ra-tab ${period === t.key ? 'active' : ''}`}
              onClick={() => setPeriod(t.key)}
              title={t.hint}
            >
              {t.label}
            </button>
          ))}
          <span className="ra-tab-hint">{periodTabs.find((t) => t.key === period)?.hint}</span>
        </div>
      </div>

      <div className="ra-table-card">
        {loading ? (
          <div className="ra-loading">Davomat yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className={homeStyles.emptyState}>
            <span className={homeStyles.emptyIcon}><ReceptionIcon name="empty" size={24} /></span>
            <p className={homeStyles.emptyText}>Bu mezon bo‘yicha kelmasdan yurgan o‘quvchi topilmadi</p>
          </div>
        ) : (
          <div className="ra-table-wrap">
            <table className="ra-table">
              <thead>
                <tr>
                  <th>O‘quvchi</th>
                  <th>Sinf</th>
                  <th>Telefon</th>
                  <th>Ketma-ket</th>
                  <th>Bugungi holat</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="ra-student">
                        <div className="ra-avatar">{`${(a.firstName || ' ')[0] || ''}${(a.lastName || ' ')[0] || ''}`.toUpperCase()}</div>
                        <div>
                          <div className="ra-name">{a.firstName} {a.lastName}</div>
                          <div className="ra-id">{a.studentId}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="ra-class">{a.className}</span></td>
                    <td>
                      {a.phone !== '-' ? (
                        <a className="ra-phone" href={`tel:${a.phone}`}><ReceptionIcon name="phone" size={13} /> {a.phone}</a>
                      ) : <span className="ra-muted">-</span>}
                    </td>
                    <td><span className={streakBadge(a.streak)}>{a.streak} kun</span></td>
                    <td>
                      {a.todayStatus === 'absent'
                        ? <span className="ra-today bad">Kelmadi</span>
                        : a.todayStatus === 'present'
                          ? <span className="ra-today good">Keldi</span>
                          : a.todayStatus === 'excused'
                            ? <span className="ra-today mid">Sababli</span>
                            : <span className="ra-muted">Belgilanmagan</span>}
                    </td>
                    <td>
                      <button className="ra-view" onClick={() => { setSelectedStudent(a.profile); setShowProfile(true); }} title="Ko'rish">
                        <ReceptionIcon name="eye" size={15} /><span>Ko‘rish</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentProfile
        student={selectedStudent}
        isOpen={showProfile}
        onClose={() => { setShowProfile(false); setSelectedStudent(null); }}
        onUpdate={() => {}}
        mode="view"
      />

      <style>{`
        .ra-notice { display: flex; align-items: center; gap: 0.6rem; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; border-radius: 12px; padding: 0.75rem 1rem; font-size: 0.82rem; font-weight: 600; margin-bottom: 1rem; }
        .ra-filter-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 14px rgba(15,23,42,.06); padding: 1rem; margin-bottom: 1rem; }
        .ra-filter-row { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
        .ra-search { position: relative; flex: 1; min-width: 200px; display: flex; align-items: center; }
        .ra-search-icon { position: absolute; left: 0.7rem; color: #94a3b8; display: flex; }
        .ra-search input { width: 100%; padding: 0.6rem 2rem 0.6rem 2.2rem; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.82rem; }
        .ra-search input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
        .ra-clear { position: absolute; right: 0.5rem; border: none; background: #fee2e2; color: #991b1b; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 0.6rem; }
        .ra-select { padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.8rem; background: #fff; cursor: pointer; font-weight: 600; color: #334155; }
        .ra-count { display: flex; flex-direction: column; align-items: center; background: #eff6ff; border-radius: 10px; padding: 0.3rem 0.8rem; min-width: 64px; }
        .ra-count b { color: #1d4ed8; font-size: 1rem; line-height: 1; }
        .ra-count span { color: #60a5fa; font-size: 0.65rem; }
        .ra-tabs { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.8rem; flex-wrap: wrap; }
        .ra-tab { padding: 0.5rem 1rem; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 0.8rem; font-weight: 700; color: #475569; cursor: pointer; }
        .ra-tab:hover { border-color: #93c5fd; color: #1d4ed8; }
        .ra-tab.active { background: #2563eb; border-color: #2563eb; color: #fff; box-shadow: 0 4px 12px rgba(37,99,235,.3); }
        .ra-tab-hint { font-size: 0.75rem; color: #94a3b8; margin-left: 0.25rem; }
        .ra-table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 14px rgba(15,23,42,.06); overflow: hidden; }
        .ra-loading, .ra-table-card .emptyState { padding: 2.5rem; text-align: center; color: #64748b; font-size: 0.85rem; }
        .ra-table-wrap { overflow-x: auto; }
        .ra-table { width: 100%; border-collapse: collapse; min-width: 760px; }
        .ra-table thead { background: linear-gradient(135deg, #1e3a8a, #1e40af); color: #fff; }
        .ra-table th { padding: 0.65rem 0.8rem; text-align: left; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .ra-table td { padding: 0.6rem 0.8rem; font-size: 0.8rem; color: #334155; border-bottom: 1px solid #f1f5f9; }
        .ra-table tbody tr:hover { background: #f8fafc; }
        .ra-student { display: flex; align-items: center; gap: 0.6rem; }
        .ra-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; flex-shrink: 0; }
        .ra-name { font-weight: 600; color: #1e293b; }
        .ra-id { font-size: 0.68rem; color: #94a3b8; }
        .ra-class { background: #dbeafe; color: #1e40af; padding: 0.15rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.7rem; white-space: nowrap; }
        .ra-phone { display: inline-flex; align-items: center; gap: 0.3rem; color: #0369a1; font-weight: 600; text-decoration: none; }
        .ra-phone:hover { text-decoration: underline; }
        .ra-muted { color: #94a3b8; }
        .ra-streak { padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 800; font-size: 0.72rem; white-space: nowrap; }
        .ra-streak.s1 { background: #fef3c7; color: #92400e; }
        .ra-streak.s3 { background: #ffedd5; color: #c2410c; }
        .ra-streak.s7 { background: #fee2e2; color: #b91c1c; }
        .ra-streak.s8 { background: #fecaca; color: #7f1d1d; }
        .ra-today { padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 700; font-size: 0.72rem; }
        .ra-today.bad { background: #fee2e2; color: #b91c1c; }
        .ra-today.good { background: #dcfce7; color: #166534; }
        .ra-today.mid { background: #e0f2fe; color: #075985; }
        .ra-view { display: inline-flex; align-items: center; gap: 0.35rem; background: #dbeafe; color: #1e40af; border: none; border-radius: 8px; padding: 0.4rem 0.7rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .ra-view:hover { background: #2563eb; color: #fff; }
        @media (max-width: 639px) {
          .ra-filter-row { flex-direction: column; align-items: stretch; }
          .ra-search { min-width: 0; }
          .ra-select { width: 100%; }
        }
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
    { path: '/reception', label: 'Bosh sahifa', iconKey: 'grid', end: true },
    { path: '/reception/students', label: "O'quvchilar", iconKey: 'student' },
    { path: '/reception/attendance', label: 'Davomat', iconKey: 'attendance' },
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
            <Route path="/attendance" element={<ReceptionAttendance />} />
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
