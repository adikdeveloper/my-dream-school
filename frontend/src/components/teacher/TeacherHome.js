import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import apiService from '../../services/apiService';
import styles from './TeacherHome.module.css';

const HomeIcon = ({ name, size = 20 }) => {
  const paths = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    attendance: <><circle cx="9" cy="7" r="4" /><path d="M2 21a7 7 0 0 1 14 0M16 11l2 2 4-5" /></>,
    grading: <><path d="M5 4h14v17H5zM9 4V2h6v2M9 10h6M9 14h6" /><path d="m9 18 1.5 1.5L14 16" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    journal: <><path d="M5 3h13a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2ZM5 3v16M9 7h7M9 11h7M9 15h5" /></>,
    assignment: <><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h4" /></>,
    test: <><path d="M5 3h14v18H5zM9 7h6M9 11h6M9 15h3" /><path d="m14 16 1.5 1.5L19 14" /></>,
    warning: <><path d="M12 3 2 21h20Z" /><path d="M12 9v5M12 17h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    welcome: <><path d="M8 12V5a2 2 0 0 1 4 0v6M12 10V4a2 2 0 0 1 4 0v7M16 10V6a2 2 0 0 1 4 0v8a8 8 0 0 1-8 8h-1a8 8 0 0 1-8-8v-3a2 2 0 0 1 4 0v2" /></>,
    lightning: <path d="m13 2-9 12h8l-1 8 9-12h-8Z" />
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.calendar}</svg>;
};

const TeacherHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setLoading, setError } = useData();
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [classStats, setClassStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    pendingGrades: 0,
    upcomingAssignments: 0
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [ungradedLessons, setUngradedLessons] = useState([]);
  const [showUngradedModal, setShowUngradedModal] = useState(false);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSchedule = useCallback(async (dayOfWeek) => {
    try {
      setIsLoadingSchedule(true);
      const teacherSchedule = await apiService.getTeacherSchedule();

      // Process today's schedule
      const todayLessons = teacherSchedule
        .find(day => day.day === dayOfWeek)?.periods || [];

      const formattedSchedule = todayLessons.map((period, index) => ({
        id: index + 1,
        time: `${period.startTime} - ${period.endTime}`,
        subject: period.subject?.name || 'N/A',
        class: period.className || 'N/A',
        room: period.room || 'N/A'
      }));

      setTodaySchedule(formattedSchedule);
    } catch (error) {
      setTodaySchedule([]);
    } finally {
      setIsLoadingSchedule(false);
    }
  }, []);

  const checkUngradedLessons = useCallback(async () => {
    try {
      // Backend'dan bugungi baholarsiz darslarni olish
      const data = await apiService.getTeacherUngradedLessons();

      if (!data || !data.ungradedLessons || data.ungradedLessons.length === 0) {
        setUngradedLessons([]);
        return;
      }

      // LocalStorage'da bugungi kun uchun modal ko'rsatilganligini tekshirish
      const storageKey = `ungraded_modal_shown_${data.todayKey}`;
      const alreadyShown = localStorage.getItem(storageKey);

      // Eski kunlar uchun localStorage'ni tozalash (faqat bugungi kun qoladi)
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('ungraded_modal_shown_') && key !== storageKey) {
          localStorage.removeItem(key);
        }
      });

      // Darslarni formatlash
      const formattedLessons = data.ungradedLessons.map(lesson => ({
        date: new Date(lesson.date),
        subject: lesson.subjectName,
        class: lesson.className,
        time: lesson.time,
        classId: lesson.classId,
        subjectId: lesson.subjectId
      }));

      setUngradedLessons(formattedLessons);

      // Agar bugun modal ko'rsatilmagan bo'lsa va baholarsiz darslar bo'lsa
      if (!alreadyShown && formattedLessons.length > 0) {
        setShowUngradedModal(true);
        // Bugungi kun uchun modal ko'rsatilganligini belgilash
        localStorage.setItem(storageKey, 'true');
      }
    } catch {
      setUngradedLessons([]);
    }
  }, []);

  const loadTeacherData = useCallback(async () => {
    try {
      setLoading(true);

      // Get today's date info
      const today = new Date();
      const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

      // Load schedule
      loadSchedule(dayOfWeek);

      // Parallel API calls for better performance - REAL DATA
      const [
        todayStats
      ] = await Promise.all([
        apiService.getTeacherTodayStats()
      ]);

      // Real data from backend API
      setClassStats({
        totalStudents: todayStats.totalStudents || 0,
        presentToday: todayStats.presentToday || 0,
        pendingGrades: todayStats.pendingGrades || 0,
        upcomingAssignments: todayStats.activeAssignments || 0
      });

      // Bahosiz darslarni tekshirish
      checkUngradedLessons();

    } catch (error) {
      setError(error.response?.data?.message || 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, loadSchedule, checkUngradedLessons]);

  useEffect(() => {
    loadTeacherData();
  }, [loadTeacherData]);

  const statCards = [
    {
      title: 'Jami o\'quvchilar',
      value: classStats.totalStudents,
      icon: 'users',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Bugun kelganlar',
      value: classStats.presentToday,
      icon: 'attendance',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Kutilayotgan baholar',
      value: classStats.pendingGrades,
      icon: 'grading',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Topshiriqlar soni',
      value: classStats.upcomingAssignments,
      icon: 'calendar',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      change: '0%',
      changeType: 'neutral'
    }
  ];

  const quickActions = [
    { icon: 'journal', label: 'Sinf jurnalini ochish', handler: () => navigate('/teacher/journal') },
    { icon: 'attendance', label: 'Davomat olish', handler: () => navigate('/teacher/journal') },
    { icon: 'assignment', label: 'Topshiriq berish', handler: () => navigate('/teacher/assignments') },
    { icon: 'test', label: 'Test yaratish', handler: () => navigate('/teacher/tests') }
  ];

  return (
    <div className={styles.teacherHome}>
      {/* Bahosiz darslar modal */}
      {showUngradedModal && (
        <div className={styles.modalOverlay} onClick={() => setShowUngradedModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}><HomeIcon name="warning" size={21} /> Bahosiz darslar</h2>
              <button className={styles.modalClose} onClick={() => setShowUngradedModal(false)}><HomeIcon name="close" size={18} /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDescription}>
                Bugun {ungradedLessons.length} ta darsga baho kiritilmagan. Iltimos, baholarni kiriting.
              </p>
              <div className={styles.ungradedLessonsList}>
                {ungradedLessons.map((lesson, index) => (
                  <div key={index} className={styles.ungradedLessonItem}>
                    <div className={styles.lessonDetails}>
                      <span className={styles.lessonSubject}>{lesson.subject}</span>
                      <span className={styles.lessonSeparator}>•</span>
                      <span>{lesson.class}</span>
                      <span className={styles.lessonSeparator}>•</span>
                      <span><HomeIcon name="clock" size={15} /> {lesson.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCloseModal} onClick={() => setShowUngradedModal(false)}>
                Tushunarli
              </button>
              <button className={styles.btnGoJournal} onClick={() => { setShowUngradedModal(false); navigate('/teacher/journal'); }}>
                Jurnalga o'tish
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.welcomeSection}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.pageTitle}>
            <span className={styles.wave}><HomeIcon name="welcome" size={28} /></span>
            Xush kelibsiz, {user?.firstName}!
          </h1>
          <p className={styles.pageDescription}>
            Bugun sinflaringizda sodir bo'layotgan voqealar va darslar haqida ma'lumot.
          </p>
        </div>
        <div className={styles.currentTime}>
          <div className={styles.timeDisplay}>
            {currentTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className={styles.dateDisplay}>
            {currentTime.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <div key={index} className={styles.statCard} style={{ background: stat.gradient }}>
            <div className={styles.statIconWrapper}>
              <div className={styles.statIcon}><HomeIcon name={stat.icon} size={25} /></div>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.title}</div>
            </div>
            <div className={styles.statChange}>
              <span className={styles.changeArrow}>
                {stat.changeType === 'positive' ? '↑' : stat.changeType === 'negative' ? '↓' : '→'}
              </span>
              {stat.change}
            </div>
            <div className={styles.statDecoration}></div>
          </div>
        ))}
      </div>

      <div className={styles.dashboardGrid}>
        {/* Quick Actions */}
        <div className={styles.quickActionsCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span className={styles.titleIcon}><HomeIcon name="lightning" size={19} /></span>
              Tezkor amallar
            </h2>
          </div>
          <div className={styles.actionGrid}>
            {quickActions.map((action, index) => (
              <button
                key={index}
                className={styles.actionBtn}
                onClick={action.handler}
                aria-label={action.label}
              >
                <div className={styles.actionIcon}>
                  <HomeIcon name={action.icon} size={22} />
                </div>
                <span className={styles.actionLabel}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className={styles.scheduleCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span className={styles.titleIcon}><HomeIcon name="calendar" size={19} /></span>
              Bugungi dars jadvali
            </h2>
          </div>
          <div className={styles.scheduleList}>
            {isLoadingSchedule ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`${styles.scheduleItem} ${styles.skeleton}`}>
                    <div className={styles.skeletonTime}></div>
                    <div className={styles.skeletonContent}>
                      <div className={styles.skeletonText}></div>
                      <div className={styles.skeletonTextSmall}></div>
                    </div>
                  </div>
                ))}
              </>
            ) : todaySchedule.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Bugun dars yo'q</p>
              </div>
            ) : (
              todaySchedule.map((item) => (
                <div key={item.id} className={styles.scheduleItem}>
                  <div className={styles.scheduleTime}>{item.time}</div>
                  <div className={styles.scheduleDetails}>
                    <div className={styles.scheduleSubject}>{item.subject}</div>
                    <div className={styles.scheduleClass}>{item.class} • {item.room}</div>
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

export default TeacherHome;
