import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import styles from './Schedule.module.css';
import TeacherUiIcon from './TeacherUiIcon';

const Schedule = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileGroup, setMobileGroup] = useState(0); // 0, 1, 2 for the 3 groups
  const [weekSubs, setWeekSubs] = useState([]); // bu haftadagi almashtirishlar

  const dayNamesUz = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const dayNamesEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // 3 groups of 2 days for mobile
  const groups = [
    { label: 'Dush — Sesh', uz: dayNamesUz.slice(0, 2), en: dayNamesEn.slice(0, 2) },
    { label: 'Chor — Pay', uz: dayNamesUz.slice(2, 4), en: dayNamesEn.slice(2, 4) },
    { label: 'Juma — Shan', uz: dayNamesUz.slice(4, 6), en: dayNamesEn.slice(4, 6) },
  ];

  useEffect(() => {
    fetchSchedule();
    fetchWeekSubs();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiService.getTeacherSchedule();
      setSchedule(data || []);
    } catch (err) {
      setError('Dars jadvalini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // Bu haftadagi almashtirishlar (men o'tgan yoki mening o'rnimga o'tilgan)
  const fetchWeekSubs = async () => {
    try {
      const today = new Date();
      const dow = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);
      const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const subs = await apiService.getSubstitutionOverlay(fmt(monday), fmt(saturday));
      setWeekSubs(Array.isArray(subs) ? subs : []);
    } catch (e) {
      setWeekSubs([]);
    }
  };

  const myId = user?._id;
  // Mening o'z darsim o'rniga kim o'tgani (jadval katagiga belgi qo'yish uchun)
  const coveredOnMyCell = (dayEn, timeSlot) => weekSubs.find((s) =>
    s.originalTeacher && String(s.originalTeacher._id) === String(myId) &&
    `${s.day}-${s.startTime}-${s.endTime}` === `${dayEn}-${timeSlot}`
  );
  const formatDateShort = (d) => new Date(d).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });

  // Get all unique time slots
  const getTimeSlots = () => {
    const slots = new Set();
    schedule.forEach(day => {
      day.periods?.forEach(period => {
        slots.add(`${period.startTime}-${period.endTime}`);
      });
    });
    return Array.from(slots).sort();
  };

  // Get period for specific day and time
  const getPeriod = (dayEn, timeSlot) => {
    const daySchedule = schedule.find(d => d.day === dayEn);
    if (!daySchedule) return null;

    return daySchedule.periods?.find(p =>
      `${p.startTime}-${p.endTime}` === timeSlot
    );
  };

  const timeSlots = getTimeSlots();

  const renderTable = (daysUz, daysEn) => (
    <div className={styles.tableWrapper}>
      <table className={styles.scheduleTable}>
        <thead>
          <tr>
            <th className={styles.thTime}>Vaqt</th>
            {daysUz.map(day => (
              <th key={day} className={styles.thDay}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map(timeSlot => (
            <tr key={timeSlot}>
              <td className={styles.tdTime}>{timeSlot}</td>
              {daysEn.map(dayEn => {
                const period = getPeriod(dayEn, timeSlot);
                return (
                  <td key={`${dayEn}-${timeSlot}`} className={styles.tdPeriod}>
                    {period ? (
                      <div className={styles.periodContent}>
                        <div className={styles.periodSubject}>{period.subject?.name || 'Fan'}</div>
                        <div className={styles.periodClass}>{period.className || 'Sinf'}</div>
                        {period.topic && (
                          <div className={styles.periodTopic}>{period.topic}</div>
                        )}
                        {(() => {
                          const cov = coveredOnMyCell(dayEn, timeSlot);
                          if (!cov || !cov.substituteTeacher) return null;
                          return (
                            <div style={{ marginTop: 4, background: '#fee2e2', color: '#991b1b', borderRadius: 4, padding: '2px 5px', fontSize: '0.62rem', fontWeight: 700 }}>
                              <TeacherUiIcon name="swap" size={13} /> O'rniga: {cov.substituteTeacher.name} ({formatDateShort(cov.date)})
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className={styles.periodEmpty}>—</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.scheduleContainer}>
        <div className={styles.loading}>Yuklanmoqda...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.scheduleContainer}>
        <div className={styles.errorBox}>{error}</div>
      </div>
    );
  }

  if (!schedule || schedule.length === 0) {
    return (
      <div className={styles.scheduleContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}><TeacherUiIcon name="calendar" size={22} /> Dars jadvali</h1>
        </div>
        <div className={styles.emptyBox}>
          <p>Dars jadvali topilmadi</p>
          <small>Administrator bilan bog'laning</small>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.scheduleContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}><TeacherUiIcon name="calendar" size={22} /> Haftalik dars jadvali</h1>
        <p className={styles.subtitle}>Jami {timeSlots.length} ta dars soati</p>
      </div>

      {/* Desktop: full table */}
      <div className={styles.desktopTable}>
        {renderTable(dayNamesUz, dayNamesEn)}
      </div>

      {/* Mobile: split into groups of 2 days */}
      <div className={styles.mobileTable}>
        <div className={styles.mobileToggle}>
          {groups.map((g, i) => (
            <button
              key={i}
              className={`${styles.mobileToggleBtn} ${mobileGroup === i ? styles.mobileToggleActive : ''}`}
              onClick={() => setMobileGroup(i)}
            >
              {g.label}
            </button>
          ))}
        </div>
        {renderTable(groups[mobileGroup].uz, groups[mobileGroup].en)}
      </div>

      {/* Bu haftadagi almashtirishlar */}
      {(() => {
        const asSub = weekSubs.filter((s) => s.substituteTeacher && String(s.substituteTeacher._id) === String(myId));
        const asOrig = weekSubs.filter((s) => s.originalTeacher && String(s.originalTeacher._id) === String(myId));
        if (asSub.length === 0 && asOrig.length === 0) return null;
        const row = (s, label) => (
          <div key={s._id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
            <strong>{formatDateShort(s.date)}</strong> • {s.startTime}-{s.endTime} • {s.className}
            {s.subjectName ? ` • ${s.subjectName}` : ''} — <span style={{ color: '#0c4a6e' }}>{label}</span>
            {s.status === 'pending' && <span style={{ marginLeft: 6, color: '#92400e', fontSize: '0.72rem' }}>(tasdiq kutilmoqda)</span>}
          </div>
        );
        return (
          <div style={{ background: '#fff', borderRadius: 12, padding: '1rem 1.25rem', marginTop: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}><TeacherUiIcon name="swap" /> Bu haftadagi almashtirishlar</h2>
            {asSub.map((s) => row(s, `Siz ${s.originalTeacher ? s.originalTeacher.name : ''} o'rniga o'tdingiz`))}
            {asOrig.map((s) => row(s, `${s.substituteTeacher ? s.substituteTeacher.name : ''} sizning o'rningizga o'tdi`))}
          </div>
        );
      })()}
    </div>
  );
};

export default Schedule;
