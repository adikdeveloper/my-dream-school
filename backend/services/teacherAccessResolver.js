const mongoose = require('mongoose');
const Schedule = require('../models/scheduling/Schedule');
const Class = require('../models/academic/Class');
const User = require('../models/users/User');
const LessonSubstitution = require('../models/scheduling/LessonSubstitution');
const TeacherLesson = require('../models/scheduling/TeacherLesson');
const Grade = require('../models/academic/Grade');

const asId = value => String(value?._id || value || '');

const normalizeDay = value => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = value => {
  const date = normalizeDay(value);
  if (date) date.setHours(23, 59, 59, 999);
  return date;
};

const scheduleOverlapFilter = (startDate, endDate) => {
  const start = normalizeDay(startDate);
  const end = endOfDay(endDate || startDate);
  if (!start || !end) return {};
  return { startDate: { $lte: end }, endDate: { $gte: start } };
};

async function getTeacherSchedules(teacherId, options = {}) {
  const query = { 'schedule.periods.teacher': teacherId };
  if (options.classId) query.classId = options.classId;
  Object.assign(query, scheduleOverlapFilter(options.startDate, options.endDate));

  return Schedule.find(query)
    .select('classId name startDate endDate isActive schedule academicYear semester')
    .populate('classId', 'name grade section group isActive')
    .populate('schedule.periods.subject', 'name code color isActive')
    .lean();
}

async function getTeacherSubstitutions(teacherId, options = {}) {
  const query = {
    substituteTeacher: teacherId,
    status: { $ne: 'rejected' }
  };
  if (options.classId) query.classId = options.classId;
  const start = normalizeDay(options.startDate);
  const end = endOfDay(options.endDate || options.startDate);
  if (start && end) query.date = { $gte: start, $lte: end };

  return LessonSubstitution.find(query)
    .populate('classId', 'name grade section group isActive')
    .populate('subject', 'name code color isActive')
    .lean();
}

async function getTeacherLessons(teacherId, options = {}) {
  const query = { teacher: teacherId };
  if (options.classId) query.classId = options.classId;
  return TeacherLesson.find(query)
    .populate('classId', 'name grade section group isActive')
    .populate('subject', 'name code color isActive')
    .lean();
}

async function getTeacherGradeAssignments(teacherId, options = {}) {
  const match = { teacher: new mongoose.Types.ObjectId(String(teacherId)) };
  if (options.classId) match.class = new mongoose.Types.ObjectId(String(options.classId));
  const start = normalizeDay(options.startDate);
  const end = endOfDay(options.endDate || options.startDate);
  if (start && end) match.date = { $gte: start, $lte: end };
  return Grade.aggregate([
    { $match: match },
    { $group: { _id: { classId: '$class', subjectId: '$subject' } } },
    { $lookup: { from: 'classes', localField: '_id.classId', foreignField: '_id', as: 'classData' } },
    { $lookup: { from: 'subjects', localField: '_id.subjectId', foreignField: '_id', as: 'subjectData' } },
    { $unwind: '$classData' },
    { $unwind: '$subjectData' },
    { $match: { 'classData.isActive': { $ne: false } } }
  ]);
}

function collectScheduleSubjects(schedule, teacherId) {
  const subjects = new Map();
  for (const day of schedule.schedule || []) {
    for (const period of day.periods || []) {
      if (asId(period.teacher) !== asId(teacherId) || !period.subject) continue;
      subjects.set(asId(period.subject), {
        _id: period.subject._id || period.subject,
        name: period.subject.name || '',
        code: period.subject.code || '',
        color: period.subject.color || ''
      });
    }
  }
  return subjects;
}

