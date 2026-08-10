import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import apiService from '../../services/apiService';
import styles from './SupervisorHome.module.css';

const HomeIcon = ({ name, size = 20 }) => {
  const paths = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    attendance: <><circle cx="9" cy="7" r="4" /><path d="M2 21a7 7 0 0 1 14 0M16 11l2 2 4-5" /></>,
    grading: <><path d="M5 4h14v17H5zM9 4V2h6v2M9 10h6M9 14h6" /><path d="m9 18 1.5 1.5L14 16" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    warning: <><path d="M12 3 2 21h20Z" /><path d="M12 9v5M12 17h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    welcome: <><path d="M8 12V5a2 2 0 0 1 4 0v6M12 10V4a2 2 0 0 1 4 0v7M16 10V6a2 2 0 0 1 4 0v8a8 8 0 0 1-8 8h-1a8 8 0 0 1-8-8v-3a2 2 0 0 1 4 0v2" /></>,
    filter: <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.calendar}</svg>;
};

const SupervisorHome = () => {
  const { setLoading, setError } = useData();
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [timeFilter, setTimeFilter] = useState('daily'); // daily, weekly, monthly
  
  const [teacherStats, setTeacherStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    pendingGrades: 0,
    upcomingAssignments: 0
  });
  
  const [ungradedLessons, setUngradedLessons] = useState([]);
  const [classStats, setClassStats] = useState([]);
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedTeacher) {
      loadTeacherData(selectedTeacher, timeFilter);
    }
  }, [selectedTeacher, timeFilter]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await apiService.getTeacherPerformanceReport(); 
      // Assuming getTeacherPerformanceReport returns users with role=teacher
      setTeachers(res.users || res);
      if (res && (res.users || res).length > 0) {
        setSelectedTeacher((res.users || res)[0]._id);
      }
    } catch (err) {
      setError('O\'qituvchilarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherData = async (teacherId, filter) => {
    try {
      setLoading(true);

      const [todayStats, ungradedReq, classesData, scheduleData] = await Promise.all([
        apiService.getTeacherTodayStats(teacherId).catch(() => ({})),
        apiService.getTeacherUngradedLessons(teacherId).catch(() => ({ ungradedLessons: [] })),
        apiService.getTeacherClassStats(teacherId).catch(() => []),
        apiService.getTeacherSchedule(teacherId).catch(() => [])
      ]);

      setTeacherStats({
        totalStudents: todayStats.totalStudents || 0,
        presentToday: todayStats.presentToday || 0,
        pendingGrades: todayStats.pendingGrades || 0,
        upcomingAssignments: todayStats.activeAssignments || 0
      });

      setUngradedLessons(ungradedReq.ungradedLessons || []);
      setClassStats(classesData || []);
      
      // Filter schedule if needed, or just show today
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const todayLessons = (scheduleData || []).find(d => d.day === today)?.periods || [];
      setSchedule(todayLessons);
      
    } catch (err) {
      setError('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>
            <HomeIcon name="welcome" size={24} /> Ta'lim Nazorati Dashboardi
          </h1>
          <p className={styles.subtitle}>O'qituvchilar faoliyatini, davomat va baholarni nazorat qiling.</p>
        </div>
        
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <select 
              value={selectedTeacher} 
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className={styles.select}
            >
              {teachers.map(t => (
                <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <HomeIcon name="filter" size={16} />
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              className={styles.select}
            >
              <option value="daily">Kunlik</option>
              <option value="weekly">Haftalik</option>
              <option value="monthly">Oylik</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className={styles.statIcon}><HomeIcon name="users" size={24} /></div>
          <div className={styles.statInfo}>
            <h3>Jami o'quvchilar</h3>
            <p>{teacherStats.totalStudents}</p>
          </div>
        </div>
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
          <div className={styles.statIcon}><HomeIcon name="attendance" size={24} /></div>
          <div className={styles.statInfo}>
            <h3>Davomat ({timeFilter === 'daily' ? 'Bugun' : timeFilter})</h3>
            <p>{teacherStats.presentToday}</p>
          </div>
        </div>
        <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <div className={styles.statIcon}><HomeIcon name="grading" size={24} /></div>
          <div className={styles.statInfo}>
            <h3>Baho qo'yilmagan (Kutilayotgan)</h3>
            <p>{teacherStats.pendingGrades}</p>
          </div>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3><HomeIcon name="warning" size={18} /> Baho qo'yilmagan darslar ({ungradedLessons.length})</h3>
          </div>
          <div className={styles.cardBody}>
            {ungradedLessons.length === 0 ? (
              <p className={styles.empty}>Barcha darslar baholangan</p>
            ) : (
              <ul className={styles.list}>
                {ungradedLessons.map((l, i) => (
                  <li key={i} className={styles.listItem}>
                    <span className={styles.bold}>{l.class}</span> - {l.subject}
                    <span className={styles.time}><HomeIcon name="clock" size={14} /> {l.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3><HomeIcon name="calendar" size={18} /> Dars jadvali (Bugun)</h3>
          </div>
          <div className={styles.cardBody}>
            {schedule.length === 0 ? (
              <p className={styles.empty}>Bugun darslar yo'q</p>
            ) : (
              <ul className={styles.list}>
                {schedule.map((p, i) => (
                  <li key={i} className={styles.listItem}>
                    <span className={styles.time}>{p.startTime} - {p.endTime}</span>
                    <span className={styles.bold}>{p.className}</span> {p.subject?.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: '20px' }}>
        <div className={styles.cardHeader}>
          <h3><HomeIcon name="grading" size={18} /> Sinflar kesimida davomat va baholar</h3>
        </div>
        <div className={styles.cardBody}>
          {classStats.length === 0 ? (
            <p className={styles.empty}>Sinflar ma'lumoti yo'q</p>
          ) : (
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sinf</th>
                    <th>O'quvchilar</th>
                    <th>Fan</th>
                    <th>O'rtacha baho</th>
                    <th>Davomat</th>
                  </tr>
                </thead>
                <tbody>
                  {classStats.map((cls, i) => (
                    cls.subjects.map((sub, j) => (
                      <tr key={`${i}-${j}`}>
                        {j === 0 && (
                          <>
                            <td rowSpan={cls.subjects.length} className={styles.bold}>{cls.grade}-{cls.section}</td>
                            <td rowSpan={cls.subjects.length}>{cls.studentCount}</td>
                          </>
                        )}
                        <td>{sub.subjectName}</td>
                        <td>
                          <span className={styles.badge} style={{ background: sub.average >= 80 ? '#10b981' : sub.average >= 60 ? '#f59e0b' : '#ef4444' }}>
                            {sub.average}%
                          </span>
                        </td>
                        <td>
                          <span className={styles.badge} style={{ background: sub.attendanceRate >= 80 ? '#10b981' : sub.attendanceRate >= 60 ? '#f59e0b' : '#ef4444' }}>
                            {sub.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupervisorHome;
