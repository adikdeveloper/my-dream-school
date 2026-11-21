const Class = require('../models/academic/Class');
const Subject = require('../models/academic/Subject');
const Grade = require('../models/academic/Grade');
const Attendance = require('../models/academic/Attendance');
const AcademicCalendar = require('../models/academic/AcademicCalendar');

const quarterService = require('./quarterGradeService');
const { getTeacherAssignedClasses } = require('./teacherAccessResolver');
const { rosterForClass, schoolNow } = require('./dailyGrading');
const {
  collectClassLessonSlots,
  buildClassCoverage,
  applyCoverageGate,
  activeOnDate,
  dayKey,
  dayEnd,
  fullName,
  ABSENCE_STATUSES
} = require('./lessonCoverage');

const TARGET_RATIO = 2 / 5;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function classLabel(cls) {
  if (!cls) return '';
  if (cls.grade !== null && cls.grade !== undefined && cls.grade !== '') {
    return `${cls.grade}-${cls.section}`;
  }
  return cls.name || cls.section || 'Sinf';
}

function normalizeAcademicYear(value) {
  const academicYear = String(value || '').trim();
  if (!academicYear) return quarterService.getAcademicYear();

  const match = /^(\d{4})-(\d{4})$/.exec(academicYear);
  if (!match) return null;
  if (Number(match[2]) !== Number(match[1]) + 1) return null;

  return academicYear;
}

async function loadCalendar(academicYear) {
  const saved = await AcademicCalendar.findOne({ academicYear }).lean();
  return quarterService.normalizeCalendar(saved, academicYear);
}

function quarterStatus(currentQuarter, range) {
  if (currentQuarter?.quarter === range.quarter) return currentQuarter.status;

  const today = schoolNow().today;
  const startKey = dayKey(range.startDate);
  const endKey = dayKey(range.endDate);

  if (today < startKey) return 'upcoming';
  if (today > endKey) return 'past';
  return 'current';
}

function clampRange(range) {
  const todayEnd = dayEnd(schoolNow().today);
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  const effectiveEnd = new Date(Math.min(end.getTime(), todayEnd.getTime()));

  return {
    startDate: start,
    endDate: end,
    effectiveEndDate: start <= effectiveEnd ? effectiveEnd : null,
    hasStarted: start <= effectiveEnd,
    isCompleted: end <= todayEnd
  };
}

async function resolveContext({ teacherId, classId, academicYear, quarter }) {
  const assigned = await getTeacherAssignedClasses(teacherId);
  if (!assigned.length) {
    throw new HttpError(403, "Sizga sinf rahbari sifatida biriktirilgan sinf yo'q");
  }

  const targetId = classId ? String(classId) : String(assigned[0]._id);
  const assignedClass = assigned.find((item) => String(item._id) === targetId);
  if (!assignedClass) {
    throw new HttpError(403, "Bu sinf sizga sinf rahbari sifatida biriktirilmagan");
  }

  const classData = await Class.findById(targetId)
    .select('name grade section group students subjects academicYear')
    .populate('subjects.subject', 'name code color isActive')
    .populate('subjects.teacher', 'firstName lastName')
    .lean();
  if (!classData) throw new HttpError(404, 'Sinf topilmadi');

  const students = await rosterForClass(classData);
  const year = normalizeAcademicYear(academicYear);
  if (!year) {
    throw new HttpError(400, "O'quv yili YYYY-YYYY formatida bo'lishi kerak");
  }

  const calendar = await loadCalendar(year);
  const currentQuarter = quarterService.getCurrentQuarter(calendar);
  const quarterNumber = quarter !== undefined && quarter !== null && quarter !== ''
    ? Number(quarter)
    : (currentQuarter?.quarter || 1);

  if (![1, 2, 3, 4].includes(quarterNumber)) {
    throw new HttpError(400, "Chorak 1 dan 4 gacha bo'lishi kerak");
  }

  const range = quarterService.getQuarterRange(calendar, quarterNumber);
  if (!range) throw new HttpError(400, 'Chorak topilmadi');

  return {
    assignedClasses: assigned,
    classData,
    students,
    academicYear: year,
    calendar,
    currentQuarter,
    quarter: quarterNumber,
    range
  };
}