async function getTeacherJournalScope(teacherId, options = {}) {
  const [teacher, schedules, substitutions, teacherLessons, gradeAssignments, legacyClasses] = await Promise.all([
    User.findById(teacherId).select('classes subjects').lean(),
    getTeacherSchedules(teacherId, options),
    getTeacherSubstitutions(teacherId, options),
    getTeacherLessons(teacherId, options),
    getTeacherGradeAssignments(teacherId, options),
    Class.find({
      isActive: true,
      $or: [{ classTeacher: teacherId }, { 'subjects.teacher': teacherId }]
    })
      .select('name grade section group subjects classTeacher isActive')
      .populate('subjects.subject', 'name code color isActive')
      .lean()
  ]);

  const directClassIds = (teacher?.classes || []).map(asId).filter(Boolean);
  if (directClassIds.length) {
    const directClasses = await Class.find({ _id: { $in: directClassIds }, isActive: true })
      .select('name grade section group subjects classTeacher isActive')
      .populate('subjects.subject', 'name code color isActive')
      .lean();
    legacyClasses.push(...directClasses);
  }

  const classes = new Map();
  const ensureClass = raw => {
    if (!raw) return null;
    const id = asId(raw);
    if (!id) return null;
    if (!classes.has(id)) {
      classes.set(id, {
        _id: raw._id || raw,
        name: raw.name || '',
        grade: raw.grade,
        section: raw.section || '',
        group: raw.group || '',
        subjects: new Map(),
        scheduleIds: new Set(),
        sources: new Set()
      });
    }
    return classes.get(id);
  };

  for (const schedule of schedules) {
    const entry = ensureClass(schedule.classId);
    if (!entry) continue;
    entry.sources.add('schedule');
    entry.scheduleIds.add(asId(schedule));
    for (const [id, subject] of collectScheduleSubjects(schedule, teacherId)) {
      entry.subjects.set(id, subject);
    }
  }

  for (const substitution of substitutions) {
    const entry = ensureClass(substitution.classId);
    if (!entry) continue;
    entry.sources.add('substitution');
    if (substitution.subject) {
      entry.subjects.set(asId(substitution.subject), {
        _id: substitution.subject._id || substitution.subject,
        name: substitution.subject.name || '',
        code: substitution.subject.code || '',
        color: substitution.subject.color || ''
      });
    }
  }

  for (const lesson of teacherLessons) {
    const entry = ensureClass(lesson.classId);
    if (!entry || !lesson.subject) continue;
    entry.sources.add('teacherLesson');
    entry.subjects.set(asId(lesson.subject), { _id: lesson.subject._id || lesson.subject, name: lesson.subject.name || '', code: lesson.subject.code || '', color: lesson.subject.color || '' });
  }

  for (const assignment of gradeAssignments) {
    const entry = ensureClass(assignment.classData);
    if (!entry) continue;
    const subject = assignment.subjectData;
    entry.sources.add('gradeHistory');
    entry.subjects.set(asId(subject), { _id: subject._id, name: subject.name || '', code: subject.code || '', color: subject.color || '' });
  }

  for (const classItem of legacyClasses) {
    const entry = ensureClass(classItem);
    if (!entry) continue;
    entry.sources.add('legacy');
    for (const pair of classItem.subjects || []) {
      if (asId(pair.teacher) !== asId(teacherId) || !pair.subject) continue;
      entry.subjects.set(asId(pair.subject), {
        _id: pair.subject._id || pair.subject,
        name: pair.subject.name || '',
        code: pair.subject.code || '',
        color: pair.subject.color || ''
      });
    }
  }

  return [...classes.values()].map(item => ({
    ...item,
    subjects: [...item.subjects.values()],
    scheduleIds: [...item.scheduleIds],
    sources: [...item.sources]
  }));
}

async function resolveTeacherLessonAccess({ teacherId, classId, subjectId, date }) {
  if (![teacherId, classId, subjectId].every(id => mongoose.Types.ObjectId.isValid(id))) {
    return { allowed: false, reason: 'invalid_ids', schedule: null };
  }
  const dayStart = normalizeDay(date);
  const dayEnd = endOfDay(date);
  if (!dayStart) return { allowed: false, reason: 'invalid_date', schedule: null };
  const today = normalizeDay(new Date());
  if (dayStart > today) return { allowed: false, reason: 'future_date', schedule: null };

  const schedules = await Schedule.find({
    classId,
    startDate: { $lte: dayEnd },
    endDate: { $gte: dayStart }
  });
  const dayNames = [
    ['Yakshanba', 'Sunday'], ['Dushanba', 'Monday'], ['Seshanba', 'Tuesday'],
    ['Chorshanba', 'Wednesday'], ['Payshanba', 'Thursday'], ['Juma', 'Friday'],
    ['Shanba', 'Saturday']
  ];
  const allowedDayNames = dayNames[dayStart.getDay()];
  const schedule = schedules.find(item => (item.schedule || []).some(day =>
    allowedDayNames.includes(day.day) && (day.periods || []).some(period =>
      asId(period.teacher) === asId(teacherId) && asId(period.subject) === asId(subjectId)
    )
  ));
  if (schedule) {
    const holiday = (schedule.holidays || []).some(item => {
      const holidayDay = normalizeDay(item.date);
      return holidayDay && holidayDay.getTime() === dayStart.getTime();
    });
    if (holiday) return { allowed: false, reason: 'holiday', schedule };
    return { allowed: true, source: 'schedule', schedule };
  }

  const substitution = await LessonSubstitution.findOne({
    substituteTeacher: teacherId,
    classId,
    subject: subjectId,
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $ne: 'rejected' }
  });
  if (substitution) return { allowed: true, source: 'substitution', schedule: null, substitution };

  const historicalGrade = await Grade.exists({ teacher: teacherId, class: classId, subject: subjectId, date: { $gte: dayStart, $lte: dayEnd } });
  if (historicalGrade) return { allowed: true, source: 'gradeHistory', schedule: null };

  const teacherLesson = await TeacherLesson.exists({ teacher: teacherId, classId, subject: subjectId, day: { $in: allowedDayNames } });
  if (teacherLesson) return { allowed: true, source: 'teacherLesson', schedule: null };

  const anyScheduleForDay = schedules.length > 0;
  if (!anyScheduleForDay) {
    const legacy = await Class.exists({
      _id: classId,
      subjects: { $elemMatch: { teacher: teacherId, subject: subjectId } }
    });
    if (legacy) return { allowed: true, source: 'legacy', schedule: null };
  }

  return { allowed: false, reason: 'not_assigned_for_date', schedule: null };
}

module.exports = {
  normalizeDay,
  endOfDay,
  getTeacherSchedules,
  getTeacherSubstitutions,
  getTeacherLessons,
  getTeacherJournalScope,
  resolveTeacherLessonAccess
};
