import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import { formatUzShortDate, formatUzWeekdayDate } from '../../utils/uzDate';
import TeacherUiIcon from './TeacherUiIcon';
import styles from './TeacherHome.module.css';

const DAY_LABELS = [
  { key: 'Monday', short: 'Du', full: 'Dushanba' },
  { key: 'Tuesday', short: 'Se', full: 'Seshanba' },
  { key: 'Wednesday', short: 'Ch', full: 'Chorshanba' },
  { key: 'Thursday', short: 'Pa', full: 'Payshanba' },
  { key: 'Friday', short: 'Ju', full: 'Juma' },
  { key: 'Saturday', short: 'Sh', full: 'Shanba' }
];

const PRIORITY = {
  urgent: { label: 'Shoshilinch', color: '#c5453b', bg: '#fbecea' },
  high: { label: 'Muhim', color: '#c98a18', bg: '#fdf3df' },
  normal: { label: "Oddiy", color: '#2f6fdb', bg: '#eaf1fd' },
  low: { label: 'Past', color: '#667085', bg: '#f2f4f7' }
};

const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return 'Xayrli tong';
  if (hour < 18) return 'Xayrli kun';
  return 'Xayrli kech';
};

const toMinutes = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const formatDate = (value) => formatUzShortDate(value);

const formatLongDate = (date = new Date()) => formatUzWeekdayDate(date);