function subjectPayload(entry, coverageStats = null) {
  const teachers = [...entry.teachers.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'uz'));
  const primary = teachers[0] || null;

  const gradedLessonDates = [...entry.totalDates]
    .filter((dateKeyValue) => entry.gradedDates.has(dateKeyValue))
    .sort();
  const missingLessonDates = [...entry.totalDates]
    .filter((dateKeyValue) => !entry.gradedDates.has(dateKeyValue))
    .sort();

  const totalLessons = entry.totalDates.size;
  const gradedLessons = gradedLessonDates.length;
  const coveragePercent = coverageStats?.totalLessons
    ? Math.round((coverageStats.gradedLessons / coverageStats.totalLessons) * 100)
    : null;

  return {
    _id: entry._id,
    name: entry.name || '',
    code: entry.code || '',
    color: entry.color || '',
    teacherId: primary?._id || '',
    teacherName: primary?.name || '',
    teachers: teachers.map((teacher) => ({
      _id: teacher._id || '',
      name: teacher.name || '',
      lessons: teacher.count
    })),
    totalLessons,
    gradedLessons,
    missingLessons: totalLessons - gradedLessons,
    gradedPercent: coveragePercent,
    totalPeriods: entry.periods,
    coverage: {
      studentCount: coverageStats?.studentCount || 0,
      totalLessons: coverageStats?.totalLessons || 0,
      gradedLessons: coverageStats?.gradedLessons || 0,
      missingLessons: coverageStats?.missingLessons || 0,
      percent: coveragePercent
    },
    lastGradedDate: gradedLessonDates[gradedLessonDates.length - 1] || null,
    lastMissingDate: missingLessonDates[missingLessonDates.length - 1] || null,
    missingLessonDates
  };
}

function createSubjectEntry(subject, order = 10000) {
  const rawId = subject?._id || subject;
  return {
    _id: rawId,
    name: subject?.name || '',
    code: subject?.code || '',
    color: subject?.color || '',
    order,
    teachers: new Map(),
    totalDates: new Set(),
    gradedDates: new Set(),
    periods: 0
  };
}

function addTeacher(entry, id, name) {
  if (!entry || (!id && !name)) return;
  const key = id ? String(id) : String(name);
  const teacher = entry.teachers.get(key) || { _id: id ? String(id) : '', name: name || '', count: 0 };
  teacher.count += 1;
  if (name) teacher.name = name;
  entry.teachers.set(key, teacher);
}

