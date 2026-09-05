import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import styles from './StudentHome.module.css';
import homeStyles from '../admin/AdminHome.module.css';
import StudentAIWidget from './StudentAIWidget';

// Direktor dizayn tizimiga mos SVG ikonlar (emoji o'rniga)
const StudentHomeIcon = ({ name = 'grid', size = 20 }) => {
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    journal: <><path d="M5 3h13a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2ZM5 3v16M9 7h7M9 11h7M9 15h5" /></>,
    report: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
    coins: <><circle cx="9" cy="12" r="6" /><path d="M9 9v6M7 10h3a1.5 1.5 0 0 1 0 3H8M15 7a5 5 0 1 1 0 10" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    empty: <><path d="M4 5h16v14H4zM4 8l8 6 8-6" /></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.calendar}
    </svg>
  );
};

// Raw grade hujjatini 0–100% ga aylantiradi.
// Kunlik baho maksimal 0.5; imtihon baho examMaxScore (o'qituvchi belgilaydi) bilan o'lchanadi.
const gradeToPercent = (g) => {
  const isExam = g.isExam || g.type === 'exam' || !!g.examMaxScore;
  const cap = isExam ? (g.examMaxScore || g.maxScore || 100) : 0.5;
  return cap > 0 ? Math.min(100, Math.round(((g.score || 0) / cap) * 100)) : 0;
};

