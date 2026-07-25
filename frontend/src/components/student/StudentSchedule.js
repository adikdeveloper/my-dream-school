import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import './StudentSchedule.css';

const StudentSchedule = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState(null);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [currentDay, setCurrentDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  const [timeFormat, setTimeFormat] = useState('24'); // '12' yoki '24'
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const daysEn = useMemo(() => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], []);
  const daysUz = useMemo(() => ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'], []);

  const translateDay = useCallback((dayEn) => {
    const i = daysEn.indexOf(dayEn);
    return i !== -1 ? daysUz[i] : dayEn;
  }, [daysEn, daysUz]);

  // Joriy kunni yarim tunda yangilash
  useEffect(() => {
    const updateCurrentDay = () => setCurrentDay(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow - now;

    let dailyInterval;
    const midnightTimeout = setTimeout(() => {
      updateCurrentDay();
      dailyInterval = setInterval(updateCurrentDay, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    return () => {
      clearTimeout(midnightTimeout);
      if (dailyInterval) clearInterval(dailyInterval);
    };
  }, []);

  // Jadvalni yuklash
  useEffect(() => {
    if (user?.classId) {
      fetchSchedule();
    } else {
      setIsLoading(false);
      setError('Siz hali hech qanday sinfga biriktirilmagansiz');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.classId]);

  // Joriy darsni aniqlash
  useEffect(() => {
    if (schedule) {
      fetchCurrentPeriod();
      const interval = setInterval(fetchCurrentPeriod, 60000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, currentDay]);

  const fetchSchedule = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!user?.classId) {
        setError('Siz hali hech qanday sinfga biriktirilmagansiz');
        setIsLoading(false);
        return;
      }

      const now = Date.now();
      const CACHE_DURATION = 5 * 60 * 1000;
      if (!forceRefresh && lastUpdated && (now - lastUpdated) < CACHE_DURATION && schedule) {
        setIsLoading(false);
        return;
      }

      const scheduleData = await apiService.getStudentSchedule();

      if (scheduleData && scheduleData.weeklySchedule && scheduleData.weeklySchedule.length > 0) {
        setSchedule({
          className: scheduleData.className || 'Sinf nomi',
          grade: scheduleData.grade || '',
          section: scheduleData.section || '',
          academicYear: scheduleData.academicYear || '2024-2025',
          weeklySchedule: scheduleData.weeklySchedule
        });
        setScheduleInfo(scheduleData.scheduleInfo || null);
        setLastUpdated(now);
        setError(null);
      } else {
        setSchedule(null);
        setScheduleInfo(null);
        setError(null);
      }
    } catch (error) {
      setError('Dars jadvalini yuklashda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSchedule(true);
    fetchCurrentPeriod();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const fetchCurrentPeriod = useCallback(() => {
    try {
      if (!schedule || !schedule.weeklySchedule) return;
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todaySchedule = schedule.weeklySchedule.find(d => d.day === currentDay);
      if (!todaySchedule || !todaySchedule.periods) {
        setCurrentPeriod(null);
        return;
      }

      let current = null;
      let next = null;
      for (let i = 0; i < todaySchedule.periods.length; i++) {
        const period = todaySchedule.periods[i];
        if (currentTime >= period.startTime && currentTime < period.endTime) {
          current = period;
          if (i + 1 < todaySchedule.periods.length) next = todaySchedule.periods[i + 1];
          break;
        } else if (currentTime < period.startTime && !next) {
          next = period;
          break;
        }
      }
      setCurrentPeriod({ currentPeriod: current, nextPeriod: next, currentTime, day: currentDay });
    } catch (error) {
      setCurrentPeriod(null);
    }
  }, [schedule, currentDay]);

  const formatTime = useCallback((time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    if (timeFormat === '24') return `${hours}:${minutes}`;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }, [timeFormat]);

  const formatLastUpdated = useCallback(() => {
    if (!lastUpdated) return null;
    const minutes = Math.floor((Date.now() - lastUpdated) / (1000 * 60));
    if (minutes < 1) return 'Hozirgina yangilandi';
    if (minutes === 1) return '1 daqiqa oldin';
    if (minutes < 60) return `${minutes} daqiqa oldin`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 soat oldin';
    return `${hours} soat oldin`;
  }, [lastUpdated]);

  const isCurrentPeriod = useCallback((period, day) => {
    if (!currentPeriod || !currentPeriod.currentPeriod || currentPeriod.day !== day) return false;
    return period.startTime === currentPeriod.currentPeriod.startTime &&
           period.endTime === currentPeriod.currentPeriod.endTime;
  }, [currentPeriod]);

  const isUpcomingPeriod = useCallback((period, day) => {
    if (!currentPeriod || !currentPeriod.nextPeriod || currentPeriod.day !== day) return false;
    return period.startTime === currentPeriod.nextPeriod.startTime &&
           period.endTime === currentPeriod.nextPeriod.endTime;
  }, [currentPeriod]);

  // Faqat darsi bor kunlar (ustunlar), Du -> Ya tartibida
  const activeDays = useMemo(() => {
    if (!schedule?.weeklySchedule) return [];
    return daysEn.filter(day => {
      const d = schedule.weeklySchedule.find(x => x.day === day);
      return d && Array.isArray(d.periods) && d.periods.length > 0;
    });
  }, [schedule, daysEn]);

  // Noyob vaqt oraliqlari (qatorlar), boshlanish vaqti bo'yicha tartiblangan
  const timeSlots = useMemo(() => {
    if (!schedule?.weeklySchedule) return [];
    const map = new Map();
    schedule.weeklySchedule.forEach(d => {
      (d.periods || []).forEach(p => {
        if (!p.startTime || !p.endTime) return;
        const key = `${p.startTime}-${p.endTime}`;
        if (!map.has(key)) map.set(key, { startTime: p.startTime, endTime: p.endTime });
      });
    });
    return [...map.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedule]);

  const getPeriodAt = useCallback((day, slot) => {
    if (!schedule?.weeklySchedule) return null;
    const d = schedule.weeklySchedule.find(x => x.day === day);
    if (!d || !d.periods) return null;
    return d.periods.find(p => p.startTime === slot.startTime && p.endTime === slot.endTime) || null;
  }, [schedule]);

  // Loading
  if (isLoading) {
    return (
      <div className="schedule-container" role="main" aria-busy="true">
        <div className="loading-state">
          <div className="loading-spinner" role="status" aria-label="Yuklanmoqda"></div>
          <p aria-live="polite">Dars jadvali yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="schedule-container" role="main">
        <div className="error-state" role="alert">
          <div className="error-icon" aria-hidden="true">⚠️</div>
          <h3>Xatolik yuz berdi</h3>
          <p>{error}</p>
          <button onClick={fetchSchedule} className="retry-btn">Qayta urinib ko'ring</button>
        </div>
      </div>
    );
  }

  // No schedule
  if (!schedule) {
    return (
      <div className="schedule-container" role="main">
        <div className="no-schedule-state" role="status">
          <div className="no-schedule-icon" aria-hidden="true">📅</div>
          <h3>Dars jadvali topilmadi</h3>
          <p>Siz hali hech qanday sinfga biriktirilmagansiz yoki dars jadvali tayyor emas.</p>
          <button onClick={handleRefresh} className="retry-btn">
            <span aria-hidden="true">🔄</span> Qayta urinib ko'ring
          </button>
        </div>
      </div>
    );
  }

  const hasGrid = timeSlots.length > 0 && activeDays.length > 0;

  // Main render — faqat haftalik (Excel uslubi)
  return (
    <div className="schedule-container" role="main">
      <div className="schedule-header">
        <div className="header-info">
          <h1 className="page-title" id="schedule-title">📅 Haftalik dars jadvali</h1>
          <div className="class-info">
            <span className="class-name">{schedule.className}</span>
            <span className="class-details">{schedule.grade}-sinf · {schedule.section} bo'lim</span>
            <span className="academic-year">{schedule.academicYear}</span>
            {lastUpdated && (
              <span className="last-updated"><span aria-hidden="true">⏱️</span> {formatLastUpdated()}</span>
            )}
          </div>
        </div>

        {scheduleInfo && (
          <div className={`schedule-info-banner schedule-${scheduleInfo.status}`}>
            <div className="banner-icon">
              {scheduleInfo.status === 'active' ? '🟢' :
               scheduleInfo.status === 'future' ? '🔵' :
               scheduleInfo.status === 'expired' ? '🟡' : '⚫'}
            </div>
            <div className="banner-content">
              <h3>{scheduleInfo.name}</h3>
              <p>
                {new Date(scheduleInfo.startDate).toLocaleDateString('uz-UZ')} - {new Date(scheduleInfo.endDate).toLocaleDateString('uz-UZ')}
                {scheduleInfo.semester && ` • ${scheduleInfo.semester}-semestr`}
              </p>
            </div>
          </div>
        )}

        <div className="schedule-toolbar" role="toolbar" aria-label="Boshqaruv">
          <button
            className="schedule-tool-btn"
            onClick={() => setTimeFormat(timeFormat === '24' ? '12' : '24')}
            title={`${timeFormat === '24' ? '12' : '24'} soatlik formatga o'tish`}
          >
            <span aria-hidden="true">🕐</span> {timeFormat}h
          </button>
          <button
            className="schedule-tool-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Yangilash"
          >
            <span aria-hidden="true">{isRefreshing ? '🔄' : '↻'}</span> Yangilash
          </button>
        </div>
      </div>

      {hasGrid ? (
        <div className="excel-wrap" role="region" aria-label="Haftalik dars jadvali jadvali" tabIndex={0}>
          <table className="excel-schedule">
            <thead>
              <tr>
                <th className="time-col-head" scope="col">№ / Vaqt</th>
                {activeDays.map(day => (
                  <th key={day} scope="col" className={day === currentDay ? 'today-col' : ''}>
                    <span className="th-day">{translateDay(day)}</span>
                    {day === currentDay && <span className="today-tag">Bugun</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, idx) => (
                <tr key={`${slot.startTime}-${slot.endTime}`}>
                  <th scope="row" className="time-cell">
                    <span className="lesson-num">{idx + 1}</span>
                    <span className="lesson-time">{formatTime(slot.startTime)}<br />{formatTime(slot.endTime)}</span>
                  </th>
                  {activeDays.map(day => {
                    const p = getPeriodAt(day, slot);
                    const cur = p && isCurrentPeriod(p, day);
                    const up = p && isUpcomingPeriod(p, day);
                    return (
                      <td
                        key={day}
                        className={`subject-cell${day === currentDay ? ' today-col' : ''}${cur ? ' current-cell' : up ? ' upcoming-cell' : ''}`}
                      >
                        {p ? (
                          <>
                            <span className="cell-subject">{p.subject?.name || "Noma'lum"}</span>
                            {(p.teacher?.firstName || p.teacher?.lastName) && (
                              <span className="cell-teacher">{p.teacher?.firstName} {p.teacher?.lastName}</span>
                            )}
                            {cur && <span className="cell-flag cur">Hozir</span>}
                            {up && <span className="cell-flag up">Keyingi</span>}
                          </>
                        ) : (
                          <span className="cell-empty" aria-hidden="true">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-classes-day">
          <div className="no-classes-icon" aria-hidden="true">📚</div>
          <h4>Dars jadvali bo'sh</h4>
          <p>Hozircha darslar kiritilmagan.</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(StudentSchedule);