async function getSubjectsOverview({ teacherId, classId, academicYear, quarter }) {
  const context = await resolveContext({ teacherId, classId, academicYear, quarter });
  const { classData, students, academicYear: year, currentQuarter, range } = context;
  const effective = clampRange(range);

  let slots = [];
  let grades = [];
  if (effective.hasStarted) {
    slots = await collectClassLessonSlots({
      classId: classData._id,
      startDate: effective.startDate,
      endDate: effective.effectiveEndDate
    });

    grades = await Grade.find({
      class: classData._id,
      date: { $gte: effective.startDate, $lte: effective.effectiveEndDate },
      type: 'daily',
      isExam: { $ne: true }
    })
      .select('student subject date type isExam')
      .populate('subject', 'name code color')
      .lean();
  }

  const subjectMap = new Map();

  (classData.subjects || []).forEach((pair, index) => {
    if (!pair?.subject) return;
    const subjectId = String(pair.subject._id || pair.subject);
    if (!subjectMap.has(subjectId)) {
      subjectMap.set(subjectId, createSubjectEntry(pair.subject, index));
    }
    addTeacher(subjectMap.get(subjectId), pair.teacher?._id || pair.teacher, fullName(pair.teacher));
  });

  for (const slot of slots) {
    if (!subjectMap.has(slot.subjectId)) {
      subjectMap.set(slot.subjectId, createSubjectEntry({
        _id: slot.subjectId,
        name: slot.subjectName
      }));
    }
    const entry = subjectMap.get(slot.subjectId);
    if (!entry.name && slot.subjectName) entry.name = slot.subjectName;
    addTeacher(entry, slot.teacherId, slot.teacherName);
    entry.totalDates.add(slot.dateKey);
    entry.periods += 1;
  }

  for (const grade of grades) {
    if (!grade.subject) continue;
    const subjectId = String(grade.subject._id || grade.subject);
    if (!subjectMap.has(subjectId)) {
      subjectMap.set(subjectId, createSubjectEntry(grade.subject));
    }
    const entry = subjectMap.get(subjectId);
    if (!entry.name && grade.subject?.name) entry.name = grade.subject.name;
    entry.gradedDates.add(dayKey(grade.date));
  }

  for (const entry of subjectMap.values()) {
    for (const gradedDate of [...entry.gradedDates]) {
      if (!entry.totalDates.has(gradedDate)) entry.gradedDates.delete(gradedDate);
    }
  }

  const coverageSubjectIds = [...subjectMap.keys()].map(String).filter(Boolean);
  const coverage = effective.hasStarted && coverageSubjectIds.length
    ? await buildClassCoverage({
      classId: classData._id,
      students,
      subjectIds: coverageSubjectIds,
      startDate: effective.startDate,
      endDate: effective.effectiveEndDate,
      grades,
      slots
    })
    : { students: new Map() };

  const coverageStatsBySubject = new Map();
  for (const studentCoverage of coverage.students.values()) {
    for (const [subjectId, info] of studentCoverage.entries()) {
      if (!info || !info.totalLessons) continue;
      const stats = coverageStatsBySubject.get(subjectId) || {
        studentCount: 0,
        totalLessons: 0,
        gradedLessons: 0,
        missingLessons: 0
      };
      stats.studentCount += 1;
      stats.totalLessons += info.totalLessons;
      stats.gradedLessons += info.gradedLessons;
      stats.missingLessons += info.missingLessons;
      coverageStatsBySubject.set(subjectId, stats);
    }
  }

  const subjects = [...subjectMap.values()]
    .map((entry) => subjectPayload(
      entry,
      coverageStatsBySubject.get(String(entry._id))
    ))
    .sort((a, b) => {
      const aEntry = subjectMap.get(String(a._id));
      const bEntry = subjectMap.get(String(b._id));
      return (aEntry?.order ?? 10000) - (bEntry?.order ?? 10000)
        || a.name.localeCompare(b.name, 'uz');
    });

  const totals = subjects.reduce((acc, subject) => {
    acc.totalLessons += subject.totalLessons;
    acc.gradedLessons += subject.gradedLessons;
    acc.missingLessons += subject.missingLessons;
    acc.totalPeriods += subject.totalPeriods;
    acc.coverageLessons += subject.coverage.totalLessons;
    acc.coverageGradedLessons += subject.coverage.gradedLessons;
    acc.coverageMissingLessons += subject.coverage.missingLessons;
    return acc;
  }, {
    totalLessons: 0,
    gradedLessons: 0,
    missingLessons: 0,
    totalPeriods: 0,
    coverageLessons: 0,
    coverageGradedLessons: 0,
    coverageMissingLessons: 0
  });

  return {
    academicYear: year,
    class: {
      _id: classData._id,
      name: classData.name,
      label: classLabel(classData),
      grade: classData.grade,
      section: classData.section,
      group: classData.group,
      studentsCount: students.length
    },
    assignedClasses: context.assignedClasses.map((item) => ({
      _id: item._id,
      name: item.name,
      label: classLabel(item),
      grade: item.grade,
      section: item.section,
      group: item.group,
      studentsCount: Array.isArray(item.students) ? item.students.length : 0
    })),
    quarter: {
      quarter: range.quarter,
      label: range.label,
      startDate: range.startDate,
      endDate: range.endDate,
      effectiveEndDate: effective.effectiveEndDate,
      hasStarted: effective.hasStarted,
      isCompleted: effective.isCompleted,
      status: quarterStatus(currentQuarter, range)
    },
    summary: {
      subjectCount: subjects.length,
      studentCount: students.length,
      totalLessons: totals.totalLessons,
      gradedLessons: totals.gradedLessons,
      missingLessons: totals.missingLessons,
      totalPeriods: totals.totalPeriods,
      coverageLessons: totals.coverageLessons,
      coverageGradedLessons: totals.coverageGradedLessons,
      coverageMissingLessons: totals.coverageMissingLessons,
      gradedPercent: totals.coverageLessons
        ? Math.round((totals.coverageGradedLessons / totals.coverageLessons) * 100)
        : null,
      missingSubjectCount: subjects.filter((subject) => subject.coverage.totalLessons > 0 && subject.coverage.missingLessons > 0).length
    },
    subjects
  };
}

