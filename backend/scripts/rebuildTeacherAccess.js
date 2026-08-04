const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Class = require('../models/academic/Class');
const Schedule = require('../models/scheduling/Schedule');
const User = require('../models/users/User');
const Subject = require('../models/academic/Subject');
const { extractSubjectTeacherPairs } = require('../utils/scheduleSynchronizer');

async function rebuildTeacherAccess() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI topilmadi');
  await mongoose.connect(process.env.MONGODB_URI);

  const [classes, schedules] = await Promise.all([
    Class.find({}).select('subjects classTeacher').lean(),
    Schedule.find({}).select('classId schedule').lean()
  ]);
  const schedulesByClass = new Map();
  for (const schedule of schedules) {
    const classId = String(schedule.classId);
    if (!schedulesByClass.has(classId)) schedulesByClass.set(classId, []);
    schedulesByClass.get(classId).push(schedule);
  }

  let pairCount = 0;
  for (const classItem of classes) {
    const pairMap = new Map();
    for (const schedule of schedulesByClass.get(String(classItem._id)) || []) {
      for (const pair of extractSubjectTeacherPairs(schedule.schedule || [])) {
        pairMap.set(`${pair.subject}_${pair.teacher}`, pair);
      }
    }
    // Preserve explicit legacy assignments when no dated schedule contains them.
    for (const pair of classItem.subjects || []) {
      if (pair.subject && pair.teacher) pairMap.set(`${pair.subject}_${pair.teacher}`, pair);
    }
    const pairs = [...pairMap.values()];
    await Class.updateOne({ _id: classItem._id }, { $set: { subjects: pairs } });
    for (const pair of pairs) {
      await Promise.all([
        User.updateOne({ _id: pair.teacher }, {
          $addToSet: { classes: classItem._id, subjects: pair.subject }
        }),
        Subject.updateOne({ _id: pair.subject }, { $addToSet: { teachers: pair.teacher } })
      ]);
    }
    if (classItem.classTeacher) {
      await User.updateOne({ _id: classItem.classTeacher }, { $addToSet: { classes: classItem._id } });
    }
    pairCount += pairs.length;
  }

  console.log(`Rebuild complete: ${classes.length} classes, ${schedules.length} schedules, ${pairCount} pairs`);
}

rebuildTeacherAccess()
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());

