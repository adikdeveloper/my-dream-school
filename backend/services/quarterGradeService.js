const Grade = require('../models/academic/Grade');
const Subject = require('../models/academic/Subject');
const Class = require('../models/academic/Class');
const User = require('../models/users/User');

// Kunlik baholar ikki xil shkalada uchraydi:
// - admin jurnalida 0..0.5
// - o'qituvchi jurnalida 0..5
// Shu sabab 0.5 dan katta qiymat 5 ballik shkala deb qabul qilinadi.
const DAILY_MAX_SCORE = 0.5;
const DAILY_MAX_SCORE_LEGACY = 5;

const QUARTER_LABELS = {
  1: '1-chorak',
  2: '2-chorak',
  3: '3-chorak',
  4: '4-chorak'
};

function getAcademicYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function utcDate(year, monthIndex, day, endOfDay = false) {
  return endOfDay
    ? new Date(Date.UTC(year, monthIndex, day, 23, 59, 59, 999))
    : new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
}

function buildDefaultQuarters(academicYear) {
  const startYear = parseInt(String(academicYear).slice(0, 4), 10);
  const endYear = startYear + 1;

  return [
    { quarter: 1, startDate: utcDate(startYear, 8, 2), endDate: utcDate(startYear, 9, 25, true) },
    { quarter: 2, startDate: utcDate(startYear, 10, 5), endDate: utcDate(startYear, 11, 28, true) },
    { quarter: 3, startDate: utcDate(endYear, 0, 9), endDate: utcDate(endYear, 2, 20, true) },
    { quarter: 4, startDate: utcDate(endYear, 3, 1), endDate: utcDate(endYear, 4, 30, true) }
  ];
}

function normalizeCalendar(savedCalendar, academicYear) {
  const hasSavedQuarters = savedCalendar
    && Array.isArray(savedCalendar.quarters)
    && savedCalendar.quarters.length === 4;

  if (hasSavedQuarters) {
    const quarters = savedCalendar.quarters
      .map(item => ({
        quarter: Number(item.quarter),
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate)
      }))
      .sort((a, b) => a.quarter - b.quarter);

    return {
      academicYear,
      quarters,
      isConfigured: true,
      updatedAt: savedCalendar.updatedAt || null
    };
  }

  return {
    academicYear,
    quarters: buildDefaultQuarters(academicYear),
    isConfigured: false,
    updatedAt: null
  };
}

function getQuarterRange(calendar, quarterNumber) {
  const quarter = calendar.quarters.find(item => Number(item.quarter) === Number(quarterNumber));
  if (!quarter) return null;

  const startDate = new Date(quarter.startDate);
  startDate.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(quarter.endDate);
  endDate.setUTCHours(23, 59, 59, 999);

  return {
    quarter: Number(quarter.quarter),
    label: QUARTER_LABELS[Number(quarter.quarter)],
    startDate,
    endDate
  };
}

function getCurrentQuarter(calendar, now = new Date()) {
  const nowTime = new Date(now).getTime();
  // getQuarterRange tugash sanasini kun oxirigacha cho'zadi — saqlangan
  // sanalar 00:00 bo'lsa ham chorakning oxirgi kuni joriy hisoblanadi.
  const ranges = [...calendar.quarters]
    .sort((a, b) => a.quarter - b.quarter)
    .map(item => getQuarterRange(calendar, item.quarter))
    .filter(Boolean);

  const current = ranges.find(item => (
    nowTime >= item.startDate.getTime() && nowTime <= item.endDate.getTime()
  ));

  if (current) {
    return { ...current, status: 'current' };
  }

  const upcoming = ranges.find(item => nowTime < item.startDate.getTime());
  if (upcoming) {
    return { ...upcoming, status: 'upcoming' };
  }

  const last = ranges[ranges.length - 1];
  if (!last) return null;
  return { ...last, status: 'past' };
}

function isExamGrade(grade) {
  return Boolean(grade.isExam || grade.type === 'exam' || Number(grade.examMaxScore) > 0);
}

function getGradeCap(grade) {
  if (isExamGrade(grade)) {
    return Number(grade.examMaxScore) || Number(grade.maxScore) || 100;
  }

  return Number(grade.score) > DAILY_MAX_SCORE ? DAILY_MAX_SCORE_LEGACY : DAILY_MAX_SCORE;
}

