import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import styles from './Schedule.module.css';
import TeacherUiIcon from './TeacherUiIcon';
import { formatUzShortDate } from '../../utils/uzDate';

const Schedule = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileGroup, setMobileGroup] = useState(0);
  const [weekSubs, setWeekSubs] = useState([]);

  const dayNamesUz = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const dayNamesEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  const coveredOnMyCell = (dayEn, timeSlot) => weekSubs.find((s) =>
    s.originalTeacher && String(s.originalTeacher._id) === String(myId) &&
    `${s.day}-${s.startTime}-${s.endTime}` === `${dayEn}-${timeSlot}`
  );
  const formatDateShort = (d) => formatUzShortDate(d);

  const getTimeSlots = () => {
    const slots = new Set();
    schedule.forEach(day => {
      day.periods?.forEach(period => {
        slots.add(`${period.startTime}-${period.endTime}`);
      });
    });
    return Array.from(slots).sort();
  };

  const getPeriod = (dayEn, timeSlot) => {
    const daySchedule = schedule.find(d => d.day === dayEn);
    if (!daySchedule) return null;
    return daySchedule.periods?.find(p => `${p.startTime}-${p.endTime}` === timeSlot);
  };

  const timeSlots = getTimeSlots();
  const activeDays = schedule.filter((day) => day.periods?.length > 0).length;
  const mySubs = weekSubs.filter((s) => s.substituteTeacher && String(s.substituteTeacher._id) === String(myId));
  const coveredSubs = weekSubs.filter((s) => s.originalTeacher && String(s.originalTeacher._id) === String(myId));

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
                const covered = period ? coveredOnMyCell(dayEn, timeSlot) : null;
                return (
                  <td key={`${dayEn}-${timeSlot}`} className={styles.tdPeriod}>
                    {period ? (
                      <div className={styles.periodContent}>
                        <div className={styles.periodSubject}>{period.subject?.name || 'Fan'}</div>
                        <div className={styles.periodClass}>{period.className || 'Sinf'}</div>
                        {period.topic && <div className={styles.periodTopic}>{period.topic}</div>}
                        {covered?.substituteTeacher && (
                          <div className={styles.subBadge}>
                            <TeacherUiIcon name="swap" size={12} />
                            <span className={styles.subBadgeText}>
                              <span>O'rniga: {covered.substituteTeacher.name}</span>
                              <small>{formatDateShort(covered.date)}</small>
                            </span>
                          </div>
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
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <p className={styles.eyebrow}>Dars jarayoni</p>
            <h1 className={styles.title}>Haftalik dars jadvali</h1>
            <p className={styles.subtitle}>Darslar yuklanmoqda...</p>
          </div>
        </header>
        <div className={`td-card ${styles.card}`}>
          <div className={styles.loading}>
            {[1, 2, 3, 4, 5].map((item) => <div className={`td-skeleton ${styles.loadingRow}`} key={item} />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <p className={styles.eyebrow}>Dars jarayoni</p>
            <h1 className={styles.title}>Haftalik dars jadvali</h1>
          </div>
        </header>
        <div className={`td-card ${styles.errorCard}`}>
          <span className={styles.errorIcon}><TeacherUiIcon name="warning" size={22} /></span>
          <strong>{error}</strong>
          <p>Internet aloqasini tekshirib, qayta urinib ko'ring.</p>
          <button type="button" className="td-btn td-btn--gold" onClick={fetchSchedule}>Qayta urinish</button>
        </div>
      </div>
    );
  }

  if (!schedule || schedule.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <p className={styles.eyebrow}>Dars jarayoni</p>
            <h1 className={styles.title}>Haftalik dars jadvali</h1>
          </div>
        </header>
        <div className={`td-card ${styles.emptyCard}`}>
          <span className={styles.emptyIcon}><TeacherUiIcon name="calendar" size={22} /></span>
          <strong>Dars jadvali topilmadi</strong>
          <p>Jadval hali shakllanmagan bo'lishi mumkin. Administrator bilan bog'laning.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Dars jarayoni</p>
          <h1 className={styles.title}>Haftalik dars jadvali</h1>
          <p className={styles.subtitle}>Darslaringiz kun va vaqt bo'yicha bir joyda.</p>
        </div>
        <div className={styles.headChip}>
          <TeacherUiIcon name="clock2" size={15} /> {timeSlots.length} ta dars soati
        </div>
      </header>

      <section className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}><TeacherUiIcon name="calendar" size={17} /></span>
          <div><strong>{activeDays}</strong><span>Faol kunlar</span></div>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}><TeacherUiIcon name="clock2" size={17} /></span>
          <div><strong>{timeSlots.length}</strong><span>Dars soatlari</span></div>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}><TeacherUiIcon name="swap" size={17} /></span>
          <div><strong>{mySubs.length + coveredSubs.length}</strong><span>Bu hafta almashtirish</span></div>
        </div>
      </section>

      <section className={`td-card ${styles.card}`}>
        <div className="td-card-head">
          <div>
            <h2 className="td-card-title">Dars jadvali</h2>
            <p className="td-card-sub">Dushanba — Shanba</p>
          </div>
        </div>

        <div className={styles.desktopTable}>
          {renderTable(dayNamesUz, dayNamesEn)}
        </div>

        <div className={styles.mobileTable}>
          <div className={styles.mobileToggle}>
            {groups.map((g, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.mobileToggleBtn} ${mobileGroup === i ? styles.mobileToggleActive : ''}`}
                onClick={() => setMobileGroup(i)}
              >
                {g.label}
              </button>
            ))}
          </div>
          {renderTable(groups[mobileGroup].uz, groups[mobileGroup].en)}
        </div>
      </section>

      {(mySubs.length > 0 || coveredSubs.length > 0) && (
        <section className={`td-card ${styles.card} ${styles.subsCard}`}>
          <div className="td-card-head">
            <div>
              <h2 className="td-card-title">Bu haftadagi almashtirishlar</h2>
              <p className="td-card-sub">{mySubs.length + coveredSubs.length} ta yozuv</p>
            </div>
            <span className="td-chip td-chip--gold"><TeacherUiIcon name="swap" size={12} /> Almashtirish</span>
          </div>
          <div className={styles.subsList}>
            {mySubs.map((s) => (
              <div className={styles.subsRow} key={s._id}>
                <span className={`${styles.subsIcon} ${styles.subsIconGold}`}><TeacherUiIcon name="star" size={15} /></span>
                <div className={styles.subsInfo}>
                  <strong>{s.className}{s.subjectName ? ` · ${s.subjectName}` : ''}</strong>
                  <span>{formatDateShort(s.date)} · {s.startTime}-{s.endTime}</span>
                </div>
                <span className={styles.subsNote}>Siz {s.originalTeacher?.name || ''} o'rniga o'tdingiz</span>
                {s.status === 'pending' && <span className="td-chip td-chip--amber">Tasdiq kutilmoqda</span>}
              </div>
            ))}
            {coveredSubs.map((s) => (
              <div className={styles.subsRow} key={s._id}>
                <span className={styles.subsIcon}><TeacherUiIcon name="swap" size={15} /></span>
                <div className={styles.subsInfo}>
                  <strong>{s.className}{s.subjectName ? ` · ${s.subjectName}` : ''}</strong>
                  <span>{formatDateShort(s.date)} · {s.startTime}-{s.endTime}</span>
                </div>
                <span className={styles.subsNote}>{s.substituteTeacher?.name || ''} sizning o'rningizga o'tdi</span>
                {s.status === 'pending' && <span className="td-chip td-chip--amber">Tasdiq kutilmoqda</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Schedule;
