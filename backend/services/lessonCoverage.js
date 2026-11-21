const Schedule = require('../models/scheduling/Schedule');
const Holiday = require('../models/scheduling/Holiday');
const LessonSubstitution = require('../models/scheduling/LessonSubstitution');
const Attendance = require('../models/academic/Attendance');
const Grade = require('../models/academic/Grade');

const DAY_MS = 86400000;
const MAX_UNGRADED_RATIO = 0.2;
const ABSENCE_STATUSES = ['absent', 'excused', 'kelmadi', 'sababli'];
const DAILY_GRADE_TYPES = new Set(['daily']);

const dayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const dayStart = (value) => new Date(`${dayKey(value)}T00:00:00.000Z`);
const dayEnd = (value) => new Date(`${dayKey(value)}T23:59:59.999Z`);

const weekday = (value) => new Date(`${dayKey(value)}T12:00:00.000Z`)
  .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

const currentSchoolDayKey = () => new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 10);

const fullName = (person) => {
  if (!person || typeof person !== 'object') return '';
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
};

function activeOnDate(student, dateKeyValue) {
  if (!student) return false;
  if (student.registrationDate && dayKey(student.registrationDate) > dateKeyValue) return false;
  if (student.leftDate && dayKey(student.leftDate) < dateKeyValue) return false;
  return true;
}

function scheduleCoversDay(schedule, dateKeyValue) {
  return dayKey(schedule.startDate) <= dateKeyValue && dayKey(schedule.endDate) >= dateKeyValue;
}

function isGlobalHoliday(holidays, dateKeyValue) {
  return holidays.some((holiday) => {
    const start = dayKey(holiday.date);
    if (!start) return false;
    const end = holiday.endDate ? dayKey(holiday.endDate) : start;
    return dateKeyValue >= start && dateKeyValue <= end;
  });
}

/*
 * Chorakdagi haqiqiy dars slotlarini yig'adi.
 * Har bir slot — jadvaldagi bitta dars soati. Bayramlar, jadval amal
 * qilmaydigan kunlar va kelajak sanalar hisobga olinmaydi.
 */
