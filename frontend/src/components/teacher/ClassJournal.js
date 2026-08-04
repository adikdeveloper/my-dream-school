import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/authService';
import apiService from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import styles from './ClassJournal.module.css';

const JournalIcon = ({ name, size = 18 }) => {
  const paths = {
    book: <><path d="M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3Z" /><path d="M4 5v17M8 6h8M8 10h6" /></>,
    day: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    left: <path d="m15 18-6-6 6-6" />,
    right: <path d="m9 18 6-6-6-6" />,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    attendance: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m17 11 2 2 4-5" /></>,
    save: <><path d="M5 3h12l3 3v15H4V3Z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    warning: <><path d="M12 3 2 21h20Z" /><path d="M12 9v5M12 17h.01" /></>,
    holiday: <><path d="M4 21h16M6 17h12M8 13h8M12 3v10M9 6h6" /></>,
    empty: <><path d="M4 7h16v13H4zM8 3h8l2 4H6Z" /><path d="M9 13h6" /></>
  };
  return (
    <svg className={styles.uiIcon} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.info}
    </svg>
  );
};

// Jurnal sanalarini UTC ga aylantirmasdan lokal YYYY-MM-DD ko'rinishida beradi.
// Aks holda UTC+5 da tanlangan sana backendga bir kun oldin bo'lib ketadi.
const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [dirtyGrades, setDirtyGrades] = useState({});
  const [dirtyAttendance, setDirtyAttendance] = useState({});
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

  const isBeforeStudentRegistration = (student, dateStr) => {
    if (!student?.registrationDate) return false;
    const lessonDate = new Date(`${dateStr}T00:00:00`);
    const registrationDate = new Date(student.registrationDate);
    registrationDate.setHours(0, 0, 0, 0);
    return lessonDate < registrationDate;
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      // Barcha sinflarni emas, faqat shu o'qituvchiga tegishli sinflarni olamiz.
      const response = await api.get('/classes/teacher/my-classes');

      // Endpoint array qaytaradi; eski format bilan ham moslikni saqlaymiz.
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

      const selectedClassInfo = classes.find(item => String(item._id) === String(selectedClass));
      const teacherSubjects = (selectedClassInfo?.scheduleSubjects || []).map(subject => ({ subject, teacher: { _id: user?._id }, fromSchedule: true }));

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

      // Tanlangan ko'rinishga tegishli (jumladan tarixiy) jadvalni olamiz.
      let startDate, endDate, dates;

      if (viewType === 'day') {
        // Daily view: single day
        const dayStart = new Date(selectedDay);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDay);
        dayEnd.setHours(23, 59, 59, 999);

        startDate = dayStart.toISOString();
        endDate = dayEnd.toISOString();

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
      } else {
        // Monthly view
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

        startDate = monthStart.toISOString();
        endDate = monthEnd.toISOString();

        // Generate lesson dates based on schedule
      }

      const contextResponse = await api.get('/classes/teacher/journal-context', { params: { classId: selectedClass, startDate, endDate } });
      const schedules = contextResponse.data?.schedules || [];
      const rangeSubstitutions = contextResponse.data?.substitutions || [];
      setStudents(contextResponse.data?.class?.students || []);
      if (viewType === 'day') {
        const dayStart = new Date(selectedDay); dayStart.setHours(0, 0, 0, 0);
        dates = generateLessonDatesForWeek(schedules, dayStart, rangeSubstitutions).filter(date => toLocalDateKey(date) === toLocalDateKey(dayStart));
      } else if (viewType === 'week') {
        dates = generateLessonDatesForWeek(schedules, currentWeekStart, rangeSubstitutions);
      } else {
        dates = generateLessonDates(schedules, selectedMonth, selectedYear, rangeSubstitutions);
      }
      setLessonDates(dates);

      // Baholarni backend ruxsat bergan limitda sahifalab to'liq yuklaymiz.
      // Bu katta sinf/oylarda ham ma'lumot kesilib qolmasligini ta'minlaydi.
      const fetchAllGrades = async () => {
        const allGrades = [];
        let page = 1;
        let totalPages = 1;

        do {
          const response = await api.get(
            `/grades?classId=${selectedClass}&subjectId=${selectedSubject}&startDate=${startDate}&endDate=${endDate}&limit=100&page=${page}`
          );
          const pageGrades = response.data?.grades || response.data || [];
          if (Array.isArray(pageGrades)) allGrades.push(...pageGrades);
          totalPages = Number(response.data?.pagination?.totalPages) || 1;
          page += 1;
        } while (page <= totalPages);

        return allGrades;
      };

      // Fetch grades and attendance in parallel for better performance
      const [gradesArray, attendanceResponse] = await Promise.all([
        fetchAllGrades(),
        api.get(`/attendance?classId=${selectedClass}&subjectId=${selectedSubject}&startDate=${startDate}&endDate=${endDate}`)
      ]);

      // Process grades data
      const gradesData = {};
      const gradeUpdateTimes = {};

      if (Array.isArray(gradesArray)) {
        gradesArray.forEach(record => {
          const recordDate = new Date(record.date).toISOString().split('T')[0];
          const studentId = record.student._id || record.student;
          const gradeKey = `${studentId}|${recordDate}`;
          const updateTime = new Date(record.updatedAt || record.createdAt || record.date).getTime();
          if (!gradesData[studentId]) {
            gradesData[studentId] = {};
          }
          // Bir kun uchun eski dublikatlar bo'lsa, faqat eng oxirgi
          // yangilangan bahoni katakka chiqaramiz.
          if (gradeUpdateTimes[gradeKey] === undefined || updateTime >= gradeUpdateTimes[gradeKey]) {
            gradesData[studentId][recordDate] = record.score;
            gradeUpdateTimes[gradeKey] = updateTime;
          }
        });
      }
      setGrades(gradesData);
      setDirtyGrades({});

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
      setDirtyAttendance({});

    } catch (error) {
      // If schedule endpoint is not found, show user-friendly message
      if (error.response?.status === 404 || error.response?.data?.message?.includes('topilmadi')) {
        setLessonDates([]);
        showToast('Bu sinf uchun dars jadvali topilmadi. Jurnal ishlatish uchun avval admin tomonidan sinf jadvali yaratilishi kerak.', 'warning');
      } else {
        showToast('Jurnal ma\'lumotlarini yuklashda xatolik: ' + (error.response?.data?.message || error.message), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const hasLessonOnDate = (schedules, date, substitutions = []) => {
    const dayMap = {
      'Dushanba': 1, 'Seshanba': 2, 'Chorshanba': 3, 'Payshanba': 4, 'Juma': 5, 'Shanba': 6,
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    const day = new Date(date); day.setHours(12, 0, 0, 0);
    const substitutionMatch = substitutions.some(item => toLocalDateKey(new Date(item.date)) === toLocalDateKey(day) && String(item.subject?._id || item.subject) === String(selectedSubject));
    return substitutionMatch || (schedules || []).some(item => {
      const start = new Date(item.startDate); start.setHours(0, 0, 0, 0);
      const end = new Date(item.endDate); end.setHours(23, 59, 59, 999);
      if (day < start || day > end) return false;
      return (item.schedule || []).some(daySchedule => dayMap[daySchedule.day] === day.getDay() && (daySchedule.periods || []).some(period => String(period.teacher?._id || period.teacher) === String(user?._id) && String(period.subject?._id || period.subject) === String(selectedSubject)));
    });
  };

  const generateLessonDatesForWeek = (schedules, weekStart, substitutions = []) => {

    // Generate dates for the week (7 days from weekStart)
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = toLocalDateKey(date);
      if (hasLessonOnDate(schedules, date, substitutions) && !isHoliday(dateStr)) {
        dates.push(date);
      }
    }

    return dates;
  };

  const generateLessonDates = (schedules, month, year, substitutions = []) => {
    const dates = [];

    // Generate all dates in the month for those days
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (hasLessonOnDate(schedules, date, substitutions) && !isHoliday(dateStr)) {
        dates.push(date);
      }
    }

    return dates;
  };

  const handleGradeChange = (studentId, dateStr, value) => {
    const student = students.find(item => item._id === studentId);
    if (isBeforeStudentRegistration(student, dateStr)) {
      showToast("O'quvchining maktabga kelgan sanasidan oldingi darsga baho qo'yib bo'lmaydi", 'warning');
      return;
    }

    // Bayram kunida baho qo'yish mumkin emas
    const holiday = isHoliday(dateStr);
    if (holiday) {
      showToast(`${holiday.name} — bayram kunida baho qo'yib bo'lmaydi!`, 'warning');
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
    setDirtyGrades(prev => ({ ...prev, [`${studentId}|${dateStr}`]: true }));
  };

  const handleGradeKeyDown = (event, rowIndex, columnIndex) => {
    const directions = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1]
    };
    const direction = directions[event.key];
    if (!direction) return;

    event.preventDefault();
    let targetRow = rowIndex + direction[0];
    let targetColumn = columnIndex + direction[1];
    const maxColumn = viewType === 'day' ? 0 : lessonDates.length - 1;

    while (targetRow >= 0 && targetRow < students.length && targetColumn >= 0 && targetColumn <= maxColumn) {
      const target = document.querySelector(
        `[data-grade-row="${targetRow}"][data-grade-column="${targetColumn}"]`
      );
      if (target && !target.disabled) {
        target.focus();
        target.select();
        return;
      }
      targetRow += direction[0];
      targetColumn += direction[1];
    }
  };

  const handleAttendanceToggle = (studentId, dateStr) => {
    const student = students.find(item => item._id === studentId);
    if (isBeforeStudentRegistration(student, dateStr)) {
      showToast("O'quvchi hali maktabga kelmagan sana uchun davomat belgilab bo'lmaydi", 'warning');
      return;
    }

    // Bayram kunida davomat belgilash mumkin emas
    const holiday = isHoliday(dateStr);
    if (holiday) {
      showToast(`${holiday.name} — bayram kunida davomat belgilab bo'lmaydi!`, 'warning');
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
    setDirtyAttendance(prev => ({ ...prev, [`${studentId}|${dateStr}`]: true }));

    // If marking as absent or excused, clear grade
    if (newStatus === 'absent' || newStatus === 'excused') {
      setGrades(prev => ({ ...prev, [studentId]: { ...prev[studentId], [dateStr]: null } }));
      setDirtyGrades(prev => ({ ...prev, [`${studentId}|${dateStr}`]: true }));
    }
  };

  // Get attendance icon like admin dashboard
  const getAttendanceIcon = (status) => {
    switch (status) {
      case 'absent': return <JournalIcon name="close" size={14} />;
      case 'excused': return <JournalIcon name="clock" size={14} />;
      default: return <JournalIcon name="check" size={14} />;
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

      // Faqat o'qituvchi o'zgartirgan baholarni saqlaymiz.
      Object.keys(dirtyGrades).forEach(key => {
        const [studentId, dateStr] = key.split('|');
        const score = grades[studentId]?.[dateStr];
        const student = students.find(item => item._id === studentId);
        if (!isBeforeStudentRegistration(student, dateStr)) {
          gradePromises.push(
            (score === null || score === undefined || score === ''
              ? api.delete('/grades', { params: { studentId, classId: selectedClass, subjectId: selectedSubject, date: dateStr } })
              : api.post('/grades', { student: studentId, class: selectedClass, subject: selectedSubject, date: dateStr, score, type: 'daily', description: 'Kundalik baho' })
            ).catch(err => ({
              error: true,
              message: err.response?.data?.error || err.response?.data?.message || `Baho saqlashda xatolik (${studentId}, ${dateStr}): ${err.message}`
            }))
          );
        }
      });

      // Prepare attendance for saving
      Object.keys(dirtyAttendance).forEach(key => {
        const [studentId, dateStr] = key.split('|');
        const status = attendance[studentId]?.[dateStr];
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
              message: err.response?.data?.error || err.response?.data?.message || `Davomat saqlashda xatolik (${studentId}, ${dateStr}): ${err.message}`
            }))
          );
        }
      });

      if (gradePromises.length === 0 && attendancePromises.length === 0) {
        showToast("Saqlash uchun o'zgartirilgan ma'lumot yo'q", 'info');
        return;
      }

      const attendanceResults = await Promise.all(attendancePromises);
      const attendanceErrors = attendanceResults.filter(r => r && r.error);
      const gradeResults = attendanceErrors.length ? [] : await Promise.all(gradePromises);
      const results = [...attendanceResults, ...gradeResults];

      // Check for errors
      const errors = results.filter(r => r && r.error);
      if (errors.length > 0) {
        showToast(`Saqlashda ${errors.length} ta xatolik: ${errors[0].message}`, 'error');
      } else {
        setDirtyGrades({});
        setDirtyAttendance({});
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
          <h1 className={styles.pageTitle}><JournalIcon name="book" size={24} /> Sinf jurnali</h1>
        </div>
        <div className={styles.noDataMessage}>
          <p>Sizga biriktirilgan sinflar topilmadi.</p>
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
            {toast.type === 'success' && <JournalIcon name="check" />}
            {toast.type === 'warning' && <JournalIcon name="warning" />}
            {toast.type === 'error' && <JournalIcon name="close" />}
            {toast.type === 'info' && <JournalIcon name="info" />}
          </div>
          <div className={styles.toastMessage}>{toast.message}</div>
          <button className={styles.toastClose} onClick={() => setToast({ ...toast, show: false })}>
            <JournalIcon name="close" size={16} />
          </button>
        </div>
      )}

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><JournalIcon name="book" size={24} /> Sinf jurnali</h1>
        <p className={styles.pageSubtitle}>Jami {classes.length} ta sinf mavjud</p>

        {/* View Type Toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleBtn} ${viewType === 'day' ? styles.viewToggleBtnActive : ''}`}
            onClick={() => setViewType('day')}
          >
            <JournalIcon name="day" size={16} /> Kunlik
          </button>
          <button
            className={`${styles.viewToggleBtn} ${viewType === 'week' ? styles.viewToggleBtnActive : ''}`}
            onClick={() => setViewType('week')}
          >
            <JournalIcon name="calendar" size={16} /> Haftalik
          </button>
          <button
            className={`${styles.viewToggleBtn} ${viewType === 'month' ? styles.viewToggleBtnActive : ''}`}
            onClick={() => setViewType('month')}
          >
            <JournalIcon name="calendar" size={16} /> Oylik
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
                <JournalIcon name="left" size={16} /> Oldingi
              </button>
              <button className={`${styles.weekNavBtn} ${styles.todayBtn}`} onClick={() => setSelectedDay(new Date())} title="Bugun">
                <JournalIcon name="pin" size={15} /> Bugun
              </button>
              <button className={styles.weekNavBtn} onClick={() => { const d = new Date(selectedDay); d.setDate(d.getDate() + 1); setSelectedDay(d); }} title="Keyingi kun">
                Keyingi <JournalIcon name="right" size={16} />
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
                <JournalIcon name="left" size={16} /> Oldingi
              </button>
              <button className={`${styles.weekNavBtn} ${styles.todayBtn}`} onClick={handleTodayWeek} title="Bugun">
                <JournalIcon name="pin" size={15} /> Bugun
              </button>
              <button className={styles.weekNavBtn} onClick={handleNextWeek} title="Keyingi hafta">
                Keyingi <JournalIcon name="right" size={16} />
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
          <div className={styles.emptyIcon}><JournalIcon name="empty" size={28} /></div>
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
              <span className={styles.infoStat}><JournalIcon name="chart" size={15} /> O'rtacha: {calculateSubjectAvgPercent()}%</span>
              <span className={styles.infoStat}><JournalIcon name="attendance" size={15} /> Davomat: {calculateAttendanceRate()}%</span>
            </div>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={saveJournal}
              disabled={saving}
            >
              <JournalIcon name={saving ? 'clock' : 'save'} size={17} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>

          {viewType === 'day' ? (
            /* ===== DAILY VIEW: Mobile-friendly vertical cards ===== */
            <div className={styles.dailyView}>
              {students.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Bu sinfda hali o'quvchilar ro'yxatga olinmagan</p>
                </div>
              ) : students.map((student, index) => {
                const dateStr = toLocalDateKey(selectedDay);
                const attStatus = attendance[student._id]?.[dateStr] || 'present';
                const isDisabled = attStatus === 'absent' || attStatus === 'excused';
                const grade = grades[student._id]?.[dateStr];
                const hasGrade = grade !== null && grade !== undefined && grade !== '';
                const holidayInfo = isHoliday(dateStr);
                const beforeRegistration = isBeforeStudentRegistration(student, dateStr);
                return (
                  <div key={student._id} className={`${styles.dailyCard} ${attStatus === 'absent' ? styles.dailyCardAbsent : attStatus === 'excused' ? styles.dailyCardExcused : ''}`}>
                    <div className={styles.dailyCardHeader}>
                      <span className={styles.dailyNum}>{index + 1}</span>
                      <span className={styles.dailyName}>{student.lastName} {student.firstName}</span>
                      <span className={styles.dailyAvg}>{calculateAverage(student._id)}</span>
                    </div>
                    {holidayInfo ? (
                      <div className={styles.dailyHoliday}><JournalIcon name="holiday" size={18} /> {holidayInfo.name}</div>
                    ) : (
                      <div className={styles.dailyCardBody}>
                        <div className={styles.dailyGradeWrap}>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            inputMode="numeric"
                            className={`${styles.dailyGradeInput} ${isDisabled || beforeRegistration ? styles.gradeInputAbsent : hasGrade ? styles.gradedInput : styles.ungradedInput}`}
                            value={grade || ''}
                            onChange={(e) => handleGradeChange(student._id, dateStr, e.target.value)}
                            onKeyDown={(e) => handleGradeKeyDown(e, index, 0)}
                            data-grade-row={index}
                            data-grade-column={0}
                            placeholder={beforeRegistration ? 'Hali kelmagan' : isDisabled ? '' : 'Baho'}
                            disabled={isDisabled || beforeRegistration}
                          />
                        </div>
                        <button
                          className={`${styles.dailyAttBtn} ${attStatus === 'absent' ? styles.dailyAttAbsent : attStatus === 'excused' ? styles.dailyAttExcused : styles.dailyAttPresent}`}
                          onClick={() => handleAttendanceToggle(student._id, dateStr)}
                          disabled={beforeRegistration}
                          title={beforeRegistration ? "O'quvchi bu sanada hali maktabga kelmagan" : getAttendanceLabel(attStatus)}
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
                    <th className={styles.thStudent}>Ism familiya</th>
                    {lessonDates.map((date, index) => {
                      const dateStr = toLocalDateKey(date);
                      const holidayInfo = isHoliday(dateStr);
                      return (
                        <th key={index} className={`${styles.thDate} ${holidayInfo ? styles.holidayHeader : ''}`} title={holidayInfo ? holidayInfo.name : ''}>
                          {date.getDate()}.{String(date.getMonth() + 1).padStart(2, '0')}
                          {holidayInfo && <span className={styles.holidayIconSmall}><JournalIcon name="holiday" size={13} /></span>}
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
                        Bu sinfda hali o'quvchilar ro'yxatga olinmagan
                        <br />
                        <small>Administrator bilan bog'lanib, o'quvchilarni qo'shing</small>
                      </td>
                    </tr>
                  ) : (
                    students.map((student, index) => (
                      <tr key={student._id}>
                        <td className={styles.tdNumber}>{index + 1}</td>
                        <td className={styles.tdStudent}>
                          {student.firstName} {student.lastName}
                        </td>
                        {lessonDates.map((date, dateIndex) => {
                          const dateStr = toLocalDateKey(date);
                          const attStatus = attendance[student._id]?.[dateStr] || 'present';
                          const isDisabled = attStatus === 'absent' || attStatus === 'excused';
                          const grade = grades[student._id]?.[dateStr];
                          const hasGrade = grade !== null && grade !== undefined && grade !== '';
                          const holidayInfo = isHoliday(dateStr);
                          const beforeRegistration = isBeforeStudentRegistration(student, dateStr);

                          return (
                            <td key={dateIndex} className={`${styles.tdGrade} ${holidayInfo ? styles.holidayCell : beforeRegistration || isDisabled ? styles.blockedGradeCell : hasGrade ? styles.gradedCell : styles.ungradedCell}`}>
                              {holidayInfo ? (
                                <div className={styles.holidayMarker} title={holidayInfo.name}>
                                  <JournalIcon name="holiday" size={17} />
                                </div>
                              ) : (
                                <div className={styles.gradeWrapper}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    className={`${styles.gradeInput} ${isDisabled ? styles.gradeInputAbsent : hasGrade ? styles.gradedInput : styles.ungradedInput}`}
                                    value={grade || ''}
                                    onChange={(e) => handleGradeChange(student._id, dateStr, e.target.value)}
                                    onKeyDown={(e) => handleGradeKeyDown(e, index, dateIndex)}
                                    data-grade-row={index}
                                    data-grade-column={dateIndex}
                                    placeholder={beforeRegistration || isDisabled ? '—' : ''}
                                    disabled={isDisabled || beforeRegistration}
                                    title={beforeRegistration ? "O'quvchi bu sanada hali maktabga kelmagan" : ''}
                                  />
                                  <button
                                    className={`${styles.btnAttendance} ${attStatus === 'absent' ? styles.btnAttendanceAbsent : attStatus === 'excused' ? styles.btnAttendanceExcused : styles.btnAttendancePresent}`}
                                    onClick={() => handleAttendanceToggle(student._id, dateStr)}
                                    disabled={beforeRegistration}
                                    title={beforeRegistration ? "O'quvchi bu sanada hali maktabga kelmagan" : getAttendanceLabel(attStatus)}
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
                  <span className={`${styles.legendIcon} ${styles.legendIconPresent}`}><JournalIcon name="check" size={12} /></span>
                  <span>Kelgan</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendIcon} ${styles.legendIconAbsent}`}><JournalIcon name="close" size={12} /></span>
                  <span>Kelmagan</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendIcon} ${styles.legendIconExcused}`}><JournalIcon name="clock" size={12} /></span>
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
              </div>
            </div>
            <div className={styles.legendNote}>
              <span className={styles.noteIcon}><JournalIcon name="info" size={17} /></span>
              <span className={styles.noteText}>Yashil katak — baho qo'yilgan. Sariq katak — hali baho qo'yilmagan. Kelmagan yoki sababli bo'lsa baho katagi bloklanadi.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClassJournal;
