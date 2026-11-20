import React, { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { usePermissions } from '../../context/PermissionsContext';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import Logo from '../../components/common/Logo';
import NotificationBell from '../../components/common/NotificationBell';
import NotificationInbox from '../../components/common/NotificationInbox';
import Substitutions from '../../components/common/Substitutions';
import DirectorNotifications from '../../components/admin/DirectorNotifications';
import StudentManagement from '../../components/admin/StudentManagement';
import TeacherManagement from '../../components/admin/TeacherManagement';
import ClassManagement from '../../components/admin/ClassManagement';
import SubjectManagement from '../../components/admin/SubjectManagement';
import ScheduleManagement from '../../components/admin/ScheduleManagement';
import AttendanceManagement from '../../components/admin/AttendanceManagement';
import AdminClassJournal from '../../components/admin/AdminClassJournal';
import CoinLeaderboard from '../../components/admin/CoinLeaderboard';
import QuarterGrades from '../../components/admin/QuarterGrades';
import QuarterSettings from '../../components/admin/QuarterSettings';
import Reports from '../../components/admin/Reports';
import PaymentManagement from '../../components/admin/PaymentManagement';
import DebtorsList from '../../components/admin/DebtorsList';
import ParentContacts from '../../components/admin/ParentContacts';
import Profile from '../../components/admin/Profile';
import './AdminDashboard.css';

const sections = [
  { label: 'Nazorat', pages: [
    ['', 'Bosh sahifa', '▦'],
    ['reports', 'Hisobotlar', '▤', Reports]
  ] },
  { label: "Ta'lim", pages: [
    ['students', "O'quvchilar", '◎', StudentManagement],
    ['teachers', "O'qituvchilar", '♙', TeacherManagement],
    ['classes', 'Sinflar', '▦', ClassManagement],
    ['subjects', 'Fanlar', '▧', SubjectManagement],
    ['schedule', 'Dars jadvali', '▣', ScheduleManagement, 'schedule.edit'],
    ['attendance', 'Davomat', '✓', AttendanceManagement],
    ['journal', 'Sinf jurnali', '▤', AdminClassJournal],
    ['quarters/grades', 'Chorak baholari', '★', QuarterGrades],
    ['quarters/settings', 'Chorak sozlamalari', '⚙', QuarterSettings],
    ['coins', 'Coin reytingi', '◇', CoinLeaderboard]
  ] },
  { label: 'Moliya nazorati', pages: [
    ['payments', "To'lovlar", '?', PaymentManagement, 'payment.view_all'],
    ['debtors', 'Qarzdorlik', '?', DebtorsList, 'payment.view_all']
  ] },
  { label: 'Kundalik ishlar', pages: [
    ['substitutions', 'Dars almashtirish', '⇄', Substitutions, 'lesson.substitute'],
    ['communication/notifications', 'Bildirishnoma yuborish', '↗', DirectorNotifications],
    ['communication/parents', 'Ota-onalar bilan aloqa', '?', ParentContacts],
    ['notifications', 'Bildirishnomalar', '✉', NotificationInbox],
    ['profile', 'Profil', '◉', Profile]
  ] }
];

const metrics = [
  ["Faol o'quvchilar", 'students', async () => (await apiService.getStudentStats()).active],
  ["O'qituvchilar", 'teachers', async () => (await apiService.getUsers('teacher', 1, 1)).total],
  ['Sinflar', 'classes', async () => (await apiService.getClasses()).pagination.totalClasses],
  ['Fanlar', 'subjects', async () => (await apiService.getSubjects()).length]
];

const pageUrl = (path) => path ? '/admin/' + path : '/admin';

function AdminOverview({ user }) {
  const [results, setResults] = useState({});
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let current = true;
    metrics.forEach(([, path, load]) => {
      load().then((value) => {
        if (!Number.isFinite(value)) throw new Error('Unexpected summary response');
        if (current) setResults((previous) => ({ ...previous, [path]: { value } }));
      }).catch(() => {
        if (current) setResults((previous) => ({ ...previous, [path]: { error: true } }));
      });
    });
    return () => { current = false; };
  }, [refresh]);

  const hasErrors = Object.values(results).some((result) => result.error);

  return (
    <div className="school-admin-overview">
      <section className="school-admin-hero">
        <p>Maktab boshqaruvi</p>
        <h1>Salom, {user?.firstName || 'administrator'}</h1>
        <span>Jadval, davomat va sinflarning kundalik holati</span>
      </section>
      <section className="school-admin-metrics" aria-label="Maktab ko'rsatkichlari">
        {metrics.map(([label, path]) => {
          const result = results[path];
          return (
            <Link key={path} to={pageUrl(path)} className="school-admin-metric">
              <span>{label}</span>
              <strong>{result?.value ?? (result?.error ? '—' : '…')}</strong>
              {result?.error && <small>Yuklanmadi</small>}
            </Link>
          );
        })}
      </section>
      {hasErrors && (
        <div className="school-admin-warning" role="status">
          Ayrim ko'rsatkichlarni yuklab bo'lmadi.
          <button type="button" onClick={() => { setResults({}); setRefresh((value) => value + 1); }}>Qayta yuklash</button>
        </div>
      )}
      <section className="school-admin-quick">
        <h2>Tezkor nazorat</h2>
        <div>
          <Link to="/admin/schedule">Dars jadvali <span aria-hidden="true">→</span></Link>
          <Link to="/admin/attendance">Davomat <span aria-hidden="true">→</span></Link>
          <Link to="/admin/journal">Sinf jurnali <span aria-hidden="true">→</span></Link>
          <Link to="/admin/substitutions">Dars almashtirish <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { can, loading } = usePermissions();
  const [menuOpen, setMenuOpen] = useState(false);
  const pages = sections.flatMap((section) => section.pages);

  return (
    <div className="school-admin">
      <header className="school-admin-header">
        <div className="school-admin-brand">
          <button type="button" className="school-admin-menu" aria-expanded={menuOpen} aria-controls="school-admin-nav" onClick={() => setMenuOpen(!menuOpen)}>Menyu</button>
          <Logo />
          <span>Administrator</span>
        </div>
        <div className="school-admin-account">
          <NotificationBell accent="#1e3a8a" viewAllLink="/admin/notifications" />
          <Link to="/admin/profile">{user?.firstName} {user?.lastName}</Link>
          <button type="button" onClick={logout}>Chiqish</button>
        </div>
      </header>
      <div className="school-admin-body">
        <aside id="school-admin-nav" className={menuOpen ? 'is-open' : ''}>
          <nav aria-label="Admin bo'limlari">
            {sections.map(({ label, pages: groupPages }) => (
              <div key={label} className="school-admin-nav-group">
                <h2>{label}</h2>
                {groupPages.map(([path, title, icon]) => (
                  <NavLink key={path} to={pageUrl(path)} end onClick={() => setMenuOpen(false)}>
                    <span aria-hidden="true">{icon}</span>{title}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <main className="school-admin-main">
          <Routes>
            <Route index element={<AdminOverview user={user} />} />
            {pages.filter(([, , , Page]) => Page).map(([path, , , Page, permission]) => (
              <Route key={path} path={path} element={permission && (loading || !can(permission))
                ? <p role="status">{loading ? 'Ruxsatlar yuklanmoqda…' : "Bu bo'limga kirish uchun direktor ruxsati kerak."}</p>
                : <Page accent="#1e3a8a" />} />
            ))}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