async function collectClassLessonSlots({
  classId,
  startDate,
  endDate,
  subjectId = null,
  todayKey = currentSchoolDayKey()
}) {
  const start = dayStart(startDate);
  const requestedEnd = dayEnd(endDate);
  const cap = dayEnd(todayKey);
  const end = requestedEnd > cap ? cap : requestedEnd;

  if (!classId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const [schedules, holidays, substitutions] = await Promise.all([
    Schedule.find({
      classId,
      isActive: true,
      startDate: { $lte: end },
      endDate: { $gte: start }
    })
      .populate('schedule.periods.subject', 'name code color')
      .populate('schedule.periods.teacher', 'firstName lastName')
      .sort({ startDate: -1 })
      .lean(),
    Holiday.find({
      isActive: true,
      date: { $lte: end },
      $or: [
        { endDate: { $gte: start } },
        { endDate: null, date: { $gte: start } },
        { endDate: { $exists: false }, date: { $gte: start } }
      ]
    }).lean(),
    LessonSubstitution.find({
      classId,
      date: { $gte: start, $lte: end },
      status: { $ne: 'rejected' }
    })
      .populate('substituteTeacher', 'firstName lastName')
      .lean()
  ]);

  const substitutionBySlot = new Map();
  for (const substitution of substitutions) {
    substitutionBySlot.set(
      `${dayKey(substitution.date)}|${substitution.periodIndex}`,
      substitution
    );
  }

  const filterSubjectId = subjectId ? String(subjectId) : null;
  const slots = [];

  for (let cursor = +start; cursor <= +end; cursor += DAY_MS) {
    const date = new Date(cursor);
    const key = dayKey(date);
    if (isGlobalHoliday(holidays, key)) continue;

    const schedule = schedules.find((item) => scheduleCoversDay(item, key));
    if (!schedule) continue;

    if ((schedule.holidays || []).some((holiday) => dayKey(holiday.date) === key)) continue;

    const daySchedule = (schedule.schedule || []).find((item) => item.day === weekday(key));
    if (!daySchedule) continue;

    (daySchedule.periods || []).forEach((period, index) => {
      const rawSubject = period.subject;
      const slotSubjectId = rawSubject?._id || rawSubject;
      if (!slotSubjectId) return;
      if (filterSubjectId && String(slotSubjectId) !== filterSubjectId) return;

      const substitution = substitutionBySlot.get(`${key}|${index}`);
      const owner = substitution?.substituteTeacher || period.teacher;

      slots.push({
        dateKey: key,
        date: date.toISOString(),
        periodIndex: index,
        periodNumber: index + 1,
        startTime: period.startTime || '',
        endTime: period.endTime || '',
        subjectId: String(slotSubjectId),
        subjectName: rawSubject?.name || '',
        teacherId: owner?._id ? String(owner._id) : '',
        teacherName: fullName(owner),
        scheduleId: schedule._id ? String(schedule._id) : ''
      });
    });
  }

  return slots;
}

/*
 * Har bir o'quvchi va fan bo'yicha dars soatlari qamrovini hisoblaydi.
 * Baholanmagan darslar ulushi 20% dan oshsa, chorak bahosi chiqarilmaydi.
 * O'quvchi darsda qatnashmagan (kelmagan/sababli) kunlar hisobga olinmaydi.
 */
async function buildClassCoverage({
  classId,
  students,
  subjectIds,
  startDate,
  endDate,
  grades = null,
  attendance = null,
  slots = null,
  todayKey = currentSchoolDayKey()
}) {
  const ids = [...new Set((subjectIds || []).map(String).filter(Boolean))];
  const empty = { students: new Map(), subjects: new Map() };
  if (!classId || !ids.length) return empty;

  const lessonSlots = slots || await collectClassLessonSlots({
    classId,
    startDate,
    endDate,
    todayKey
  });
  const relevantSlots = lessonSlots.filter((slot) => ids.includes(slot.subjectId));

  const subjectDates = new Map();
  for (const slot of relevantSlots) {
    if (!subjectDates.has(slot.subjectId)) subjectDates.set(slot.subjectId, new Map());
    const datePeriods = subjectDates.get(slot.subjectId);
    if (!datePeriods.has(slot.dateKey)) datePeriods.set(slot.dateKey, new Set());
    datePeriods.get(slot.dateKey).add(slot.periodNumber);
  }

  if (!subjectDates.size) return empty;

  const rangeStart = dayStart(startDate);
  const rangeEnd = dayEnd(endDate);

  const [gradeDocs, attendanceDocs] = await Promise.all([
    grades
      ? Promise.resolve(grades)
      : Grade.find({
        class: classId,
        subject: { $in: ids },
        date: { $gte: rangeStart, $lte: rangeEnd }
      }).select('student subject date type isExam periodNumber').lean(),
    attendance
      ? Promise.resolve(attendance)
      : Attendance.find({
        class: classId,
        subject: { $in: ids },
        date: { $gte: rangeStart, $lte: rangeEnd }
      }).select('student subject date status').lean()
  ]);

  // Jurnal bir kunda fan bo'yicha bitta baho yozadi. Shu sabab o'sha kunda
  // fanning barcha dars soatlari baholangan hisoblanadi. periodNumber faqat
  // dublikatlarni ajratish uchun ishlatiladi, qamrovni hisoblashda kun
  // birligi asos qilib olinadi.
  const dailyGradeDates = new Map();
  for (const grade of gradeDocs) {
    if (!grade.student || !grade.subject) continue;
    if (grade.isExam || grade.type === 'exam' || !DAILY_GRADE_TYPES.has(grade.type)) continue;
    const studentIdValue = String(grade.student?._id || grade.student);
    const subjectIdValue = String(grade.subject?._id || grade.subject);
    const key = `${studentIdValue}|${subjectIdValue}`;
    if (!dailyGradeDates.has(key)) dailyGradeDates.set(key, new Set());
    dailyGradeDates.get(key).add(dayKey(grade.date));
  }

  const attendanceByKey = new Map();
  for (const record of attendanceDocs) {
    if (!record.student || !record.subject || !record.date) continue;
    const studentIdValue = String(record.student?._id || record.student);
    const subjectIdValue = String(record.subject?._id || record.subject);
    const key = `${studentIdValue}|${subjectIdValue}|${dayKey(record.date)}`;
    const entry = attendanceByKey.get(key) || { present: false, absent: false };
    if (ABSENCE_STATUSES.includes(record.status)) entry.absent = true;
    else entry.present = true;
    attendanceByKey.set(key, entry);
  }

  const coverageByStudent = new Map();

  for (const student of students || []) {
    if (!student?._id) continue;
    const studentId = String(student._id);
    const subjectCoverage = new Map();

    for (const subjectIdValue of ids) {
      const dateCounts = subjectDates.get(subjectIdValue);
      if (!dateCounts) {
        subjectCoverage.set(subjectIdValue, {
          totalLessons: 0,
          gradedLessons: 0,
          missingLessons: 0,
          coveragePercent: null,
          blocked: false,
          missingDates: []
        });
        continue;
      }

      let totalLessons = 0;
      let gradedLessons = 0;
      const missingDates = [];
      const gradeDates = dailyGradeDates.get(`${studentId}|${subjectIdValue}`) || new Set();

      for (const [dateKeyValue, periodNumbers] of dateCounts) {
        if (!activeOnDate(student, dateKeyValue)) continue;

        const attendanceEntry = attendanceByKey.get(`${studentId}|${subjectIdValue}|${dateKeyValue}`);
        if (attendanceEntry && attendanceEntry.absent && !attendanceEntry.present) continue;

        const periods = periodNumbers.size;
        totalLessons += periods;
        if (gradeDates.has(dateKeyValue)) {
          gradedLessons += periods;
        } else {
          missingDates.push(dateKeyValue);
        }
      }

      const missingLessons = Math.max(0, totalLessons - gradedLessons);
      const coveragePercent = totalLessons ? Math.round((gradedLessons / totalLessons) * 100) : null;
      const blocked = totalLessons > 0 && missingLessons > totalLessons * MAX_UNGRADED_RATIO;

      subjectCoverage.set(subjectIdValue, {
        totalLessons,
        gradedLessons,
        missingLessons,
        coveragePercent,
        blocked,
        missingDates: missingDates.sort()
      });
    }

    coverageByStudent.set(studentId, subjectCoverage);
  }

  return { students: coverageByStudent, subjects: subjectDates };
}

function applyCoverageGate(summary, coverage) {
  const blocked = Boolean(coverage?.blocked);
  const issued = !blocked && summary.grade !== null;

  return {
    ...summary,
    grade: issued ? summary.grade : null,
    issued,
    blocked,
    totalLessons: coverage?.totalLessons ?? 0,
    gradedLessons: coverage?.gradedLessons ?? 0,
    missingLessons: coverage?.missingLessons ?? 0,
    coveragePercent: coverage?.coveragePercent ?? null,
    missingLessonDates: coverage?.missingDates ?? []
  };
}

module.exports = {
  DAY_MS,
  MAX_UNGRADED_RATIO,
  ABSENCE_STATUSES,
  dayKey,
  dayStart,
  dayEnd,
  weekday,
  currentSchoolDayKey,
  activeOnDate,
  fullName,
  collectClassLessonSlots,
  buildClassCoverage,
  applyCoverageGate
};
