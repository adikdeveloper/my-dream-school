const User = require('../models/users/User');
const Grade = require('../models/academic/Grade');
const Attendance = require('../models/academic/Attendance');
const Schedule = require('../models/scheduling/Schedule');
const Holiday = require('../models/scheduling/Holiday');
const LessonSubstitution = require('../models/scheduling/LessonSubstitution');

const DAY_MS = 86400000;
const dayKey = (date) => new Date(date).toISOString().slice(0, 10);
const dayStart = (date) => new Date(dayKey(date));
const dateRange = (date) => ({ $gte: dayStart(date), $lt: new Date(+dayStart(date) + DAY_MS) });
const weekday = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
const targetCount = (count) => Math.ceil(count * 2 / 5);
const absence = ['absent', 'excused', 'kelmadi', 'sababli'];
const dailyFilter = { type: 'daily', isExam: { $ne: true } };

function schoolNow() {
  const local = new Date(Date.now() + 5 * 3600000).toISOString();
  return { today: local.slice(0, 10), time: local.slice(11, 16) };
}

function activeOnDate(student, date) {
  return (!student.registrationDate || dayKey(student.registrationDate) <= date) &&
    (!student.leftDate || dayKey(student.leftDate) >= date);
}

async function rosterForClass(cls, session) {
  return User.find({
    role: 'student',
    isActive: true,
    $or: [{ classId: cls._id }, { _id: { $in: cls.students || [] } }]
  }).select('firstName lastName studentId registrationDate leftDate').session(session || null).lean();
}

async function gradingContext(cls, subject, date, session, roster) {
  const filters = { class: cls._id, subject, date: dateRange(date) };
  const absent = await Attendance.distinct('student', { ...filters, status: { $in: absence } }).session(session || null);
  const excluded = new Set(absent.map(String));
  const members = roster || await rosterForClass(cls, session);
  const eligible = new Set(members.filter((student) => activeOnDate(student, date) && !excluded.has(String(student._id))).map((student) => String(student._id)));
  const grades = await Grade.find({ ...filters, ...dailyFilter }).sort({ updatedAt: -1, _id: -1 }).session(session || null);
  return { eligible, grades, required: targetCount(eligible.size) };
}

function scheduleOnDate(schedules, date) {
  const range = dateRange(date);
  return schedules.find((schedule) => schedule.startDate < range.$lt && schedule.endDate >= range.$gte);
}

function schedulePeriods(schedule, date) {
  if (!schedule || schedule.holidays?.some((holiday) => dayKey(holiday.date) === date)) return [];
  return schedule.schedule.find((day) => day.day === weekday(date))?.periods || [];
}

async function previousStreak(classId, subject, date, session) {
  const start = new Date(+dayStart(date) - 90 * DAY_MS);
  const end = dayStart(date);
  const schedules = await Schedule.find({ classId, isActive: true, startDate: { $lt: end }, endDate: { $gte: start } }).sort({ startDate: -1 }).session(session).lean();
  const holidays = await Holiday.find({ isActive: true, date: { $lt: end }, $or: [{ date: { $gte: start } }, { endDate: { $gte: start } }] }).session(session).lean();
  const replacements = await LessonSubstitution.distinct('date', { classId, subject, date: { $gte: start, $lt: end }, status: { $ne: 'rejected' } }).session(session);
  const replacementDates = new Set(replacements.map(dayKey));
  const records = await Grade.find({ ...dailyFilter, class: classId, subject, date: { $gte: start, $lt: end } }).select('student date').session(session).lean();
  const byDate = new Map();
  for (const record of records) {
    const key = dayKey(record.date);
    if (!byDate.has(key)) byDate.set(key, new Set());
    byDate.get(key).add(String(record.student));
  }
  const previous = [];
  for (let cursor = +end - DAY_MS; cursor >= +start && previous.length < 2; cursor -= DAY_MS) {
    const key = dayKey(cursor);
    if (holidays.some((holiday) => dayKey(holiday.date) <= key && dayKey(holiday.endDate || holiday.date) >= key)) continue;
    const schedule = scheduleOnDate(schedules, key);
    if (replacementDates.has(key) || schedulePeriods(schedule, key).some((period) => String(period.subject) === String(subject)) || (!schedule && byDate.has(key))) {
      previous.push(byDate.get(key) || new Set());
    }
  }
  return previous.length === 2 ? new Set([...previous[0]].filter((student) => previous[1].has(student))) : new Set();
}

