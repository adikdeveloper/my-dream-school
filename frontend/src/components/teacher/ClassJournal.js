import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/authService';
import apiService from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import styles from './ClassJournal.module.css';

const ClassJournal = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  // Vaqtincha (almashtirish orqali) baho qo'yish mumkin bo'lgan sinf+fanlar
  const [substitutionAccess, setSubstitutionAccess] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [students, setStudents] = useState([]);
  const [holidays, setHolidays] = useState([]);

  // View type: 'day', 'week' or 'month'
  // Kompyuterda haftalik, telefon/planshetda kunlik ko'rinish
  const [viewType, setViewType] = useState(() => window.innerWidth <= 768 ? 'day' : 'week');
  const [selectedDay, setSelectedDay] = useState(new Date());

  // For weekly view - start of current week (Monday)
  const getWeekStart = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart());

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // Toast ko'rsatish funksiyasi
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3000);
  };

  // Generate years dynamically (current year - 2 to current year + 2)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const [lessonDates, setLessonDates] = useState([]);
  const [grades, setGrades] = useState({});
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];

  const fetchClassesCallback = useCallback(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchClassesCallback();
    fetchHolidays();
    fetchSubstitutionAccess();
  }, [fetchClassesCallback]);

  // O'qituvchi almashtirish orqali qaysi sinf+fanlarga vaqtincha kira olishini yuklaymiz
  const fetchSubstitutionAccess = async () => {
    try {
      const access = await apiService.getMySubstitutionAccess();
      setSubstitutionAccess(Array.isArray(access) ? access : []);
    } catch (e) {
      setSubstitutionAccess([]);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchClassData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, substitutionAccess]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchJournalData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSubject, selectedMonth, selectedYear, currentWeekStart, viewType, selectedDay]);

  const fetchHolidays = async () => {
    try {
      const holidaysData = await apiService.getHolidays();
      setHolidays(holidaysData || []);
    } catch (error) {
    }
  };

  // Berilgan sananing bayram kuni ekanligini tekshirish
  const isHoliday = (dateStr) => {
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);

    return holidays.find(holiday => {
      const holidayStart = new Date(holiday.date);
      holidayStart.setHours(0, 0, 0, 0);

      if (holiday.endDate) {
        const holidayEnd = new Date(holiday.endDate);
        holidayEnd.setHours(23, 59, 59, 999);
        return checkDate >= holidayStart && checkDate <= holidayEnd;
      }

      return checkDate.getTime() === holidayStart.getTime();
    });
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/classes');

      // Handle new API format: {classes: [...], pagination: {...}}
      const classesData = response.data.classes || response.data || [];
      const teacherClasses = Array.isArray(classesData) ? classesData : [];

      setClasses(teacherClasses);
      if (teacherClasses.length > 0) {
        setSelectedClass(teacherClasses[0]._id);
      }
    } catch (error) {
      setClasses([]);
      showToast('Sinflarni yuklashda xatolik: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassData = async () => {
    try {
      setLoading(true);

      // Get class details
      const classResponse = await api.get(`/classes/${selectedClass}`);
      const classData = classResponse.data;

      setStudents(classData.students || []);
      const classSubjects = classData.subjects || [];

      // O'qituvchining faqat o'ziga biriktirilgan fanlarini filtrlash
      // Masalan: IT o'qituvchi faqat IT fanini ko'radi
      const teacherSubjects = classSubjects.filter(subj => {
        const teacherId = subj.teacher?._id || subj.teacher;
        return teacherId === user?._id;
      });

      // Almashtirish orqali shu sinfga vaqtincha kira oladigan fanlarni qo'shamiz
      // (masalan: ingliz tili o'qituvchisi matematika o'qituvchisi o'rniga o'tgan)
      const subSubjects = substitutionAccess
        .filter(a => String(a.classId) === String(selectedClass))
        .reduce((acc, a) => {
          const already = teacherSubjects.some(ts => String(ts.subject?._id || ts.subject) === String(a.subjectId))
            || acc.some(x => String(x.subject._id) === String(a.subjectId));
          if (!already && a.subjectId) {
            acc.push({ subject: { _id: a.subjectId, name: a.subjectName }, teacher: { _id: user?._id }, isSubstitution: true });
          }
          return acc;
        }, []);

      const mergedSubjects = [...teacherSubjects, ...subSubjects];
      setSubjects(mergedSubjects);

      // Tanlangan fan hali ham mavjud bo'lsa saqlaymiz (almashtirish ro'yxati
      // keyin yuklanib qayta ishga tushganda tanlovni bekorga ketkazmaslik uchun)
      if (mergedSubjects.length > 0) {
        setSelectedSubject(prev => {
          const stillValid = prev && mergedSubjects.some(s => String(s.subject?._id) === String(prev));
          return stillValid ? prev : (mergedSubjects[0].subject?._id || '');
        });
      } else {
        setSelectedSubject('');
      }
    } catch (error) {
      showToast('Sinf ma\'lumotlarini yuklashda xatolik: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchJournalData = async () => {
    try {
      setLoading(true);

      // Get current schedule for the class
      const scheduleResponse = await api.get(`/schedule/class/${selectedClass}/current`);
      const scheduleData = scheduleResponse.data;

      let startDate, endDate, dates;

      if (viewType === 'day') {
        // Daily view: single day
        const dayStart = new Date(selectedDay);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDay);
        dayEnd.setHours(23, 59, 59, 999);

        startDate = dayStart.toISOString();
        endDate = dayEnd.toISOString();

        dates = [new Date(selectedDay)];
        setLessonDates(dates);
      } else if (viewType === 'week') {
        // Weekly view: 7 days from Monday to Sunday
        const weekStart = new Date(currentWeekStart);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        startDate = weekStart.toISOString();
        endDate = weekEnd.toISOString();

        // Generate lesson dates for the week
        dates = generateLessonDatesForWeek(scheduleData?.schedule || [], weekStart);
        setLessonDates(dates);
      } else {
        // Monthly view
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

        startDate = monthStart.toISOString();
        endDate = monthEnd.toISOString();

        // Generate lesson dates based on schedule
        dates = generateLessonDates(scheduleData?.schedule || [], selectedMonth, selectedYear);
        setLessonDates(dates);
      }

      // Fetch grades and attendance in parallel for better performance
      const [gradesResponse, attendanceResponse] = await Promise.all([
        api.get(`/grades?classId=${selectedClass}&subjectId=${selectedSubject}&startDate=${startDate}&endDate=${endDate}`),
        api.get(`/attendance?classId=${selectedClass}&startDate=${startDate}&endDate=${endDate}`)
      ]);

      // Process grades data - handle API format {grades: [...], pagination: {...}}
      const gradesData = {};
      const gradesArray = gradesResponse.data.grades || gradesResponse.data || [];

      if (Array.isArray(gradesArray)) {
        gradesArray.forEach(record => {
          const recordDate = new Date(record.date).toISOString().split('T')[0];
          const studentId = record.student._id || record.student;
          if (!gradesData[studentId]) {
            gradesData[studentId] = {};
          }
          gradesData[studentId][recordDate] = record.score;
        });
      }
      setGrades(gradesData);

      // Process attendance data - handle API format {attendance: [...], pagination: {...}}
      const attendanceData = {};
      const attendanceArray = attendanceResponse.data.attendance || attendanceResponse.data || [];

      if (Array.isArray(attendanceArray)) {
        attendanceArray.forEach(record => {
          const recordDate = new Date(record.date).toISOString().split('T')[0];
          const studentId = record.student._id || record.student;
          if (!attendanceData[studentId]) {
            attendanceData[studentId] = {};
          }
          attendanceData[studentId][recordDate] = record.status;
        });
      }
      setAttendance(attendanceData);

    } catch (error) {
      // If schedule endpoint is not found, show user-friendly message
      if (error.response?.status === 404 || error.response?.data?.message?.includes('topilmadi')) {
        setLessonDates([]);
        showToast('⚠️ Bu sinf uchun dars jadvali topilmadi. Jurnal ishlatish uchun avval admin tomonidan sinf jadvali yaratilishi kerak.', 'warning');
      } else {
        showToast('Jurnal ma\'lumotlarini yuklashda xatolik: ' + (error.response?.data?.message || error.message), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateLessonDatesForWeek = (schedule, weekStart) => {
    // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
    const dayMap = {
      'Dushanba': 1, 'Seshanba': 2, 'Chorshanba': 3, 'Payshanba': 4, 'Juma': 5, 'Shanba': 6,
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    let daysOfWeek = [];
    let hasSchedule = false;

    // Get days from schedule for the selected subject
    if (schedule && Array.isArray(schedule) && schedule.length > 0) {
      const subjectDays = new Set();

      schedule.forEach(daySchedule => {
        if (daySchedule.periods && Array.isArray(daySchedule.periods)) {
          daySchedule.periods.forEach(period => {
            if (period.subject && (period.subject._id === selectedSubject || period.subject === selectedSubject)) {
              subjectDays.add(daySchedule.day);
              hasSchedule = true;
            }
          });
        }
      });

      daysOfWeek = Array.from(subjectDays).map(day => dayMap[day]).filter(d => d !== undefined);
    } else if (schedule && schedule.periods && Array.isArray(schedule.periods)) {
      const subjectDays = new Set();
      schedule.periods.forEach(period => {
        if (period.subject && (period.subject._id === selectedSubject || period.subject === selectedSubject)) {
          subjectDays.add(period.day);
          hasSchedule = true;
        }
      });

      daysOfWeek = Array.from(subjectDays).map(day => dayMap[day]).filter(d => d !== undefined);
    }

    if (!hasSchedule || daysOfWeek.length === 0) {
      return [];
    }

    // Generate dates for the week (7 days from weekStart)
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      if (daysOfWeek.includes(date.getDay())) {
        dates.push(date);
      }
    }

    return dates;
  };

  const generateLessonDates = (schedule, month, year) => {
    // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
    const dayMap = {
      'Dushanba': 1, 'Seshanba': 2, 'Chorshanba': 3, 'Payshanba': 4, 'Juma': 5, 'Shanba': 6,
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    let daysOfWeek = [];
    let hasSchedule = false;

    // Try to get days from schedule - handle both old and new structure
    if (schedule && Array.isArray(schedule) && schedule.length > 0) {
      const subjectDays = new Set();

      // New structure: schedule is array of {day, periods: [...]}
      schedule.forEach(daySchedule => {
        if (daySchedule.periods && Array.isArray(daySchedule.periods)) {
          daySchedule.periods.forEach(period => {
            if (period.subject && (period.subject._id === selectedSubject || period.subject === selectedSubject)) {
              subjectDays.add(daySchedule.day);
              hasSchedule = true;
            }
          });
        }
      });

      daysOfWeek = Array.from(subjectDays).map(day => dayMap[day]).filter(d => d !== undefined);
    } else if (schedule && schedule.periods && Array.isArray(schedule.periods)) {
      // Old structure: schedule.periods is array with day property
      const subjectDays = new Set();
      schedule.periods.forEach(period => {
        if (period.subject && (period.subject._id === selectedSubject || period.subject === selectedSubject)) {
          subjectDays.add(period.day);
          hasSchedule = true;
        }
      });

      daysOfWeek = Array.from(subjectDays).map(day => dayMap[day]).filter(d => d !== undefined);
    }

    // If no schedule found for this subject, return empty array
    if (!hasSchedule || daysOfWeek.length === 0) {
      return [];
    }

    const dates = [];
    // Generate all dates in the month for those days
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (daysOfWeek.includes(date.getDay())) {
        dates.push(date);
      }
    }

    return dates;
  };

  const handleGradeChange = (studentId, dateStr, value) => {
    // Bayram kunida baho qo'yish mumkin emas
    const holiday = isHoliday(dateStr);
    if (holiday) {
      showToast(`🎉 ${holiday.name} - bayram kunida baho qo'yib bo'lmaydi!`, 'warning');
      return;
    }

    // Validate input
    if (value !== '' && (isNaN(value) || parseFloat(value) < 0 || parseFloat(value) > 5)) {
      return; // Ignore invalid input
    }

    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [dateStr]: value === '' ? null : parseFloat(value)
      }
    }));
  };

  const handleAttendanceToggle = (studentId, dateStr) => {
    // Bayram kunida davomat belgilash mumkin emas
    const holiday = isHoliday(dateStr);
    if (holiday) {
      showToast(`🎉 ${holiday.name} - bayram kunida davomat belgilab bo'lmaydi!`, 'warning');
      return;
    }

    // Davomat sikli: present -> absent -> excused -> present
    const currentStatus = attendance[studentId]?.[dateStr] || 'present';
    let newStatus;
    if (currentStatus === 'present') {
      newStatus = 'absent';
    } else if (currentStatus === 'absent') {
      newStatus = 'excused';
    } else {
      newStatus = 'present';
    }

    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [dateStr]: newStatus
      }
    }));

    // If marking as absent or excused, clear grade
    if (newStatus === 'absent' || newStatus === 'excused') {
      handleGradeChange(studentId, dateStr, 0);
    }
  };

  // Get attendance icon like admin dashboard
  const getAttendanceIcon = (status) => {
    switch (status) {
      case 'absent': return '✗';
      case 'excused': return '◐';
      default: return '✓';
    }
  };

  // Get attendance label
  const getAttendanceLabel = (status) => {
    switch (status) {
      case 'absent': return 'Kelmagan';
      case 'excused': return 'Sababli';
      default: return 'Kelgan';
    }
  };

  const calculateAverage = (studentId) => {
    const studentGrades = grades[studentId] || {};
    const gradeValues = Object.values(studentGrades).filter(g => g !== null && g > 0);

    if (gradeValues.length === 0) return '-';

    const sum = gradeValues.reduce((acc, val) => acc + val, 0);
    return (sum / gradeValues.length).toFixed(1);
  };

  // Calculate subject average as percentage (0-100 scale => percentage)
  const calculateSubjectAvgPercent = () => {
    let total = 0, count = 0;
    Object.values(grades).forEach(sg => {
      Object.values(sg).forEach(g => { if (g !== null && g > 0) { total += g; count++; } });
    });
    return count > 0 ? Math.round(total / count) : 0;
  };

  // Calculate monthly attendance rate
  const calculateAttendanceRate = () => {
    let present = 0, total = 0;
    Object.values(attendance).forEach(sa => {
      Object.values(sa).forEach(st => {
        total++;
        if (st !== 'absent' && st !== 'excused') present++;
      });
    });
    return total > 0 ? Math.round((present / total) * 100) : 100;
  };

  const saveJournal = async () => {
    try {
      setSaving(true);

      const gradePromises = [];
      const attendancePromises = [];

      // Prepare grades for saving
      Object.entries(grades).forEach(([studentId, studentGrades]) => {
        Object.entries(studentGrades).forEach(([dateStr, score]) => {
          if (score !== null && score !== undefined) {
            gradePromises.push(
              api.post('/grades', {
                student: studentId,
                class: selectedClass,
                subject: selectedSubject,
                date: dateStr,
                score: score,
                type: 'daily',
                description: 'Kundalik baho'
              }).catch(err => ({
                error: true,
                message: `Baho saqlashda xatolik (${studentId}, ${dateStr}): ${err.message}`
              }))
            );
          }
        });
      });

      // Prepare attendance for saving
      Object.entries(attendance).forEach(([studentId, studentAttendance]) => {
        Object.entries(studentAttendance).forEach(([dateStr, status]) => {
          if (status) {
            attendancePromises.push(
              api.post('/attendance', {
                student: studentId,
                class: selectedClass,
                subject: selectedSubject,
                date: dateStr,
                status: status,
                period: 1
              }).catch(err => ({
                error: true,
                message: `Davomat saqlashda xatolik (${studentId}, ${dateStr}): ${err.message}`
              }))
            );
          }
        });
      });

      // Save all in parallel
      const results = await Promise.all([...gradePromises, ...attendancePromises]);

      // Check for errors
      const errors = results.filter(r => r && r.error);
      if (errors.length > 0) {
        showToast(`Saqlashda ${errors.length} ta xatolik yuz berdi. Ba'zi ma'lumotlar saqlanmagan bo'lishi mumkin.`, 'error');
      } else {
        showToast('Jurnal muvaffaqiyatli saqlandi!', 'success');
        // Refresh data after successful save
        await fetchJournalData();
      }

    } catch (error) {
      showToast('Saqlashda xatolik yuz berdi: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const handleTodayWeek = () => {
    setCurrentWeekStart(getWeekStart());
  };

  const formatWeekRange = () => {
    const weekStart = new Date(currentWeekStart);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const formatDate = (date) => {
      return `${date.getDate()} ${months[date.getMonth()]}`;
    };

    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}, ${weekStart.getFullYear()}`;
  };

  const selectedClassData = classes.find(c => c._id === selectedClass);

  // Toast type class mapping
  const getToastClass = (type) => {
    const typeMap = {
      'warning': styles.toastWarning,
      'success': styles.toastSuccess,
      'error': styles.toastError,
      'info': styles.toastInfo
    };
    return typeMap[type] || styles.toastInfo;
  };

  if (loading && !selectedClass) {
    return (
      <div className={styles.classJournal}>
        <div className={styles.loadingMessage}>Yuklanmoqda...</div>
      </div>
    );
  }

  if (!loading && classes.length === 0) {
    return (
      <div className={styles.classJournal}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>📖 Sinf Jurnali</h1>
        </div>
        <div className={styles.noDataMessage}>
          <p>❌ Sizga biriktirilgan sinflar topilmadi.</p>
          <p>Iltimos, administrator bilan bog'laning.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.classJournal}>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`${styles.toastNotification} ${getToastClass(toast.type)}`}>
          <div className={styles.toastIcon}>
            {toast.type === 'success' && '✓'}
            {toast.type === 'warning' && '⚠'}
            {toast.type === 'error' && '✗'}
            {toast.type === 'info' && 'ℹ'}
          </div>
          <div className={styles.toastMessage}>{toast.message}</div>
          <button className={styles.toastClose} onClick={() => setToast({ ...toast, show: false })}>
            ×
          </button>
        </div>
      )}

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>📖 Sinf Jurnali</h1>
        <p className={styles.pageSubtitle}>Jami {classes.length} ta sinf mavjud</p>

        {/* View Type Toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleBtn} ${viewType === 'day' ? styles.viewToggleBtnActive : ''}`}
            onClick={() => setViewType('day')}
          >
            📋 Kunlik
          </button>
          <button
            className={`${styles.viewToggleBtn} ${viewType === 'week' ? styles.viewToggleBtnActive : ''}`}
            onClick={() => setViewType('week')}
          >
            📅 Haftalik
          </button>
          <button
            className={`${styles.viewToggleBtn} ${viewType === 'month' ? styles.viewToggleBtnActive : ''}`}
            onClick={() => setViewType('month')}
          >
            📆 Oylik
          </button>
        </div>

        <div className={styles.journalControls}>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className={styles.controlSelect}
            disabled={loading}
          >
            <option value="">Sinf tanlang ({classes.length} ta)</option>
            {classes.map(cls => (
              <option key={cls._id} value={cls._id}>
                {cls.name} {cls.students?.length > 0 ? `(${cls.students.length} o'quvchi)` : ''}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className={styles.controlSelect}
            disabled={loading || !selectedClass}
          >
            <option value="">Fan tanlang</option>
            {subjects.map((subj, idx) => (
              <option key={`${subj.subject?._id}-${idx}`} value={subj.subject?._id}>
                {subj.subject?.name}{subj.isSubstitution ? " (O'rinbosar)" : ''}
              </option>
            ))}
          </select>

          {viewType === 'day' ? (
            <div className={styles.weekNavigation}>
              <button className={styles.weekNavBtn} onClick={() => { const d = new Date(selectedDay); d.setDate(d.getDate() - 1); setSelectedDay(d); }} title="Oldingi kun">
                ◀ Oldingi
              </button>
              <button className={`${styles.weekNavBtn} ${styles.todayBtn}`} onClick={() => setSelectedDay(new Date())} title="Bugun">
                📍 Bugun
              </button>
              <button className={styles.weekNavBtn} onClick={() => { const d = new Date(selectedDay); d.setDate(d.getDate() + 1); setSelectedDay(d); }} title="Keyingi kun">
                Keyingi ▶
              </button>
              <div className={styles.weekDisplay}>
                {selectedDay.getDate()} {months[selectedDay.getMonth()]} {selectedDay.getFullYear()}
              </div>
            </div>
          ) : viewType === 'month' ? (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className={styles.controlSelect}
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className={styles.controlSelect}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </>
          ) : (
            <div className={styles.weekNavigation}>
              <button className={styles.weekNavBtn} onClick={handlePreviousWeek} title="Oldingi hafta">
                ◀ Oldingi
              </button>
              <button className={`${styles.weekNavBtn} ${styles.todayBtn}`} onClick={handleTodayWeek} title="Bugun">
                📍 Bugun
              </button>
              <button className={styles.weekNavBtn} onClick={handleNextWeek} title="Keyingi hafta">
                Keyingi ▶
              </button>
              <div className={styles.weekDisplay}>
                {formatWeekRange()}
              </div>
            </div>
          )}
        </div>
      </div>

      {!selectedClass || !selectedSubject ? (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>Jurnal ochish</h3>
          <p className={styles.emptyText}>Sinf va fanni tanlang</p>
        </div>
      ) : lessonDates.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.trashAnimation}>
            <div className={styles.paperFalling}>📄</div>
            <div className={styles.trashBin}>🗑️</div>
          </div>
          <h3 className={styles.emptyTitle}>Darslar topilmadi</h3>
          <p className={styles.emptyText}>
            {viewType === 'day'
              ? `Bu fan uchun ${selectedDay.getDate()} ${months[selectedDay.getMonth()]} kuni dars jadvali mavjud emas.`
              : viewType === 'week'
                ? `Bu fan uchun ${formatWeekRange()} davomida dars jadvali mavjud emas.`
                : `Bu fan uchun ${months[selectedMonth]} ${selectedYear} oyida dars jadvali mavjud emas.`
            }
          </p>
          <p className={styles.emptyHint}>
            Administrator bilan bog'lanib, sinf jadvalini to'ldiring yoki boshqa {viewType === 'week' ? 'hafta' : 'oy'} tanlang.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.journalInfo}>
            <div className={styles.infoBadge}>
              <strong>{selectedClassData?.name}</strong>
              <span>{subjects.find(s => s.subject?._id === selectedSubject)?.subject?.name}</span>
              <span>{viewType === 'day' ? `${selectedDay.getDate()} ${months[selectedDay.getMonth()]}` : viewType === 'week' ? formatWeekRange() : `${months[selectedMonth]} ${selectedYear}`}</span>
              <span className={styles.infoStat} style={{ background: '#ccfbf1', color: '#115e59' }}>📊 O'rtacha: {calculateSubjectAvgPercent()}%</span>
              <span className={styles.infoStat} style={{ background: '#d1fae5', color: '#065f46' }}>📋 Davomat: {calculateAttendanceRate()}%</span>
            </div>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={saveJournal}
              disabled={saving}
            >
              {saving ? '⏳ Saqlanmoqda...' : '💾 Saqlash'}
            </button>
          </div>

          {viewType === 'day' ? (
            /* ===== DAILY VIEW: Mobile-friendly vertical cards ===== */
            <div className={styles.dailyView}>
              {students.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>⚠️ Bu sinfda hali o'quvchilar ro'yxatga olinmagan</p>
                </div>
              ) : students.map((student, index) => {
                const dateStr = selectedDay.toISOString().split('T')[0];
                const attStatus = attendance[student._id]?.[dateStr] || 'present';
                const isDisabled = attStatus === 'absent' || attStatus === 'excused';
                const grade = grades[student._id]?.[dateStr];
                const holidayInfo = isHoliday(dateStr);
                return (
                  <div key={student._id} className={`${styles.dailyCard} ${attStatus === 'absent' ? styles.dailyCardAbsent : attStatus === 'excused' ? styles.dailyCardExcused : ''}`}>
                    <div className={styles.dailyCardHeader}>
                      <span className={styles.dailyNum}>{index + 1}</span>
                      <span className={styles.dailyName}>{student.lastName} {student.firstName}</span>
                      <span className={styles.dailyAvg}>{calculateAverage(student._id)}</span>
                    </div>
                    {holidayInfo ? (
                      <div className={styles.dailyHoliday}>🎉 {holidayInfo.name}</div>
                    ) : (
                      <div className={styles.dailyCardBody}>
                        <div className={styles.dailyGradeWrap}>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            inputMode="numeric"
                            className={`${styles.dailyGradeInput} ${isDisabled ? styles.gradeInputAbsent : ''}`}
                            value={grade || ''}
                            onChange={(e) => handleGradeChange(student._id, dateStr, e.target.value)}
                            placeholder={isDisabled ? (attStatus === 'excused' ? 'Sababli' : 'н/к') : 'Baho'}
                            disabled={isDisabled}
                          />
                        </div>
                        <button
                          className={`${styles.dailyAttBtn} ${attStatus === 'absent' ? styles.dailyAttAbsent : attStatus === 'excused' ? styles.dailyAttExcused : styles.dailyAttPresent}`}
                          onClick={() => handleAttendanceToggle(student._id, dateStr)}
                        >
                          {getAttendanceIcon(attStatus)} {getAttendanceLabel(attStatus)}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ===== TABLE VIEW: Week / Month ===== */
            <div className={styles.journalTableContainer}>
              <table className={styles.journalTable}>
                <thead>
                  <tr>
                    <th className={styles.thNumber}>№</th>
                    <th className={styles.thStudent}>Familiya Ism</th>
                    {lessonDates.map((date, index) => {
                      const dateStr = date.toISOString().split('T')[0];
                      const holidayInfo = isHoliday(dateStr);
                      return (
                        <th key={index} className={`${styles.thDate} ${holidayInfo ? styles.holidayHeader : ''}`} title={holidayInfo ? holidayInfo.name : ''}>
                          {date.getDate()}.{String(date.getMonth() + 1).padStart(2, '0')}
                          {holidayInfo && <span className={styles.holidayIconSmall}>🎉</span>}
                        </th>
                      );
                    })}
                    <th className={styles.thAverage}>O'rtacha</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={lessonDates.length + 3} style={{ textAlign: 'center', padding: '1.5rem' }}>
                        ⚠️ Bu sinfda hali o'quvchilar ro'yxatga olinmagan
                        <br />
                        <small>Administrator bilan bog'lanib, o'quvchilarni qo'shing</small>
                      </td>
                    </tr>
                  ) : (
                    students.map((student, index) => (
                      <tr key={student._id}>
                        <td className={styles.tdNumber}>{index + 1}</td>
                        <td className={styles.tdStudent}>
                          {student.lastName} {student.firstName}
                        </td>
                        {lessonDates.map((date, dateIndex) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const attStatus = attendance[student._id]?.[dateStr] || 'present';
                          const isDisabled = attStatus === 'absent' || attStatus === 'excused';
                          const grade = grades[student._id]?.[dateStr];
                          const holidayInfo = isHoliday(dateStr);

                          return (
                            <td key={dateIndex} className={`${styles.tdGrade} ${holidayInfo ? styles.holidayCell : ''}`}>
                              {holidayInfo ? (
                                <div className={styles.holidayMarker} title={holidayInfo.name}>
                                  🎉
                                </div>
                              ) : (
                                <div className={styles.gradeWrapper}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    className={`${styles.gradeInput} ${isDisabled ? styles.gradeInputAbsent : ''}`}
                                    value={grade || ''}
                                    onChange={(e) => handleGradeChange(student._id, dateStr, e.target.value)}
                                    placeholder={isDisabled ? (attStatus === 'excused' ? '◐' : 'н/к') : ''}
                                    disabled={isDisabled}
                                  />
                                  <button
                                    className={`${styles.btnAttendance} ${attStatus === 'absent' ? styles.btnAttendanceAbsent : attStatus === 'excused' ? styles.btnAttendanceExcused : styles.btnAttendancePresent}`}
                                    onClick={() => handleAttendanceToggle(student._id, dateStr)}
                                    title={getAttendanceLabel(attStatus)}
                                  >
                                    {getAttendanceIcon(attStatus)}
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className={styles.tdAverage}>
                          {calculateAverage(student._id)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.journalLegend}>
            <div className={styles.legendSection}>
              <h4 className={styles.legendSectionTitle}>Davomat belgilari:</h4>
              <div className={styles.legendItems}>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendIcon} ${styles.legendIconPresent}`}>✓</span>
                  <span>Kelgan</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendIcon} ${styles.legendIconAbsent}`}>✗</span>
                  <span>Kelmagan</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendIcon} ${styles.legendIconExcused}`}>◐</span>
                  <span>Sababli</span>
                </div>
              </div>
            </div>
            <div className={styles.legendSection}>
              <h4 className={styles.legendSectionTitle}>Baholash:</h4>
              <div className={styles.legendItems}>
                <div className={styles.legendItem}>
                  <span className={styles.legendBadge}>0-5</span>
                  <span>Ball</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendBadgeSecondary}>н/к</span>
                  <span>Не келди (kelmagan)</span>
                </div>
              </div>
            </div>
            <div className={styles.legendNote}>
              <span className={styles.noteIcon}>ℹ️</span>
              <span className={styles.noteText}>Faqat dars bo'lgan kunlar ko'rsatiladi. O'quvchi kelmaganda avtomatik "н/к" ko'rinadi.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClassJournal;