function gradeToPercent(grade) {
  const cap = getGradeCap(grade);
  if (!Number.isFinite(cap) || cap <= 0) return null;

  const score = Number(grade.score) || 0;
  return Math.max(0, Math.min(100, (score / cap) * 100));
}

function percentToQuarterGrade(percent) {
  if (percent === null || percent === undefined || !Number.isFinite(Number(percent))) {
    return null;
  }

  return Math.min(10, Math.max(1, Math.round(Number(percent) / 10)));
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizeGrades(grades) {
  const valid = grades
    .map(grade => ({ grade, percent: gradeToPercent(grade) }))
    .filter(item => item.percent !== null);

  if (!valid.length) {
    return {
      percent: null,
      grade: null,
      dailyPercent: null,
      examPercent: null,
      gradeCount: 0,
      dailyCount: 0,
      examCount: 0,
      totalScore: 0,
      maxScore: 0
    };
  }

  const dailyPercents = valid
    .filter(item => !isExamGrade(item.grade))
    .map(item => item.percent);

  const examPercents = valid
    .filter(item => isExamGrade(item.grade))
    .map(item => item.percent);

  const percent = average(valid.map(item => item.percent));
  const totalScore = grades.reduce((sum, grade) => sum + (Number(grade.score) || 0), 0);
  const maxScore = grades.reduce((sum, grade) => sum + getGradeCap(grade), 0);

  return {
    percent: Math.round(percent),
    grade: percentToQuarterGrade(percent),
    dailyPercent: dailyPercents.length ? Math.round(average(dailyPercents)) : null,
    examPercent: examPercents.length ? Math.round(average(examPercents)) : null,
    gradeCount: valid.length,
    dailyCount: dailyPercents.length,
    examCount: examPercents.length,
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore: Math.round(maxScore * 100) / 100
  };
}

async function calculateClassQuarter({ classId, quarter, calendar, subjectIds = null }) {
  const range = getQuarterRange(calendar, quarter);
  if (!range) throw new Error("Chorak topilmadi");

  const [classData, directStudents, grades] = await Promise.all([
    Class.findById(classId)
      .select('name grade section group students subjects')
      .populate('students', 'firstName lastName studentId')
      .populate('subjects.subject', 'name code color')
      .lean(),
    User.find({ role: 'student', classId, isActive: { $ne: false } })
      .select('firstName lastName studentId')
      .lean(),
    Grade.find({
      class: classId,
      date: { $gte: range.startDate, $lte: range.endDate }
    })
      .select('student subject score isExam examMaxScore maxScore type date')
      .lean()
  ]);

  if (!classData) throw new Error('Sinf topilmadi');

  const subjectIdSet = new Set();
  for (const pair of classData.subjects || []) {
    if (pair?.subject?._id) subjectIdSet.add(String(pair.subject._id));
  }
  for (const grade of grades) {
    if (grade.subject) subjectIdSet.add(String(grade.subject));
  }

  // null — barcha fanlar (admin/direktor), bo'sh massiv — o'qituvchiga
  // biriktirilgan fan yo'q degani.
  const allowedSubjectIds = Array.isArray(subjectIds)
    ? new Set(subjectIds.map(String))
    : null;

  const subjectIdsToFetch = [...subjectIdSet].filter(id => !allowedSubjectIds || allowedSubjectIds.has(id));
  const subjectDocs = subjectIdsToFetch.length
    ? await Subject.find({ _id: { $in: subjectIdsToFetch } }).select('name code color').lean()
    : [];

  const subjectMap = new Map(subjectDocs.map(subject => [String(subject._id), subject]));
  for (const pair of classData.subjects || []) {
    if (pair?.subject?._id && !subjectMap.has(String(pair.subject._id)) && (!allowedSubjectIds || allowedSubjectIds.has(String(pair.subject._id)))) {
      subjectMap.set(String(pair.subject._id), pair.subject);
    }
  }

  const subjects = [...subjectMap.values()].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'uz'));

  const studentMap = new Map();
  for (const student of classData.students || []) {
    if (student?._id) studentMap.set(String(student._id), student);
  }
  for (const student of directStudents || []) {
    if (student?._id) studentMap.set(String(student._id), student);
  }

  const gradesByStudentSubject = new Map();
  for (const grade of grades) {
    if (!grade.student || !grade.subject) continue;
    if (allowedSubjectIds && !allowedSubjectIds.has(String(grade.subject))) continue;

    const key = `${grade.student}:${grade.subject}`;
    if (!gradesByStudentSubject.has(key)) gradesByStudentSubject.set(key, []);
    gradesByStudentSubject.get(key).push(grade);
  }

  const students = [...studentMap.values()]
    .map(student => {
      const studentSubjects = {};
      const subjectPercents = [];

      for (const subject of subjects) {
        const key = `${student._id}:${subject._id}`;
        const summary = summarizeGrades(gradesByStudentSubject.get(key) || []);

        studentSubjects[String(subject._id)] = {
          _id: subject._id,
          name: subject.name || '',
          code: subject.code || '',
          color: subject.color || '',
          ...summary
        };

        if (summary.percent !== null) subjectPercents.push(summary.percent);
      }

      const overallPercentRaw = average(subjectPercents);

      return {
        _id: student._id,
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        studentId: student.studentId || '',
        subjects: studentSubjects,
        overallPercent: overallPercentRaw === null ? null : Math.round(overallPercentRaw),
        overallGrade: percentToQuarterGrade(overallPercentRaw)
      };
    })
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'uz'));

  const gradedStudents = students.filter(student => student.overallPercent !== null);
  const classAveragePercent = average(gradedStudents.map(student => student.overallPercent));

  return {
    quarter: range,
    class: {
      _id: classData._id,
      name: classData.name,
      grade: classData.grade,
      section: classData.section,
      group: classData.group
    },
    subjects: subjects.map(subject => ({
      _id: subject._id,
      name: subject.name || '',
      code: subject.code || '',
      color: subject.color || ''
    })),
    students,
    summary: {
      studentCount: students.length,
      gradedStudentCount: gradedStudents.length,
      subjectCount: subjects.length,
      averagePercent: classAveragePercent === null ? null : Math.round(classAveragePercent),
      averageGrade: percentToQuarterGrade(classAveragePercent)
    }
  };
}

