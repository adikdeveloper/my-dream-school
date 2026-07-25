import React, { useState, useEffect } from 'react';
import { api } from '../../services/authService';
import apiService from '../../services/apiService';
import './AdminClassJournal.css';

const AdminClassJournal = () => {
  // Asosiy state'lar
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [holidays, setHolidays] = useState([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Dars jadvallari uchun state'lar
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [noScheduleExists, setNoScheduleExists] = useState(false);

  // Jurnal ma'lumotlari
  const [students, setStudents] = useState([]);
  const [lessonDays, setLessonDays] = useState([]);
  const [grades, setGrades] = useState({});
  const [attendance, setAttendance] = useState({});
  const [examGrades, setExamGrades] = useState({}); // Imtihon baholari

  // Loading va xato holatlari
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // O'zgarishlarni kuzatish
  const [hasChanges, setHasChanges] = useState(false);

  // Toast notification
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // Toast ko'rsatish funksiyasi
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, 3000);
  };

  // Oylar ro'yxati
  const months = [
    { value: 9, label: 'Sentyabr' },
    { value: 10, label: 'Oktyabr' },
    { value: 11, label: 'Noyabr' },
    { value: 12, label: 'Dekabr' },
    { value: 1, label: 'Yanvar' },
    { value: 2, label: 'Fevral' },
    { value: 3, label: 'Mart' },
    { value: 4, label: 'Aprel' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Iyun' }
  ];

  // Sinflarni yuklash
  useEffect(() => {
    loadClasses();
  }, []);

  // Jadvallarni yuklash (sinf va oy tanlanganida)
  useEffect(() => {
    if (selectedClass) {
      loadSchedulesForPeriod();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedMonth, selectedYear]);

  // Fanlari yuklash (jadval tanlanganida)
  useEffect(() => {
    if (selectedClass && selectedSchedule) {
      loadSubjectsFromSchedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchedule, selectedClass]);

  // Jurnal yukash (barcha tanlovlar bajarilganida)
  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTeacher) {
      loadJournal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSubject, selectedTeacher, selectedMonth, selectedYear]);

  // Bayram kunlarini yuklash
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const startDate = new Date(selectedYear, selectedMonth - 1, 1);
        const endDate = new Date(selectedYear, selectedMonth, 0);
        const response = await apiService.getHolidaysInRange(
          startDate.toISOString(),
          endDate.toISOString()
        );
        setHolidays(response || []);
      } catch (err) {
      }
    };
    fetchHolidays();
  }, [selectedMonth, selectedYear]);

  // Bayram kunini tekshirish
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

  const loadClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.classes || []);
    } catch (err) {
      setError('Sinflarni yuklashda xatolik yuz berdi');
    }
  };

  // Tanlangan oy uchun mavjud jadvallarni yuklash
  const loadSchedulesForPeriod = async () => {
    setSchedulesLoading(true);
    setNoScheduleExists(false);
    setAvailableSchedules([]);
    setSelectedSchedule('');
    setSubjects([]);
    setSelectedSubject('');
    setSelectedTeacher('');
    setTeachers([]);

    try {
      const res = await api.get(`/schedule/class/${selectedClass}`);

      if (res.data && res.data.length > 0) {
        // Tanlangan oyga mos jadvallarni filtrlash
        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth, 0);

        const relevantSchedules = res.data.filter(schedule => {
          const scheduleStart = new Date(schedule.startDate);
          const scheduleEnd = schedule.endDate ? new Date(schedule.endDate) : new Date(2099, 11, 31);

          // Jadval tanlangan oy bilan kesishadi mi?
          return scheduleStart <= endOfMonth && scheduleEnd >= startOfMonth;
        }).map(schedule => ({
          ...schedule,
          displayLabel: formatScheduleDateRange(schedule)
        }));

        if (relevantSchedules.length > 0) {
          setAvailableSchedules(relevantSchedules);
          // Agar bitta jadval bo'lsa avtomatik tanlash
          if (relevantSchedules.length === 1) {
            setSelectedSchedule(relevantSchedules[0]._id);
          }
        } else {
          setNoScheduleExists(true);
        }
      } else {
        setNoScheduleExists(true);
      }
    } catch (err) {
      setNoScheduleExists(true);
    } finally {
      setSchedulesLoading(false);
    }
  };

  // Sana oralig'ini formatlash
  const formatScheduleDateRange = (schedule) => {
    const startDate = new Date(schedule.startDate);
    const endDate = schedule.endDate ? new Date(schedule.endDate) : null;

    const formatDate = (date) => {
      return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
    };

    if (endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else {
      return `${formatDate(startDate)} dan boshlab`;
    }
  };

  // Tanlangan jadvaldan fanlarni yuklash
  const loadSubjectsFromSchedule = async () => {
    try {
      const schedule = availableSchedules.find(s => s._id === selectedSchedule);

      if (schedule && schedule.schedule) {
        // Fan va o'qituvchilar juftligini olish
        const subjectTeacherMap = new Map();

        schedule.schedule.forEach(day => {
          day.periods?.forEach(period => {
            if (period.subject && period.teacher) {
              const key = period.subject._id;
              if (!subjectTeacherMap.has(key)) {
                subjectTeacherMap.set(key, {
                  subject: period.subject,
                  teachers: []
                });
              }
              const entry = subjectTeacherMap.get(key);
              if (!entry.teachers.find(t => t._id === period.teacher._id)) {
                entry.teachers.push(period.teacher);
              }
            }
          });
        });

        setSubjects(Array.from(subjectTeacherMap.values()));
      } else {
        setSubjects([]);
      }
    } catch (err) {
      setError('Fanlarni yuklashda xatolik yuz berdi');
    }
  };

  const loadJournal = async () => {
    setLoading(true);
    setError(null);

    try {
      // Oydagi darslik kunlarni olish
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);

      const res = await api.get(
        `/grades/journal/${selectedClass}/${selectedSubject}`,
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }
      );



      // O'quvchilarni saqlash
      if (res.data.students) {
        setStudents(res.data.students);

        // Baholarni to'ldirish
        const gradesData = {};
        const attendanceData = {};
        const examGradesData = {};

        res.data.students.forEach(student => {
          // Baholar
          if (student.grades) {
            Object.keys(student.grades).forEach(dateKey => {
              const dateGrades = student.grades[dateKey];
              Object.keys(dateGrades).forEach(period => {
                const gradeInfo = dateGrades[period];

                // Imtihon bahosini alohida saqlash
                if (gradeInfo.isExam) {
                  examGradesData[student.studentId] = gradeInfo.score || '';
                } else {
                  // Kundalik baho - sana formatini YYYY-MM-DD ga o'zgartirish
                  const formattedDate = dateKey.split('T')[0]; // ISO dan YYYY-MM-DD olish
                  const key = `${student.studentId}-${formattedDate}`;
                  gradesData[key] = gradeInfo.score || '';
                }
              });
            });
          }

          // Davomat
          if (student.attendance) {
            Object.keys(student.attendance).forEach(dateKey => {
              const dateAttendance = student.attendance[dateKey];
              Object.keys(dateAttendance).forEach(period => {
                const formattedDate = dateKey.split('T')[0];
                const key = `${student.studentId}-${formattedDate}`;
                attendanceData[key] = dateAttendance[period].status || 'none';
              });
            });
          }
        });



        setGrades(gradesData);
        setAttendance(attendanceData);
        setExamGrades(examGradesData);
      }

      // Dars kunlarini saqlash
      if (res.data.lessonDays) {
        const days = Object.keys(res.data.lessonDays)
          .filter(dateKey => {
            const lesson = res.data.lessonDays[dateKey];
            return lesson.hasLesson && !lesson.isHoliday;
          })
          .map(dateKey => {
            // Sana formatini YYYY-MM-DD ga o'zgartirish
            const formattedDate = dateKey.split('T')[0];
            const date = new Date(dateKey);
            return {
              date: formattedDate,
              day: date.getDate(),
              periods: res.data.lessonDays[dateKey].periods || [1]
            };
          })
          .sort((a, b) => a.day - b.day);


        setLessonDays(days);
      }

      setHasChanges(false);
    } catch (err) {
      setError('Jurnal ma\'lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setSelectedSchedule('');
    setAvailableSchedules([]);
    setNoScheduleExists(false);
    setSelectedSubject('');
    setSelectedTeacher('');
    setTeachers([]);
    setSubjects([]);
    setStudents([]);
    setLessonDays([]);
  };

  const handleScheduleChange = (scheduleId) => {
    setSelectedSchedule(scheduleId);
    setSelectedSubject('');
    setSelectedTeacher('');
    setTeachers([]);
  };

  // Jadval qo'shish sahifasiga o'tish
  const goToAddSchedule = () => {
    // window.location.href yoki React Router ishlatish
    const selectedClassData = classes.find(c => c._id === selectedClass);
    if (selectedClassData) {
      // URL ga sinf ID ni qo'shib yuborish
      window.location.href = `/admin/schedule?classId=${selectedClass}&className=${selectedClassData.grade}-${selectedClassData.section}`;
    } else {
      window.location.href = '/admin/schedule';
    }
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedTeacher('');

    // O'qituvchilarni topish
    const subjectData = subjects.find(s => s.subject._id === subjectId);
    if (subjectData) {
      setTeachers(subjectData.teachers);
    }
  };

  const handleGradeChange = (studentId, date, value) => {
    const key = `${studentId}-${date}`;

    // Bayram kunida baho qo'yib bo'lmaydi
    const holiday = isHoliday(date);
    if (holiday) {
      showToast(`🎉 ${holiday.name} - bayram kunida baho qo'yib bo'lmaydi!`, 'warning');
      return;
    }

    // Kelmagan o'quvchiga baho qo'yib bo'lmaydi
    const attendanceStatus = attendance[key];
    if (attendanceStatus === 'kelmadi') {
      showToast('Kelmagan o\'quvchiga baho qo\'yib bo\'lmaydi!', 'warning');
      return;
    }

    // Vergulni nuqtaga almashtirish
    let cleanValue = value.replace(',', '.');

    // Bo'sh qiymat
    if (cleanValue === '' || cleanValue === null || cleanValue === undefined) {
      setGrades(prev => ({
        ...prev,
        [key]: ''
      }));
      setHasChanges(true);
      return;
    }

    // Faqat raqam va nuqtaga ruxsat berish
    if (!/^[0-9]*\.?[0-9]*$/.test(cleanValue)) {
      return;
    }

    // Yozish davom etayotgan bo'lsa (masalan "0." yoki "0.5")
    // To'g'ridan-to'g'ri saqlash
    if (cleanValue === '0' || cleanValue === '0.' || cleanValue.endsWith('.')) {
      setGrades(prev => ({
        ...prev,
        [key]: cleanValue
      }));
      setHasChanges(true);
      return;
    }

    // Raqamga aylantirish
    let numValue = parseFloat(cleanValue);

    // NaN tekshiruvi
    if (isNaN(numValue)) {
      setGrades(prev => ({
        ...prev,
        [key]: cleanValue
      }));
      setHasChanges(true);
      return;
    }

    // Maksimal 0.5 ball
    if (numValue > 0.5) {
      showToast('Kundalik baho maksimal 0.5 ball bo\'lishi kerak!', 'warning');
      return;
    }

    // Manfiy qiymatlarni rad qilish
    if (numValue < 0) {
      return;
    }

    setGrades(prev => ({
      ...prev,
      [key]: numValue
    }));
    setHasChanges(true);
  };

  // Baho qiymatini formatlash (0.4 ko'rinishida)
  const formatGradeValue = (value) => {
    if (value === '' || value === null || value === undefined) {
      return '';
    }

    // Agar string bo'lsa va nuqta bilan tugasa (yozish davom etayotgan)
    if (typeof value === 'string' && (value.endsWith('.') || value === '0')) {
      return value;
    }

    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (num === 0) return '0';

    // 0.5, 0.4, 0.3 kabi qiymatlar uchun
    return num.toFixed(1);
  };

  // Imtihon bahosini o'zgartirish
  const handleExamGradeChange = (studentId, value) => {
    // Bo'sh qiymat
    if (value === '' || value === null || value === undefined) {
      setExamGrades(prev => ({
        ...prev,
        [studentId]: ''
      }));
      setHasChanges(true);
      return;
    }

    // Faqat raqamlarga ruxsat berish
    if (!/^[0-9]*$/.test(value)) {
      return;
    }

    const numValue = parseInt(value, 10);

    // NaN tekshiruvi
    if (isNaN(numValue)) {
      setExamGrades(prev => ({
        ...prev,
        [studentId]: value
      }));
      setHasChanges(true);
      return;
    }

    // Imtihon bahosi maksimal 30 ball
    if (numValue > 30) {
      showToast('Imtihon bahosi maksimal 30 ball bo\'lishi kerak!', 'warning');
      return;
    }

    // Manfiy qiymatlarni rad qilish
    if (numValue < 0) {
      return;
    }

    setExamGrades(prev => ({
      ...prev,
      [studentId]: numValue
    }));
    setHasChanges(true);
  };

  const handleAttendanceChange = (studentId, date, currentStatus) => {
    const key = `${studentId}-${date}`;

    // Bayram kunida davomat belgilab bo'lmaydi
    const holiday = isHoliday(date);
    if (holiday) {
      showToast(`🎉 ${holiday.name} - bayram kunida davomat belgilab bo'lmaydi!`, 'warning');
      return;
    }

    // Davomat sikli: none -> keldi -> kelmadi -> sababli -> none
    let newStatus;
    if (currentStatus === 'none' || !currentStatus) {
      newStatus = 'keldi';
    } else if (currentStatus === 'keldi') {
      newStatus = 'kelmadi';
    } else if (currentStatus === 'kelmadi') {
      newStatus = 'sababli';
    } else {
      newStatus = 'none';
    }

    setAttendance(prev => ({
      ...prev,
      [key]: newStatus
    }));

    // Agar kelmadi bo'lsa, bahoni o'chirib tashlash
    if (newStatus === 'kelmadi') {
      setGrades(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }

    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      showToast('Hech qanday o\'zgarish yo\'q', 'info');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage('');

    try {
      // Kundalik baholarni saqlash
      const gradesToSave = [];
      Object.keys(grades).forEach(key => {
        if (grades[key] && grades[key] > 0) {
          // key formati: studentId-date (date YYYY-MM-DD formatida)
          const parts = key.split('-');
          const studentId = parts[0];
          const dateStr = parts.slice(1).join('-'); // YYYY-MM-DD

          gradesToSave.push({
            student: studentId,
            date: new Date(dateStr).toISOString(),
            score: parseFloat(grades[key]),
            periodNumber: 1,
            isExam: false
          });
        }
      });

      // Imtihon baholarini qo'shish
      Object.keys(examGrades).forEach(studentId => {
        if (examGrades[studentId] && examGrades[studentId] > 0) {
          // Oyning oxirgi kuni imtihon sanasi sifatida
          const examDate = new Date(selectedYear, selectedMonth, 0);

          gradesToSave.push({
            student: studentId,
            date: examDate.toISOString(),
            score: parseFloat(examGrades[studentId]),
            periodNumber: 1,
            isExam: true,
            examMaxScore: 30
          });
        }
      });



      if (gradesToSave.length > 0) {
        await api.post('/grades/journal-bulk', {
          classId: selectedClass,
          subjectId: selectedSubject,
          scheduleId: selectedSchedule,
          grades: gradesToSave
        });

      }

      // Davomatni saqlash
      const attendanceToSave = [];
      Object.keys(attendance).forEach(key => {
        if (attendance[key] && attendance[key] !== 'none') {
          const parts = key.split('-');
          const studentId = parts[0];
          const dateStr = parts.slice(1).join('-');

          attendanceToSave.push({
            student: studentId,
            class: selectedClass,
            subject: selectedSubject,
            date: new Date(dateStr).toISOString(),
            period: 1,
            status: attendance[key]
          });
        }
      });

      if (attendanceToSave.length > 0) {
        await api.post('/attendance/bulk', {
          records: attendanceToSave
        });
      }

      setHasChanges(false);
      showToast('Ma\'lumotlar muvaffaqiyatli saqlandi!', 'success');

      // Jurnalni qayta yuklash
      await loadJournal();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Ma\'lumotlarni saqlashda xatolik yuz berdi';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getGrade = (studentId, date) => {
    const key = `${studentId}-${date}`;
    return grades[key] || '';
  };

  const getAttendance = (studentId, date) => {
    const key = `${studentId}-${date}`;
    return attendance[key] || 'none';
  };

  const getAttendanceIcon = (status) => {
    switch (status) {
      case 'keldi': return '✓';
      case 'kelmadi': return '✗';
      case 'sababli': return '◐';
      default: return '○';
    }
  };

  const getAttendanceClass = (status) => {
    switch (status) {
      case 'keldi': return 'status-present';
      case 'kelmadi': return 'status-absent';
      case 'sababli': return 'status-excused';
      default: return 'status-none';
    }
  };

  // O'quvchi statistikasini hisoblash
  const calculateStudentStats = (student) => {
    const studentGrades = Object.keys(grades)
      .filter(key => key.startsWith(student.studentId))
      .map(key => grades[key])
      .filter(g => g > 0);

    const total = studentGrades.reduce((sum, g) => sum + g, 0);
    const average = studentGrades.length > 0 ? total / studentGrades.length : 0;

    const studentAttendance = Object.keys(attendance)
      .filter(key => key.startsWith(student.studentId));

    const attended = studentAttendance.filter(key => attendance[key] === 'keldi').length;
    const attendanceRate = studentAttendance.length > 0
      ? (attended / studentAttendance.length) * 100
      : 0;

    return { total, average, attended, totalDays: studentAttendance.length, attendanceRate };
  };

  return (
    <div className="admin-class-journal">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'warning' && '⚠'}
            {toast.type === 'error' && '✗'}
            {toast.type === 'info' && 'ℹ'}
          </div>
          <div className="toast-message">{toast.message}</div>
          <button className="toast-close" onClick={() => setToast({ ...toast, show: false })}>
            ×
          </button>
        </div>
      )}

      <div className="journal-header">
        <h2>📚 Sinf Jurnali</h2>
      </div>

      {/* Xato va muvaffaqiyat xabarlari */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          ✅ {successMessage}
        </div>
      )}

      {/* Tanlov paneli */}
      <div className="selection-panel">
        <div className="select-group">
          <label>Sinf:</label>
          <select
            value={selectedClass}
            onChange={(e) => handleClassChange(e.target.value)}
          >
            <option value="" disabled>Sinfni tanlang</option>
            {classes.map(cls => (
              <option key={cls._id} value={cls._id}>
                {cls.grade}-{cls.section}
              </option>
            ))}
          </select>
        </div>

        <div className="select-group">
          <label>Oy:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className="select-group">
          <label>Yil:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {Array.from({ length: 5 }, (_, i) => 2024 + i).map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Jadval tanlash (bir nechta jadval mavjud bo'lsa) */}
        {selectedClass && availableSchedules.length > 1 && (
          <div className="select-group schedule-select">
            <label>Dars jadvali:</label>
            <select
              value={selectedSchedule}
              onChange={(e) => handleScheduleChange(e.target.value)}
            >
              <option value="" disabled>Jadvalni tanlang</option>
              {availableSchedules.map(schedule => (
                <option key={schedule._id} value={schedule._id}>
                  {schedule.displayLabel}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fan tanlash */}
        {selectedSchedule && subjects.length > 0 && (
          <div className="select-group">
            <label>Fan:</label>
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
            >
              <option value="" disabled>Fanni tanlang</option>
              {subjects.map(item => (
                <option key={item.subject._id} value={item.subject._id}>
                  {item.subject.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* O'qituvchi tanlash */}
        {selectedSubject && teachers.length > 0 && (
          <div className="select-group">
            <label>O'qituvchi:</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
            >
              <option value="" disabled>O'qituvchini tanlang</option>
              {teachers.map(teacher => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.firstName} {teacher.lastName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Jadval yuklanmoqda */}
      {schedulesLoading && selectedClass && (
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Dars jadvallari tekshirilmoqda...</p>
        </div>
      )}

      {/* Jadval mavjud emas - xabar va tugma */}
      {!schedulesLoading && noScheduleExists && selectedClass && (
        <div className="no-schedule-message">
          <div className="no-schedule-icon">📅</div>
          <h3>Bu vaqtga dars jadvali belgilanmagan</h3>
          <p>
            {months.find(m => m.value === selectedMonth)?.label} {selectedYear} oy uchun
            bu sinfda hech qanday dars jadvali topilmadi.
          </p>
          <button className="btn-add-schedule" onClick={goToAddSchedule}>
            ➕ Dars jadvalini qo'shish
          </button>
        </div>
      )}

      {/* Mavjud jadvallar haqida ma'lumot */}
      {!schedulesLoading && availableSchedules.length > 0 && selectedClass && (
        <div className="schedules-info">
          <span className="info-label">📋 Bu oy uchun mavjud jadvallar:</span>
          <div className="schedules-list">
            {availableSchedules.map(schedule => (
              <span
                key={schedule._id}
                className={`schedule-badge ${selectedSchedule === schedule._id ? 'active' : ''}`}
                onClick={() => handleScheduleChange(schedule._id)}
              >
                {schedule.displayLabel}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Yuklash holati */}
      {loading && (
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Jurnal yuklanmoqda...</p>
        </div>
      )}

      {/* Jurnal jadvali - faqat barcha tanlovlar bajarilganda */}
      {!loading && selectedClass && selectedSchedule && selectedSubject && selectedTeacher && students.length > 0 && lessonDays.length > 0 && (
        <>
          <div className="journal-actions">
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? 'Saqlanmoqda...' : hasChanges ? '💾 Saqlash' : 'O\'zgarish yo\'q'}
            </button>

            {hasChanges && (
              <span className="changes-indicator">
                ⚠️ Saqlanmagan o'zgarishlar mavjud
              </span>
            )}
          </div>

          <div className="table-wrapper">
            <table className="journal-table">
              <thead>
                <tr>
                  <th className="col-number">№</th>
                  <th className="col-student">O'quvchi</th>
                  {lessonDays.map(day => {
                    const holiday = isHoliday(day.date);
                    return (
                      <th
                        key={day.date}
                        className={`col-day ${holiday ? 'holiday-header' : ''}`}
                        title={holiday ? `🎉 ${holiday.name}` : ''}
                      >
                        {day.day}
                        {holiday && <span className="holiday-icon">🎉</span>}
                      </th>
                    );
                  })}
                  <th className="col-exam">Imtihon (30)</th>
                  <th className="col-stat">Jami ball</th>
                  <th className="col-stat">O'rtacha</th>
                  <th className="col-stat">Davomat</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const stats = calculateStudentStats(student);
                  const examGrade = examGrades[student.studentId] || '';

                  return (
                    <tr key={student.studentId}>
                      <td className="col-number">{index + 1}</td>
                      <td className="col-student">
                        {student.firstName} {student.lastName}
                      </td>

                      {lessonDays.map(day => {
                        const gradeValue = getGrade(student.studentId, day.date);
                        const attendanceStatus = getAttendance(student.studentId, day.date);
                        const isAbsent = attendanceStatus === 'kelmadi';
                        const holiday = isHoliday(day.date);
                        const isDisabled = isAbsent || holiday;

                        return (
                          <td key={day.date} className={`col-day ${holiday ? 'holiday-cell' : ''}`}>
                            {holiday ? (
                              <div className="holiday-marker" title={`🎉 ${holiday.name}`}>
                                <span className="holiday-emoji">🎉</span>
                              </div>
                            ) : (
                              <div className="cell-content">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className={`grade-input ${isDisabled ? 'disabled-input' : ''}`}
                                  value={formatGradeValue(gradeValue)}
                                  onChange={(e) => handleGradeChange(
                                    student.studentId,
                                    day.date,
                                    e.target.value
                                  )}
                                  placeholder={isAbsent ? '✗' : '-'}
                                  disabled={isDisabled}
                                  title={isAbsent ? 'Kelmagan o\'quvchiga baho qo\'yib bo\'lmaydi' : 'Maksimal 0.5 ball'}
                                />
                                <button
                                  className={`attendance-btn ${getAttendanceClass(attendanceStatus)}`}
                                  onClick={() => handleAttendanceChange(
                                    student.studentId,
                                    day.date,
                                    attendanceStatus
                                  )}
                                  title={attendanceStatus}
                                  disabled={holiday}
                                >
                                  {getAttendanceIcon(attendanceStatus)}
                                </button>
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Imtihon bahosi */}
                      <td className="col-exam">
                        <input
                          type="text"
                          inputMode="numeric"
                          className="exam-input"
                          value={examGrade}
                          onChange={(e) => handleExamGradeChange(
                            student.studentId,
                            e.target.value
                          )}
                          placeholder="0"
                          title="Maksimal 30 ball"
                        />
                      </td>

                      <td className="col-stat">{(stats.total + (parseFloat(examGrade) || 0)).toFixed(1)}</td>
                      <td className="col-stat">{stats.average.toFixed(2)}</td>
                      <td className="col-stat">
                        {stats.attended}/{stats.total} ({stats.attendanceRate.toFixed(0)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Belgilar izohi */}
          <div className="legend-container">
            <div className="legend-title">Belgilar:</div>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-icon legend-present">✓</span>
                <span className="legend-text">Keldi</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon legend-absent">✗</span>
                <span className="legend-text">Kelmadi</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon legend-excused">◐</span>
                <span className="legend-text">Sababli</span>
              </div>
              <div className="legend-item">
                <span className="legend-icon legend-none">○</span>
                <span className="legend-text">Belgilanmagan</span>
              </div>
              <div className="legend-divider"></div>
              <div className="legend-item">
                <span className="legend-badge legend-daily">0.5</span>
                <span className="legend-text">Kundalik baho (max 0.5)</span>
              </div>
              <div className="legend-item">
                <span className="legend-badge legend-exam">30</span>
                <span className="legend-text">Imtihon baho (max 30)</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bo'sh holat */}
      {!loading && students.length === 0 && selectedClass && selectedSubject && selectedTeacher && (
        <div className="empty-state">
          <p>📋 Bu oy uchun darslar topilmadi</p>
        </div>
      )}
    </div>
  );
};

export default AdminClassJournal;
