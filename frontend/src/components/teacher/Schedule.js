import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';
import styles from './Schedule.module.css';

const Schedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileGroup, setMobileGroup] = useState(0); // 0, 1, 2 for the 3 groups

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
          <h1 className={styles.title}>📅 Dars Jadvali</h1>
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
        <h1 className={styles.title}>📅 Haftalik Dars Jadvali</h1>
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
    </div>
  );
};

export default Schedule;
