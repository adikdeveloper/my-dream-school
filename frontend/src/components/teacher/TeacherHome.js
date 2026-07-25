import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import apiService from '../../services/apiService';
import styles from './TeacherHome.module.css';

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
      icon: '👥',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Bugun kelganlar',
      value: classStats.presentToday,
      icon: '✅',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Kutilayotgan baholar',
      value: classStats.pendingGrades,
      icon: '📝',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      change: '0%',
      changeType: 'neutral'
    },
    {
      title: 'Topshiriqlar soni',
      value: classStats.upcomingAssignments,
      icon: '📅',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      change: '0%',
      changeType: 'neutral'
    }
  ];

  const quickActions = [
    { icon: '📖', label: 'Sinf jurnalini ochish', color: '#667eea', handler: () => navigate('/teacher/journal') },
    { icon: '✅', label: 'Davomat olish', color: '#43e97b', handler: () => navigate('/teacher/journal') },
    { icon: '📝', label: 'Topshiriq berish', color: '#f093fb', handler: () => navigate('/teacher/assignments') },
    { icon: '📋', label: 'Test yaratish', color: '#fbbf24', handler: () => navigate('/teacher/tests') }
  ];

  return (
    <div className={styles.teacherHome}>
      {/* Bahosiz darslar modal */}
      {showUngradedModal && (
        <div className={styles.modalOverlay} onClick={() => setShowUngradedModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>⚠️ Bahosiz darslar</h2>
              <button className={styles.modalClose} onClick={() => setShowUngradedModal(false)}>×</button>
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
                      <span>🕐 {lesson.time}</span>
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
            <span className={styles.wave}>👋</span>
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
              <div className={styles.statIcon}>{stat.icon}</div>
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
              <span className={styles.titleIcon}>⚡</span>
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
                <div className={styles.actionIcon} style={{ background: action.color }}>
                  {action.icon}
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
              <span className={styles.titleIcon}>📅</span>
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