function findAttendanceForDay(attendanceDocs, dateKeyValue) {
  const byStudent = new Map();
  for (const record of attendanceDocs) {
    if (dayKey(record.date) !== dateKeyValue || !record.student) continue;
    const studentId = String(record.student);
    const entry = byStudent.get(studentId) || { present: false, absent: false };
    if (ABSENCE_STATUSES.includes(record.status)) entry.absent = true;
    else entry.present = true;
    byStudent.set(studentId, entry);
  }
  return byStudent;
}

async function getSubjectDetail({ teacherId, classId, subjectId, academicYear, quarter }) {
  const context = await resolveContext({ teacherId, classId, academicYear, quarter });
  const { classData, students, academicYear: year, currentQuarter, range } = context;

  const subject = await Subject.findById(subjectId).select('name code color').lean();
  if (!subject) throw new HttpError(404, 'Fan topilmadi');

  const effective = clampRange(range);
  let slots = [];
  let grades = [];
  let attendance = [];

  if (effective.hasStarted) {
    [slots, grades, attendance] = await Promise.all([
      collectClassLessonSlots({
        classId: classData._id,
        startDate: effective.startDate,
        endDate: effective.effectiveEndDate,
        subjectId: subject._id
      }),
      Grade.find({
        class: classData._id,
        subject: subject._id,
        date: { $gte: effective.startDate, $lte: effective.effectiveEndDate }
      })
        .select('student subject score isExam examMaxScore maxScore type date periodNumber')
        .lean(),
      Attendance.find({
        class: classData._id,
        subject: subject._id,
        date: { $gte: effective.startDate, $lte: effective.effectiveEndDate }
      })
        .select('student subject date status')
        .lean()
    ]);
  }

  const coverage = await buildClassCoverage({
    classId: classData._id,
    students,
    subjectIds: [subject._id],
    startDate: effective.hasStarted ? effective.startDate : range.startDate,
    endDate: effective.hasStarted ? effective.effectiveEndDate : range.startDate,
    grades,
    attendance,
    slots
  });

  const dailyGrades = grades.filter((grade) => !grade.isExam && grade.type !== 'exam' && grade.type === 'daily');
  const gradeStudentsByDate = new Map();
  for (const grade of dailyGrades) {
    if (!grade.student) continue;
    const dateKeyValue = dayKey(grade.date);
    if (!gradeStudentsByDate.has(dateKeyValue)) gradeStudentsByDate.set(dateKeyValue, new Set());
    gradeStudentsByDate.get(dateKeyValue).add(String(grade.student));
  }

  const daysMap = new Map();
  for (const slot of slots) {
    if (!daysMap.has(slot.dateKey)) {
      daysMap.set(slot.dateKey, {
        dateKey: slot.dateKey,
        date: slot.date,
        periods: [],
        teachers: new Set()
      });
    }
    const day = daysMap.get(slot.dateKey);
    day.periods.push(slot);
    if (slot.teacherName) day.teachers.add(slot.teacherName);
  }

  const studentNameById = new Map(
    students.map((student) => [
      String(student._id),
      [student.firstName, student.lastName].filter(Boolean).join(' ').trim()
    ])
  );

  const days = [...daysMap.values()].map((day) => {
    const attendanceForDay = findAttendanceForDay(attendance, day.dateKey);
    const gradedStudents = gradeStudentsByDate.get(day.dateKey) || new Set();

    const activeStudents = students.filter((student) => activeOnDate(student, day.dateKey));
    const eligibleStudents = activeStudents.filter((student) => {
      const attendanceEntry = attendanceForDay.get(String(student._id));
      return !(attendanceEntry && attendanceEntry.absent && !attendanceEntry.present);
    });

    const eligibleIds = new Set(eligibleStudents.map((student) => String(student._id)));
    const gradedEligible = [...gradedStudents].filter((studentId) => eligibleIds.has(studentId));
    const missingStudents = eligibleStudents
      .filter((student) => !gradedStudents.has(String(student._id)))
      .map((student) => ({
        _id: student._id,
        name: studentNameById.get(String(student._id)) || ''
      }));

    const targetCount = Math.ceil(eligibleStudents.length * TARGET_RATIO);
    const gradedCount = gradedEligible.length;
    const completed = gradedCount >= targetCount;
    const hasGrades = gradedStudents.size > 0;

    const periodLabels = [...new Set(day.periods.map((slot) => (
      slot.startTime && slot.endTime ? `${slot.startTime}-${slot.endTime}` : ''
    )).filter(Boolean))];

    return {
      dateKey: day.dateKey,
      date: day.date,
      weekday: new Date(`${day.dateKey}T12:00:00.000Z`)
        .toLocaleDateString('uz-UZ', { weekday: 'long', timeZone: 'UTC' }),
      periods: day.periods.map((slot) => ({
        periodNumber: slot.periodNumber,
        startTime: slot.startTime,
        endTime: slot.endTime,
        teacherName: slot.teacherName
      })),
      time: periodLabels.join(', '),
      teacherNames: [...day.teachers],
      graded: hasGrades,
      completed,
      status: !hasGrades ? 'missing' : (completed ? 'complete' : 'partial'),
      gradedCount,
      eligibleCount: eligibleStudents.length,
      targetCount,
      missingStudents
    };
  }).sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const gradesByStudent = new Map();
  for (const grade of grades) {
    if (!grade.student) continue;
    const studentId = String(grade.student);
    if (!gradesByStudent.has(studentId)) gradesByStudent.set(studentId, []);
    gradesByStudent.get(studentId).push(grade);
  }

  const subjectCoverage = new Map();
  for (const [studentId, coverageBySubject] of coverage.students.entries()) {
    subjectCoverage.set(studentId, coverageBySubject.get(String(subject._id)));
  }

  let coverageLessons = 0;
  let coverageGradedLessons = 0;
  let coverageMissingLessons = 0;
  for (const info of subjectCoverage.values()) {
    if (!info || !info.totalLessons) continue;
    coverageLessons += info.totalLessons;
    coverageGradedLessons += info.gradedLessons;
    coverageMissingLessons += info.missingLessons;
  }
  const coveragePercent = coverageLessons
    ? Math.round((coverageGradedLessons / coverageLessons) * 100)
    : null;

  const studentRows = students.map((student) => {
    const studentId = String(student._id);
    const studentGrades = gradesByStudent.get(studentId) || [];
    const summary = quarterService.summarizeGrades(studentGrades);
    const coverageInfo = subjectCoverage.get(studentId);
    const gated = applyCoverageGate(summary, coverageInfo);
    const missingShare = coverageInfo?.totalLessons
      ? Math.round((coverageInfo.missingLessons / coverageInfo.totalLessons) * 100)
      : 0;

    return {
      _id: student._id,
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      studentId: student.studentId || '',
      grade: gated.grade,
      issued: gated.issued,
      blocked: gated.blocked,
      blockedReason: gated.blocked
        ? `${coverageInfo.missingLessons} soat (${missingShare}%) baholanmagan`
        : '',
      percent: summary.percent,
      dailyPercent: summary.dailyPercent,
      examPercent: summary.examPercent,
      gradeCount: summary.gradeCount,
      dailyCount: summary.dailyCount,
      examCount: summary.examCount,
      totalLessons: gated.totalLessons,
      gradedLessons: gated.gradedLessons,
      missingLessons: gated.missingLessons,
      coveragePercent: gated.coveragePercent,
      missingLessonDates: gated.missingLessonDates
    };
  }).sort((a, b) => (
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'uz')
  ));

  const gradedDays = days.filter((day) => day.graded).length;
  const totalDays = days.length;
  const teachers = new Map();
  for (const slot of slots) {
    if (!slot.teacherId && !slot.teacherName) continue;
    const key = slot.teacherId || slot.teacherName;
    const entry = teachers.get(key) || { _id: slot.teacherId, name: slot.teacherName, lessons: 0 };
    entry.lessons += 1;
    if (slot.teacherName) entry.name = slot.teacherName;
    teachers.set(key, entry);
  }

  return {
    academicYear: year,
    class: {
      _id: classData._id,
      name: classData.name,
      label: classLabel(classData),
      grade: classData.grade,
      section: classData.section,
      group: classData.group,
      studentsCount: students.length
    },
    quarter: {
      quarter: range.quarter,
      label: range.label,
      startDate: range.startDate,
      endDate: range.endDate,
      effectiveEndDate: effective.effectiveEndDate,
      hasStarted: effective.hasStarted,
      isCompleted: effective.isCompleted,
      status: quarterStatus(currentQuarter, range)
    },
    subject: {
      _id: subject._id,
      name: subject.name || '',
      code: subject.code || '',
      color: subject.color || '',
      teachers: [...teachers.values()].sort((a, b) => b.lessons - a.lessons)
    },
    summary: {
      totalLessons: totalDays,
      gradedLessons: gradedDays,
      missingLessons: totalDays - gradedDays,
      gradedPercent: coveragePercent,
      coverageLessons,
      coverageGradedLessons,
      coverageMissingLessons,
      coveragePercent,
      completedLessons: days.filter((day) => day.completed).length,
      totalPeriods: slots.length,
      studentCount: students.length,
      issuedStudentCount: studentRows.filter((student) => student.issued).length,
      blockedStudentCount: studentRows.filter((student) => student.blocked).length
    },
    days,
    students: studentRows
  };
}

async function getQuarterGrades({ teacherId, classId, academicYear, quarter }) {
  const context = await resolveContext({ teacherId, classId, academicYear, quarter });
  const { classData, academicYear: year, calendar, currentQuarter, quarter: quarterNumber, range } = context;

  const result = await quarterService.calculateClassQuarter({
    classId: classData._id,
    quarter: quarterNumber,
    calendar
  });

  return {
    academicYear: year,
    quarter: {
      ...result.quarter,
      status: quarterStatus(currentQuarter, range)
    },
    class: result.class,
    subjects: result.subjects,
    students: result.students,
    summary: result.summary
  };
}

module.exports = {
  HttpError,
  classLabel,
  normalizeAcademicYear,
  getSubjectsOverview,
  getSubjectDetail,
  getQuarterGrades
};
