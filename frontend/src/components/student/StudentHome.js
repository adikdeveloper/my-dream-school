import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import styles from './StudentHome.module.css';
import StudentAIWidget from './StudentAIWidget';

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

  // Statistika kartalari
  const statCards = [
    {
      title: 'Davomat',
      value: `${stats.attendance}%`,
      icon: '✅',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      title: 'O\'rtacha baho',
      value: `${stats.avgGrade}%`,
      icon: '📊',
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
    },
    {
      title: 'Bajarilgan',
      value: stats.completedTasks,
      icon: '📋',
      gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)'
    },
    {
      title: 'Coinlar',
      value: stats.coins,
      icon: '🪙',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    }
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
    <div className={styles.studentHome}>
      {/* Welcome Section */}
      <section className={styles.welcomeSection}>
        <div className={styles.welcomeContent}>
          <span className={styles.greeting}>{getGreeting()},</span>
          <h1 className={styles.pageTitle}>
            <span className={styles.wave}>👋</span>
            {user?.firstName || 'O\'quvchi'}!
          </h1>
          <p className={styles.dateText}>{formatDate()}</p>
        </div>
        <div className={styles.currentTime}>
          <div className={styles.timeDisplay}>
            {currentTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <div key={index} className={styles.statCard} style={{ background: stat.gradient }}>
            <div className={styles.statIconWrapper}>
              <div className={styles.statIcon}>{stat.icon}</div>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.title}</div>
            </div>
            <div className={styles.statDecoration}></div>
          </div>
        ))}
      </section>

      {/* Current/Next Lesson Highlight */}
      {currentLesson && (
        <section className={styles.currentLessonSection}>
          <div className={`${styles.currentLessonCard} ${styles[currentLesson.status]}`}>
            <div className={styles.lessonStatusBadge}>
              {currentLesson.status === 'current' ? '🔴 Hozir' : '⏭️ Keyingi dars'}
            </div>
            <div className={styles.lessonMain}>
              <h3>{currentLesson.subject}</h3>
              <div className={styles.lessonDetails}>
                <span>🕐 {currentLesson.time} - {currentLesson.endTime}</span>
                {currentLesson.room && <span>🏫 {currentLesson.room}-xona</span>}
              </div>
            </div>
            {currentLesson.status === 'current' && (() => {
              const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
              const startMin = toMin(currentLesson.time);
              const endMin = toMin(currentLesson.endTime);
              const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
              const pct = endMin > startMin ? Math.min(100, Math.max(0, ((nowMin - startMin) / (endMin - startMin)) * 100)) : 0;
              return (
                <div className={styles.lessonProgress}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        {/* Today's Schedule */}
        <section className={`${styles.card} ${styles.scheduleCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span className={styles.titleIcon}>📅</span>
              Bugungi darslar
            </h2>
            <span className={styles.countBadge}>{todaySchedule.length} ta dars</span>
          </div>
          <div className={styles.scheduleList}>
            {todaySchedule.length > 0 ? (
              todaySchedule.map((lesson, index) => {
                const isCurrent = currentLesson?.index === index && currentLesson?.status === 'current';
                const isPast = currentLesson ? index < currentLesson.index : false;

                return (
                  <div key={lesson.id} className={`${styles.scheduleItem} ${isCurrent ? styles.current : ''} ${isPast ? styles.past : ''}`}>
                    <div className={styles.scheduleTime}>
                      <span className={styles.startTime}>{lesson.time}</span>
                      <span className={styles.endTime}>{lesson.endTime}</span>
                    </div>
                    <div className={styles.scheduleDivider}>
                      <div className={styles.dividerDot}></div>
                      <div className={styles.dividerLine}></div>
                    </div>
                    <div className={styles.scheduleContent}>
                      <h4>{lesson.subject}</h4>
                      {lesson.room && <span className={styles.roomInfo}>{lesson.room}-xona</span>}
                    </div>
                    {isCurrent && <span className={styles.nowBadge}>Hozir</span>}
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📭</span>
                <p className={styles.emptyText}>Bugun darslar yo'q</p>
              </div>
            )}
          </div>
        </section>

        {/* Tasks */}
        <section className={`${styles.card} ${styles.tasksCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span className={styles.titleIcon}>📝</span>
              Topshiriqlar
            </h2>
            <span className={styles.countBadge}>{pendingTasks.length} ta</span>
          </div>
          <div className={styles.tasksList}>
            {pendingTasks.length > 0 ? (
              pendingTasks.map((task) => (
                <div key={task.id} className={`${styles.taskItem} ${task.dueToday ? styles.urgent : ''}`}>
                  <div className={styles.taskCheckbox}>
                    <div className={styles.checkbox}></div>
                  </div>
                  <div className={styles.taskContent}>
                    <h4>{task.title}</h4>
                    <span className={styles.taskSubject}>{task.subject}</span>
                  </div>
                  <span className={`${styles.taskDue} ${task.dueToday ? styles.today : ''}`}>
                    {task.dueDateText}
                  </span>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>✅</span>
                <p className={styles.emptyText}>Topshiriqlar yo'q</p>
              </div>
            )}
          </div>
        </section>

        {/* Grades */}
        <section className={`${styles.card} ${styles.gradesCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <span className={styles.titleIcon}>📈</span>
              So'nggi baholar
            </h2>
          </div>
          <div className={styles.gradesList}>
            {weeklyGrades.length > 0 ? (
              weeklyGrades.map((item, index) => (
                <div key={item.subject || index} className={styles.gradeItem}>
                  <div className={styles.gradeInfo}>
                    <h4>{item.subject}</h4>
                    <div className={styles.gradeBar}>
                      <div
                        className={styles.gradeFill}
                        style={{
                          width: `${item.grade}%`,
                          background: item.grade >= 90 ? '#10b981' : item.grade >= 80 ? '#22c55e' : '#f59e0b'
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className={styles.gradeValueWrapper}>
                    <span className={`${styles.gradeValue} ${item.grade >= 90 ? styles.excellent : item.grade >= 80 ? styles.good : styles.average}`}>
                      {item.grade}
                    </span>
                    {item.trend === 'up' && <span className={`${styles.trend} ${styles.up}`}>↑</span>}
                    {item.trend === 'down' && <span className={`${styles.trend} ${styles.down}`}>↓</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>📊</span>
                <p className={styles.emptyText}>Baholar yo'q</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bosh sahifadagi suzuvchi AI yordamchi */}
      <StudentAIWidget />
    </div>
  );
};

export default StudentHome;
