/**
 * Schedule Synchronization Utility
 *
 * Synchronizes data between Schedule, Class.subjects, and User.subjects
 * to ensure consistency across all models.
 */

const User = require('../models/users/User');
const Class = require('../models/academic/Class');
const Subject = require('../models/academic/Subject');

/**
 * Extract unique subject-teacher pairs from schedule
 * @param {Array} schedule - Schedule array from Schedule model
 * @returns {Array} Array of {subject, teacher} objects
 */
function extractSubjectTeacherPairs(schedule) {
  const pairs = [];
  const seen = new Set();

  schedule.forEach(day => {
    if (day.periods && Array.isArray(day.periods)) {
      day.periods.forEach(period => {
        if (period.subject && period.teacher) {
          const key = `${period.subject}_${period.teacher}`;
          if (!seen.has(key)) {
            seen.add(key);
            pairs.push({
              subject: period.subject,
              teacher: period.teacher
            });
          }
        }
      });
    }
  });

  return pairs;
}

/**
 * Synchronize Schedule → Class.subjects + User.subjects
 * Called when Schedule is created or updated
 */
async function syncScheduleToClassAndUser(classId, scheduleData) {
  try {
    // Extract subject-teacher pairs from schedule
    const pairs = extractSubjectTeacherPairs(scheduleData);

    if (pairs.length === 0) {
      return { success: true, message: 'No subjects to synchronize' };
    }

    // Update Class.subjects
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw new Error('Class not found');
    }

    // Replace Class.subjects with pairs from schedule
    classDoc.subjects = pairs;
    await classDoc.save();

    // Update User.subjects for each teacher
    const teacherUpdates = {};
    pairs.forEach(pair => {
      const teacherId = pair.teacher.toString();
      if (!teacherUpdates[teacherId]) {
        teacherUpdates[teacherId] = [];
      }
      teacherUpdates[teacherId].push(pair.subject);
    });

    // Update each teacher's subjects
    for (const [teacherId, subjectIds] of Object.entries(teacherUpdates)) {
      await User.findByIdAndUpdate(
        teacherId,
        { $addToSet: { subjects: { $each: subjectIds } } },
        { runValidators: true }
      );

      // Also update Subject.teachers
      for (const subjectId of subjectIds) {
        await Subject.findByIdAndUpdate(
          subjectId,
          { $addToSet: { teachers: teacherId } },
          { runValidators: true }
        );
      }
    }

    return {
      success: true,
      message: 'Synchronized successfully',
      stats: {
        classSubjectsUpdated: pairs.length,
        teachersUpdated: Object.keys(teacherUpdates).length
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Synchronize User.subjects → Schedule
 * Called when User.subjects is updated
 */
async function syncUserToSchedule(userId, newSubjects, oldSubjects = []) {
  try {
    // Find all schedules where this teacher teaches
    const Schedule = require('../models/scheduling/Schedule');
    const schedules = await Schedule.find({
      'schedule.periods.teacher': userId
    });

    const addedSubjects = newSubjects.filter(s => !oldSubjects.includes(s.toString()));
    const removedSubjects = oldSubjects.filter(s => !newSubjects.map(ns => ns.toString()).includes(s.toString()));

    // Note: We don't automatically add subjects to schedule
    // because schedule requires specific day/period placement
    // This sync only removes subjects that are no longer assigned

    for (const schedule of schedules) {
      let modified = false;

      schedule.schedule.forEach(day => {
        if (day.periods) {
          day.periods.forEach(period => {
            if (period.teacher?.toString() === userId.toString()) {
              // If subject was removed from teacher, clear it from schedule
              if (removedSubjects.includes(period.subject?.toString())) {
                period.subject = null;
                period.teacher = null;
                modified = true;
              }
            }
          });
        }
      });

      if (modified) {
        await schedule.save();
      }
    }

    return { success: true, message: 'User-to-Schedule sync completed' };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Synchronize Class.subjects → Schedule
 * Called when Class.subjects is updated
 */
async function syncClassToSchedule(classId, newSubjects, oldSubjects = []) {
  try {
    const Schedule = require('../models/scheduling/Schedule');
    const schedules = await Schedule.find({ classId });

    const removedPairs = oldSubjects.filter(old => {
      return !newSubjects.find(newPair =>
        newPair.subject?.toString() === old.subject?.toString() &&
        newPair.teacher?.toString() === old.teacher?.toString()
      );
    });

    // Remove subject-teacher pairs from schedule if they're no longer in Class.subjects
    for (const schedule of schedules) {
      let modified = false;

      schedule.schedule.forEach(day => {
        if (day.periods) {
          day.periods.forEach(period => {
            const removed = removedPairs.find(pair =>
              pair.subject?.toString() === period.subject?.toString() &&
              pair.teacher?.toString() === period.teacher?.toString()
            );

            if (removed) {
              period.subject = null;
              period.teacher = null;
              modified = true;
            }
          });
        }
      });

      if (modified) {
        await schedule.save();
      }
    }

    return { success: true, message: 'Class-to-Schedule sync completed' };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  syncScheduleToClassAndUser,
  syncUserToSchedule,
  syncClassToSchedule,
  extractSubjectTeacherPairs
};
