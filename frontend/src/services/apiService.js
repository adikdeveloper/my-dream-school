import { api } from './authService';

const apiService = {
  // Users
  getUsers: async (role, page = 1, limit = 200, search = '') => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    params.append('page', page);
    params.append('limit', limit);
    if (search && search.trim()) params.append('search', search.trim());

    const response = await api.get(`/users?${params}`);
    return response.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // O'quvchini boshqa sinf/guruhga ko'chirish (baholar va tarix saqlanadi)
  transferStudent: async (studentId, newClassId) => {
    const response = await api.post(`/users/${studentId}/transfer`, { newClassId });
    return response.data;
  },

  // ===== COINS (uy vazifa coinlari) =====
  getCoinLeaderboard: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.append(k, v); });
    const response = await api.get(`/coins/leaderboard?${qs}`);
    return response.data;
  },

  getTeacherCoins: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.append(k, v); });
    const response = await api.get(`/coins/teacher?${qs}`);
    return response.data;
  },

  getMyCoins: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.append(k, v); });
    const response = await api.get(`/coins/my?${qs}`);
    return response.data;
  },

  getStudentStats: async () => {
    const response = await api.get('/users/student/stats');
    return response.data;
  },

  // Classes
  getClasses: async () => {
    const response = await api.get('/classes');
    // Backend returns { classes: [], pagination: {} }, we return the full response
    return response.data;
  },

  getClass: async (id) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  createClass: async (classData) => {
    const response = await api.post('/classes', classData);
    return response.data;
  },

  updateClass: async (id, classData) => {
    const response = await api.put(`/classes/${id}`, classData);
    return response.data;
  },

  deleteClass: async (id) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },

  getAvailableStudents: async () => {
    const response = await api.get('/classes/available-students');
    return response.data;
  },

  // Teachers
  getTeachers: async () => {
    const response = await api.get('/users?role=teacher&limit=1000');
    return response.data.users || response.data;
  },

  // Subjects
  getSubjects: async () => {
    const response = await api.get('/subjects');
    // Backend returns { subjects: [], pagination: {} }, we return just subjects array
    return response.data.subjects || response.data;
  },

  getSubjectById: async (id) => {
    const response = await api.get(`/subjects/${id}`);
    return response.data;
  },

  createSubject: async (subjectData) => {
    const response = await api.post('/subjects', subjectData);
    return response.data;
  },

  updateSubject: async (id, subjectData) => {
    const response = await api.put(`/subjects/${id}`, subjectData);
    return response.data;
  },

  deleteSubject: async (id) => {
    const response = await api.delete(`/subjects/${id}`);
    return response.data;
  },

  // Grades
  getGrades: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await api.get(`/grades?${params}`);

    // Handle both old format (array) and new format (object with grades array)
    if (response.data) {
      // New format with pagination
      if (response.data.grades && Array.isArray(response.data.grades)) {
        return response.data.grades;
      }
      // Old format (direct array)
      if (Array.isArray(response.data)) {
        return response.data;
      }
    }

    // Fallback to empty array
    return [];
  },

  // Get grades with pagination support
  getGradesPaginated: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await api.get(`/grades?${params}`);
    return response.data; // Returns { grades: [], pagination: {} }
  },

  // Barcha sahifalardagi baholarni yig'ib beradi (to'liq tarix — sinf almashganda ham hammasi).
  getAllGrades: async (filters = {}) => {
    let page = 1;
    let all = [];
    let data;
    do {
      data = await apiService.getGradesPaginated({ ...filters, page, limit: 100 });
      all = all.concat(data?.grades || []);
      page += 1;
    } while (data?.pagination && page <= data.pagination.totalPages && page <= 50);
    return all;
  },

  createGrade: async (gradeData) => {
    const response = await api.post('/grades', gradeData);
    return response.data;
  },

  updateGrade: async (id, gradeData) => {
    const response = await api.put(`/grades/${id}`, gradeData);
    return response.data;
  },

  // Attendance
  getAttendance: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });

    const response = await api.get(`/attendance?${params}`);
    return response.data;
  },

  createAttendance: async (attendanceData) => {
    const response = await api.post('/attendance', attendanceData);
    return response.data;
  },

  // Announcements
  getAnnouncements: async () => {
    const response = await api.get('/announcements');
    return response.data;
  },

  createAnnouncement: async (announcementData) => {
    const response = await api.post('/announcements', announcementData);
    return response.data;
  },

  updateAnnouncement: async (id, announcementData) => {
    const response = await api.put(`/announcements/${id}`, announcementData);
    return response.data;
  },

  deleteAnnouncement: async (id) => {
    const response = await api.delete(`/announcements/${id}`);
    return response.data;
  },

  // Assignments
  getAssignments: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });

    const response = await api.get(`/assignments?${params}`);

    // Handle both array and object responses
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data.assignments)) {
      return response.data.assignments;
    }
    // Fallback to empty array
    return [];
  },

  // Get student assignments (for student role)
  getStudentAssignments: async () => {
    const response = await api.get('/assignments/student');
    return response.data;
  },

  // Get teacher assignments (for teacher role)
  getTeacherAssignments: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });

    const response = await api.get(`/assignments/teacher?${params}`);
    return response.data;
  },

  getAssignmentById: async (id) => {
    const response = await api.get(`/assignments/${id}`);
    return response.data;
  },

  createAssignment: async (assignmentData) => {
    const response = await api.post('/assignments', assignmentData);
    return response.data;
  },

  submitAssignment: async (assignmentId, submissionData) => {
    const response = await api.post(`/assignments/${assignmentId}/submit`, submissionData);
    return response.data;
  },

  // Schedule - Legacy (for backward compatibility)
  getSchedule: async (classId) => {
    const response = await api.get(`/classes/${classId}`);
    return response.data.schedule || [];
  },

  // Get teacher's schedule
  getTeacherSchedule: async () => {
    const response = await api.get('/schedule/teacher');
    return response.data;
  },

  getTeacherLessonOptions: async () => {
    const response = await api.get('/schedule/teacher/lesson-list/options');
    return response.data;
  },

  getTeacherLessonList: async () => {
    const response = await api.get('/schedule/teacher/lesson-list');
    return response.data;
  },

  createTeacherLesson: async (lessonData) => {
    const response = await api.post('/schedule/teacher/lesson-list', lessonData);
    return response.data;
  },

  updateTeacherLesson: async (lessonId, lessonData) => {
    const response = await api.put(`/schedule/teacher/lesson-list/${lessonId}`, lessonData);
    return response.data;
  },

  deleteTeacherLesson: async (lessonId) => {
    const response = await api.delete(`/schedule/teacher/lesson-list/${lessonId}`);
    return response.data;
  },

  // Get student's schedule
  getStudentSchedule: async () => {
    const response = await api.get('/schedule/student');
    return response.data;
  },

  // Update period topic (teacher only)
  updatePeriodTopic: async (classId, day, periodIndex, topic) => {
    const response = await api.put(`/schedule/teacher/period/${classId}/${day}/${periodIndex}`, { topic });
    return response.data;
  },

  // New Schedule Management API (with validity periods)
  // Get all schedules for a class
  getAllSchedules: async (classId) => {
    const response = await api.get(`/schedule/class/${classId}`);
    return response.data;
  },

  // Get current active schedule for a class
  getCurrentSchedule: async (classId) => {
    const response = await api.get(`/schedule/class/${classId}/current`);
    return response.data;
  },

  // Get single schedule by ID
  getScheduleById: async (scheduleId) => {
    const response = await api.get(`/schedule/${scheduleId}`);
    return response.data;
  },

  // Create new schedule
  createSchedule: async (scheduleData) => {
    const response = await api.post('/schedule', scheduleData);
    return response.data;
  },

  // Update schedule
  updateSchedule: async (scheduleId, scheduleData) => {
    const response = await api.put(`/schedule/${scheduleId}`, scheduleData);
    return response.data;
  },

  // Check teacher availability
  checkTeacherAvailability: async (teacherId, day, startTime, endTime, excludeClassId = null) => {
    const response = await api.post('/schedule/check-teacher-availability', {
      teacherId,
      day,
      startTime,
      endTime,
      excludeClassId
    });
    return response.data;
  },

  // Get all busy teachers for all time slots
  getBusyTeachers: async (excludeClassId = null) => {
    const response = await api.post('/schedule/busy-teachers', { excludeClassId });
    return response.data;
  },

  // Delete (archive) schedule
  deleteSchedule: async (scheduleId) => {
    const response = await api.delete(`/schedule/${scheduleId}`);
    return response.data;
  },

  // Get next available date for new schedule
  getNextAvailableDate: async (classId) => {
    const response = await api.get(`/schedule/class/${classId}/next-available-date`);
    return response.data;
  },

  // Get expiring and expired schedules
  getExpiringSchedules: async () => {
    const response = await api.get('/schedule/expiring-schedules');
    return response.data;
  },

  // Extend schedule end date
  extendSchedule: async (scheduleId, days = null, newEndDate = null) => {
    const response = await api.put(`/schedule/${scheduleId}/extend`, { days, newEndDate });
    return response.data;
  },

  // Auto-extend all expired schedules
  autoExtendExpiredSchedules: async () => {
    const response = await api.post('/schedule/auto-extend-expired');
    return response.data;
  },

  // Notifications
  getStudentNotificationCounts: async () => {
    const response = await api.get('/notifications/student/counts');
    return response.data;
  },

  getTeacherNotificationCounts: async () => {
    const response = await api.get('/notifications/teacher/counts');
    return response.data;
  },

  getAdminNotificationCounts: async () => {
    const response = await api.get('/notifications/admin/counts');
    return response.data;
  },

  // Mark a section as viewed (to clear notifications)
  markSectionAsViewed: async (section) => {
    const response = await api.post('/notifications/mark-viewed', { section });
    return response.data;
  },

  // Leads
  getLeads: async () => {
    const response = await api.get('/leads');
    return response.data;
  },

  createLead: async (leadData) => {
    const response = await api.post('/leads', leadData);
    return response.data;
  },

  updateLead: async (id, leadData) => {
    const response = await api.put(`/leads/${id}`, leadData);
    return response.data;
  },

  deleteLead: async (id) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },

  // Get student assignment statistics
  getStudentAssignmentStats: async (studentId) => {
    const response = await api.get(`/assignments/student-stats/${studentId || 'me'}`);
    return response.data;
  },

  // Stats
  getAdminStats: async () => {
    const response = await api.get('/stats/admin');
    return response.data;
  },

  getRecentActivities: async (limit = 10) => {
    const response = await api.get(`/stats/activities?limit=${limit}`);
    return response.data;
  },

  // Teacher Reports
  getTeacherClassStats: async () => {
    const response = await api.get('/stats/teacher/classes');
    return response.data;
  },

  getTeacherStudentStats: async (classId, subjectId) => {
    const params = new URLSearchParams();
    if (classId) params.append('classId', classId);
    if (subjectId) params.append('subjectId', subjectId);
    const response = await api.get(`/stats/teacher/students?${params}`);
    return response.data;
  },

  // Bitta o'quvchining umumiy ko'rsatkichlari (akademik %, davomat %, umumiy %, oylik trend)
  getStudentDetailStats: async (studentId) => {
    const response = await api.get(`/stats/teacher/student/${studentId}`);
    return response.data;
  },

  getTeacherAttendanceStats: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    const response = await api.get(`/stats/teacher/attendance?${params}`);
    return response.data;
  },

  getTeacherAssignmentStats: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    const response = await api.get(`/stats/teacher/assignments?${params}`);
    return response.data;
  },

  // O'qituvchining bugungi statistikasi (real ma'lumotlar)
  getTeacherTodayStats: async () => {
    const response = await api.get('/stats/teacher/today');
    return response.data;
  },

  // O'qituvchining bugungi baholarsiz darslarini olish
  getTeacherUngradedLessons: async () => {
    const response = await api.get('/stats/teacher/ungraded-lessons');
    return response.data;
  },

  getClassStatistics: async (classId) => {
    const response = await api.get(`/stats/class/${classId}`);
    return response.data;
  },

  // Admin Reports - Advanced statistics
  getStudentPerformanceReport: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    const response = await api.get(`/grades?${params}`);
    // Handle both array and object with grades property
    return response.data.grades || response.data;
  },

  getAttendanceSummaryReport: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    const response = await api.get(`/attendance?${params}`);
    // Handle both array and object responses
    return Array.isArray(response.data) ? response.data : (response.data.attendance || response.data);
  },

  getGradeDistributionReport: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    const response = await api.get(`/grades?${params}`);
    // Handle both array and object with grades property
    return response.data.grades || response.data;
  },

  getTeacherPerformanceReport: async () => {
    const response = await api.get('/users?role=teacher&limit=1000');
    return response.data;
  },

  // Salary
  getTeacherCurrentSalary: async () => {
    const response = await api.get('/salary/current');
    return response.data;
  },

  getTeacherMonthlySalary: async (year, month, teacherId = null) => {
    const url = teacherId
      ? `/salary/monthly/${year}/${month}?teacherId=${teacherId}`
      : `/salary/monthly/${year}/${month}`;
    const response = await api.get(url);
    return response.data;
  },

  updateTeacherSalaryRate: async (teacherId, salaryPerLesson) => {
    const response = await api.put('/salary/rate', { teacherId, salaryPerLesson });
    return response.data;
  },

  // Tests/Exams
  // Get student test results
  getStudentTests: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await api.get(`/tests/student?${params}`);
    return response.data;
  },

  // Get test for taking (student)
  getTestForTaking: async (testId) => {
    const response = await api.get(`/tests/student/take/${testId}`);
    return response.data;
  },

  // Submit test answers (student)
  submitTestAnswers: async (testId, answers) => {
    const response = await api.post(`/tests/student/submit/${testId}`, { answers });
    return response.data;
  },

  // Get detailed test results (student)
  getTestResults: async (testId) => {
    const response = await api.get(`/tests/student/results/${testId}`);
    return response.data;
  },

  // Get teacher tests
  getTeacherTests: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await api.get(`/tests/teacher?${params}`);
    return response.data;
  },

  // Payments
  getPayments: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await api.get(`/payments?${params}`);
    return response.data;
  },

  getStudentPayments: async (studentId) => {
    const response = await api.get(`/payments?studentId=${studentId}`);
    return response.data;
  },

  getMyPayments: async () => {
    const response = await api.get('/payments/my-payments');
    return response.data;
  },

  // Student Fee (O'quvchi to'lovlari)
  getMyFee: async () => {
    const response = await api.get('/student-fees/my-fee');
    return response.data;
  },

  getMyPaymentStatus: async (studentId) => {
    const response = await api.get(`/student-fees/payment-status/${studentId}`);
    return response.data;
  },

  createPayment: async (paymentData) => {
    const response = await api.post('/payments', paymentData);
    return response.data;
  },

  updatePayment: async (id, paymentData) => {
    const response = await api.put(`/payments/${id}`, paymentData);
    return response.data;
  },

  deletePayment: async (id) => {
    const response = await api.delete(`/payments/${id}`);
    return response.data;
  },

  getUnpaidMonths: async (studentId) => {
    const response = await api.get(`/payments/unpaid-months/${studentId}`);
    return response.data;
  },

  // OPTIMIZED: Get all debtors in a single query
  getAllDebtors: async () => {
    const response = await api.get('/payments/all-debtors');
    return response.data;
  },

  getPaymentStatistics: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });

    const response = await api.get(`/payments/statistics?${params}`);
    return response.data;
  },

  // Teacher Balance
  updateTeacherBalance: async (teacherId, amount, type, description = '') => {
    const response = await api.put(`/users/${teacherId}/balance`, {
      amount,
      type, // 'add' or 'withdraw'
      description
    });
    return response.data;
  },

  // Student Balance Operations
  getStudentBalance: async (studentId) => {
    const response = await api.get(`/balance/student/${studentId}`);
    return response.data;
  },

  useBalanceForPayment: async (studentId, amount, paymentMonth, notes) => {
    const response = await api.post('/balance/use-for-payment', {
      studentId,
      amount,
      paymentMonth,
      notes
    });
    return response.data;
  },

  useBalanceForOther: async (studentId, amount, description, notes) => {
    const response = await api.post('/balance/use-for-other', {
      studentId,
      amount,
      description,
      notes
    });
    return response.data;
  },

  transferBalanceToNext: async (studentId, amount, targetMonth, notes) => {
    const response = await api.post('/balance/transfer-to-next', {
      studentId,
      amount,
      targetMonth,
      notes
    });
    return response.data;
  },

  refundBalance: async (studentId, amount, notes) => {
    const response = await api.post('/balance/refund', {
      studentId,
      amount,
      notes
    });
    return response.data;
  },

  getBalanceStatistics: async () => {
    const response = await api.get('/balance/statistics');
    return response.data;
  },

  getFrozenAccounts: async () => {
    const response = await api.get('/balance/frozen-accounts');
    return response.data;
  },

  addStudentBalance: async (studentId, amount, notes) => {
    const response = await api.post('/balance/add', {
      studentId,
      amount,
      notes
    });
    return response.data;
  },

  payFine: async (studentId, amount, reason, paymentType = 'cash', notes) => {
    const response = await api.post('/balance/pay-fine', {
      studentId,
      amount,
      reason,
      paymentType,
      notes
    });
    return response.data;
  },

  // Holidays (Bayram kunlari)
  getHolidays: async (academicYear) => {
    const params = academicYear ? `?academicYear=${academicYear}` : '';
    const response = await api.get(`/holidays${params}`);
    return response.data;
  },

  getHolidaysForMonth: async (year, month) => {
    const response = await api.get(`/holidays?year=${year}&month=${month}`);
    return response.data;
  },

  getHolidaysInRange: async (startDate, endDate) => {
    const response = await api.get(`/holidays/range?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },

  checkHoliday: async (date) => {
    const response = await api.get(`/holidays/check/${date}`);
    return response.data;
  },

  createHoliday: async (holidayData) => {
    const response = await api.post('/holidays', holidayData);
    return response.data;
  },

  updateHoliday: async (id, holidayData) => {
    const response = await api.put(`/holidays/${id}`, holidayData);
    return response.data;
  },

  deleteHoliday: async (id) => {
    const response = await api.delete(`/holidays/${id}`);
    return response.data;
  },

  // Teacher Monthly Status (Admin)
  getTeachersMonthlyStatus: async (year, month) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    const response = await api.get(`/schedule/admin/teachers-monthly-status?${params}`);
    return response.data;
  },

  getTeacherMonthlyDetails: async (teacherId, year, month) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    const response = await api.get(`/schedule/admin/teacher/${teacherId}/monthly-details?${params}`);
    return response.data;
  },

  // Admin Reports - Daily/Weekly/Monthly/Yearly
  getDailyReport: async (date) => {
    const params = date ? `?date=${date}` : '';
    const response = await api.get(`/stats/reports/daily${params}`);
    return response.data;
  },

  getWeeklyReport: async () => {
    const response = await api.get('/stats/reports/weekly');
    return response.data;
  },

  getMonthlyReport: async (month, year) => {
    const response = await api.get(`/stats/reports/monthly?month=${month}&year=${year}`);
    return response.data;
  },


  // AI Assistant
  getAiSessions: async () => {
    const response = await api.get('/ai/sessions');
    return response.data;
  },

  getAiChatHistory: async (sessionId) => {
    const response = await api.get(`/ai/sessions/${sessionId}`);
    return response.data;
  },

  deleteAiSession: async (sessionId) => {
    const response = await api.delete(`/ai/sessions/${sessionId}`);
    return response.data;
  },

  sendAiMessage: async (sessionId, message) => {
    const response = await api.post('/ai/chat', { sessionId, message });
    return response.data;
  },

  // ─── Student AI (o'quvchi o'qituvchi-yordamchi) ───
  sendStudentAiMessage: async (sessionId, message) => {
    const response = await api.post('/ai/student/chat', { sessionId, message });
    return response.data;
  },

  getStudentAiSessions: async () => {
    const response = await api.get('/ai/student/sessions');
    return response.data;
  },

  getStudentAiChatHistory: async (sessionId) => {
    const response = await api.get(`/ai/student/sessions/${sessionId}`);
    return response.data;
  },

  deleteStudentAiSession: async (sessionId) => {
    const response = await api.delete(`/ai/student/sessions/${sessionId}`);
    return response.data;
  },

  // ─── Teacher AI (o'qituvchi AI yordamchi) ───
  getTeacherAiScope: async () => {
    const response = await api.get('/ai/teacher/scope');
    return response.data;
  },

  sendTeacherAiMessage: async (sessionId, message) => {
    const response = await api.post('/ai/teacher/chat', { sessionId, message });
    return response.data;
  },

  getTeacherAiSessions: async () => {
    const response = await api.get('/ai/teacher/sessions');
    return response.data;
  },

  getTeacherAiChatHistory: async (sessionId) => {
    const response = await api.get(`/ai/teacher/sessions/${sessionId}`);
    return response.data;
  },

  deleteTeacherAiSession: async (sessionId) => {
    const response = await api.delete(`/ai/teacher/sessions/${sessionId}`);
    return response.data;
  },

  teacherAiAnalyzeGrades: async (params) => {
    const response = await api.post('/ai/teacher/analyze-grades', params);
    return response.data;
  },

  teacherAiGenerateSchedule: async (params) => {
    const response = await api.post('/ai/teacher/generate-schedule', params);
    return response.data;
  },

  teacherAiGenerateTest: async (params) => {
    const response = await api.post('/ai/teacher/generate-test', params);
    return response.data;
  },

  teacherAiGenerateLessonPlan: async (params) => {
    const response = await api.post('/ai/teacher/generate-lesson-plan', params);
    return response.data;
  },

  createTest: async (testData) => {
    const response = await api.post('/tests', testData);
    return response.data;
  },

  getAiApiKeys: async () => {
    const response = await api.get('/ai/keys');
    return response.data;
  },

  addAiApiKey: async (keyData) => {
    const response = await api.post('/ai/keys', keyData);
    return response.data;
  },

  updateAiApiKey: async (id, keyData) => {
    const response = await api.put(`/ai/keys/${id}`, keyData);
    return response.data;
  },

  deleteAiApiKey: async (id) => {
    const response = await api.delete(`/ai/keys/${id}`);
    return response.data;
  },

  getAiUsage: async () => {
    const response = await api.get('/ai/usage');
    return response.data;
  },

  // AI - Barcha sessiyalarni o'chirish
  deleteAllAiSessions: async () => {
    const response = await api.delete('/ai/sessions');
    return response.data;
  },

  // AI Sandbox - Rol bo'yicha qoidalar
  getAiSandboxes: async () => {
    const response = await api.get('/ai/sandbox');
    return response.data;
  },

  getAiSandboxByRole: async (role) => {
    const response = await api.get(`/ai/sandbox/${role}`);
    return response.data;
  },

  upsertAiSandbox: async (role, data) => {
    const response = await api.put(`/ai/sandbox/${role}`, data);
    return response.data;
  },

  resetAiSandbox: async (role) => {
    const response = await api.delete(`/ai/sandbox/${role}`);
    return response.data;
  },

  getYearlyReport: async () => {
    const response = await api.get('/stats/reports/yearly');
    return response.data;
  },

  // Parent Contacts - Ota-onalar bilan oylik aloqa jurnali
  getParentContacts: async (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.append(k, v);
    });
    const response = await api.get(`/parent-contacts?${search}`);
    return response.data;
  },

  getParentContactStats: async (month) => {
    const search = month ? `?month=${encodeURIComponent(month)}` : '';
    const response = await api.get(`/parent-contacts/stats${search}`);
    return response.data;
  },

  getParentContactMonthlyCoverage: async (months = 6) => {
    const response = await api.get(`/parent-contacts/monthly-coverage?months=${months}`);
    return response.data;
  },

  getParentContactsForStudent: async (studentId) => {
    const response = await api.get(`/parent-contacts/student/${studentId}`);
    return response.data;
  },

  createParentContact: async (data) => {
    const response = await api.post('/parent-contacts', data);
    return response.data;
  },

  updateParentContact: async (id, data) => {
    const response = await api.put(`/parent-contacts/${id}`, data);
    return response.data;
  },

  deleteParentContact: async (id) => {
    const response = await api.delete(`/parent-contacts/${id}`);
    return response.data;
  },

  // ===== CHAT =====
  getChatRooms: async () => {
    const response = await api.get('/chat/rooms');
    return response.data.rooms || [];
  },

  getChatRoom: async (id) => {
    const response = await api.get(`/chat/rooms/${id}`);
    return response.data.room;
  },

  getChatMessages: async (roomId, { before, after, limit = 50 } = {}) => {
    const params = new URLSearchParams();
    if (before) params.append('before', before);
    if (after) params.append('after', after);
    if (limit) params.append('limit', limit);
    const response = await api.get(`/chat/rooms/${roomId}/messages?${params}`);
    return response.data.messages || [];
  },

  sendChatMessage: async (roomId, payload) => {
    const response = await api.post(`/chat/rooms/${roomId}/messages`, payload);
    return response.data.message;
  },

  markChatRead: async (roomId) => {
    const response = await api.post(`/chat/rooms/${roomId}/read`);
    return response.data;
  },

  createChatRoom: async (payload) => {
    const response = await api.post('/chat/rooms', payload);
    return response.data.room;
  },

  getChatContacts: async () => {
    const response = await api.get('/chat/contacts');
    return response.data.contacts || [];
  },

  getChatUnreadCount: async () => {
    const response = await api.get('/chat/unread-count');
    return response.data.count || 0;
  },

  deleteChatMessage: async (msgId, scope = 'me') => {
    const response = await api.delete(`/chat/messages/${msgId}?scope=${scope}`);
    return response.data;
  },

  editChatMessage: async (msgId, text) => {
    const response = await api.patch(`/chat/messages/${msgId}`, { text });
    return response.data.message;
  },

  // ===== PERMISSIONS =====
  getPermissionsCatalog: async () => {
    const response = await api.get('/permissions/catalog');
    return response.data;
  },

  getAllPermissions: async () => {
    const response = await api.get('/permissions');
    return response.data.permissions;
  },

  getMyPermissions: async () => {
    const response = await api.get('/permissions/me');
    return response.data;
  },

  updateRolePermissions: async (role, permissions) => {
    const response = await api.put(`/permissions/${role}`, { permissions });
    return response.data;
  },

  togglePermission: async (role, key, value) => {
    const response = await api.put(`/permissions/${role}/${key}`, { value });
    return response.data;
  },

  resetRolePermissions: async (role) => {
    const response = await api.post(`/permissions/reset/${role}`);
    return response.data;
  },

  // ===== PUSH NOTIFICATIONS (Director broadcast) =====
  createPushNotification: async (payload) => {
    const response = await api.post('/notifications', payload);
    return response.data;
  },

  listPushNotifications: async (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.append(k, v);
    });
    const response = await api.get(`/notifications?${search}`);
    return response.data;
  },

  getPushNotification: async (id) => {
    const response = await api.get(`/notifications/${id}`);
    return response.data.notification;
  },

  previewPushNotification: async (targetFilter) => {
    const response = await api.post('/notifications/preview', { targetFilter });
    return response.data;
  },

  deletePushNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  getInboxNotifications: async (onlyUnread = false) => {
    const response = await api.get(`/notifications/inbox${onlyUnread ? '?unread=true' : ''}`);
    return response.data;
  },

  getInboxUnreadCount: async () => {
    const response = await api.get('/notifications/inbox/unread-count');
    return response.data.count || 0;
  },

  markPushNotificationRead: async (id) => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },

  markAllInboxRead: async () => {
    const response = await api.post('/notifications/inbox/read-all');
    return response.data;
  },

  deleteInboxNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}/inbox`);
    return response.data;
  },

  // ===== INVENTORY (Jihozlar / xonalar) =====
  getRooms: async (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.append(k, v);
    });
    const response = await api.get(`/inventory/rooms?${search}`);
    return response.data.rooms || [];
  },

  createRoom: async (roomData) => {
    const response = await api.post('/inventory/rooms', roomData);
    return response.data;
  },

  updateRoom: async (id, roomData) => {
    const response = await api.put(`/inventory/rooms/${id}`, roomData);
    return response.data;
  },

  deleteRoom: async (id) => {
    const response = await api.delete(`/inventory/rooms/${id}`);
    return response.data;
  },

  // ===== Dars almashtirish (o'rnini bosish) =====
  getSubstitutions: async (params = {}) => {
    const qs = new URLSearchParams();
    Object.keys(params).forEach((k) => { if (params[k]) qs.append(k, params[k]); });
    const response = await api.get(`/substitutions?${qs}`);
    return response.data;
  },

  getMySubstitutions: async (year, month) => {
    const qs = new URLSearchParams();
    if (year) qs.append('year', year);
    if (month) qs.append('month', month);
    const response = await api.get(`/substitutions/mine?${qs}`);
    return response.data;
  },

  getMySubstitutionAccess: async (classId) => {
    const qs = classId ? `?classId=${classId}` : '';
    const response = await api.get(`/substitutions/my-access${qs}`);
    return response.data;
  },

  getSubstitutionOverlay: async (from, to, classId) => {
    const qs = new URLSearchParams();
    if (from) qs.append('from', from);
    if (to) qs.append('to', to);
    if (classId) qs.append('classId', classId);
    const response = await api.get(`/substitutions/overlay?${qs}`);
    return response.data;
  },

  getClassDayPeriods: async (classId, date) => {
    const response = await api.get(`/substitutions/class-day?classId=${classId}&date=${date}`);
    return response.data;
  },

  createSubstitution: async (data) => {
    const response = await api.post('/substitutions', data);
    return response.data;
  },

  confirmSubstitution: async (id) => {
    const response = await api.put(`/substitutions/${id}/confirm`);
    return response.data;
  },

  rejectSubstitution: async (id) => {
    const response = await api.put(`/substitutions/${id}/reject`);
    return response.data;
  },

  deleteSubstitution: async (id) => {
    const response = await api.delete(`/substitutions/${id}`);
    return response.data;
  }
};

export default apiService;