const TeacherHome = ({ greeting }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    pendingGrades: 0,
    activeAssignments: 0
  });
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [weeklyCounts, setWeeklyCounts] = useState({});
  const [ungraded, setUngraded] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUngradedModal, setShowUngradedModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      const schedule = await apiService.getTeacherSchedule();
      const list = Array.isArray(schedule) ? schedule : [];
      const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const todayPeriods = list.find((day) => day.day === todayKey)?.periods || [];

      const formatted = todayPeriods
        .map((period, index) => ({
          id: `${period.startTime || index}-${period.subject?._id || index}`,
          start: period.startTime || '',
          end: period.endTime || '',
          subject: period.subject?.name || 'Fan',
          className: period.className || period.class?.name || 'Sinf',
          room: period.room || '',
          teacher: period.teacher ? `${period.teacher.firstName || ''} ${period.teacher.lastName || ''}`.trim() : ''
        }))
        .sort((a, b) => (toMinutes(a.start) ?? 0) - (toMinutes(b.start) ?? 0));

      setTodaySchedule(formatted);

      const counts = {};
      DAY_LABELS.forEach((day) => {
        counts[day.key] = list.find((item) => item.day === day.key)?.periods?.length || 0;
      });
      setWeeklyCounts(counts);
    } catch (err) {
      setTodaySchedule([]);
      setWeeklyCounts({});
    }
  }, []);

  const loadUngraded = useCallback(async () => {
    try {
      const data = await apiService.getTeacherUngradedLessons();
      const lessons = data?.ungradedLessons || [];
      const formatted = lessons.map((lesson, index) => ({
        id: `${lesson.classId || index}-${lesson.subjectId || index}-${lesson.date || index}`,
        date: lesson.date,
        subject: lesson.subjectName || 'Fan',
        className: lesson.className || 'Sinf',
        time: lesson.time || ''
      }));
      setUngraded(formatted);

      if (data?.todayKey && formatted.length > 0) {
        const storageKey = `ungraded_modal_shown_${data.todayKey}`;
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('ungraded_modal_shown_') && key !== storageKey) {
            localStorage.removeItem(key);
          }
        });
        if (!localStorage.getItem(storageKey)) {
          setShowUngradedModal(true);
          localStorage.setItem(storageKey, 'true');
        }
      }
    } catch (err) {
      setUngraded([]);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiService.getTeacherTodayStats();
      setStats({
        totalStudents: data?.totalStudents || 0,
        presentToday: data?.presentToday || 0,
        absentToday: data?.absentToday || 0,
        attendanceRate: Number(data?.attendanceRate) || 0,
        pendingGrades: data?.pendingGrades || 0,
        activeAssignments: data?.activeAssignments || 0
      });
    } catch (err) {
      setError(err.response?.data?.message || "Statistika ma'lumotlarini yuklashda xatolik");
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      setAnnouncementsLoading(true);
      const data = await apiService.getAnnouncements();
      setAnnouncements(Array.isArray(data) ? data.slice(0, 3) : []);
    } catch (err) {
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.allSettled([loadSchedule(), loadStats(), loadUngraded()]);
      if (mounted) setLoading(false);
    })();
    loadAnnouncements();
    return () => { mounted = false; };
  }, [loadSchedule, loadStats, loadUngraded, loadAnnouncements]);

  const lessonStatus = useCallback((lesson) => {
    const start = toMinutes(lesson.start);
    const end = toMinutes(lesson.end);
    const current = now.getHours() * 60 + now.getMinutes();
    if (start == null || end == null) return { key: 'upcoming', label: 'Kutilmoqda' };
    if (current >= end) return { key: 'done', label: 'Tugagan' };
    if (current >= start) return { key: 'live', label: 'Davom etmoqda' };
    return { key: 'upcoming', label: 'Kutilmoqda' };
  }, [now]);

  const activeLesson = useMemo(
    () => todaySchedule.find((lesson) => lessonStatus(lesson).key === 'live'),
    [todaySchedule, lessonStatus]
  );

  const attendanceRate = useMemo(() => {
    if (stats.attendanceRate > 0) return Math.min(100, Math.round(stats.attendanceRate));
    if (!stats.totalStudents) return 0;
    return Math.min(100, Math.round((stats.presentToday / stats.totalStudents) * 100));
  }, [stats]);

  const absenceCount = useMemo(() => {
    if (stats.absentToday > 0) return stats.absentToday;
    return Math.max(0, stats.totalStudents - stats.presentToday);
  }, [stats]);

  const weeklyMax = useMemo(() => {
    const values = Object.values(weeklyCounts);
    return Math.max(1, ...values);
  }, [weeklyCounts]);

  const todayKey = now.toLocaleDateString('en-US', { weekday: 'long' });
  const totalWeekLessons = useMemo(
    () => Object.values(weeklyCounts).reduce((sum, value) => sum + value, 0),
    [weeklyCounts]
  );

  const kpis = [
    {
      label: "Jami o'quvchilar",
      value: stats.totalStudents,
      note: "Sinflaringizdagi o'quvchilar",
      icon: 'users',
      tone: 'navy'
    },
    {
      label: 'Bugun kelganlar',
      value: stats.presentToday,
      note: `${attendanceRate}% davomat`,
      icon: 'check',
      tone: 'green'
    },
    {
      label: 'Kutilayotgan baholar',
      value: stats.pendingGrades,
      note: stats.pendingGrades > 0 ? 'Baholash navbatida' : 'Barchasi baholangan',
      icon: 'assignment',
      tone: 'amber'
    },
    {
      label: 'Faol topshiriqlar',
      value: stats.activeAssignments,
      note: "O'quvchilar topshirishi kutilmoqda",
      icon: 'test',
      tone: 'blue'
    }
  ];

  const quickActions = [
    { label: 'Davomat olish', icon: 'check', tone: 'green', onClick: () => navigate('/teacher/journal') },
    { label: 'Baholash', icon: 'book', tone: 'amber', onClick: () => navigate('/teacher/journal') },
    { label: 'Topshiriq berish', icon: 'assignment', tone: 'blue', onClick: () => navigate('/teacher/assignments') },
    { label: 'Test yaratish', icon: 'test', tone: 'navy', onClick: () => navigate('/teacher/tests') }
  ];

  return (
    <div className={styles.home}>
      {showUngradedModal && ungraded.length > 0 && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setShowUngradedModal(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="ungraded-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHead}>
              <span className={styles.modalIcon}><TeacherUiIcon name="warning" size={20} /></span>
              <div>
                <h2 id="ungraded-title">Baholanmagan darslar</h2>
                <p>Bugun {ungraded.length} ta darsga baho kiritilmagan.</p>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setShowUngradedModal(false)} aria-label="Yopish">
                <TeacherUiIcon name="close" size={17} />
              </button>
            </div>
            <div className={styles.modalList}>
              {ungraded.map((lesson) => (
                <div className={styles.modalRow} key={lesson.id}>
                  <span className={styles.modalRowIcon}><TeacherUiIcon name="book" size={16} /></span>
                  <div>
                    <strong>{lesson.subject}</strong>
                    <span>{lesson.className}{lesson.time ? ` · ${lesson.time}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.modalFoot}>
              <button type="button" className="td-btn td-btn--ghost" onClick={() => setShowUngradedModal(false)}>Keyinroq</button>
              <button
                type="button"
                className="td-btn td-btn--gold"
                onClick={() => { setShowUngradedModal(false); navigate('/teacher/journal'); }}
              >
                Jurnalga o'tish <TeacherUiIcon name="arrow" size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>{formatLongDate(now)}</p>
          <h1 className={styles.title}>
            {greeting || getGreeting(now)}, {user?.firstName || "o'qituvchi"}!
          </h1>
          <p className={styles.subtitle}>
            {activeLesson
              ? `Hozir ${activeLesson.subject} darsi davom etmoqda · ${activeLesson.className}`
              : todaySchedule.length > 0
                ? `Bugun sizda ${todaySchedule.length} ta dars bor. Kuningiz samarali o'tsin.`
                : "Bugun darslaringiz yo'q. Vazifalar va baholashni tekshirib ko'ring."}
          </p>
        </div>
        <div className={styles.headActions}>
          <button type="button" className="td-btn td-btn--gold" onClick={() => navigate('/teacher/journal')}>
            <TeacherUiIcon name="check" size={15} /> Davomat olish
          </button>
          <button type="button" className="td-btn td-btn--ghost" onClick={() => navigate('/teacher/schedule')}>
            <TeacherUiIcon name="calendar" size={15} /> Dars jadvali
          </button>
        </div>
      </header>

      {error && <div className="td-alert td-alert--error"><TeacherUiIcon name="warning" size={15} /> {error}</div>}

      <section className={styles.kpis} aria-label="Asosiy ko'rsatkichlar">
        {kpis.map((kpi) => (
          <article className={styles.kpi} key={kpi.label}>
            <span className={`${styles.kpiIcon} ${styles[`tone_${kpi.tone}`]}`}>
              <TeacherUiIcon name={kpi.icon} size={19} />
            </span>
            <div className={styles.kpiBody}>
              {loading ? <span className={`td-skeleton ${styles.kpiSkeleton}`} /> : <strong>{kpi.value}</strong>}
              <span className={styles.kpiLabel}>{kpi.label}</span>
              <small>{kpi.note}</small>
            </div>
          </article>
        ))}
      </section>

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <section className={`td-card ${styles.card}`}>
            <div className="td-card-head">
              <div>
                <h2 className="td-card-title">Bugungi darslar</h2>
                <p className="td-card-sub">{todaySchedule.length > 0 ? `${todaySchedule.length} ta dars rejalashtirilgan` : "Bugun uchun dars yo'q"}</p>
              </div>
              <button type="button" className="td-card-link" onClick={() => navigate('/teacher/schedule')}>
                Haftalik jadval <TeacherUiIcon name="arrow" size={13} />
              </button>
            </div>

            {loading ? (
              <div className={styles.lessonList}>
                {[1, 2, 3].map((item) => (
                  <div className={styles.lessonRow} key={item}>
                    <span className={`td-skeleton ${styles.timeSkeleton}`} />
                    <div className={styles.lessonBody}>
                      <span className={`td-skeleton ${styles.lineSkeleton}`} />
                      <span className={`td-skeleton ${styles.lineSkeletonSm}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : todaySchedule.length === 0 ? (
              <div className="td-empty">
                <span className="td-empty-icon"><TeacherUiIcon name="calendar" size={20} /></span>
                <strong>Bugun dars yo'q</strong>
                <span>Dars jadvalini tekshirib ko'ring yoki dam oling.</span>
              </div>
            ) : (
              <div className={styles.lessonList}>
                {todaySchedule.map((lesson, index) => {
                  const status = lessonStatus(lesson);
                  return (
                    <div className={`${styles.lessonRow} ${status.key === 'live' ? styles.lessonLive : ''}`} key={lesson.id}>
                      <div className={styles.lessonTime}>
                        <strong>{lesson.start}</strong>
                        <span>{lesson.end}</span>
                      </div>
                      <span className={`${styles.timelineDot} ${styles[`dot_${status.key}`]}`} />
                      <div className={styles.lessonBody}>
                        <strong>{lesson.subject}</strong>
                        <span>
                          {lesson.className}
                          {lesson.room ? ` · ${lesson.room}-xona` : ''}
                        </span>
                      </div>
                      <span className={`td-chip ${status.key === 'live' ? 'td-chip--gold' : status.key === 'done' ? 'td-chip--gray' : 'td-chip--blue'}`}>
                        {status.label}
                      </span>
                      <button
                        type="button"
                        className={styles.rowArrow}
                        onClick={() => navigate('/teacher/journal')}
                        aria-label={`${lesson.subject} jurnalini ochish`}
                      >
                        <TeacherUiIcon name="arrow" size={15} />
                      </button>
                      <span className={styles.rowIndex}>{String(index + 1).padStart(2, '0')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className={`td-card ${styles.card}`}>
            <div className="td-card-head">
              <div>
                <h2 className="td-card-title">Baholash navbati</h2>
                <p className="td-card-sub">
                  {ungraded.length > 0 ? `${ungraded.length} ta dars baholanishi kerak` : "Barcha darslar baholangan"}
                </p>
              </div>
              <button type="button" className="td-card-link" onClick={() => navigate('/teacher/journal')}>
                Jurnalga o'tish <TeacherUiIcon name="arrow" size={13} />
              </button>
            </div>

            {ungraded.length === 0 ? (
              <div className="td-empty">
                <span className="td-empty-icon" style={{ background: 'var(--td-green-soft)', color: 'var(--td-green)' }}>
                  <TeacherUiIcon name="check" size={20} />
                </span>
                <strong>Baholash navbati bo'sh</strong>
                <span>Barcha o'tilgan darslar uchun baholar kiritilgan.</span>
              </div>
            ) : (
              <div className={styles.queue}>
                {ungraded.slice(0, 4).map((lesson) => (
                  <div className={styles.queueRow} key={lesson.id}>
                    <span className={styles.queueIcon}><TeacherUiIcon name="book" size={16} /></span>
                    <div className={styles.queueInfo}>
                      <strong>{lesson.subject}</strong>
                      <span>{lesson.className}{lesson.time ? ` · ${lesson.time}` : ''}</span>
                    </div>
                    <span className={styles.queueDate}>{formatDate(lesson.date)}</span>
                    <button type="button" className="td-btn td-btn--gold td-btn--sm" onClick={() => navigate('/teacher/journal')}>
                      Baholash
                    </button>
                  </div>
                ))}
                {ungraded.length > 4 && (
                  <button type="button" className={styles.queueMore} onClick={() => navigate('/teacher/journal')}>
                    Yana {ungraded.length - 4} ta dars <TeacherUiIcon name="arrow" size={13} />
                  </button>
                )}
              </div>
            )}
          </section>

          <div className={styles.split}>
            <section className={`td-card ${styles.card}`}>
              <div className="td-card-head">
                <div>
                  <h2 className="td-card-title">Haftalik yuklama</h2>
                  <p className="td-card-sub">Jami {totalWeekLessons} ta dars</p>
                </div>
              </div>
              <div className={styles.chart}>
                {DAY_LABELS.map((day) => {
                  const count = weeklyCounts[day.key] || 0;
                  const height = count > 0 ? Math.max(12, Math.round((count / weeklyMax) * 100)) : 4;
                  return (
                    <div className={styles.barCol} key={day.key} title={`${day.full}: ${count} ta dars`}>
                      <span className={styles.barValue}>{count}</span>
                      <div className={styles.barTrack}>
                        <span
                          className={`${styles.barFill} ${day.key === todayKey ? styles.barToday : ''}`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className={styles.barLabel}>{day.short}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={`td-card ${styles.card}`}>
              <div className="td-card-head">
                <div>
                  <h2 className="td-card-title">Davomat</h2>
                  <p className="td-card-sub">Bugungi ko'rsatkich</p>
                </div>
              </div>
              <div className={styles.attendance}>
                <div className={styles.donutWrap}>
                  <svg viewBox="0 0 108 108" className={styles.donut} role="img" aria-label={`Davomat ${attendanceRate}%`}>
                    <circle cx="54" cy="54" r="44" className={styles.donutTrack} />
                    <circle
                      cx="54"
                      cy="54"
                      r="44"
                      className={styles.donutValue}
                      strokeDasharray={`${(attendanceRate / 100) * 276.46} 276.46`}
                    />
                  </svg>
                  <div className={styles.donutCenter}>
                    <strong>{attendanceRate}%</strong>
                    <span>davomat</span>
                  </div>
                </div>
                <div className={styles.attendanceLegend}>
                  <div>
                    <span className={`${styles.legendDot} ${styles.legendGreen}`} />
                    <span>Kelganlar</span>
                    <strong>{stats.presentToday}</strong>
                  </div>
                  <div>
                    <span className={`${styles.legendDot} ${styles.legendRed}`} />
                    <span>Kelmaganlar</span>
                    <strong>{absenceCount}</strong>
                  </div>
                  <div>
                    <span className={`${styles.legendDot} ${styles.legendGray}`} />
                    <span>Jami</span>
                    <strong>{stats.totalStudents}</strong>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <aside className={styles.sideCol}>
          <section className={`td-card ${styles.card}`}>
            <div className="td-card-head">
              <div>
                <h2 className="td-card-title">Tezkor amallar</h2>
                <p className="td-card-sub">Eng ko'p ishlatiladigan bo'limlar</p>
              </div>
            </div>
            <div className={styles.quickGrid}>
              {quickActions.map((action) => (
                <button type="button" className={styles.quickBtn} key={action.label} onClick={action.onClick}>
                  <span className={`${styles.quickIcon} ${styles[`tone_${action.tone}`]}`}>
                    <TeacherUiIcon name={action.icon} size={18} />
                  </span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className={`td-card ${styles.card}`}>
            <div className="td-card-head">
              <div>
                <h2 className="td-card-title">E'lonlar</h2>
                <p className="td-card-sub">Maktab yangiliklari</p>
              </div>
              <button type="button" className="td-card-link" onClick={() => navigate('/teacher/notifications')}>
                Barchasi <TeacherUiIcon name="arrow" size={13} />
              </button>
            </div>
            {announcementsLoading ? (
              <div className={styles.announcements}>
                {[1, 2, 3].map((item) => (
                  <div className={styles.announcement} key={item}>
                    <span className={`td-skeleton ${styles.annLine}`} />
                    <span className={`td-skeleton ${styles.annLineSm}`} />
                  </div>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="td-empty">
                <span className="td-empty-icon"><TeacherUiIcon name="bell" size={19} /></span>
                <strong>Hozircha e'lonlar yo'q</strong>
                <span>Yangi e'lonlar shu yerda ko'rinadi.</span>
              </div>
            ) : (
              <div className={styles.announcements}>
                {announcements.map((announcement) => {
                  const priority = PRIORITY[announcement.priority] || PRIORITY.normal;
                  return (
                    <article className={styles.announcement} key={announcement._id}>
                      <div className={styles.announcementTop}>
                        <span className={styles.announcementDot} style={{ background: priority.color }} />
                        <strong>{announcement.title}</strong>
                        <span className={styles.announcementDate}>
                          {formatDate(announcement.publishDate || announcement.createdAt)}
                        </span>
                      </div>
                      <p>{announcement.content}</p>
                      <span className={styles.announcementTag} style={{ color: priority.color, background: priority.bg }}>
                        {priority.label}
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default TeacherHome;
