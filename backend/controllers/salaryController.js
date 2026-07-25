const Salary = require('../models/financial/Salary');
const User = require('../models/users/User');
const LessonSubstitution = require('../models/scheduling/LessonSubstitution');
const { syncOpenSalaryRecords } = require('../utils/salaryRateSync');

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

    // Eski yozuvlarda ham soliq/sof maosh to'g'ri ko'rinishi uchun qayta hisoblaymiz
    salary.calculateNetSalary();
    if (salary.isModified()) await salary.save();

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

    // Eski yozuvlarda ham soliq/sof maosh to'g'ri ko'rinishi uchun qayta hisoblaymiz
    salary.calculateNetSalary();
    if (salary.isModified()) await salary.save();

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

    const salaryRate = Number(salaryPerLesson);
    if (!Number.isFinite(salaryRate) || salaryRate < 0) {
      return res.status(400).json({ message: 'Maosh miqdori musbat son bo\'lishi kerak' });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ message: 'O\'qituvchi topilmadi' });
    }

    teacher.salaryPerLesson = salaryRate;
    await teacher.save();
    const syncedSalaryRecords = await syncOpenSalaryRecords(teacher._id, salaryRate);

    res.json({
      message: 'O\'qituvchining maoshi muvaffaqiyatli yangilandi',
      syncedSalaryRecords,
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

    // Agar bu AYNAN shu dars (sinf + fan + sana) almashtirilgan bo'lsa, maosh
    // substitution orqali hisoblanadi — bu yerda lesson_taught yozmaymiz.
    // Faqat o'sha slotni (fan bo'yicha) tashlaymiz — o'qituvchining shu sinfdagi
    // boshqa darslariga ta'sir qilmaydi. Ham o'rinbosar, ham asl o'qituvchi uchun.
    const subQuery = {
      classId: classId,
      date: { $gte: lessonDate, $lt: nextDay },
      status: { $ne: 'rejected' },
      $or: [{ substituteTeacher: teacherId }, { originalTeacher: teacherId }]
    };
    if (subjectId) subQuery.subject = subjectId;
    const activeSub = await LessonSubstitution.findOne(subQuery);
    if (activeSub) {
      return salary;
    }

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
    const { date, classId, subjectId, description, substitutionId } = lessonDetails;

    const lessonDate = new Date(date);
    lessonDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(lessonDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const year = lessonDate.getFullYear();
    const month = lessonDate.getMonth() + 1;
    const idStr = substitutionId ? substitutionId.toString() : null;

    // Shu aniq slot uchun (sinf + fan + sana) lesson_taught topish — ikki marta
    // to'lamaslik uchun olib tashlaymiz (masalan asl o'qituvchi oldin baho qo'ygan bo'lsa)
    const isSameSlotTaught = (t) =>
      t.type === 'lesson_taught' &&
      t.relatedClass && classId && t.relatedClass.toString() === classId.toString() &&
      (!subjectId || (t.relatedSubject && t.relatedSubject.toString() === subjectId.toString())) &&
      t.date >= lessonDate && t.date < nextDay;

    // O'rniga o'tgan o'qituvchiga — o'z stavkasida qo'shiladi (mustaqil idempotent)
    const coveringSalary = await Salary.getOrCreateMonthlySalary(coveringTeacherId, year, month);
    const coveringHas = idStr && coveringSalary.transactions.some(
      t => t.substitution && t.substitution.toString() === idStr
    );
    if (!coveringHas) {
      coveringSalary.transactions = coveringSalary.transactions.filter(t => !isSameSlotTaught(t));
      coveringSalary.addTransaction({
        type: 'lesson_covered',
        amount: coveringSalary.baseSalaryPerLesson,
        date: lessonDate,
        description: description || 'Boshqa o\'qituvchi o\'rnida dars o\'tildi',
        relatedClass: classId,
        relatedSubject: subjectId,
        coveredForTeacher: missedTeacherId,
        substitution: substitutionId
      });
      await coveringSalary.save();
    }

    // Kelmagan o'qituvchidan — o'z stavkasida olinadi (mustaqil idempotent)
    const missedSalary = await Salary.getOrCreateMonthlySalary(missedTeacherId, year, month);
    const missedHas = idStr && missedSalary.transactions.some(
      t => t.substitution && t.substitution.toString() === idStr
    );
    if (!missedHas) {
      // Asl o'qituvchi shu slotga lesson_taught olgan bo'lsa olib tashlaymiz —
      // aks holda -1 chegirma uning +1 ini bekor qilib, net 0 bo'lib qoladi
      missedSalary.transactions = missedSalary.transactions.filter(t => !isSameSlotTaught(t));
      missedSalary.addTransaction({
        type: 'lesson_missed',
        amount: -missedSalary.baseSalaryPerLesson,
        date: lessonDate,
        description: description || 'Darsga kelmadi (o\'rnini boshqasi bosdi)',
        relatedClass: classId,
        relatedSubject: subjectId,
        coveredByTeacher: coveringTeacherId,
        substitution: substitutionId
      });
      await missedSalary.save();
    }

    return { coveringSalary, missedSalary };
  } catch (error) {
    console.error('Record lesson covered error:', error);
    throw error;
  }
};

// Almashtirish rad etilsa/o'chirilsa — maoshdagi bog'liq transaksiyalarni qaytaradi
exports.reverseSubstitutionSalary = async (substitutionId, coveringTeacherId, missedTeacherId, date) => {
  try {
    const lessonDate = new Date(date);
    const year = lessonDate.getFullYear();
    const month = lessonDate.getMonth() + 1;
    const idStr = substitutionId.toString();

    for (const teacherId of [coveringTeacherId, missedTeacherId]) {
      const salary = await Salary.findOne({ teacher: teacherId, year, month });
      if (!salary) continue;
      const before = salary.transactions.length;
      salary.transactions = salary.transactions.filter(
        t => !(t.substitution && t.substitution.toString() === idStr)
      );
      if (salary.transactions.length !== before) {
        salary.calculateNetSalary();
        await salary.save();
      }
    }
  } catch (error) {
    console.error('Reverse substitution salary error:', error);
    throw error;
  }
};
