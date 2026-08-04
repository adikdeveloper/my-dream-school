const Schedule = require('../models/scheduling/Schedule');
const Class = require('../models/academic/Class');

/**
 * Schedule Validator Utility
 * Helps validate grades, attendance, and other data against schedule validity periods
 */

/**
 * Get current active schedule for a class
 * @param {String} classId - MongoDB ObjectId of the class
 * @returns {Object|null} - Schedule object or null if not found
 */
async function getCurrentScheduleForClass(classId) {
  try {
    const schedule = await Schedule.findCurrentSchedule(classId);
    return schedule;
  } catch (error) {
    return null;
  }
}

/**
 * Get schedule that covers a specific date for a class
 * @param {String} classId - MongoDB ObjectId of the class
 * @param {Date} date - The date to check
 * @returns {Object|null} - Schedule object or null if not found
 */
async function getScheduleForDate(classId, date) {
  try {
    const targetDate = new Date(date);

    const schedule = await Schedule.findOne({
      classId,
      isActive: true,
      startDate: { $lte: targetDate },
      endDate: { $gte: targetDate }
    })
      .populate('schedule.periods.subject', 'name code color')
      .populate('schedule.periods.teacher', 'firstName lastName');

    return schedule;
  } catch (error) {
    return null;
  }
}

/**
 * Validate if a grade date falls within a valid schedule period
 * @param {String} classId - MongoDB ObjectId of the class
 * @param {Date} gradeDate - The date of the grade
 * @returns {Object} - { valid: boolean, schedule: Object|null, message: String }
 */
async function validateGradeDate(classId, gradeDate) {
  try {
    const schedule = await getScheduleForDate(classId, gradeDate);

    if (!schedule) {
      return {
        valid: false,
        schedule: null,
        message: 'Bu sana uchun aktiv jadval topilmadi'
      };
    }

    // Check if schedule status is appropriate
    const status = schedule.getStatus();

    if (status === 'archived') {
      return {
        valid: false,
        schedule: schedule,
        message: 'Bu jadval arxivlangan'
      };
    }

    if (status === 'future') {
      return {
        valid: false,
        schedule: schedule,
        message: 'Bu jadval hali boshlanmagan'
      };
    }

    return {
      valid: true,
      schedule: schedule,
      message: status === 'expired' ? 'Tarixiy jadval bo\'yicha baholash' : 'OK'
    };
  } catch (error) {
    return {
      valid: false,
      schedule: null,
      message: 'Validatsiyada xatolik'
    };
  }
}

/**
 * Get date range filter for current active schedule
 * @param {String} classId - MongoDB ObjectId of the class
 * @returns {Object|null} - { $gte: Date, $lte: Date } or null
 */
