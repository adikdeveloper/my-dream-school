const Salary = require('../models/financial/Salary');
const User = require('../models/users/User');

// Get teacher's monthly salary
exports.getTeacherMonthlySalary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const teacherId = req.user.role === 'teacher' ? req.user._id : req.query.teacherId;

    if (!teacherId) {
      return res.status(400).json({ message: 'O\'qituvchi ID si kerak' });
    }

    // Validate month (academic year: September-June = 1-10)
    const monthNum = parseInt(month);
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Noto\'g\'ri oy raqami' });
    }

    const salary = await Salary.getOrCreateMonthlySalary(
      teacherId,
      parseInt(year),
      monthNum
    );

    await salary.populate('teacher', 'firstName lastName email salaryPerLesson');
    await salary.populate('transactions.relatedClass', 'name grade section');
    await salary.populate('transactions.relatedSubject', 'name code');
    await salary.populate('transactions.coveredForTeacher', 'firstName lastName');
    await salary.populate('transactions.coveredByTeacher', 'firstName lastName');

    res.json(salary);
  } catch (error) {
    console.error('Get monthly salary error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// Get teacher's current month salary
exports.getTeacherCurrentSalary = async (req, res) => {
  try {
    const teacherId = req.user.role === 'teacher' ? req.user._id : req.query.teacherId;

    if (!teacherId) {
      return res.status(400).json({ message: 'O\'qituvchi ID si kerak' });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12

    const salary = await Salary.getOrCreateMonthlySalary(teacherId, year, month);

    await salary.populate('teacher', 'firstName lastName email salaryPerLesson');
    await salary.populate('transactions.relatedClass', 'name grade section');
    await salary.populate('transactions.relatedSubject', 'name code');
    await salary.populate('transactions.coveredForTeacher', 'firstName lastName');
    await salary.populate('transactions.coveredByTeacher', 'firstName lastName');

    res.json(salary);
  } catch (error) {
    console.error('Get current salary error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// Update teacher's salary rate (admin only)
exports.updateTeacherSalaryRate = async (req, res) => {
  try {
    const { teacherId, salaryPerLesson } = req.body;

    if (!teacherId || salaryPerLesson === undefined) {
      return res.status(400).json({ message: 'O\'qituvchi ID si va maosh miqdori kerak' });
    }

    if (salaryPerLesson < 0) {
      return res.status(400).json({ message: 'Maosh miqdori manfiy bo\'lishi mumkin emas' });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ message: 'O\'qituvchi topilmadi' });
    }

    teacher.salaryPerLesson = salaryPerLesson;
    await teacher.save();

    res.json({
      message: 'O\'qituvchining maoshi muvaffaqiyatli yangilandi',
      teacher: {
        _id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        salaryPerLesson: teacher.salaryPerLesson
      }
    });
  } catch (error) {
    console.error('Update salary rate error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// Helper function to record a lesson taught
exports.recordLessonTaught = async (teacherId, lessonDetails) => {
  try {
    const { date, classId, subjectId, description } = lessonDetails;

    const lessonDate = new Date(date);
    lessonDate.setHours(0, 0, 0, 0); // Normalize to midnight
    const year = lessonDate.getFullYear();
    const month = lessonDate.getMonth() + 1;

    const salary = await Salary.getOrCreateMonthlySalary(teacherId, year, month);

    // Check if this exact lesson was already recorded today
    const nextDay = new Date(lessonDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingLesson = salary.transactions.find(t =>
      t.type === 'lesson_taught' &&
      t.relatedClass?.toString() === classId?.toString() &&
      t.relatedSubject?.toString() === subjectId?.toString() &&
      t.date >= lessonDate &&
      t.date < nextDay &&
      t.description === description
    );

    // Don't record duplicate lessons
    if (existingLesson) {
      return salary;
    }

    const transaction = {
      type: 'lesson_taught',
      amount: salary.baseSalaryPerLesson,
      date: lessonDate,
      description: description || 'Dars o\'tildi',
      relatedClass: classId,
      relatedSubject: subjectId
    };

    salary.addTransaction(transaction);
    await salary.save();

    return salary;
  } catch (error) {
    console.error('Record lesson taught error:', error);
    throw error;
  }
};

// Helper function to record a lesson missed
exports.recordLessonMissed = async (teacherId, lessonDetails) => {
  try {
    const { date, classId, subjectId, description, coveredByTeacher } = lessonDetails;

    const lessonDate = new Date(date);
    const year = lessonDate.getFullYear();
    const month = lessonDate.getMonth() + 1;

    const salary = await Salary.getOrCreateMonthlySalary(teacherId, year, month);

    const transaction = {
      type: 'lesson_missed',
      amount: -salary.baseSalaryPerLesson,
      date: lessonDate,
      description: description || 'Darsga kelmadi',
      relatedClass: classId,
      relatedSubject: subjectId,
      coveredByTeacher: coveredByTeacher
    };

    salary.addTransaction(transaction);
    await salary.save();

    return salary;
  } catch (error) {
    console.error('Record lesson missed error:', error);
    throw error;
  }
};

// Helper function to record a lesson covered for another teacher
exports.recordLessonCovered = async (coveringTeacherId, missedTeacherId, lessonDetails) => {
  try {
    const { date, classId, subjectId, description } = lessonDetails;

    const lessonDate = new Date(date);
    const year = lessonDate.getFullYear();
    const month = lessonDate.getMonth() + 1;

    // Get the missed teacher's salary to use their rate for the deduction
    const missedSalary = await Salary.getOrCreateMonthlySalary(missedTeacherId, year, month);

    // Get the covering teacher's salary record
    const coveringSalary = await Salary.getOrCreateMonthlySalary(coveringTeacherId, year, month);

    // Add bonus to covering teacher
    const coverTransaction = {
      type: 'lesson_covered',
      amount: coveringSalary.baseSalaryPerLesson,
      date: lessonDate,
      description: description || 'Boshqa o\'qituvchi o\'rnida dars o\'tildi',
      relatedClass: classId,
      relatedSubject: subjectId,
      coveredForTeacher: missedTeacherId
    };

    coveringSalary.addTransaction(coverTransaction);
    await coveringSalary.save();

    // Add deduction to missed teacher
    const missedTransaction = {
      type: 'lesson_missed',
      amount: -missedSalary.baseSalaryPerLesson,
      date: lessonDate,
      description: description || 'Darsga kelmadi (o\'rnini boshqasi bosdi)',
      relatedClass: classId,
      relatedSubject: subjectId,
      coveredByTeacher: coveringTeacherId
    };

    missedSalary.addTransaction(missedTransaction);
    await missedSalary.save();

    return { coveringSalary, missedSalary };
  } catch (error) {
    console.error('Record lesson covered error:', error);
    throw error;
  }
};
