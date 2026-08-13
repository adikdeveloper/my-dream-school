import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Can } from '../../context/PermissionsContext';
import apiService from '../../services/apiService';

const ScheduleManagement = () => {
  const { setLoading, setError } = useData();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'edit', 'view'
  const [schedule, setSchedule] = useState([]);
  const [scheduleName, setScheduleName] = useState('');
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'future', 'archived'
  const [filterYear, setFilterYear] = useState('all'); // 'all', '2024', '2025', etc.
  const [teacherConflicts, setTeacherConflicts] = useState({}); // {dayIndex-periodIndex: conflictInfo}
  const [busyTeachers, setBusyTeachers] = useState({}); // {"Monday-08:00-08:45": ["teacherId1", "teacherId2"]}
  const toastTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  const [deleteModal, setDeleteModal] = useState({ show: false, periodIndex: null, dayIndex: null, type: null });

  // Schedule date info state
  const [dateInfo, setDateInfo] = useState({ gaps: [], hasExistingSchedules: false, latestScheduleEnd: null, existingRanges: [] });

  // Bayram kunlari state
  const [holidays, setHolidays] = useState([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [deleteHolidayModal, setDeleteHolidayModal] = useState({ show: false, holiday: null });
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    endDate: '',
    type: 'national',
    description: '',
    academicYear: '2024-2025'
  });

  // O'qituvchilar bo'limi uchun state'lar
  const [activeTab, setActiveTab] = useState('classes'); // 'classes' yoki 'teachers'
  const [teachersMonthlyData, setTeachersMonthlyData] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherDetails, setTeacherDetails] = useState(null);
  const [teacherMonth, setTeacherMonth] = useState(new Date().getMonth() + 1);
  const [teacherYear, setTeacherYear] = useState(new Date().getFullYear());
  const [teachersLoading, setTeachersLoading] = useState(false);

  const [periodTimes, setPeriodTimes] = useState([
    { label: '1-dars', startTime: '08:00', endTime: '08:45' },
    { label: '2-dars', startTime: '08:55', endTime: '09:40' },
    { label: '3-dars', startTime: '09:50', endTime: '10:35' },
    { label: '4-dars', startTime: '10:55', endTime: '11:40' },
    { label: '5-dars', startTime: '11:50', endTime: '12:35' }
  ]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayNames = {
    'Monday': 'Dushanba',
    'Tuesday': 'Seshanba',
    'Wednesday': 'Chorshanba',
    'Thursday': 'Payshanba',
    'Friday': 'Juma',
    'Saturday': 'Shanba'
  };

  const statusLabels = {
    'active': { label: 'Aktiv', color: '#10b981', icon: '🟢' },
    'future': { label: 'Kelajak', color: '#3b82f6', icon: '🔵' },
    'archived': { label: 'Arxiv', color: '#6b7280', icon: '⚫' },
    'expired': { label: 'Muddati o\'tgan', color: '#f59e0b', icon: '🟡' }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        apiService.getClasses(),
        apiService.getSubjects(),
        apiService.getTeachers(),
        apiService.getHolidays()
      ]);

      const classesResponse = results[0].status === 'fulfilled' ? results[0].value : {};
      const subjectsData = results[1].status === 'fulfilled' ? results[1].value : [];
      const teachersData = results[2].status === 'fulfilled' ? results[2].value : [];
      const holidaysData = results[3].status === 'fulfilled' ? results[3].value : [];

      setClasses(classesResponse?.classes || classesResponse || []);
      setSubjects(subjectsData || []);
      setTeachers(teachersData || []);
      setHolidays(holidaysData || []);

      const failedRequests = results.filter(r => r.status === 'rejected');
      if (failedRequests.length > 0) {
        setError('Ba\'zi ma\'lumotlarni yuklashda xatolik yuz berdi');
      }
    } catch (error) {
      setError('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowClassDropdown(false);
      }
    };

    if (showClassDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClassDropdown]);

  const filteredClasses = useMemo(() => {
    if (!classSearchQuery) {
      return classes.filter(c => c.isActive);
    }
    return classes.filter(c =>
      c.isActive && (
        c.name.toLowerCase().includes(classSearchQuery.toLowerCase()) ||
        `${c.grade}`.includes(classSearchQuery) ||
        c.section.toLowerCase().includes(classSearchQuery.toLowerCase())
      )
    );
  }, [classes, classSearchQuery]);

  // Mavjud yillarni jadvallardan olish
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    schedules.forEach(s => {
      if (s.startDate) {
        const startYear = new Date(s.startDate).getFullYear();
        yearsSet.add(startYear);
      }
      if (s.endDate) {
        const endYear = new Date(s.endDate).getFullYear();
        yearsSet.add(endYear);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a); // Yangi yillar birinchi
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    // Jadval ma'lum yilga tegishli ekanligini tekshirish
    const isScheduleInYear = (schedule, year) => {
      if (!schedule.startDate || !schedule.endDate) return false;
      const startYear = new Date(schedule.startDate).getFullYear();
      const endYear = new Date(schedule.endDate).getFullYear();
      // Agar jadval bu yilga kirsa (boshlanishi yoki tugashi yoki o'rtasida)
      return year >= startYear && year <= endYear;
    };

    let result = schedules;

    // Status bo'yicha filter
    if (filterStatus !== 'all') {
      result = result.filter(s => s.status === filterStatus);
    }

    // Yil bo'yicha filter
    if (filterYear !== 'all') {
      const year = parseInt(filterYear);
      result = result.filter(s => isScheduleInYear(s, year));
    }

    return result;
  }, [schedules, filterStatus, filterYear]);

  const loadSchedules = async (classId) => {
    try {
      setLoading(true);
      const allSchedules = await apiService.getAllSchedules(classId);
      setSchedules(allSchedules);
    } catch (error) {
      setError(error.response?.data?.message || 'Jadvallarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = async (classId) => {
    if (!classId) {
      setSelectedClass(null);
      setSchedules([]);
      setViewMode('list');
      return;
    }

    setShowClassDropdown(false);
    setClassSearchQuery('');

    try {
      setLoading(true);
      const response = await apiService.getClass(classId);
      setSelectedClass(response);
      setViewMode('list');
      await loadSchedules(classId);
    } catch (error) {
      setError(error.response?.data?.message || 'Sinf ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const initializeEmptySchedule = () => {
    return daysOfWeek.map(day => ({
      day,
      periods: periodTimes.map(pt => ({
        startTime: pt.startTime,
        endTime: pt.endTime,
        subject: null,
        teacher: null
      }))
    }));
  };

  const handleCreateNew = async () => {
    setViewMode('create');
    setSchedule(initializeEmptySchedule());
    setScheduleName('');
    setAcademicYear(selectedClass?.academicYear || '2024-2025');
    setTeacherConflicts({});
    // Default period times
    setPeriodTimes([
      { label: '1-dars', startTime: '08:00', endTime: '08:45' },
      { label: '2-dars', startTime: '08:55', endTime: '09:40' },
      { label: '3-dars', startTime: '09:50', endTime: '10:35' },
      { label: '4-dars', startTime: '10:55', endTime: '11:40' },
      { label: '5-dars', startTime: '11:50', endTime: '12:35' }
    ]);

    // Avtomatik keyingi mavjud sanani olish va band o'qituvchilarni yuklash
    try {
      if (selectedClass?._id) {
        const [fetchedDateInfo, busyData] = await Promise.all([
          apiService.getNextAvailableDate(selectedClass._id),
          apiService.getBusyTeachers(selectedClass._id)
        ]);
        setDateInfo(fetchedDateInfo);
        setStartDate(fetchedDateInfo.suggestedStartDate || fetchedDateInfo.nextAvailableDate);
        setEndDate('');
        setBusyTeachers(busyData.busyTeachers || {});
      } else {
        setStartDate('');
        setEndDate('');
        setDateInfo({ gaps: [], hasExistingSchedules: false, latestScheduleEnd: null, existingRanges: [] });
        setBusyTeachers({});
      }
    } catch (error) {
      // Xatolik bo'lsa, bugungi sanani qo'yish
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate('');
      setDateInfo({ gaps: [], hasExistingSchedules: false, latestScheduleEnd: null, existingRanges: [] });
      setBusyTeachers({});
    }
  };

  // Sana mavjud jadvallar bilan kesishishini tekshirish
  const isDateInExistingRange = (dateStr) => {
    // Tahrirlashdagi sana backendda aynan shu jadval chiqarib tashlangan holda
    // tekshiriladi; frontenddagi create uchun olingan oraliqlar bunga halal bermasin.
    if (viewMode === 'edit') return false;
    if (!dateInfo.existingRanges || dateInfo.existingRanges.length === 0) return false;
    const date = new Date(dateStr);
    return dateInfo.existingRanges.some(range => {
      const start = new Date(range.start);
      const end = new Date(range.end);
      return date >= start && date <= end;
    });
  };

  // Yakshanba yoki bayram ekanligini tekshirish
  const isSundayOrHoliday = (dateStr) => {
    const date = new Date(dateStr);
    // Yakshanba (0)
    if (date.getDay() === 0) return true;
    // Bayram kunlarini tekshirish
    const dateOnly = dateStr.split('T')[0];
    return holidays.some(h => {
      const holidayDate = h.date?.split('T')[0];
      const holidayEndDate = h.endDate?.split('T')[0];
      if (holidayEndDate) {
        return dateOnly >= holidayDate && dateOnly <= holidayEndDate;
      }
      return dateOnly === holidayDate;
    });
  };

  // Tanlangan sana uchun maksimal tugash sanani hisoblash
  const getMaxEndDate = (startDateStr) => {
    if (!startDateStr || !dateInfo.existingRanges) return null;
    const startDate = new Date(startDateStr);

    // Keyingi mavjud jadvalni topish
    const nextSchedule = dateInfo.existingRanges.find(range => {
      const rangeStart = new Date(range.start);
      return rangeStart > startDate;
    });

    if (nextSchedule) {
      // Keyingi jadvaldan 1 kun oldin
      const maxDate = new Date(nextSchedule.start);
      maxDate.setDate(maxDate.getDate() - 1);
      return maxDate.toISOString().split('T')[0];
    }

    return null; // cheksiz
  };

  const handleViewSchedule = (scheduleItem) => {

    // ✅ TUZATISH: Agar periodTimes bo'sh bo'lsa, schedule.periods dan avtomatik yaratish
    if (!scheduleItem.periodTimes || scheduleItem.periodTimes.length === 0) {
      if (scheduleItem.schedule && scheduleItem.schedule.length > 0 && scheduleItem.schedule[0].periods) {
        scheduleItem.periodTimes = scheduleItem.schedule[0].periods.map((period, idx) => ({
          label: `${idx + 1}-dars`,
          startTime: period.startTime,
          endTime: period.endTime
        }));
      }
    }

    setSelectedSchedule(scheduleItem);
    setViewMode('view');
  };

  const handleEditSchedule = async (scheduleItem) => {
    setViewMode('edit');
    setSelectedSchedule(scheduleItem);
    setScheduleName(scheduleItem.name);
    setAcademicYear(scheduleItem.academicYear);
    setStartDate(scheduleItem.startDate?.split('T')[0] || '');
    setEndDate(scheduleItem.endDate?.split('T')[0] || '');
    setTeacherConflicts({});

    // Band o'qituvchilarni yuklash
    try {
      const busyData = await apiService.getBusyTeachers(scheduleItem.classId?._id || scheduleItem.classId);
      setBusyTeachers(busyData.busyTeachers || {});
    } catch (error) {
      setBusyTeachers({});
    }

    // Load period times from schedule or use default
    const currentPeriodTimes = (scheduleItem.periodTimes && scheduleItem.periodTimes.length > 0)
      ? scheduleItem.periodTimes
      : [
        { label: '1-dars', startTime: '08:00', endTime: '08:45' },
        { label: '2-dars', startTime: '08:55', endTime: '09:40' },
        { label: '3-dars', startTime: '09:50', endTime: '10:35' },
        { label: '4-dars', startTime: '10:55', endTime: '11:40' },
        { label: '5-dars', startTime: '11:50', endTime: '12:35' }
      ];

    setPeriodTimes(currentPeriodTimes);

    // Prepare schedule data using currentPeriodTimes (not state which updates async)
    const existingDays = (scheduleItem.schedule && scheduleItem.schedule.length > 0)
      ? scheduleItem.schedule.map(s => s.day)
      : daysOfWeek;

    const fullSchedule = existingDays.map(day => {
      const existing = scheduleItem.schedule?.find(s => s.day === day);
      if (existing && existing.periods) {
        const periods = existing.periods.map(p => ({
          startTime: p.startTime,
          endTime: p.endTime,
          subject: p.subject?._id || p.subject || null,
          teacher: p.teacher?._id || p.teacher || null
        }));

        // Sync with current periodTimes length
        while (periods.length < currentPeriodTimes.length) {
          const index = periods.length;
          periods.push({
            startTime: currentPeriodTimes[index].startTime,
            endTime: currentPeriodTimes[index].endTime,
            subject: null,
            teacher: null
          });
        }
        return { day, periods: periods.slice(0, currentPeriodTimes.length) };
      } else {
        return {
          day,
          periods: currentPeriodTimes.map(pt => ({
            startTime: pt.startTime,
            endTime: pt.endTime,
            subject: null,
            teacher: null
          }))
        };
      }
    });
    setSchedule(fullSchedule);
  };

  const handlePeriodChange = async (dayIndex, periodIndex, field, value) => {
    const newSchedule = [...schedule];

    // Agar fan o'zgartirilsa, o'qituvchini tozalash
    if (field === 'subject') {
      newSchedule[dayIndex].periods[periodIndex].subject = value || null;
      newSchedule[dayIndex].periods[periodIndex].teacher = null;

      // Clear teacher conflict for this period
      const conflictKey = `${dayIndex}-${periodIndex}`;
      const newConflicts = { ...teacherConflicts };
      delete newConflicts[conflictKey];
      setTeacherConflicts(newConflicts);
      setSchedule(newSchedule);
    } else if (field === 'teacher' && value) {
      // O'qituvchi tanlanganda availability check qilish
      newSchedule[dayIndex].periods[periodIndex][field] = value;

      const period = newSchedule[dayIndex].periods[periodIndex];
      const day = newSchedule[dayIndex].day;

      try {
        const availability = await apiService.checkTeacherAvailability(
          value,
          day,
          period.startTime,
          period.endTime,
          selectedClass._id
        );

        const conflictKey = `${dayIndex}-${periodIndex}`;
        const newConflicts = { ...teacherConflicts };

        if (!availability.available) {
          newConflicts[conflictKey] = availability.conflictingClass;
          setTeacherConflicts(newConflicts);
        } else {
          delete newConflicts[conflictKey];
          setTeacherConflicts(newConflicts);
        }
      } catch (error) {
        // Silently handle error - user will see conflict warning if exists
      }

      setSchedule(newSchedule);
      return;
    } else {
      newSchedule[dayIndex].periods[periodIndex][field] = value || null;
      setSchedule(newSchedule);
    }
  };

  const handleClearPeriod = (dayIndex, periodIndex) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].periods[periodIndex] = {
      startTime: periodTimes[periodIndex].startTime,
      endTime: periodTimes[periodIndex].endTime,
      subject: null,
      teacher: null
    };
    setSchedule(newSchedule);

    // Clear conflict for this period
    const conflictKey = `${dayIndex}-${periodIndex}`;
    const newConflicts = { ...teacherConflicts };
    delete newConflicts[conflictKey];
    setTeacherConflicts(newConflicts);
  };

  const [toastType, setToastType] = useState('success'); // 'success' or 'warning'

  const showToast = (message, type = 'success') => {
    setSuccessMessage(message);
    setToastType(type);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleAddPeriod = () => {
    const newPeriodIndex = periodTimes.length + 1;
    const lastPeriod = periodTimes[periodTimes.length - 1];

    // Calculate new start time (10 minutes after last period end)
    const [hours, minutes] = lastPeriod.endTime.split(':').map(Number);
    const newStartMinutes = minutes + 10;
    const newStartHours = hours + Math.floor(newStartMinutes / 60);
    const startTime = `${String(newStartHours).padStart(2, '0')}:${String(newStartMinutes % 60).padStart(2, '0')}`;

    // End time is 45 minutes after start
    const endMinutes = (newStartMinutes + 45) % 60;
    const endHours = newStartHours + Math.floor((newStartMinutes + 45) / 60);
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

    const newPeriod = {
      label: `${newPeriodIndex}-dars`,
      startTime,
      endTime
    };

    setPeriodTimes([...periodTimes, newPeriod]);

    // Update schedule to include new period for all days
    const newSchedule = schedule.map(daySchedule => ({
      ...daySchedule,
      periods: [...daySchedule.periods, {
        startTime,
        endTime,
        subject: null,
        teacher: null
      }]
    }));
    setSchedule(newSchedule);
    showToast('Yangi dars qo\'shildi');
  };

  const handleRemovePeriod = (index) => {
    if (periodTimes.length <= 1) {
      showToast('Kamida 1 ta dars bo\'lishi kerak', 'warning');
      return;
    }
    setDeleteModal({ show: true, periodIndex: index, dayIndex: null, type: 'period' });
  };

  // Har bir kunga alohida dars qo'shish
  const handleAddPeriodToDay = (dayIndex) => {
    const dayPeriods = schedule[dayIndex].periods;
    const maxPeriods = periodTimes.length;

    if (dayPeriods.length >= maxPeriods) {
      showToast(`Avval "Dars Vaqtlari" bo'limiga ${dayPeriods.length + 1}-dars vaqtini qo'shing`, 'warning');
      return;
    }

    const periodIndex = dayPeriods.length;
    const periodTime = periodTimes[periodIndex];

    const newSchedule = [...schedule];
    newSchedule[dayIndex] = {
      ...newSchedule[dayIndex],
      periods: [...newSchedule[dayIndex].periods, {
        startTime: periodTime.startTime,
        endTime: periodTime.endTime,
        subject: null,
        teacher: null
      }]
    };
    setSchedule(newSchedule);
    showToast(`${dayNames[schedule[dayIndex].day]}ga yangi dars qo'shildi`);
  };

  // Kundan dars o'chirish
  const handleRemovePeriodFromDay = (dayIndex) => {
    const dayPeriods = schedule[dayIndex].periods;
    if (dayPeriods.length <= 1) {
      showToast('Kamida 1 ta dars bo\'lishi kerak', 'warning');
      return;
    }

    const newSchedule = [...schedule];
    newSchedule[dayIndex] = {
      ...newSchedule[dayIndex],
      periods: newSchedule[dayIndex].periods.slice(0, -1)
    };
    setSchedule(newSchedule);
    showToast(`${dayNames[schedule[dayIndex].day]}dan oxirgi dars o'chirildi`);
  };

  // Kunni butunlay o'chirish
  const handleRemoveDay = (dayIndex) => {
    if (schedule.length <= 1) {
      showToast('Jadvalda kamida 1 ta kun bo\'lishi kerak', 'warning');
      return;
    }
    const dayNameStr = dayNames[schedule[dayIndex].day] || schedule[dayIndex].day;
    const newSchedule = schedule.filter((_, idx) => idx !== dayIndex);
    setSchedule(newSchedule);
    showToast(`${dayNameStr} kuni jadvaldan olib tashlandi`);
  };

  // O'chirilgan kunni qayta qo'shish
  const handleAddDay = (dayName) => {
    if (schedule.some(d => d.day === dayName)) return;
    const newDay = {
      day: dayName,
      periods: periodTimes.map(pt => ({
        startTime: pt.startTime,
        endTime: pt.endTime,
        subject: null,
        teacher: null
      }))
    };
    const updatedSchedule = [...schedule, newDay].sort(
      (a, b) => daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day)
    );
    setSchedule(updatedSchedule);
    showToast(`${dayNames[dayName]} kuni jadvalga qo'shildi`);
  };

  const confirmDeletePeriod = () => {
    const index = deleteModal.periodIndex;
    const newPeriodTimes = periodTimes.filter((_, i) => i !== index);
    setPeriodTimes(newPeriodTimes);

    // Update schedule to remove this period from all days
    const newSchedule = schedule.map(daySchedule => ({
      ...daySchedule,
      periods: daySchedule.periods.filter((_, i) => i !== index)
    }));
    setSchedule(newSchedule);
    setDeleteModal({ show: false, periodIndex: null, dayIndex: null, type: null });
    showToast('Dars o\'chirildi');
  };

  const cancelDelete = () => {
    setDeleteModal({ show: false, periodIndex: null, dayIndex: null, type: null });
  };

  // Bayram kunlari funksiyalari
  const holidayTypes = {
    national: { label: 'Davlat bayrami', color: '#ef4444', icon: '🏛️' },
    religious: { label: 'Diniy bayram', color: '#8b5cf6', icon: '🕌' },
    school: { label: 'Maktab dam olish', color: '#3b82f6', icon: '🏫' },
    other: { label: 'Boshqa', color: '#6b7280', icon: '📅' }
  };

  const openHolidayModal = (holiday = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setHolidayForm({
        name: holiday.name,
        date: holiday.date.split('T')[0],
        endDate: holiday.endDate ? holiday.endDate.split('T')[0] : '',
        type: holiday.type,
        description: holiday.description || '',
        academicYear: holiday.academicYear
      });
    } else {
      setEditingHoliday(null);
      setHolidayForm({
        name: '',
        date: '',
        endDate: '',
        type: 'national',
        description: '',
        academicYear: '2024-2025'
      });
    }
    setShowHolidayModal(true);
  };

  const closeHolidayModal = () => {
    setShowHolidayModal(false);
    setEditingHoliday(null);
  };

  const handleSaveHoliday = async () => {
    if (!holidayForm.name.trim()) {
      showToast('Bayram nomini kiriting', 'warning');
      return;
    }
    if (!holidayForm.date) {
      showToast('Sanani tanlang', 'warning');
      return;
    }

    try {
      setLoading(true);
      if (editingHoliday) {
        await apiService.updateHoliday(editingHoliday._id, holidayForm);
        showToast('Bayram yangilandi');
      } else {
        await apiService.createHoliday(holidayForm);
        showToast('Bayram qo\'shildi');
      }
      closeHolidayModal();
      // Reload holidays
      const holidaysData = await apiService.getHolidays();
      setHolidays(holidaysData || []);
    } catch (error) {
      showToast(error.response?.data?.message || 'Xatolik yuz berdi', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = (holiday) => {
    setDeleteHolidayModal({ show: true, holiday });
  };

  const cancelDeleteHoliday = () => {
    setDeleteHolidayModal({ show: false, holiday: null });
  };

  const confirmDeleteHoliday = async () => {
    if (!deleteHolidayModal.holiday) return;
    try {
      setLoading(true);
      await apiService.deleteHoliday(deleteHolidayModal.holiday._id);
      showToast('Bayram o\'chirildi');
      const holidaysData = await apiService.getHolidays();
      setHolidays(holidaysData || []);
      setDeleteHolidayModal({ show: false, holiday: null });
    } catch (error) {
      showToast('Xatolik yuz berdi', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const formatHolidayDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // O'qituvchilar oylik statistikasini yuklash
  const loadTeachersMonthlyStatus = useCallback(async () => {
    try {
      setTeachersLoading(true);
      const data = await apiService.getTeachersMonthlyStatus(teacherYear, teacherMonth);
      setTeachersMonthlyData(data);
    } catch (error) {
      showToast('O\'qituvchilar ma\'lumotlarini yuklashda xatolik', 'warning');
    } finally {
      setTeachersLoading(false);
    }
  }, [teacherYear, teacherMonth]);

  // O'qituvchi tafsilotlarini yuklash
  const loadTeacherDetails = useCallback(async (teacherId) => {
    try {
      setTeachersLoading(true);
      const data = await apiService.getTeacherMonthlyDetails(teacherId, teacherYear, teacherMonth);
      setTeacherDetails(data);
    } catch (error) {
      showToast('O\'qituvchi ma\'lumotlarini yuklashda xatolik', 'warning');
    } finally {
      setTeachersLoading(false);
    }
  }, [teacherYear, teacherMonth]);

  // O'qituvchini tanlash
  const handleSelectTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    loadTeacherDetails(teacher._id);
  };

  // O'qituvchilar tabiga o'tganda yuklash
  useEffect(() => {
    if (activeTab === 'teachers' && !teachersMonthlyData) {
      loadTeachersMonthlyStatus();
    }
  }, [activeTab, teachersMonthlyData, loadTeachersMonthlyStatus]);

  // Oy/yil o'zgarganda qayta yuklash
  useEffect(() => {
    if (activeTab === 'teachers') {
      loadTeachersMonthlyStatus();
      if (selectedTeacher) {
        loadTeacherDetails(selectedTeacher._id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherMonth, teacherYear]);

  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];

  const handlePeriodTimeChange = (index, field, value) => {
    const newPeriodTimes = [...periodTimes];
    newPeriodTimes[index][field] = value;
    setPeriodTimes(newPeriodTimes);

    // Update schedule with new times
    const newSchedule = schedule.map(daySchedule => ({
      ...daySchedule,
      periods: daySchedule.periods.map((period, i) => {
        if (i === index) {
          return {
            ...period,
            startTime: field === 'startTime' ? value : period.startTime,
            endTime: field === 'endTime' ? value : period.endTime
          };
        }
        return period;
      })
    }));
    setSchedule(newSchedule);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleName.trim()) {
      showToast('Jadval nomini kiriting', 'warning');
      return;
    }

    if (!startDate || !endDate) {
      showToast('Boshlanish va tugash sanalarini kiriting', 'warning');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      showToast('Tugash sanasi boshlanish sanasidan kechroq bo\'lishi kerak', 'warning');
      return;
    }

    {
      // Maksimal dars sonini topish
      const maxDayPeriods = Math.max(...schedule.map(day => day.periods.length));

      // Dars vaqtlari yetarli ekanligini tekshirish
      if (periodTimes.length < maxDayPeriods) {
        showToast(`"Dars Vaqtlari" bo'limida ${maxDayPeriods} ta dars vaqtini kiriting (hozir ${periodTimes.length} ta)`, 'warning');
        return;
      }

      // Barcha kunlar va darslarni tekshirish
      for (const daySchedule of schedule) {
        for (const period of daySchedule.periods) {
          if (!period.subject || !period.teacher) {
            showToast('Barcha kunlardagi barcha darslarga fan va o\'qituvchi biriktiring', 'warning');
            return;
          }
        }
      }
    }

    try {
      setLoading(true);

      const scheduleData = {
        classId: selectedClass._id,
        academicYear,
        name: scheduleName,
        startDate,
        endDate,
        periodTimes,
        schedule
      };

      if (viewMode === 'create') {
        await apiService.createSchedule(scheduleData);
        showToast('Jadval muvaffaqiyatli yaratildi');
      } else {
        await apiService.updateSchedule(selectedSchedule._id, scheduleData);
        showToast('Jadval muvaffaqiyatli yangilandi');
      }

      await loadSchedules(selectedClass._id);
      setViewMode('list');
    } catch (error) {
      const message = error.response?.data?.message || 'Jadvalni saqlashda xatolik';
      setError(message);
      showToast(message, 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Jadvalni arxivlashni xohlaysizmi?')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteSchedule(scheduleId);
      showToast('Jadval arxivlandi');
      await loadSchedules(selectedClass._id);
    } catch (error) {
      setError(error.response?.data?.message || 'Jadvalni o\'chirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderScheduleList = () => {
    return (
      <div className="schedule-list">
        <div className="schedule-list-header">
          <h3>Dars Jadvallari</h3>
          <div className="schedule-actions">
            <div className="filter-group">
              <label>Holat:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Barcha</option>
                <option value="active">Aktiv</option>
                <option value="future">Kelajak</option>
                <option value="archived">Arxiv</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Yil:</label>
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                <option value="all">Barcha yillar</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <Can perm="schedule.edit"><button className="btn btn-primary" onClick={handleCreateNew}>
              + Yangi Jadval
            </button></Can>
          </div>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <p>Jadvallar topilmadi</p>
            {schedules.length === 0 && (
              <Can perm="schedule.edit"><button className="btn btn-primary" onClick={handleCreateNew}>
                Birinchi jadvalni yarating
              </button></Can>
            )}
          </div>
        ) : (
          <div className="schedules-grid">
            {filteredSchedules.map((sched) => {
              const status = sched.status || 'archived';
              const statusInfo = statusLabels[status] || statusLabels.archived;

              return (
                <div key={sched._id} className="schedule-card">
                  <div className="schedule-card-header">
                    <h4>{sched.name}</h4>
                    <span className="status-badge" style={{ backgroundColor: statusInfo.color }}>
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                  </div>
                  <div className="schedule-card-body">
                    <div className="schedule-info">
                      <p><strong>O'quv yili:</strong> {sched.academicYear}</p>
                      <p><strong>Bo'lim:</strong> {formatDate(sched.startDate)} - {formatDate(sched.endDate)}</p>
                      <p className="created-info">
                        Yaratdi: {sched.createdBy?.firstName} {sched.createdBy?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="schedule-card-actions">
                    <button className="btn btn-sm btn-info" onClick={() => handleViewSchedule(sched)}>
                      Ko'rish
                    </button>
                    <Can perm="schedule.edit"><button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEditSchedule(sched)}
                      disabled={status === 'archived'}
                      title={status === 'archived' ? 'Arxivlangan jadvallarni tahrirlash mumkin emas' : ''}
                    >
                      Tahrirlash
                    </button></Can>
                    <Can perm="schedule.edit"><button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteSchedule(sched._id)}
                      disabled={status !== 'expired'}
                      title={status !== 'expired' ? 'Faqat muddati o\'tgan jadvallarni arxivlash mumkin' : ''}
                    >
                      Arxivlash
                    </button></Can>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderScheduleForm = () => {
    return (
      <div className="schedule-form">
        <div className="form-header">
          <button className="btn btn-text" onClick={() => setViewMode('list')}>
            ← Orqaga
          </button>
          <h3>{viewMode === 'create' ? 'Yangi Jadval' : 'Jadvalni Tahrirlash'}</h3>
        </div>

        {viewMode === 'edit' && selectedSchedule?.status === 'active' && (
          <div className="active-schedule-warning">
            <span className="warning-icon">⚠️</span>
            <span>Amaldagi jadval tahrirlanmoqda. Saqlangan o'zgarishlar darhol qo'llanadi.</span>
          </div>
        )}

        <div className="form-fields">
          <div className="form-row">
            <div className="form-group">
              <label>Jadval nomi *</label>
              <input
                type="text"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="Masalan: 1-semestr jadvali"
              />
            </div>
            <div className="form-group">
              <label>O'quv yili *</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2024-2025"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Boshlanish sanasi *
                {viewMode === 'create' && dateInfo.suggestedStartDate && (
                  <span className="auto-date-hint">(tavsiya: {dateInfo.suggestedStartDate})</span>
                )}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  // Mavjud jadval sanasiga ruxsat bermang
                  if (isDateInExistingRange(newDate)) {
                    showToast('Bu sana boshqa jadval bilan band!', 'warning');
                    return;
                  }
                  setStartDate(newDate);
                }}
              />
              {viewMode === 'create' && dateInfo.hasExistingSchedules && (
                <small className="date-info">
                  Band sanalar: {dateInfo.existingRanges?.map(r => `${r.start} - ${r.end}`).join(', ')}
                </small>
              )}
              {viewMode === 'create' && !dateInfo.hasExistingSchedules && (
                <small className="date-info">Bu sinf uchun birinchi jadval - istalgan sanani tanlang</small>
              )}
            </div>
            <div className="form-group">
              <label>
                Tugash sanasi *
                {viewMode === 'create' && startDate && getMaxEndDate(startDate) && (
                  <span className="auto-date-hint">(max: {getMaxEndDate(startDate)})</span>
                )}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  const newEndDate = e.target.value;
                  const maxEnd = getMaxEndDate(startDate);

                  // Mavjud jadval sanasiga ruxsat bermang
                  if (isDateInExistingRange(newEndDate)) {
                    showToast('Bu sana boshqa jadval bilan band!', 'warning');
                    return;
                  }

                  // Maksimal sanadan oshmasligini tekshirish
                  if (maxEnd && newEndDate > maxEnd) {
                    showToast(`Tugash sanasi ${maxEnd} dan oshmasligi kerak (keyingi jadval bor)`, 'warning');
                    setEndDate(maxEnd);
                    return;
                  }

                  // Yakshanba yoki bayramga tugashni tekshirish
                  if (isSundayOrHoliday(newEndDate)) {
                    const dayName = new Date(newEndDate).getDay() === 0 ? 'yakshanba' : 'bayram kuni';
                    showToast(`Diqqat: ${newEndDate} - ${dayName}`, 'warning');
                  }

                  setEndDate(newEndDate);
                }}
                min={startDate}
                max={viewMode === 'create' ? getMaxEndDate(startDate) || undefined : undefined}
              />
              {viewMode === 'create' && startDate && getMaxEndDate(startDate) && (
                <small className="date-info" style={{ color: '#f59e0b' }}>
                  Keyingi jadval {new Date(new Date(getMaxEndDate(startDate)).getTime() + 86400000).toISOString().split('T')[0]} da boshlanadi
                </small>
              )}
            </div>
          </div>

          {/* Mavjud jadvallar haqida ma'lumot */}
          {viewMode === 'create' && dateInfo.existingRanges && dateInfo.existingRanges.length > 0 && (
            <div className="existing-schedules-info">
              <div className="info-title">
                <span>📅</span> Mavjud jadvallar
              </div>
              <ul className="schedules-list">
                {dateInfo.existingRanges.map((range, index) => (
                  <li key={index}>
                    <strong>{range.name}</strong>: {range.start} - {range.end}
                  </li>
                ))}
              </ul>
              {/* Bo'sh kunlar va bayram bo'shliqlarini ko'rsatish */}
              {dateInfo.gaps && dateInfo.gaps.filter(g => g.end !== null).length > 0 && (
                <>
                  <div className="info-title" style={{ marginTop: '12px' }}>
                    <span>📋</span> Bo'sh davrlar
                  </div>
                  <ul className="schedules-list">
                    {dateInfo.gaps.filter(g => g.end !== null).map((gap, index) => (
                      <li key={index} style={{ color: gap.isAllHolidays ? '#f59e0b' : '#10b981' }}>
                        {gap.start} - {gap.end}
                        {gap.isAllHolidays && <span style={{ marginLeft: '8px', fontSize: '0.85em' }}>(faqat bayram/yakshanba - o'tkazib yuboriladi)</span>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        <div className="period-times-editor">
          <div className="editor-header">
            <h4>⏰ Dars Vaqtlari</h4>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleAddPeriod}
              type="button"
            >
              + Dars qo'shish
            </button>
          </div>
          <div className="period-times-grid">
            {periodTimes.map((period, index) => (
              <div key={index} className="period-time-row">
                <input
                  type="text"
                  value={period.label}
                  onChange={(e) => {
                    const newPeriodTimes = [...periodTimes];
                    newPeriodTimes[index].label = e.target.value;
                    setPeriodTimes(newPeriodTimes);
                  }}
                  placeholder="Dars nomi"
                  className="period-label-input"
                />
                <div className="time-inputs">
                  <label>Boshlanish:</label>
                  <input
                    type="time"
                    value={period.startTime}
                    onChange={(e) => handlePeriodTimeChange(index, 'startTime', e.target.value)}
                    className="time-input"
                  />
                </div>
                <div className="time-inputs">
                  <label>Tugash:</label>
                  <input
                    type="time"
                    value={period.endTime}
                    onChange={(e) => handlePeriodTimeChange(index, 'endTime', e.target.value)}
                    className="time-input"
                  />
                </div>
                {periodTimes.length > 1 && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleRemovePeriod(index)}
                    type="button"
                    title="Darsni o'chirish"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="schedule-editor">
          <h4>📅 Dars Jadvali</h4>

          {/* Kunlar boshqaruvi */}
          <div className="days-control-bar">
            <span className="days-control-label">📅 Dars Kunlari:</span>
            <div className="days-chips">
              {daysOfWeek.map(dayKey => {
                const isIncluded = schedule.some(s => s.day === dayKey);
                return (
                  <button
                    key={dayKey}
                    type="button"
                    className={`day-chip ${isIncluded ? 'active' : 'inactive'}`}
                    onClick={() => {
                      if (isIncluded) {
                        const idx = schedule.findIndex(s => s.day === dayKey);
                        if (idx !== -1) handleRemoveDay(idx);
                      } else {
                        handleAddDay(dayKey);
                      }
                    }}
                    title={isIncluded ? `${dayNames[dayKey]} kunini olib tashlash` : `${dayNames[dayKey]} kunini qo'shish`}
                  >
                    {isIncluded ? '✓ ' : '+ '} {dayNames[dayKey]}
                  </button>
                );
              })}
            </div>
          </div>

          {schedule.map((daySchedule, dayIndex) => {
            const isActiveEdit = false;
            return (
              <div key={daySchedule.day} className="day-schedule">
                <div className="day-header">
                  <h5>
                    <span>📅</span> {dayNames[daySchedule.day]} <span className="day-period-count">({daySchedule.periods.length} ta dars soati)</span>
                  </h5>
                  {!isActiveEdit && (
                    <div className="day-actions">
                      <button
                        type="button"
                        className="btn-day-action btn-add-p"
                        onClick={() => handleAddPeriodToDay(dayIndex)}
                        title="Dars soati qo'shish"
                      >
                        + Dars
                      </button>
                      {daySchedule.periods.length > 1 && (
                        <button
                          type="button"
                          className="btn-day-action btn-rem-p"
                          onClick={() => handleRemovePeriodFromDay(dayIndex)}
                          title="Oxirgi dars soatini olib tashlash"
                        >
                          − Dars
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-day-action btn-del-day"
                        onClick={() => handleRemoveDay(dayIndex)}
                        title="Ushbu kunni jadvaldan o'chirish"
                      >
                        🗑️ Kunni o'chirish
                      </button>
                    </div>
                  )}
                </div>

                <div className="periods-grid">
                  {daySchedule.periods.map((period, periodIndex) => {
                    const conflictKey = `${dayIndex}-${periodIndex}`;
                    const hasConflict = teacherConflicts[conflictKey];
                    const isActiveEdit = false;
                    const isAssigned = period.subject && period.teacher;

                    return (
                      <div key={periodIndex} className={`period-row ${isAssigned ? 'period-assigned' : 'period-empty'} ${hasConflict ? 'has-conflict' : ''}`}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%' }}>
                          <div className="period-info">
                            <strong>{periodTimes[periodIndex]?.label || `${periodIndex + 1}-dars`}</strong>
                            <span>{period.startTime} - {period.endTime}</span>
                            {isAssigned && <span className="assigned-badge">✓ Biriktirilgan</span>}
                          </div>
                          <div className="period-fields">
                            <select
                              value={period.subject || ''}
                              onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'subject', e.target.value)}
                              disabled={isActiveEdit}
                              className={period.subject ? 'select-selected' : ''}
                            >
                              <option value="">📘 Fan tanlang</option>
                              {subjects.map(subj => (
                                <option key={subj._id} value={subj._id}>
                                  {subj.name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={period.teacher || ''}
                              onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'teacher', e.target.value)}
                              disabled={!period.subject || isActiveEdit}
                              className={period.teacher ? 'select-selected' : ''}
                            >
                              <option value="">
                                {!period.subject ? 'Avval fan tanlang' : '👨‍🏫 O\'qituvchi tanlang'}
                              </option>
                              {period.subject && (() => {
                                // Tanlangan fan ma'lumotlarini topish
                                const selectedSubject = subjects.find(s => s._id === period.subject);

                                // Bu vaqtda band o'qituvchilarni olish
                                const busyKey = `${daySchedule.day}-${period.startTime}-${period.endTime}`;
                                const busyTeacherIds = busyTeachers[busyKey] || [];

                                // Agar fan topilsa va teachers maydoni bo'lsa
                                if (selectedSubject && selectedSubject.teachers && selectedSubject.teachers.length > 0) {
                                  // Faqat shu fanni o'qituvchi o'qituvchilarni ko'rsatish
                                  const subjectTeacherIds = selectedSubject.teachers.map(t =>
                                    typeof t === 'string' ? t : (t._id || t)
                                  );

                                  return teachers
                                    .filter(teacher => subjectTeacherIds.includes(teacher._id))
                                    .filter(teacher => !busyTeacherIds.includes(teacher._id))
                                    .map(teacher => (
                                      <option key={teacher._id} value={teacher._id}>
                                        {teacher.firstName} {teacher.lastName}
                                      </option>
                                    ));
                                } else {
                                  // Agar fan uchun o'qituvchilar belgilanmagan bo'lsa, barcha bo'sh o'qituvchilarni ko'rsatish
                                  return teachers
                                    .filter(teacher => !busyTeacherIds.includes(teacher._id))
                                    .map(teacher => (
                                      <option key={teacher._id} value={teacher._id}>
                                        {teacher.firstName} {teacher.lastName}
                                      </option>
                                    ));
                                }
                              })()}
                            </select>
                            {(period.subject || period.teacher) && !isActiveEdit && (
                              <button
                                className="btn btn-sm btn-clear-slot"
                                onClick={() => handleClearPeriod(dayIndex, periodIndex)}
                                title="Darsni tozalash"
                                type="button"
                              >
                                ✕ Tozalash
                              </button>
                            )}
                          </div>
                        </div>
                        {hasConflict && (
                          <div className="conflict-warning">
                            ⚠️ Bu o'qituvchi <strong>{hasConflict.className}</strong> sinfida {dayNames[hasConflict.day]} kuni {hasConflict.startTime} - {hasConflict.endTime} vaqtida band
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => setViewMode('list')}>
            Bekor qilish
          </button>
          <Can perm="schedule.edit"><button className="btn btn-primary" onClick={handleSaveSchedule}>
            Saqlash
          </button></Can>
        </div>
      </div>
    );
  };

  // O'qituvchilar bo'limini render qilish
  const renderTeachersSection = () => {
    return (
      <div className="teachers-section">
        {/* Oy tanlash */}
        <div className="teachers-filter-bar">
          <div className="month-selector">
            <button
              className="btn btn-icon"
              onClick={() => {
                if (teacherMonth === 1) {
                  setTeacherMonth(12);
                  setTeacherYear(teacherYear - 1);
                } else {
                  setTeacherMonth(teacherMonth - 1);
                }
              }}
            >
              ←
            </button>
            <div className="month-display">
              <span className="month-name">{monthNames[teacherMonth - 1]}</span>
              <span className="year">{teacherYear}</span>
            </div>
            <button
              className="btn btn-icon"
              onClick={() => {
                if (teacherMonth === 12) {
                  setTeacherMonth(1);
                  setTeacherYear(teacherYear + 1);
                } else {
                  setTeacherMonth(teacherMonth + 1);
                }
              }}
            >
              →
            </button>
          </div>
          <button
            className="btn btn-secondary"
            onClick={loadTeachersMonthlyStatus}
          >
            🔄 Yangilash
          </button>
        </div>

        {teachersLoading ? (
          <div className="teachers-loading">
            <div className="loading-spinner"></div>
            <p>Yuklanmoqda...</p>
          </div>
        ) : !selectedTeacher ? (
          /* O'qituvchilar ro'yxati */
          <div className="teachers-list">
            <h3>👨‍🏫 O'qituvchilar ({teachersMonthlyData?.teachers?.length || 0})</h3>
            <div className="teachers-grid">
              {teachersMonthlyData?.teachers?.map(teacherData => {
                const completionRate = teacherData.totalLessons > 0
                  ? Math.round((teacherData.gradedCount / (teacherData.gradedCount + teacherData.notGradedCount)) * 100) || 0
                  : 0;

                return (
                  <div
                    key={teacherData.teacher._id}
                    className="teacher-card"
                    onClick={() => handleSelectTeacher(teacherData.teacher)}
                  >
                    <div className="teacher-avatar">
                      {teacherData.teacher.profileImage ? (
                        <img
                          src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://my-dream-school.onrender.com'}${teacherData.teacher.profileImage}`}
                          alt=""
                        />
                      ) : (
                        <span>{teacherData.teacher.firstName?.[0]}{teacherData.teacher.lastName?.[0]}</span>
                      )}
                    </div>
                    <div className="teacher-info">
                      <h4>{teacherData.teacher.firstName} {teacherData.teacher.lastName}</h4>
                      <p className="teacher-phone">{teacherData.teacher.phone}</p>
                      <div className="teacher-stats">
                        <span className="stat stat-total" title="Jami darslar">
                          📚 {teacherData.totalLessons}
                        </span>
                        <span className="stat stat-graded" title="Baho qo'yilgan">
                          ✅ {teacherData.gradedCount}
                        </span>
                        <span className="stat stat-missed" title="Baho qo'yilmagan">
                          ❌ {teacherData.notGradedCount}
                        </span>
                      </div>
                      <div className="completion-bar">
                        <div
                          className="completion-fill"
                          style={{
                            width: `${completionRate}%`,
                            backgroundColor: completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444'
                          }}
                        ></div>
                      </div>
                      <span className="completion-text">{completionRate}% bajarilgan</span>
                    </div>
                    <div className="teacher-arrow">→</div>
                  </div>
                );
              })}
            </div>
            {(!teachersMonthlyData?.teachers || teachersMonthlyData.teachers.length === 0) && (
              <div className="empty-state">
                <div className="empty-icon">👨‍🏫</div>
                <p>Bu oyda dars o'tadigan o'qituvchilar topilmadi</p>
              </div>
            )}
          </div>
        ) : (
          /* O'qituvchi tafsilotlari */
          <div className="teacher-details">
            <div className="teacher-details-header">
              <button className="btn btn-back" onClick={() => {
                setSelectedTeacher(null);
                setTeacherDetails(null);
              }}>
                ← Orqaga
              </button>
              <div className="teacher-title">
                <h3>
                  {teacherDetails?.teacher?.firstName} {teacherDetails?.teacher?.lastName}
                </h3>
                <span className="teacher-period">
                  {monthNames[teacherMonth - 1]} {teacherYear}
                </span>
              </div>
            </div>

            {/* Statistika */}
            {teacherDetails?.stats && (
              <div className="teacher-stats-grid">
                <div className="stat-card stat-total">
                  <span className="stat-icon">📚</span>
                  <span className="stat-value">{teacherDetails.stats.totalExpectedLessons}</span>
                  <span className="stat-label">Jami darslar</span>
                </div>
                <div className="stat-card stat-completed">
                  <span className="stat-icon">✅</span>
                  <span className="stat-value">{teacherDetails.stats.completedLessons}</span>
                  <span className="stat-label">Bajarilgan</span>
                </div>
                <div className="stat-card stat-missed">
                  <span className="stat-icon">❌</span>
                  <span className="stat-value">{teacherDetails.stats.missedLessons}</span>
                  <span className="stat-label">O'tilmagan</span>
                </div>
                <div className="stat-card stat-upcoming">
                  <span className="stat-icon">📅</span>
                  <span className="stat-value">{teacherDetails.stats.upcomingLessons}</span>
                  <span className="stat-label">Kelayotgan</span>
                </div>
              </div>
            )}

            {/* Sinflar ro'yxati */}
            {teacherDetails?.classes && teacherDetails.classes.length > 0 && (
              <div className="teacher-classes-list">
                <h4>📖 O'qitadigan sinflar:</h4>
                <div className="classes-badges">
                  {teacherDetails.classes.map(cls => (
                    <span key={cls.id} className="class-badge">{cls.name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Kalendar */}
            <div className="teacher-calendar">
              <h4>📅 Oylik darslar takvimi</h4>
              <div className="calendar-grid">
                {/* Hafta kunlari sarlavhasi */}
                <div className="calendar-header">
                  {['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'].map(day => (
                    <div key={day} className="calendar-header-cell">{day}</div>
                  ))}
                </div>

                {/* Kalendar kunlari */}
                <div className="calendar-body">
                  {(() => {
                    const calendar = teacherDetails?.calendar || [];
                    const firstDay = new Date(teacherYear, teacherMonth - 1, 1).getDay();
                    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Dushanbadan boshlash
                    const emptyCells = Array(adjustedFirstDay).fill(null);

                    return [...emptyCells, ...calendar].map((day, index) => {
                      if (!day) {
                        return <div key={`empty-${index}`} className="calendar-cell empty"></div>;
                      }

                      const hasLessons = day.lessons && day.lessons.length > 0;
                      const hasMissed = day.lessons?.some(l => l.status === 'missed');
                      const allCompleted = day.lessons?.every(l => l.status === 'completed' || l.status === 'holiday');
                      const hasUpcoming = day.lessons?.some(l => l.status === 'upcoming');

                      let cellClass = 'calendar-cell';
                      if (day.isToday) cellClass += ' today';
                      if (day.isHoliday) cellClass += ' holiday';
                      if (!hasLessons) cellClass += ' no-lessons';
                      else if (hasMissed) cellClass += ' has-missed';
                      else if (allCompleted) cellClass += ' all-completed';
                      else if (hasUpcoming) cellClass += ' has-upcoming';

                      return (
                        <div key={day.date} className={cellClass} title={day.date}>
                          <span className="day-number">{day.dayOfMonth}</span>
                          {hasLessons && (
                            <div className="day-lessons">
                              {day.lessons.map((lesson, idx) => (
                                <div
                                  key={idx}
                                  className={`lesson-dot ${lesson.status}`}
                                  title={`${lesson.className}: ${lesson.subjectName} (${lesson.startTime}-${lesson.endTime}) - ${lesson.status === 'completed' ? '✅ Bajarildi' :
                                    lesson.status === 'missed' ? '❌ O\'tilmadi' :
                                      lesson.status === 'holiday' ? '🎉 Bayram' :
                                        '📅 Kelayotgan'
                                    }`}
                                >
                                  {lesson.status === 'completed' && '✓'}
                                  {lesson.status === 'missed' && '✗'}
                                  {lesson.status === 'upcoming' && '○'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Legend */}
              <div className="calendar-legend">
                <div className="legend-item">
                  <span className="legend-dot completed">✓</span>
                  <span>Bajarildi (baho qo'yildi)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot missed">✗</span>
                  <span>O'tilmadi (baho qo'yilmadi)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot upcoming">○</span>
                  <span>Kelayotgan dars</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot holiday">🎉</span>
                  <span>Bayram/dam olish</span>
                </div>
              </div>
            </div>

            {/* O'tilmagan darslar ro'yxati */}
            {teacherDetails?.calendar && (
              <div className="missed-lessons-list">
                <h4>❌ O'tilmagan (baho qo'yilmagan) darslar</h4>
                {(() => {
                  const missedLessons = [];
                  teacherDetails.calendar.forEach(day => {
                    day.lessons?.forEach(lesson => {
                      if (lesson.status === 'missed') {
                        missedLessons.push({
                          date: day.date,
                          dayName: day.dayName,
                          ...lesson
                        });
                      }
                    });
                  });

                  if (missedLessons.length === 0) {
                    return (
                      <div className="no-missed">
                        <span>✅</span>
                        <p>Barcha darslar bajarilgan!</p>
                      </div>
                    );
                  }

                  return (
                    <div className="missed-lessons-grid">
                      {missedLessons.map((lesson, idx) => (
                        <div key={idx} className="missed-lesson-card">
                          <div className="missed-date">
                            <span className="date-day">{new Date(lesson.date).getDate()}</span>
                            <span className="date-month">{monthNames[new Date(lesson.date).getMonth()]?.slice(0, 3)}</span>
                          </div>
                          <div className="missed-info">
                            <h5>{lesson.className}</h5>
                            <p>{lesson.subjectName}</p>
                            <span className="missed-time">{lesson.startTime} - {lesson.endTime}</span>
                          </div>
                          <div className="missed-status">
                            <span className="status-badge missed">Dars o'tilmadi</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderScheduleView = () => {
    if (!selectedSchedule) return null;

    return (
      <div className="schedule-view-container">
        <div className="view-header">
          <button className="btn btn-text" onClick={() => setViewMode('list')}>
            ← Orqaga
          </button>
          <div className="view-title-section">
            <h3>📅 {selectedSchedule.name}</h3>
            <span className="status-badge" style={{ backgroundColor: statusLabels[selectedSchedule.status || 'archived'].color }}>
              {statusLabels[selectedSchedule.status || 'archived'].icon} {statusLabels[selectedSchedule.status || 'archived'].label}
            </span>
          </div>
        </div>

        <div className="view-info-section">
          <div className="view-info-cards">
            <div className="info-card">
              <div className="info-icon">📚</div>
              <div className="info-content">
                <span className="info-label">O'quv yili</span>
                <span className="info-value">{selectedSchedule.academicYear}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">📆</div>
              <div className="info-content">
                <span className="info-label">Bo'lim</span>
                <span className="info-value">{formatDate(selectedSchedule.startDate)} - {formatDate(selectedSchedule.endDate)}</span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">👤</div>
              <div className="info-content">
                <span className="info-label">Yaratuvchi</span>
                <span className="info-value">{selectedSchedule.createdBy?.firstName} {selectedSchedule.createdBy?.lastName}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="schedule-table-view">
          <div className="schedule-table-header">
            <h4>📅 Haftalik Dars Jadvali</h4>
            <div className="version-info">
              <span className="version-badge">
                📍 Joriy ko'rsatilayotgan jadval
              </span>
            </div>
          </div>

          <table className="view-table">
            <thead>
              <tr>
                <th className="day-column">
                  <div className="day-header-content">
                    <strong>Kun</strong>
                  </div>
                </th>
                {(selectedSchedule.periodTimes || []).map((period, idx) => (
                  <th key={idx} className="period-column">
                    <div className="period-header">
                      <strong>{period.label || `${idx + 1}-dars`}</strong>
                      <span>{period.startTime} - {period.endTime}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedSchedule.schedule?.map((daySchedule, dayIdx) => (
                <tr key={daySchedule.day}>
                  <td className="day-cell">
                    <strong>{dayNames[daySchedule.day]}</strong>
                  </td>
                  {daySchedule.periods?.map((period, idx) => {
                    // Handle both populated objects and IDs
                    const subjectObj = typeof period.subject === 'object' && period.subject !== null
                      ? period.subject
                      : subjects.find(s => s._id === period.subject);

                    const teacherObj = typeof period.teacher === 'object' && period.teacher !== null
                      ? period.teacher
                      : teachers.find(t => t._id === period.teacher);

                    return (
                      <td key={idx} className="period-cell">
                        {period.subject && period.teacher ? (
                          <div className="period-content">
                            <div className="subject-name">{subjectObj?.name || 'Noma\'lum fan'}</div>
                            <div className="teacher-name">
                              {teacherObj?.firstName || ''} {teacherObj?.lastName || 'Noma\'lum o\'qituvchi'}
                            </div>
                          </div>
                        ) : (
                          <div className="empty-period">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="view-actions">
          <button className="btn btn-secondary" onClick={() => setViewMode('list')}>
            Yopish
          </button>
          <Can perm="schedule.edit"><button className="btn btn-primary" onClick={() => handleEditSchedule(selectedSchedule)}>
            ✏️ Tahrirlash
          </button></Can>
        </div>
      </div>
    );
  };

  return (
    <div className="schedule-management">
      {/* Tablar - faqat sinf tanlanmagan bo'lsa ko'rinadi */}
      {!selectedClass && (
        <div className="schedule-tabs">
          <button
            className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            🏫 Sinflar va Jadvallar
          </button>
          <button
            className={`tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
            onClick={() => setActiveTab('teachers')}
          >
            👨‍🏫 O'qituvchilar
          </button>
        </div>
      )}

      {/* O'qituvchilar bo'limi */}
      {!selectedClass && activeTab === 'teachers' ? (
        renderTeachersSection()
      ) : !selectedClass ? (
        <div className="class-selection-view">
          {/* Bayram kunlari bo'limi */}
          <div className="holidays-section">
            <div className="holidays-header">
              <h3>🎉 Bayram kunlari</h3>
              <button className="btn btn-primary" onClick={() => openHolidayModal()}>
                + Bayram qo'shish
              </button>
            </div>
            {holidays.length === 0 ? (
              <div className="holidays-empty">
                <p>Bayram kunlari belgilanmagan</p>
              </div>
            ) : (
              <div className="holidays-list">
                {holidays.map(holiday => {
                  const typeInfo = holidayTypes[holiday.type] || holidayTypes.other;
                  return (
                    <div key={holiday._id} className="holiday-card">
                      <div className="holiday-icon" style={{ backgroundColor: typeInfo.color }}>
                        {typeInfo.icon}
                      </div>
                      <div className="holiday-info">
                        <h4>{holiday.name}</h4>
                        <p className="holiday-date">
                          {formatHolidayDate(holiday.date)}
                          {holiday.endDate && holiday.endDate !== holiday.date && (
                            <> — {formatHolidayDate(holiday.endDate)}</>
                          )}
                        </p>
                        <span className="holiday-type-badge" style={{ backgroundColor: typeInfo.color }}>
                          {typeInfo.label}
                        </span>
                      </div>
                      <div className="holiday-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => openHolidayModal(holiday)}>
                          ✏️
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteHoliday(holiday)}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sinflar ro'yxati */}
          <div className="classes-section">
            <h3>🏫 Sinflar</h3>
          </div>
          <div className="classes-grid">
            {filteredClasses.map((classItem) => {
              const studentCount = classItem.students?.length || classItem.studentCount || 0;
              const classTeacher = classItem.classTeacher;
              const teacherName = classTeacher
                ? `${classTeacher.firstName || ''} ${classTeacher.lastName || ''}`.trim()
                : 'Sinf rahbari yo\'q';

              return (
                <div
                  key={classItem._id}
                  className="class-card"
                  onClick={() => handleClassSelect(classItem._id)}
                >
                  <div className="class-icon">🏫</div>
                  <div className="class-info">
                    <h3 className="class-name">{classItem.name}</h3>
                    <p className="class-students">
                      {studentCount} o'quvchi
                    </p>
                    <p className="class-teacher">
                      {teacherName}
                    </p>
                  </div>
                  <div className="class-arrow">→</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="schedule-view">
          {viewMode === 'list' && (
            <div className="back-navigation">
              <button className="btn-back" onClick={() => setSelectedClass(null)}>
                ← Orqaga
              </button>
              <h3 className="selected-class-name">{selectedClass.name}</h3>
            </div>
          )}
          {viewMode === 'list' ? renderScheduleList() : viewMode === 'view' ? renderScheduleView() : renderScheduleForm()}
        </div>
      )}

      {successMessage && (
        <div className={`toast ${toastType === 'warning' ? 'toast-warning' : 'toast-success'}`}>
          {toastType === 'warning' && <span>⚠️ </span>}
          {successMessage}
        </div>
      )}

      {deleteModal.show && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-icon">🗑️</div>
            <h3>Darsni o'chirish</h3>
            <p>
              <strong>{periodTimes[deleteModal.periodIndex]?.label}</strong> darsini o'chirmoqchimisiz?
            </p>
            <p className="delete-modal-warning">Bu amal barcha kunlardagi ushbu darsni o'chiradi!</p>
            <div className="delete-modal-actions">
              <button className="btn btn-secondary" onClick={cancelDelete}>
                Bekor qilish
              </button>
              <button className="btn btn-danger" onClick={confirmDeletePeriod}>
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {showHolidayModal && (
        <div className="delete-modal-overlay">
          <div className="holiday-modal">
            <div className="holiday-modal-header">
              <h3>{editingHoliday ? '✏️ Bayramni tahrirlash' : '🎉 Yangi bayram qo\'shish'}</h3>
              <button className="btn-close" onClick={closeHolidayModal}>×</button>
            </div>
            <div className="holiday-modal-body">
              <div className="form-group">
                <label>Bayram nomi *</label>
                <input
                  type="text"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  placeholder="Masalan: Mustaqillik kuni"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Boshlanish sanasi *</label>
                  <input
                    type="date"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Tugash sanasi (agar bir necha kun bo'lsa)</label>
                  <input
                    type="date"
                    value={holidayForm.endDate}
                    onChange={(e) => setHolidayForm({ ...holidayForm, endDate: e.target.value })}
                    min={holidayForm.date}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bayram turi</label>
                  <select
                    value={holidayForm.type}
                    onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value })}
                  >
                    <option value="national">🏛️ Davlat bayrami</option>
                    <option value="religious">🕌 Diniy bayram</option>
                    <option value="school">🏫 Maktab dam olish</option>
                    <option value="other">📅 Boshqa</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>O'quv yili</label>
                  <input
                    type="text"
                    value={holidayForm.academicYear}
                    onChange={(e) => setHolidayForm({ ...holidayForm, academicYear: e.target.value })}
                    placeholder="2024-2025"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Izoh</label>
                <textarea
                  value={holidayForm.description}
                  onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                  placeholder="Qo'shimcha ma'lumot..."
                  rows="2"
                />
              </div>
            </div>
            <div className="holiday-modal-footer">
              <button className="btn btn-secondary" onClick={closeHolidayModal}>
                Bekor qilish
              </button>
              <button className="btn btn-primary" onClick={handleSaveHoliday}>
                {editingHoliday ? 'Saqlash' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bayram o'chirish modal */}
      {deleteHolidayModal.show && (
        <div className="delete-modal-overlay">
          <div className="delete-holiday-modal">
            <div className="delete-holiday-icon">
              <span className="icon-bg">🎉</span>
              <span className="icon-warning">⚠️</span>
            </div>
            <h3>Bayramni o'chirish</h3>
            <p className="holiday-name">
              "{deleteHolidayModal.holiday?.name}"
            </p>
            <p className="holiday-date">
              📅 {deleteHolidayModal.holiday && formatHolidayDate(deleteHolidayModal.holiday.date)}
              {deleteHolidayModal.holiday?.endDate && ` - ${formatHolidayDate(deleteHolidayModal.holiday.endDate)}`}
            </p>
            <div className="delete-holiday-warning">
              <span className="warning-icon">⚠️</span>
              <span>Bu amalni qaytarib bo'lmaydi!</span>
            </div>
            <div className="delete-holiday-actions">
              <button className="btn btn-cancel" onClick={cancelDeleteHoliday}>
                <span>✕</span> Bekor qilish
              </button>
              <button className="btn btn-confirm-delete" onClick={confirmDeleteHoliday}>
                <span>🗑️</span> O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .schedule-management {
          padding: 1rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .section-header {
          margin-bottom: 1.25rem;
          text-align: center;
          position: relative;
        }

        .section-header::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 4px;
          background: linear-gradient(90deg, #1e3a8a 0%, #fbbf24 100%);
          border-radius: 2px;
        }

        .section-header h2 {
          color: #1e3a8a;
          margin-bottom: 0.75rem;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        /* Class Selection View */
        .class-selection-view {
          margin-top: 1rem;
        }

        .class-selection-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .selection-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e3a8a;
          margin: 0 0 0.375rem 0;
          letter-spacing: -0.025em;
        }

        .selection-subtitle {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0;
          font-weight: 500;
        }

        /* Classes Grid - Copied from AttendanceManagement */
        .classes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .class-card {
          background: white;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }

        .class-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(251, 191, 36, 0.05) 100%);
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        .class-card:hover::before {
          opacity: 1;
        }

        .class-card:hover {
          transform: translateY(-3px);
          border-color: #3b82f6;
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.15);
        }

        .class-icon {
          font-size: 1.75rem;
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(30, 58, 138, 0.2);
          position: relative;
          z-index: 1;
          transition: all 0.3s ease;
        }

        .class-card:hover .class-icon {
          transform: rotate(-5deg) scale(1.1);
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        }

        .class-info {
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .class-name {
          font-size: 1rem;
          font-weight: 700;
          color: #1e3a8a;
          margin: 0 0 0.375rem;
          letter-spacing: -0.01em;
        }

        .class-students {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0.25rem 0 0.375rem 0;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .class-students::before {
          content: '👥';
          font-size: 1rem;
        }

        .class-teacher {
          font-size: 0.6875rem;
          color: #1e3a8a;
          margin: 0;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.5rem;
          background: rgba(30, 58, 138, 0.08);
          border-radius: 6px;
          width: fit-content;
        }

        .class-teacher::before {
          content: '👨‍🏫';
          font-size: 1rem;
        }

        .class-arrow {
          font-size: 1.25rem;
          color: #1e3a8a;
          font-weight: 700;
          transition: all 0.3s ease;
          position: relative;
          z-index: 1;
        }

        .class-card:hover .class-arrow {
          color: #fbbf24;
          transform: translateX(8px);
        }

        /* Schedule View */
        .schedule-view {
          margin-top: 1rem;
        }

        .back-navigation {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          background: white;
          border-radius: 10px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
        }

        .btn-back {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.8125rem;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.2);
        }

        .btn-back:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
        }

        .selected-class-name {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e3a8a;
          margin: 0;
        }

        .class-selector {
          margin-bottom: 2.5rem;
          position: relative;
          max-width: 450px;
          margin-left: auto;
          margin-right: auto;
        }

        .class-selector label {
          display: block;
          margin-bottom: 0.75rem;
          font-weight: 600;
          color: #1e3a8a;
          font-size: 1.05rem;
        }

        .custom-select {
          position: relative;
          width: 100%;
        }

        .select-button {
          width: 100%;
          padding: 1rem 1.25rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 1.05rem;
          font-weight: 500;
          color: #1e3a8a;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .select-button:hover {
          border-color: #1e3a8a;
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.15);
          transform: translateY(-2px);
        }

        .dropdown-arrow {
          color: #fbbf24;
          font-size: 0.875rem;
          transition: transform 0.3s ease;
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          right: 0;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          z-index: 100;
          animation: dropdown-appear 0.3s ease;
        }

        @keyframes dropdown-appear {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .search-input {
          width: 100%;
          padding: 1rem;
          border: none;
          border-bottom: 2px solid #f3f4f6;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.3s ease;
        }

        .search-input:focus {
          border-bottom-color: #fbbf24;
        }

        .dropdown-options {
          max-height: 300px;
          overflow-y: auto;
        }

        .dropdown-options::-webkit-scrollbar {
          width: 8px;
        }

        .dropdown-options::-webkit-scrollbar-track {
          background: #f3f4f6;
        }

        .dropdown-options::-webkit-scrollbar-thumb {
          background: #1e3a8a;
          border-radius: 4px;
        }

        .dropdown-option {
          padding: 1rem 1.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
          color: #374151;
          font-weight: 500;
        }

        .dropdown-option:hover {
          background: linear-gradient(90deg, #fef3c7 0%, #fef9e7 100%);
          border-left-color: #fbbf24;
          color: #1e3a8a;
          padding-left: 1.5rem;
        }

        .schedule-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          background: white;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(30, 58, 138, 0.08);
          border: 1px solid rgba(30, 58, 138, 0.06);
          position: relative;
          overflow: hidden;
        }

        .schedule-list-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #1e3a8a 0%, #3b82f6 50%, #fbbf24 100%);
        }

        .schedule-list-header h3 {
          color: #1e3a8a;
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .schedule-list-header h3::before {
          content: '📋';
          font-size: 1.25rem;
        }

        .schedule-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8fafc;
          padding: 0.5rem 0.875rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
        }

        .filter-group:hover {
          border-color: #fbbf24;
          box-shadow: 0 6px 20px rgba(251, 191, 36, 0.15);
        }

        .filter-group label {
          font-weight: 600;
          color: #1e3a8a;
          font-size: 0.8125rem;
          letter-spacing: 0.3px;
        }

        .filter-group label::before {
          content: '🔍';
          margin-right: 0.5rem;
        }

        .filter-group select {
          padding: 0.5rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          font-weight: 600;
          color: #1e3a8a;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-group select:focus {
          outline: none;
          border-color: #fbbf24;
          box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.15);
          transform: scale(1.02);
        }

        .filter-group select:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
        }

        .schedules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
          animation: fade-in 0.6s ease-in-out;
        }

        .schedule-card {
          background: white;
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(30, 58, 138, 0.06);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .schedule-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #1e3a8a 0%, #3b82f6 50%, #fbbf24 100%);
        }

        .schedule-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(30, 58, 138, 0.12);
          border-color: #3b82f6;
        }

        .schedule-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          gap: 0.75rem;
        }

        .schedule-card-header h4 {
          margin: 0;
          color: #1e3a8a;
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.3;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-badge {
          padding: 0.35rem 0.85rem;
          border-radius: 20px;
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
          flex-shrink: 0;
        }

        .schedule-card-body {
          margin-bottom: 1.5rem;
        }

        .schedule-info p {
          margin: 0.75rem 0;
          color: #475569;
          font-size: 0.95rem;
          line-height: 1.5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 0.875rem;
          background: #f8fafc;
          border-radius: 10px;
          border-left: 3px solid #cbd5e1;
          transition: all 0.2s ease;
        }

        .schedule-info p:hover {
          background: #f1f5f9;
          border-left-color: #fbbf24;
        }

        .schedule-info p strong {
          color: #1e3a8a;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .created-info {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 1rem !important;
          padding-top: 0.75rem;
          border-top: 1px dashed #e2e8f0;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .created-info {
          font-size: 0.9375rem;
          color: #64748b;
          margin-top: 1.5rem !important;
          padding-top: 1.5rem;
          border-top: 2px dashed #e2e8f0;
          font-style: normal;
          font-weight: 600;
          display: flex;
          align-items: center;
        }

        .created-info::before {
          content: '👤';
          font-size: 1.125rem;
          margin-right: 0.5rem;
        }

        .schedule-card-actions {
          display: flex;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .schedule-card-actions .btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
        }

        .schedule-card-actions .btn-secondary::before {
          content: '✏️';
        }

        .schedule-card-actions .btn-info::before {
          content: '👁️';
        }

        .schedule-card-actions .btn-danger::before {
          content: '📦';
        }

        .btn-info {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }

        .btn-info:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        }

        .btn-info:active {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
        }

        .empty-state {
          text-align: center;
          padding: 5rem 2rem;
          background: white;
          border: 3px dashed #cbd5e1;
          border-radius: 24px;
          animation: fade-in 0.6s ease-in-out;
          position: relative;
          overflow: hidden;
        }

        .empty-state::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.02) 0%, rgba(251, 191, 36, 0.02) 100%);
        }

        .empty-state p {
          color: #6b7280;
          font-size: 1.15rem;
          margin: 1rem 0;
          position: relative;
          z-index: 1;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .empty-icon {
          font-size: 5rem;
          margin-bottom: 1.5rem;
          animation: float 3s ease-in-out infinite;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
          position: relative;
          z-index: 1;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(5deg);
          }
        }

        .form-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .form-fields {
          background: white;
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          box-shadow: 0 4px 20px rgba(30, 58, 138, 0.08);
          border: 1px solid #f3f4f6;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .form-row:last-child {
          margin-bottom: 0;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: 0.75rem;
          font-weight: 600;
          color: #1e3a8a;
          font-size: 0.95rem;
        }

        .form-group input,
        .form-group select {
          padding: 0.875rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: white;
          color: #374151;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #fbbf24;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
        }

        .form-group input::placeholder {
          color: #9ca3af;
        }

        .form-group input:disabled,
        .form-group input.auto-filled-date:disabled {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-color: #7dd3fc;
          color: #0369a1;
          cursor: not-allowed;
          font-weight: 600;
        }

        .auto-date-hint {
          font-size: 0.75rem;
          color: #0ea5e9;
          font-weight: 500;
          margin-left: 0.5rem;
        }

        .date-info {
          display: block;
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: #0ea5e9;
          background: #f0f9ff;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          border-left: 3px solid #0ea5e9;
        }

        .gap-warning {
          margin-top: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 12px;
          border-left: 4px solid #f59e0b;
        }

        .gap-warning-title {
          font-weight: 700;
          color: #92400e;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .gap-warning-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .gap-warning-list li {
          padding: 0.5rem 0;
          color: #78350f;
          font-size: 0.9rem;
          border-bottom: 1px dashed #fbbf24;
        }

        .gap-warning-list li:last-child {
          border-bottom: none;
        }

        .existing-schedules-info {
          margin-top: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 12px;
          border-left: 4px solid #3b82f6;
        }

        .existing-schedules-info .info-title {
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
        }

        .existing-schedules-info .schedules-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .existing-schedules-info .schedules-list li {
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.5rem;
          background: white;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #1e3a8a;
          border: 1px solid #bfdbfe;
        }

        .existing-schedules-info .schedules-list li:last-child {
          margin-bottom: 0;
        }

        .existing-schedules-info .schedules-list li strong {
          color: #1e40af;
        }

        .period-times-editor {
          background: white;
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          box-shadow: 0 4px 20px rgba(30, 58, 138, 0.08);
          border: 1px solid #f3f4f6;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .editor-header h4 {
          margin: 0;
          color: #1e3a8a;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .period-times-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .period-time-row {
          display: grid;
          grid-template-columns: 150px 1fr 1fr auto;
          gap: 1rem;
          align-items: center;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
        }

        .period-time-row:hover {
          background: #f3f4f6;
          border-color: #1e3a8a;
        }

        .period-label-input {
          padding: 0.75rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.3s ease;
          background: white;
          color: #1e3a8a;
        }

        .period-label-input:focus {
          outline: none;
          border-color: #fbbf24;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
        }

        .time-inputs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .time-inputs label {
          font-weight: 600;
          color: #64748b;
          font-size: 0.875rem;
          min-width: 80px;
        }

        .time-input {
          padding: 0.75rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          background: white;
          flex: 1;
        }

        .time-input:focus {
          outline: none;
          border-color: #fbbf24;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
        }

        .schedule-editor {
          background: white;
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          box-shadow: 0 4px 20px rgba(30, 58, 138, 0.08);
          border: 1px solid #f3f4f6;
        }

        .schedule-editor h4 {
          margin-bottom: 2rem;
          color: #1e3a8a;
          font-size: 1.5rem;
          font-weight: 700;
          text-align: center;
          position: relative;
          padding-bottom: 1rem;
        }

        .schedule-editor h4::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #1e3a8a 0%, #fbbf24 100%);
          border-radius: 2px;
        }

        .day-schedule {
          margin-bottom: 1.5rem;
          border: 2px solid #f3f4f6;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .day-schedule:hover {
          border-color: #e5e7eb;
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.08);
        }

        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          padding: 1.25rem 1.5rem;
          border-bottom: none;
        }

        .day-header h5 {
          margin: 0;
          color: white;
          font-size: 1.15rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .day-period-count {
          font-size: 0.85rem;
          font-weight: 500;
          opacity: 0.8;
        }

        .day-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-outline-primary {
          background: transparent;
          border: 2px solid rgba(255, 255, 255, 0.6);
          color: white;
          width: 32px;
          height: 32px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: bold;
          border-radius: 8px;
        }

        .btn-outline-primary:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: white;
        }

        .btn-outline-danger {
          background: transparent;
          border: 2px solid rgba(239, 68, 68, 0.6);
          color: #fca5a5;
          width: 32px;
          height: 32px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: bold;
          border-radius: 8px;
        }

        .btn-outline-danger:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          color: white;
        }

        .days-control-bar {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .days-control-label {
          font-weight: 700;
          color: #1e3a8a;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .days-chips {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .day-chip {
          padding: 0.45rem 0.9rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1.5px solid transparent;
        }

        .day-chip.active {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #3b82f6;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
        }

        .day-chip.active:hover {
          background: #fef2f2;
          color: #dc2626;
          border-color: #ef4444;
        }

        .day-chip.inactive {
          background: white;
          color: #64748b;
          border-color: #cbd5e1;
        }

        .day-chip.inactive:hover {
          background: #ecfdf5;
          color: #047857;
          border-color: #10b981;
        }

        .btn-day-action {
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .btn-add-p {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border-color: rgba(255, 255, 255, 0.4);
        }

        .btn-add-p:hover {
          background: white;
          color: #1e3a8a;
        }

        .btn-rem-p {
          background: rgba(255, 255, 255, 0.15);
          color: #fef08a;
          border-color: rgba(254, 240, 138, 0.3);
        }

        .btn-rem-p:hover {
          background: #fef08a;
          color: #854d0e;
        }

        .btn-del-day {
          background: rgba(239, 68, 68, 0.25);
          color: #fecaca;
          border-color: rgba(239, 68, 68, 0.5);
        }

        .btn-del-day:hover {
          background: #ef4444;
          color: white;
        }

        .periods-grid {
          padding: 1.5rem;
          background: #fafbfc;
        }

        .period-row {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
          background: white;
          padding: 1.15rem;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          transition: all 0.3s ease;
        }

        .period-row.period-assigned {
          background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
          border-color: #10b981;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.12);
        }

        .period-row.period-empty {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .period-row:hover {
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.08);
        }

        .period-row.has-conflict {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .period-row > div:first-child {
          display: flex;
          gap: 1rem;
          align-items: center;
          width: 100%;
        }

        .assigned-badge {
          display: inline-block;
          font-size: 0.725rem;
          font-weight: 700;
          color: #047857;
          background: #d1fae5;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          margin-top: 0.25rem;
          width: fit-content;
        }

        .select-selected {
          border-color: #10b981 !important;
          background-color: #f0fdf4 !important;
          font-weight: 600 !important;
          color: #065f46 !important;
        }

        .btn-clear-slot {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fca5a5;
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn-clear-slot:hover {
          background: #ef4444;
          color: white;
        }

        .conflict-warning {
          background: #fee2e2;
          color: #991b1b;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          border-left: 4px solid #ef4444;
          line-height: 1.5;
          width: 100%;
        }

        .conflict-warning strong {
          color: #7f1d1d;
          font-weight: 700;
        }

        .period-row:last-child {
          margin-bottom: 0;
        }

        .period-info {
          min-width: 130px;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(251, 191, 36, 0.08) 100%);
          padding: 0.75rem;
          border-radius: 8px;
        }

        .period-info strong {
          color: #1e3a8a;
          font-weight: 700;
          font-size: 0.95rem;
        }

        .period-info span {
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .period-fields {
          display: flex;
          gap: 0.75rem;
          flex: 1;
        }

        .period-fields select {
          flex: 1;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.3s ease;
          background: white;
        }

        .period-fields select:focus {
          outline: none;
          border-color: #fbbf24;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        .btn {
          padding: 0.875rem 1.75rem;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.3px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(30, 58, 138, 0.3);
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.4), transparent);
          transition: left 0.6s;
        }

        .btn-primary:hover::before {
          left: 100%;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%);
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(30, 58, 138, 0.4);
        }

        .btn-primary:active {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(30, 58, 138, 0.3);
        }

        .btn-secondary {
          background: white;
          color: #1e3a8a;
          border: 2px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .btn-secondary:hover {
          background: #f9fafb;
          border-color: #1e3a8a;
          transform: translateY(-3px);
          box-shadow: 0 6px 15px rgba(30, 58, 138, 0.15);
        }

        .btn-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }

        .btn-danger:hover {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
        }

        .btn-danger:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
          transform: none;
          box-shadow: none;
        }

        .btn-sm {
          padding: 0.625rem 1.25rem;
          font-size: 0.9rem;
        }

        .btn-text {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%);
          color: #f59e0b;
          padding: 0.625rem 1.25rem;
          font-weight: 700;
          border: 2px solid #fbbf24;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .btn-text:hover {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
          border-color: #f59e0b;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(30, 58, 138, 0.4);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fade-in 0.3s ease;
        }

        .modal {
          background: white;
          padding: 2.5rem;
          border-radius: 20px;
          max-width: 450px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modal-appear 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid #f3f4f6;
        }

        @keyframes modal-appear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .modal h3 {
          margin-top: 0;
          color: #1e3a8a;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .modal p {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }

        .modal select {
          width: 100%;
          padding: 1rem;
          margin: 0.5rem 0 1.5rem;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .modal select:focus {
          outline: none;
          border-color: #fbbf24;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        .toast {
          position: fixed;
          top: 2rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 1.5rem 2rem;
          border-radius: 16px;
          color: white;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          z-index: 1001;
          animation: slide-down 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 600;
          font-size: 1.05rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        @keyframes slide-down {
          from {
            transform: translateX(-50%) translateY(-150%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }

        .toast-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
        }

        .toast-success::before {
          content: '✓';
          font-size: 1.5rem;
          font-weight: bold;
        }

        .toast-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 10px 30px rgba(245, 158, 11, 0.4);
        }

        /* Delete Modal */
        .delete-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1002;
          animation: fade-in 0.2s ease;
        }

        .delete-modal {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          max-width: 400px;
          width: 90%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .delete-modal-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .delete-modal h3 {
          color: #1e3a8a;
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .delete-modal p {
          color: #64748b;
          margin-bottom: 0.5rem;
        }

        .delete-modal-warning {
          color: #f59e0b;
          font-size: 0.875rem;
          background: #fef3c7;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .delete-modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
        }

        .delete-modal-actions .btn {
          min-width: 120px;
        }

        .btn-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .btn-danger:hover {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        /* Delete Holiday Modal */
        .delete-holiday-modal {
          background: white;
          border-radius: 24px;
          padding: 2.5rem;
          max-width: 420px;
          width: 90%;
          text-align: center;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
          animation: holiday-modal-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }

        .delete-holiday-modal::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #fbbf24, #f59e0b, #ef4444);
        }

        @keyframes holiday-modal-in {
          from {
            transform: scale(0.7) translateY(20px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .delete-holiday-icon {
          position: relative;
          display: inline-block;
          margin-bottom: 1.5rem;
        }

        .delete-holiday-icon .icon-bg {
          font-size: 4rem;
          filter: grayscale(0.3);
          opacity: 0.9;
        }

        .delete-holiday-icon .icon-warning {
          position: absolute;
          bottom: -5px;
          right: -10px;
          font-size: 1.8rem;
          animation: warning-bounce 1s ease-in-out infinite;
        }

        @keyframes warning-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .delete-holiday-modal h3 {
          color: #1e3a8a;
          font-size: 1.6rem;
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .delete-holiday-modal .holiday-name {
          color: #1e3a8a;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 12px;
          display: inline-block;
        }

        .delete-holiday-modal .holiday-date {
          color: #64748b;
          font-size: 1rem;
          margin-bottom: 1.25rem;
        }

        .delete-holiday-warning {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.25rem;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 1px solid #fecaca;
          border-radius: 12px;
          color: #dc2626;
          font-size: 0.95rem;
          font-weight: 500;
          margin-bottom: 1.75rem;
        }

        .delete-holiday-warning .warning-icon {
          font-size: 1.1rem;
        }

        .delete-holiday-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .delete-holiday-actions .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 140px;
          justify-content: center;
        }

        .btn-cancel {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .btn-cancel:hover {
          background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(100, 116, 139, 0.2);
        }

        .btn-confirm-delete {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
        }

        .btn-confirm-delete:hover {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
        }

        .btn-confirm-delete:active {
          transform: translateY(0);
        }

        /* Holidays Section */
        .holidays-section {
          background: white;
          border-radius: 20px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 20px rgba(30, 58, 138, 0.08);
        }

        .holidays-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .holidays-header h3 {
          color: #1e3a8a;
          font-size: 1.25rem;
          margin: 0;
        }

        .holidays-empty {
          text-align: center;
          padding: 2rem;
          color: #64748b;
        }

        .holidays-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .holiday-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #f8fafc;
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .holiday-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .holiday-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .holiday-info {
          flex: 1;
        }

        .holiday-info h4 {
          margin: 0 0 0.25rem 0;
          color: #1e3a8a;
          font-size: 1rem;
        }

        .holiday-date {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0 0 0.5rem 0;
        }

        .holiday-type-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          color: white;
        }

        .holiday-actions {
          display: flex;
          gap: 0.5rem;
        }

        .holiday-actions .btn {
          padding: 0.5rem;
          min-width: auto;
        }

        .classes-section {
          margin-bottom: 1rem;
        }

        .classes-section h3 {
          color: #1e3a8a;
          font-size: 1.25rem;
          margin: 0;
        }

        /* Holiday Modal */
        .holiday-modal {
          background: white;
          border-radius: 20px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          animation: scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .holiday-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .holiday-modal-header h3 {
          margin: 0;
          color: #1e3a8a;
          font-size: 1.25rem;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #64748b;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
        }

        .btn-close:hover {
          color: #1e3a8a;
        }

        .holiday-modal-body {
          padding: 1.5rem;
        }

        .holiday-modal-body .form-group {
          margin-bottom: 1rem;
        }

        .holiday-modal-body label {
          display: block;
          margin-bottom: 0.5rem;
          color: #374151;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .holiday-modal-body input,
        .holiday-modal-body select,
        .holiday-modal-body textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.2s;
        }

        .holiday-modal-body input:focus,
        .holiday-modal-body select:focus,
        .holiday-modal-body textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .holiday-modal-body .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .holiday-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        /* Schedule View Container */
        .schedule-view-container {
          background: white;
          border-radius: 24px;
          padding: 2.5rem;
          box-shadow: 0 8px 32px rgba(30, 58, 138, 0.1);
          animation: fade-in 0.5s ease;
        }

        .view-header {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 3px solid #e2e8f0;
        }

        .view-title-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .view-title-section h3 {
          color: #1e3a8a;
          font-size: 2.25rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .view-info-section {
          margin-bottom: 2.5rem;
        }

        .view-info-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .info-card {
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.75rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .info-card:hover {
          border-color: #fbbf24;
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(251, 191, 36, 0.15);
        }

        .info-icon {
          font-size: 2.5rem;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          width: 70px;
          height: 70px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.2);
        }

        .info-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .info-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 1.125rem;
          color: #1e3a8a;
          font-weight: 700;
        }

        .period-times-display {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 2px solid #bae6fd;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.1);
        }

        .period-times-display h4 {
          color: #1e3a8a;
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 0 1.5rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .period-times-grid-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .period-time-card {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .period-time-card:hover {
          border-color: #3b82f6;
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.2);
        }

        .period-number {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.125rem;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          flex-shrink: 0;
        }

        .period-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .period-details strong {
          color: #1e3a8a;
          font-size: 0.9375rem;
          font-weight: 700;
        }

        .period-details span {
          color: #64748b;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .schedule-table-view {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(30, 58, 138, 0.1);
          border: 2px solid #e2e8f0;
        }

        .schedule-table-header {
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          padding: 1.5rem 2rem;
          border-bottom: 3px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .schedule-table-header h4 {
          color: #1e3a8a;
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0;
        }

        .version-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .version-badge {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 0.625rem 1.25rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .period-number-badge {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 0.875rem;
          margin-bottom: 0.375rem;
        }

        .view-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.9375rem;
        }

        .view-table thead {
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
        }

        .view-table th {
          padding: 1.25rem 1rem;
          text-align: center;
          color: white;
          font-weight: 800;
          font-size: 0.9375rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 3px solid rgba(255, 255, 255, 0.2);
        }

        .view-table th.day-column {
          text-align: left;
          position: sticky;
          left: 0;
          z-index: 10;
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          min-width: 150px;
          border-right: 3px solid rgba(255, 255, 255, 0.3);
        }

        .period-header {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: center;
        }

        .period-header strong {
          font-size: 0.9375rem;
          letter-spacing: 0.3px;
        }

        .period-header span {
          font-size: 0.75rem;
          opacity: 0.9;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.15);
          padding: 0.25rem 0.625rem;
          border-radius: 8px;
        }

        .view-table tbody tr {
          border-bottom: 2px solid #f1f5f9;
          transition: all 0.3s ease;
        }

        .view-table tbody tr:hover {
          background: linear-gradient(90deg, #f0f9ff 0%, #f8fafc 100%);
        }

        .view-table td {
          padding: 1rem;
          text-align: center;
          vertical-align: middle;
          border-bottom: 1px solid #e2e8f0;
        }

        .day-cell {
          position: sticky;
          left: 0;
          z-index: 5;
          background: white;
          text-align: left !important;
          padding: 1rem 1.25rem !important;
          border-right: 2px solid #e2e8f0;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
        }

        .view-table tbody tr:hover .day-cell {
          background: linear-gradient(90deg, #f0f9ff 0%, #f8fafc 100%);
        }

        .day-cell-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .day-cell strong {
          color: #1e3a8a;
          font-size: 1.125rem;
          font-weight: 700;
        }

        .day-header-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
        }

        .header-periods-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          justify-content: center;
          align-items: center;
        }

        .header-period-indicator {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.8125rem;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .header-period-indicator:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
        }

        .period-cell {
          min-width: 180px;
          max-width: 200px;
        }

        .period-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.06) 0%, rgba(251, 191, 36, 0.06) 100%);
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .period-content:hover {
          border-color: #fbbf24;
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%);
          transform: scale(1.05);
        }

        .subject-name {
          font-weight: 800;
          color: #1e3a8a;
          font-size: 1rem;
          letter-spacing: 0.3px;
        }

        .teacher-name {
          font-size: 0.8125rem;
          color: #64748b;
          font-weight: 600;
        }

        .empty-period {
          color: #cbd5e1;
          font-size: 1.5rem;
          font-weight: 300;
        }

        .view-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding-top: 1.5rem;
          border-top: 2px solid #e2e8f0;
        }

        @media (max-width: 1024px) {
          .schedule-management {
            padding: 1.5rem;
          }

          .section-header h2 {
            font-size: 2rem;
          }

          .period-time-row {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .time-inputs {
            flex-direction: column;
            align-items: stretch;
          }

          .time-inputs label {
            min-width: auto;
          }

          .classes-grid {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.5rem;
          }

          .class-card {
            padding: 1.5rem;
          }

          .class-icon {
            width: 70px;
            height: 70px;
            font-size: 2.5rem;
          }

          .schedules-grid {
            grid-template-columns: 1fr;
          }

          .period-row {
            flex-direction: column;
            align-items: stretch;
          }

          .period-info {
            min-width: 100%;
          }

          .period-fields {
            flex-direction: column;
          }
        }

        @media (max-width: 768px) {
          .schedule-management {
            padding: 1rem;
            background: #f9fafb;
          }

          .section-header h2 {
            font-size: 1.75rem;
          }

          .section-header::after {
            width: 60px;
          }

          .selection-title {
            font-size: 1.5rem;
          }

          .selection-subtitle {
            font-size: 0.9375rem;
          }

          .classes-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          .class-card {
            padding: 1.25rem;
          }

          .class-selector {
            max-width: 100%;
          }

          .schedule-list-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .schedule-list-header h3 {
            text-align: center;
          }

          .schedule-actions {
            flex-direction: column;
          }

          .filter-group {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-group label {
            margin-bottom: 0.5rem;
          }

          .schedule-card {
            padding: 1.5rem;
          }

          .schedule-card-header {
            flex-direction: column;
            align-items: stretch;
          }

          .schedule-card-actions {
            flex-direction: column;
          }

          .form-fields,
          .schedule-editor {
            padding: 1.25rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .day-header {
            padding: 1rem;
            flex-direction: column;
            gap: 0.75rem;
            align-items: stretch;
          }

          .day-header h5 {
            text-align: center;
          }

          .period-row {
            padding: 0.75rem;
          }

          .periods-grid {
            padding: 1rem;
          }

          .toast {
            right: 1rem;
            left: 1rem;
            bottom: 1rem;
            padding: 1.25rem 1.5rem;
          }

          .modal {
            margin: 1rem;
            padding: 2rem;
          }
        }

        @media (max-width: 480px) {
          .section-header h2 {
            font-size: 1.5rem;
          }

          .btn {
            padding: 0.75rem 1.25rem;
            font-size: 0.95rem;
          }

          .status-badge {
            font-size: 0.75rem;
            padding: 0.4rem 0.75rem;
          }
        }

        /* Schedule Tabs */
        .schedule-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 0.5rem;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 16px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .tab-btn {
          flex: 1;
          padding: 1rem 1.5rem;
          border: none;
          background: transparent;
          font-size: 1rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          border-radius: 12px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .tab-btn:hover {
          color: #1e3a8a;
          background: rgba(255, 255, 255, 0.5);
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);
        }

        /* Teachers Section */
        .teachers-section {
          animation: fadeIn 0.3s ease;
        }

        .teachers-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.5rem 2rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          margin-bottom: 2rem;
        }

        .month-selector {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .month-selector .btn-icon {
          width: 40px;
          height: 40px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          color: white;
          font-size: 1.25rem;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .month-selector .btn-icon:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);
        }

        .month-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 120px;
        }

        .month-display .month-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e3a8a;
        }

        .month-display .year {
          font-size: 0.875rem;
          color: #64748b;
        }

        .teachers-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          gap: 1rem;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e2e8f0;
          border-top-color: #1e3a8a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .teachers-list h3 {
          font-size: 1.5rem;
          color: #1e3a8a;
          margin-bottom: 1.5rem;
        }

        .teachers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .teacher-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .teacher-card:hover {
          transform: translateY(-4px);
          border-color: #fbbf24;
          box-shadow: 0 8px 24px rgba(251, 191, 36, 0.2);
        }

        .teacher-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.25rem;
          flex-shrink: 0;
          overflow: hidden;
        }

        .teacher-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .teacher-info {
          flex: 1;
        }

        .teacher-info h4 {
          font-size: 1.125rem;
          color: #1e3a8a;
          margin: 0 0 0.25rem;
        }

        .teacher-phone {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0 0 0.75rem;
        }

        .teacher-stats {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .teacher-stats .stat {
          font-size: 0.875rem;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          background: #f1f5f9;
        }

        .teacher-stats .stat-graded { color: #10b981; }
        .teacher-stats .stat-missed { color: #ef4444; }

        .completion-bar {
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.25rem;
        }

        .completion-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .completion-text {
          font-size: 0.75rem;
          color: #64748b;
        }

        .teacher-arrow {
          font-size: 1.5rem;
          color: #cbd5e1;
          transition: all 0.3s ease;
        }

        .teacher-card:hover .teacher-arrow {
          color: #fbbf24;
          transform: translateX(4px);
        }

        /* Teacher Details */
        .teacher-details {
          animation: fadeIn 0.3s ease;
        }

        .teacher-details-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .teacher-details-header .btn-back {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .teacher-title h3 {
          margin: 0;
          font-size: 1.5rem;
          color: #1e3a8a;
        }

        .teacher-period {
          font-size: 0.875rem;
          color: #64748b;
        }

        .teacher-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 2px solid #e2e8f0;
        }

        .stat-card .stat-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        .stat-card .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1e3a8a;
          display: block;
        }

        .stat-card .stat-label {
          font-size: 0.875rem;
          color: #64748b;
        }

        .stat-card.stat-completed { border-color: #10b981; }
        .stat-card.stat-missed { border-color: #ef4444; }
        .stat-card.stat-upcoming { border-color: #3b82f6; }

        .teacher-classes-list {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .teacher-classes-list h4 {
          margin: 0 0 1rem;
          color: #1e3a8a;
        }

        .classes-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .class-badge {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.875rem;
        }

        /* Teacher Calendar */
        .teacher-calendar {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .teacher-calendar h4 {
          margin: 0 0 1.5rem;
          color: #1e3a8a;
        }

        .calendar-grid {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .calendar-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
        }

        .calendar-header-cell {
          padding: 0.75rem;
          text-align: center;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .calendar-body {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }

        .calendar-cell {
          aspect-ratio: 1;
          padding: 0.5rem;
          border: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: default;
          transition: all 0.2s ease;
          min-height: 60px;
        }

        .calendar-cell.empty {
          background: #fafafa;
        }

        .calendar-cell.today {
          background: #fef3c7;
          border-color: #fbbf24;
        }

        .calendar-cell.holiday {
          background: #fef2f2;
        }

        .calendar-cell.has-missed {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        }

        .calendar-cell.all-completed {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        }

        .calendar-cell.has-upcoming {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        }

        .day-number {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .day-lessons {
          display: flex;
          gap: 2px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 4px;
        }

        .lesson-dot {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.625rem;
          font-weight: 700;
        }

        .lesson-dot.completed {
          background: #10b981;
          color: white;
        }

        .lesson-dot.missed {
          background: #ef4444;
          color: white;
        }

        .lesson-dot.upcoming {
          background: #3b82f6;
          color: white;
        }

        .lesson-dot.holiday {
          background: #f59e0b;
        }

        .calendar-legend {
          display: flex;
          gap: 1.5rem;
          margin-top: 1.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #64748b;
        }

        .legend-dot {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .legend-dot.completed { background: #10b981; color: white; }
        .legend-dot.missed { background: #ef4444; color: white; }
        .legend-dot.upcoming { background: #3b82f6; color: white; }
        .legend-dot.holiday { background: #f59e0b; }

        /* Missed Lessons List */
        .missed-lessons-list {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .missed-lessons-list h4 {
          margin: 0 0 1.5rem;
          color: #1e3a8a;
        }

        .no-missed {
          text-align: center;
          padding: 2rem;
          color: #10b981;
        }

        .no-missed span {
          font-size: 3rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        .missed-lessons-grid {
          display: grid;
          gap: 1rem;
        }

        .missed-lesson-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #fef2f2;
          border-radius: 12px;
          border: 1px solid #fee2e2;
        }

        .missed-date {
          width: 50px;
          text-align: center;
          flex-shrink: 0;
        }

        .missed-date .date-day {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ef4444;
          display: block;
        }

        .missed-date .date-month {
          font-size: 0.75rem;
          color: #f87171;
          text-transform: uppercase;
        }

        .missed-info {
          flex: 1;
        }

        .missed-info h5 {
          margin: 0 0 0.25rem;
          color: #1e3a8a;
        }

        .missed-info p {
          margin: 0 0 0.25rem;
          color: #64748b;
          font-size: 0.875rem;
        }

        .missed-time {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .missed-status .status-badge.missed {
          background: #ef4444;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ScheduleManagement;