const StudentHome = () => {
  const { user } = useAuth();
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [weeklyGrades, setWeeklyGrades] = useState([]);
  const [stats, setStats] = useState({ attendance: 0, avgGrade: 0, completedTasks: 0, coins: 0 });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = daysOfWeek[new Date().getDay()];

      // Fetch all data in parallel
      const [scheduleData, assignments, grades, attendance, coinsData] = await Promise.all([
        apiService.getStudentSchedule().catch(() => null),
        apiService.getStudentAssignments().catch(() => []),
        apiService.getGrades({ limit: 100 }).catch(() => []),
        apiService.getAttendance({ studentId: user._id }).catch(() => []),
        apiService.getMyCoins().catch(() => ({ total: 0 }))
      ]);

      // Process schedule (Schedule modelidagi haftalik jadval)
      const weekly = Array.isArray(scheduleData?.weeklySchedule) ? scheduleData.weeklySchedule : [];
      const todayScheduleData = weekly.find(s => s.day === today);
      if (todayScheduleData?.periods) {
        const formattedSchedule = todayScheduleData.periods.map((period, index) => ({
          id: index + 1,
          time: period.startTime,
          endTime: period.endTime,
          subject: period.subject?.name || 'Noma\'lum',
          teacher: period.teacher ? `${period.teacher.firstName} ${period.teacher.lastName}` : '',
          room: period.room || ''
        }));
        setTodaySchedule(formattedSchedule);
      } else {
        setTodaySchedule([]);
      }

      // Process assignments
      const currentDate = new Date();
      const assignmentsArray = Array.isArray(assignments) ? assignments : [];

      const studentAssignments = assignmentsArray
        .filter(a => !a.mySubmission || a.mySubmission.status === 'pending')
        .slice(0, 5)
        .map(assignment => {
          const dueDate = new Date(assignment.dueDate);
          const isToday = dueDate.toDateString() === currentDate.toDateString();
          const daysUntilDue = Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24));

          let dueDateText = isToday ? 'Bugun' :
            daysUntilDue === 1 ? 'Ertaga' :
              daysUntilDue > 1 && daysUntilDue <= 7 ? `${daysUntilDue} kun` :
                daysUntilDue > 7 ? dueDate.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }) :
                  'Muddati o\'tgan';

          return {
            id: assignment._id,
            title: assignment.title,
            subject: assignment.subject?.name || 'Noma\'lum',
            dueToday: isToday,
            dueDateText
          };
        });

      setPendingTasks(studentAssignments);

      // Process grades for weekly display
      const gradesArray = Array.isArray(grades) ? grades : [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentGrades = gradesArray
        .filter(grade => new Date(grade.date) >= sevenDaysAgo)
        .reduce((acc, grade) => {
          const subjectName = grade.subject?.name || 'Noma\'lum';
          if (!acc[subjectName]) acc[subjectName] = [];
          acc[subjectName].push(gradeToPercent(grade));
          return acc;
        }, {});

      const weeklyGradesData = Object.entries(recentGrades)
        .map(([subject, scores]) => ({
          subject,
          grade: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
          trend: 'same'
        }))
        .slice(0, 5);

      setWeeklyGrades(weeklyGradesData);

      // Calculate real stats
      const attendanceArray = Array.isArray(attendance) ? attendance : [];
      const presentCount = attendanceArray.filter(a => a.status === 'present' || a.status === 'keldi').length;
      const totalAttendance = attendanceArray.length;
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

      const allScores = gradesArray.map(g => gradeToPercent(g));
      const avgGrade = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

      const completedTasks = assignmentsArray.filter(a =>
        a.mySubmission?.status === 'submitted' || a.mySubmission?.status === 'graded'
      ).length;

      const coins = coinsData?.total || 0;

      setStats({
        attendance: attendanceRate,
        avgGrade: avgGrade,
        completedTasks: completedTasks,
        coins: coins
      });

    } catch (error) {
      if (error.code !== 'ERR_CANCELED' && !error.message?.includes('cancel')) {
        console.error('Bosh sahifa maʼlumotlarini yuklashda xatolik:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getCurrentLesson = () => {
    const now = currentTime;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    for (let i = 0; i < todaySchedule.length; i++) {
      const lesson = todaySchedule[i];
      if (currentTimeStr >= lesson.time && currentTimeStr < lesson.endTime) {
        return { ...lesson, status: 'current', index: i };
      }
      if (currentTimeStr < lesson.time) {
        return { ...lesson, status: 'next', index: i };
      }
    }
    return null;
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Xayrli tong';
    if (hour < 17) return 'Xayrli kun';
    return 'Xayrli kech';
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('uz-UZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  // Statistika kartalari (direktor dizayn tizimi — oq kartalar)
  const statCards = [
    { title: 'Davomat', value: `${stats.attendance}%`, iconName: 'calendar' },
    { title: "O'rtacha baho", value: `${stats.avgGrade}%`, iconName: 'report' },
    { title: 'Bajarilgan', value: stats.completedTasks, iconName: 'journal' },
    { title: 'Coinlar', value: stats.coins, iconName: 'coins' }
  ];

  const currentLesson = getCurrentLesson();

  if (loading) {
    return (
      <div className={styles.studentHome}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={homeStyles.adminHome}>
      {/* Welcome Section */}
      <div className={homeStyles.welcomeSection}>
        <div className={homeStyles.welcomeContent}>
          <h1 className={homeStyles.pageTitle}>{getGreeting()}, {user?.firstName || "O'quvchi"}!</h1>
          <p className={homeStyles.pageDescription}>{formatDate()} — bugungi darslar, topshiriqlar va baholaringiz shu yerda.</p>
        </div>
        <div className={homeStyles.currentTime}>
          <div className={homeStyles.timeDisplay}>
            {currentTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className={homeStyles.dateDisplay}>{formatDate()}</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={homeStyles.statsGrid}>
        {statCards.map((s, i) => (
          <div key={s.title} className={`${homeStyles.statCard} ${homeStyles[`statTone${i + 1}`]}`}>
            <div className={homeStyles.statIconWrapper}>
              <div className={homeStyles.statIcon}>
                <StudentHomeIcon name={s.iconName} size={22} />
              </div>
            </div>
            <div className={homeStyles.statContent}>
              <div className={homeStyles.statNumber}>{s.value}</div>
              <div className={homeStyles.statLabel}>{s.title}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Current/Next Lesson Highlight */}
      {currentLesson && (
        <div className={homeStyles.quickActionsCard} style={{ marginBottom: '24px' }}>
          <div className={homeStyles.cardHeader}>
            <h2 className={homeStyles.cardTitle}>
              <span className={homeStyles.titleIcon}><StudentHomeIcon name="clock" size={18} /></span>
              {currentLesson.status === 'current' ? 'Hozirgi dars' : 'Keyingi dars'}
            </h2>
            <span className={homeStyles.viewAllBtn} style={{ cursor: 'default' }}>{currentLesson.time} - {currentLesson.endTime}</span>
          </div>
          <div className={homeStyles.activityItem}>
            <div className={homeStyles.activityIconWrapper}>
              <StudentHomeIcon name="calendar" size={20} />
            </div>
            <div className={homeStyles.activityContent}>
              <div className={homeStyles.activityMessage}>{currentLesson.subject}{currentLesson.room ? ` — ${currentLesson.room}-xona` : ''}</div>
              <div className={homeStyles.activityTime}>{currentLesson.teacher || ''}</div>
            </div>
          </div>
          {currentLesson.status === 'current' && (() => {
            const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
            const startMin = toMin(currentLesson.time);
            const endMin = toMin(currentLesson.endTime);
            const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
            const pct = endMin > startMin ? Math.min(100, Math.max(0, ((nowMin - startMin) / (endMin - startMin)) * 100)) : 0;
            return (
              <div className="st-progress"><div className="st-progress-fill" style={{ width: `${pct}%` }}></div></div>
            );
          })()}
        </div>
      )}

      {/* Main Content Grid */}
      <div className={homeStyles.dashboardGrid}>
        {/* Today's Schedule */}
        <div className={homeStyles.activitiesCard}>
          <div className={homeStyles.cardHeader}>
            <h2 className={homeStyles.cardTitle}>
              <span className={homeStyles.titleIcon}><StudentHomeIcon name="calendar" size={18} /></span>
              Bugungi darslar
            </h2>
            <span className={homeStyles.viewAllBtn} style={{ cursor: 'default' }}>{todaySchedule.length} ta dars</span>
          </div>
          <div className={homeStyles.activityList}>
            {todaySchedule.length > 0 ? (
              todaySchedule.map((lesson, index) => {
                const isCurrent = currentLesson?.index === index && currentLesson?.status === 'current';
                const isPast = currentLesson ? index < currentLesson.index : false;

                return (
                  <div key={lesson.id} className={homeStyles.activityItem} style={isPast ? { opacity: 0.55 } : undefined}>
                    <div className={homeStyles.activityIconWrapper}>
                      <StudentHomeIcon name="clock" size={18} />
                    </div>
                    <div className={homeStyles.activityContent}>
                      <div className={homeStyles.activityMessage}>{lesson.subject}{isCurrent ? ' — Hozir' : ''}</div>
                      <div className={homeStyles.activityTime}>{lesson.time} - {lesson.endTime}{lesson.room ? ` • ${lesson.room}-xona` : ''}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={homeStyles.emptyState}>
                <span className={homeStyles.emptyIcon}><StudentHomeIcon name="empty" size={24} /></span>
                <p className={homeStyles.emptyText}>Bugun darslar yo'q</p>
              </div>
            )}
          </div>
        </div>

        {/* Tasks */}
        <div className={homeStyles.activitiesCard}>
          <div className={homeStyles.cardHeader}>
            <h2 className={homeStyles.cardTitle}>
              <span className={homeStyles.titleIcon}><StudentHomeIcon name="journal" size={18} /></span>
              Topshiriqlar
            </h2>
            <span className={homeStyles.viewAllBtn} style={{ cursor: 'default' }}>{pendingTasks.length} ta</span>
          </div>
          <div className={homeStyles.activityList}>
            {pendingTasks.length > 0 ? (
              pendingTasks.map((task) => (
                <div key={task.id} className={homeStyles.activityItem}>
                  <div className={homeStyles.activityIconWrapper}>
                    <StudentHomeIcon name="journal" size={18} />
                  </div>
                  <div className={homeStyles.activityContent}>
                    <div className={homeStyles.activityMessage}>{task.title}</div>
                    <div className={homeStyles.activityTime}>{task.subject} • {task.dueDateText}{task.dueToday ? ' — Bugun' : ''}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className={homeStyles.emptyState}>
                <span className={homeStyles.emptyIcon}><StudentHomeIcon name="empty" size={24} /></span>
                <p className={homeStyles.emptyText}>Topshiriqlar yo'q</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grades */}
      <div className={homeStyles.chartsSection}>
        <div className={homeStyles.cardHeader}>
          <h2 className={homeStyles.cardTitle}>
            <span className={homeStyles.titleIcon}><StudentHomeIcon name="report" size={18} /></span>
            So'nggi baholar
          </h2>
        </div>
        {weeklyGrades.length > 0 ? (
          <div className="st-grades">
            {weeklyGrades.map((item, index) => (
              <div key={item.subject || index} className="st-grade-row">
                <div className="st-grade-info">
                  <span className="st-grade-subject">{item.subject}</span>
                  <div className="st-grade-bar">
                    <div
                      className="st-grade-fill"
                      style={{
                        width: `${item.grade}%`,
                        background: item.grade >= 90 ? '#2563eb' : item.grade >= 80 ? '#16a34a' : '#f59e0b'
                      }}
                    ></div>
                  </div>
                </div>
                <span className="st-grade-value">{item.grade}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={homeStyles.emptyState}>
            <span className={homeStyles.emptyIcon}><StudentHomeIcon name="empty" size={24} /></span>
            <p className={homeStyles.emptyText}>Baholar yo'q</p>
          </div>
        )}
      </div>

      <style>{`
        .st-progress { height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; margin-top: 12px; }
        .st-progress-fill { height: 100%; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 999px; transition: width .4s ease; }
        .st-grades { display: flex; flex-direction: column; gap: 12px; }
        .st-grade-row { display: flex; align-items: center; gap: 12px; }
        .st-grade-info { flex: 1; min-width: 0; }
        .st-grade-subject { display: block; font-size: 13px; font-weight: 650; color: #334155; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .st-grade-bar { height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
        .st-grade-fill { height: 100%; border-radius: 999px; transition: width .4s ease; }
        .st-grade-value { min-width: 40px; text-align: right; font-size: 15px; font-weight: 750; color: #0f172a; font-variant-numeric: tabular-nums; }
      `}</style>

      {/* Bosh sahifadagi suzuvchi AI yordamchi */}
      <StudentAIWidget />
    </div>
  );
};

export default StudentHome;