async function getCurrentScheduleDateRange(classId) {
  try {
    const schedule = await getCurrentScheduleForClass(classId);

    if (!schedule) {
      return null;
    }

    return {
      $gte: schedule.startDate,
      $lte: schedule.endDate
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get date range filter for multiple classes' current schedules
 * Useful for teachers who teach multiple classes
 * @param {Array} classIds - Array of MongoDB ObjectIds
 * @returns {Array} - Array of { classId, dateRange: {$gte, $lte} }
 */
async function getMultipleScheduleDateRanges(classIds) {
  try {
    const ranges = [];

    for (const classId of classIds) {
      const dateRange = await getCurrentScheduleDateRange(classId);
      if (dateRange) {
        ranges.push({
          classId,
          dateRange
        });
      }
    }

    return ranges;
  } catch (error) {
    return [];
  }
}

/**
 * Check if there are overlapping schedules for a class
 * @param {String} classId - MongoDB ObjectId of the class
 * @param {Date} startDate - Start date of new/updated schedule
 * @param {Date} endDate - End date of new/updated schedule
 * @param {String} excludeScheduleId - Schedule ID to exclude from check (for updates)
 * @returns {Object} - { hasOverlap: boolean, overlappingSchedules: Array }
 */
async function checkScheduleOverlap(classId, startDate, endDate, excludeScheduleId = null) {
  try {
    const query = {
      classId,
      isActive: true,
      $or: [
        // New schedule starts during existing schedule
        {
          startDate: { $lte: startDate },
          endDate: { $gte: startDate }
        },
        // New schedule ends during existing schedule
        {
          startDate: { $lte: endDate },
          endDate: { $gte: endDate }
        },
        // New schedule completely contains existing schedule
        {
          startDate: { $gte: startDate },
          endDate: { $lte: endDate }
        }
      ]
    };

    // Exclude current schedule if updating
    if (excludeScheduleId) {
      query._id = { $ne: excludeScheduleId };
    }

    const overlappingSchedules = await Schedule.find(query);

    return {
      hasOverlap: overlappingSchedules.length > 0,
      overlappingSchedules
    };
  } catch (error) {
    return {
      hasOverlap: false,
      overlappingSchedules: []
    };
  }
}

/**
 * Get schedule statistics for a class
 * @param {String} classId - MongoDB ObjectId of the class
 * @returns {Object} - Statistics about schedules
 */
async function getScheduleStats(classId) {
  try {
    const allSchedules = await Schedule.find({ classId });

    let activeCount = 0;
    let futureCount = 0;
    let expiredCount = 0;
    let archivedCount = 0;

    allSchedules.forEach(schedule => {
      const status = schedule.getStatus();
      switch (status) {
        case 'active':
          activeCount++;
          break;
        case 'future':
          futureCount++;
          break;
        case 'expired':
          expiredCount++;
          break;
        case 'archived':
          archivedCount++;
          break;
      }
    });

    return {
      total: allSchedules.length,
      active: activeCount,
      future: futureCount,
      expired: expiredCount,
      archived: archivedCount
    };
  } catch (error) {
    return {
      total: 0,
      active: 0,
      future: 0,
      expired: 0,
      archived: 0
    };
  }
}

/**
 * Validate attendance date against schedule
 * @param {String} classId - MongoDB ObjectId of the class
 * @param {Date} attendanceDate - The date of attendance record
 * @returns {Object} - { valid: boolean, message: String }
 */
async function validateAttendanceDate(classId, attendanceDate) {
  try {
    const schedule = await getScheduleForDate(classId, attendanceDate);

    if (!schedule) {
      return {
        valid: false,
        message: 'Bu sana uchun aktiv jadval topilmadi'
      };
    }

    const status = schedule.getStatus();

    if (status === 'archived' || status === 'expired') {
      return {
        valid: false,
        message: 'Bu jadval muddati tugagan yoki arxivlangan'
      };
    }

    return {
      valid: true,
      message: 'OK'
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Validatsiyada xatolik'
    };
  }
}

/**
 * Check if a teacher is available at a specific time
 * @param {String} teacherId - MongoDB ObjectId of the teacher
 * @param {String} day - Day of the week (Monday, Tuesday, etc.)
 * @param {String} startTime - Start time (HH:MM format)
 * @param {String} endTime - End time (HH:MM format)
 * @param {String} excludeClassId - Class ID to exclude from check (for updates)
 * @returns {Object} - { available: boolean, conflictingClass: Object|null }
 */
async function checkTeacherAvailability(teacherId, day, startTime, endTime, excludeClassId = null) {
  try {
    // Get all active classes
    const query = { isActive: true };
    if (excludeClassId) {
      query._id = { $ne: excludeClassId };
    }

    const classes = await Class.find(query).select('_id name').lean();

    // Check each class's current schedule
    for (const classItem of classes) {
      const schedule = await Schedule.findCurrentSchedule(classItem._id);

      if (!schedule) continue;

      // Find the day in schedule
      const daySchedule = schedule.schedule.find(s => s.day === day);

      if (!daySchedule) continue;

      // Check each period for teacher conflict
      for (const period of daySchedule.periods) {
        // Skip if no teacher assigned or different teacher
        // period.teacher may be ObjectId, string, or populated object with _id
        const periodTeacherId = period.teacher?._id?.toString() || period.teacher?.toString();
        if (!periodTeacherId || periodTeacherId !== teacherId.toString()) {
          continue;
        }

        // Check for time overlap
        // Times are in HH:MM format
        const periodStart = period.startTime;
        const periodEnd = period.endTime;

        // Convert times to minutes for easier comparison
        const toMinutes = (time) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const newStart = toMinutes(startTime);
        const newEnd = toMinutes(endTime);
        const existingStart = toMinutes(periodStart);
        const existingEnd = toMinutes(periodEnd);

        // Check if times overlap
        const hasOverlap = (newStart < existingEnd) && (newEnd > existingStart);

        if (hasOverlap) {
          return {
            available: false,
            conflictingClass: {
              classId: classItem._id,
              className: classItem.name,
              day: day,
              startTime: periodStart,
              endTime: periodEnd,
              subject: period.subject
            }
          };
        }
      }
    }

    return {
      available: true,
      conflictingClass: null
    };
  } catch (error) {
    return {
      available: false,
      conflictingClass: null,
      error: error.message
    };
  }
}

/**
 * Validate entire schedule for teacher conflicts - OPTIMIZED
 * @param {String} classId - MongoDB ObjectId of the class
 * @param {Array} scheduleData - Array of {day, periods[]} objects
 * @returns {Object} - { valid: boolean, conflicts: Array }
 */
async function validateScheduleForConflicts(classId, scheduleData) {
  try {
    const conflicts = [];

    // OPTIMIZATION: Load all schedules at once instead of per-period queries
    const allClasses = await Class.find({
      isActive: true,
      _id: { $ne: classId }
    }).select('_id name').lean();

    // Get all current schedules in one batch
    const allSchedules = await Schedule.find({
      classId: { $in: allClasses.map(c => c._id) },
      isActive: true
    }).lean();

    // Find current schedule for each class (filter by date)
    const now = new Date();
    const classScheduleMap = new Map();

    for (const schedule of allSchedules) {
      const start = new Date(schedule.startDate);
      const end = new Date(schedule.endDate);
      if (now >= start && now <= end) {
        classScheduleMap.set(schedule.classId.toString(), {
          schedule: schedule,
          className: allClasses.find(c => c._id.toString() === schedule.classId.toString())?.name
        });
      }
    }

    // Helper function for time overlap check
    const toMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Check each period against all loaded schedules
    for (const daySchedule of scheduleData) {
      for (const period of daySchedule.periods) {
        // Skip if no teacher assigned
        if (!period.teacher || !period.subject) continue;

        const teacherId = period.teacher.toString();
        const newStart = toMinutes(period.startTime);
        const newEnd = toMinutes(period.endTime);

        // Check against all loaded schedules
        for (const [classIdStr, classData] of classScheduleMap) {
          const schedule = classData.schedule;
          const dayData = schedule.schedule?.find(s => s.day === daySchedule.day);

          if (!dayData) continue;

          for (const existingPeriod of dayData.periods) {
            const periodTeacherId = existingPeriod.teacher?._id?.toString() || existingPeriod.teacher?.toString();

            if (periodTeacherId !== teacherId) continue;

            const existingStart = toMinutes(existingPeriod.startTime);
            const existingEnd = toMinutes(existingPeriod.endTime);

            // Check time overlap
            const hasOverlap = (newStart < existingEnd) && (newEnd > existingStart);

            if (hasOverlap) {
              conflicts.push({
                day: daySchedule.day,
                time: `${period.startTime} - ${period.endTime}`,
                teacherId: period.teacher,
                classId: classIdStr,
                className: classData.className,
                startTime: existingPeriod.startTime,
                endTime: existingPeriod.endTime
              });
              break; // One conflict per period is enough
            }
          }
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts
    };
  } catch (error) {
    console.error('validateScheduleForConflicts error:', error);
    return {
      valid: false,
      conflicts: [],
      error: error.message
    };
  }
}

module.exports = {
  getCurrentScheduleForClass,
  getScheduleForDate,
  validateGradeDate,
  getCurrentScheduleDateRange,
  getMultipleScheduleDateRanges,
  checkScheduleOverlap,
  getScheduleStats,
  validateAttendanceDate,
  checkTeacherAvailability,
  validateScheduleForConflicts
};