async function calculateStudentQuarter({ studentId, quarter, calendar }) {
  const range = getQuarterRange(calendar, quarter);
  if (!range) throw new Error("Chorak topilmadi");

  const grades = await Grade.find({
    student: studentId,
    date: { $gte: range.startDate, $lte: range.endDate }
  })
    .select('student subject score isExam examMaxScore maxScore type date class')
    .lean();

  const subjectIds = [...new Set(grades.map(grade => String(grade.subject)).filter(Boolean))];
  const subjectDocs = subjectIds.length
    ? await Subject.find({ _id: { $in: subjectIds } }).select('name code color').lean()
    : [];

  const subjectMap = new Map(subjectDocs.map(subject => [String(subject._id), subject]));
  const gradesBySubject = new Map();

  for (const grade of grades) {
    if (!grade.subject) continue;
    const key = String(grade.subject);
    if (!gradesBySubject.has(key)) gradesBySubject.set(key, []);
    gradesBySubject.get(key).push(grade);
  }

  const subjects = [...gradesBySubject.entries()]
    .map(([subjectId, subjectGrades]) => {
      const subject = subjectMap.get(subjectId) || { _id: subjectId, name: '', code: '', color: '' };
      return {
        _id: subject._id,
        name: subject.name || '',
        code: subject.code || '',
        color: subject.color || '',
        ...summarizeGrades(subjectGrades)
      };
    })
    .filter(subject => subject.percent !== null)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'uz'));

  const overallPercentRaw = average(subjects.map(subject => subject.percent));

  return {
    quarter: range.quarter,
    label: range.label,
    startDate: range.startDate,
    endDate: range.endDate,
    subjects,
    overallPercent: overallPercentRaw === null ? null : Math.round(overallPercentRaw),
    overallGrade: percentToQuarterGrade(overallPercentRaw),
    gradeCount: subjects.reduce((sum, subject) => sum + subject.gradeCount, 0),
    dailyCount: subjects.reduce((sum, subject) => sum + subject.dailyCount, 0),
    examCount: subjects.reduce((sum, subject) => sum + subject.examCount, 0)
  };
}

module.exports = {
  DAILY_MAX_SCORE,
  DAILY_MAX_SCORE_LEGACY,
  QUARTER_LABELS,
  getAcademicYear,
  buildDefaultQuarters,
  normalizeCalendar,
  getQuarterRange,
  getCurrentQuarter,
  gradeToPercent,
  percentToQuarterGrade,
  summarizeGrades,
  calculateClassQuarter,
  calculateStudentQuarter
};