function rotationExceeded(eligible, selected, streak, required) {
  const available = [...eligible].filter((student) => !streak.has(student)).length;
  const repeated = [...selected].filter((student) => streak.has(student)).length;
  return repeated > Math.max(0, required - available);
}

async function teacherGradingStatus(teacher, date, options = {}) {
  const { today, time } = schoolNow();
  if (date > today || await Holiday.isHoliday(dayStart(date))) return [];
  const { getTeacherJournalScope } = require('./teacherAccessResolver');
  const Class = require('../models/academic/Class');
  const range = dateRange(date);
  let classes;

  if (options.assignedOnly) {
    // Baholash nazorati faqat sinf rahbari biriktirilgan sinflar bo'yicha.
    // Boshqa sinflarda dars berish yoki baho qo'yish bu bo'limni ochmaydi.
    classes = await Class.find({
      isActive: true,
      classTeacher: teacher._id
    }).select('name students').lean();
  } else {
    const scope = await getTeacherJournalScope(teacher._id, { startDate: date, endDate: date });
    classes = await Class.find({
      isActive: true,
      $or: [
        { _id: { $in: [...scope.map((item) => item._id), ...(teacher.classes || [])] } },
        { classTeacher: teacher._id }
      ]
    }).select('name students').lean();
  }

  if (!classes.length) return [];
  const classIds = classes.map((cls) => cls._id);
  const [schedules, substitutions] = await Promise.all([
    Schedule.find({ classId: { $in: classIds }, isActive: true, startDate: { $lt: range.$lt }, endDate: { $gte: range.$gte } })
      .sort({ startDate: -1 }).populate('schedule.periods.subject', 'name').populate('schedule.periods.teacher', 'firstName lastName').lean(),
    LessonSubstitution.find({ classId: { $in: classIds }, date: range, status: { $ne: 'rejected' } })
      .populate('substituteTeacher', 'firstName lastName').lean()
  ]);
  const replacementBySlot = new Map(substitutions.map((item) => [`${item.classId}|${item.periodIndex}`, item]));
  const rowsByClass = await Promise.all(classes.map(async (cls) => {
    const schedule = scheduleOnDate(schedules.filter((item) => String(item.classId) === String(cls._id)), date);
    const entries = new Map();
    schedulePeriods(schedule, date).forEach((period, index) => {
      const replacement = replacementBySlot.get(`${cls._id}|${index}`);
      const owner = replacement?.substituteTeacher || period.teacher;
      if (!period.subject || !owner || (date === today && period.endTime > time)) return;
      const key = `${period.subject._id}|${owner._id}`;
      if (!entries.has(key)) entries.set(key, { period, owner });
    });
    if (!entries.size) return [];
    const roster = await rosterForClass(cls);
    const contexts = new Map();
    for (const { period } of entries.values()) {
      const subject = String(period.subject._id);
      if (!contexts.has(subject)) contexts.set(subject, await gradingContext(cls, subject, date, null, roster));
    }
    return [...entries.values()].map(({ period, owner }) => {
      const { required, grades, eligible } = contexts.get(String(period.subject._id));
      const graded = new Set(grades.map((grade) => String(grade.student)).filter((student) => eligible.has(student))).size;
      return {
        classId: cls._id, className: cls.name, subjectId: period.subject._id, subjectName: period.subject.name,
        teacherId: owner._id, teacherName: [owner.firstName, owner.lastName].filter(Boolean).join(' '),
        date, startTime: period.startTime, endTime: period.endTime,
        time: `${period.startTime} - ${period.endTime}`, graded, required, eligible: eligible.size,
        completed: graded >= required
      };
    });
  }));
  return rowsByClass.flat().sort((a, b) => a.startTime.localeCompare(b.startTime) || a.className.localeCompare(b.className));
}

module.exports = {
  activeOnDate, absence,
  teacherGradingStatus,
  DAY_MS, dayKey, dayStart, dateRange, schoolNow, dailyFilter, gradingContext,
  rosterForClass, scheduleOnDate, schedulePeriods, previousStreak, rotationExceeded, targetCount
};
