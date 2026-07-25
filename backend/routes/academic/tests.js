const express = require('express');
const router = express.Router();
const Test = require('../../models/academic/Test');
const { auth, authorize } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissions');

// Sanitize input to prevent XSS
const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '')
    .trim();
};

// Get test results for a student
router.get('/student', auth, authorize('student'), async (req, res) => {
  try {
    const { year, month } = req.query;

    // Get student's class
    const User = require('../../models/users/User');
    const student = await User.findById(req.user.id).select('classId');

    if (!student || !student.classId) {
      return res.status(404).json({ message: 'O\'quvchi sinfi topilmadi' });
    }

    const filter = {
      class: student.classId,
      isActive: true
    };

    // Filter by startTime date range instead of month/year fields
    if (year && month) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      filter.startTime = {
        $gte: startOfMonth,
        $lte: endOfMonth
      };
    } else if (year) {
      filter.year = parseInt(year);
    } else if (month) {
      filter.month = parseInt(month);
    }

    // Find all tests for student's class
    const tests = await Test.find(filter)
      .populate('subject', 'name')
      .populate('teacher', 'firstName lastName')
      .sort({ year: -1, month: -1, testDate: -1 });

    // Filter and format results to only show current student's scores
    const studentResults = tests.map(test => {
      const studentResult = test.results.find(
        r => r.student.toString() === req.user.id
      );

      // Calculate percentage correctly
      let scorePercentage = null;
      if (studentResult) {
        const totalPts = test.totalPoints || 1; // Prevent division by zero
        scorePercentage = Math.round((studentResult.score / totalPts) * 100);
      }

      return {
        _id: test._id,
        title: test.title,
        description: test.description,
        subject: test.subject,
        teacher: test.teacher,
        month: test.month,
        year: test.year,
        testDate: test.testDate,
        startTime: test.startTime,
        endTime: test.endTime,
        duration: test.duration,
        totalPoints: test.totalPoints,
        questionsCount: test.questions ? test.questions.length : 0,
        status: test.status,
        isCurrentlyActive: test.isCurrentlyActive,
        score: scorePercentage,
        rawScore: studentResult ? studentResult.score : null,
        submittedAt: studentResult ? studentResult.submittedAt : null,
        hasResult: !!studentResult
      };
    });

    res.json(studentResults);
  } catch (error) {
    res.status(500).json({ message: 'Testlarni yuklashda xatolik yuz berdi' });
  }
});

// Get active test for student to take
router.get('/student/take/:testId', auth, authorize('student'), async (req, res) => {
  try {
    const { testId } = req.params;

    // Get student's class
    const User = require('../../models/users/User');
    const student = await User.findById(req.user.id).select('classId');

    if (!student || !student.classId) {
      return res.status(404).json({ message: 'O\'quvchi sinfi topilmadi' });
    }

    const test = await Test.findById(testId)
      .populate('subject', 'name')
      .populate('teacher', 'firstName lastName');

    if (!test) {
      return res.status(404).json({ message: 'Test topilmadi' });
    }

    // Check if student is in this class
    if (test.class.toString() !== student.classId.toString()) {
      return res.status(403).json({ message: 'Siz bu testni topshira olmaysiz' });
    }

    // Check if test is currently active
    const now = new Date();
    if (now < test.startTime) {
      return res.status(400).json({
        message: 'Test hali boshlanmagan',
        startTime: test.startTime
      });
    }

    if (now > test.endTime) {
      return res.status(400).json({
        message: 'Test vaqti tugagan',
        endTime: test.endTime
      });
    }

    // Check if student already submitted
    const existingResult = test.results.find(
      r => r.student.toString() === req.user.id
    );

    if (existingResult) {
      return res.status(400).json({
        message: 'Siz bu testni allaqachon topshirgansiz',
        score: existingResult.score,
        submittedAt: existingResult.submittedAt
      });
    }

    // Return test without correct answers
    const questionsForStudent = test.questions.map(q => ({
      questionText: q.questionText,
      questionType: q.questionType,
      points: q.points,
      imageUrl: q.imageUrl,
      options: q.options.map(opt => ({ text: opt.text })) // Remove isCorrect
    }));

    res.json({
      _id: test._id,
      title: test.title,
      description: test.description,
      subject: test.subject,
      duration: test.duration,
      totalPoints: test.totalPoints,
      endTime: test.endTime,
      questions: questionsForStudent
    });
  } catch (error) {
    res.status(500).json({ message: 'Testni yuklashda xatolik yuz berdi' });
  }
});

// Submit test answers (student)
router.post('/student/submit/:testId', auth, authorize('student'), async (req, res) => {
  try {
    const { testId } = req.params;
    const { answers } = req.body;

    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).json({ message: 'Test topilmadi' });
    }

    // Check if test is currently active
    const now = new Date();
    if (now < test.startTime || now > test.endTime) {
      return res.status(400).json({ message: 'Test vaqti tugagan yoki hali boshlanmagan' });
    }

    // Check if already submitted
    const existingResult = test.results.find(
      r => r.student.toString() === req.user.id
    );

    if (existingResult) {
      return res.status(400).json({ message: 'Siz bu testni allaqachon topshirgansiz' });
    }

    // Calculate score
    let totalScore = 0;
    const processedAnswers = [];

    test.questions.forEach((question, index) => {
      const studentAnswer = answers.find(a => a.questionIndex === index);
      let isCorrect = false;
      let pointsEarned = 0;

      if (studentAnswer && studentAnswer.answer !== null && studentAnswer.answer !== undefined) {
        if (question.questionType === 'text') {
          // Text comparison (case-insensitive)
          const studentText = String(studentAnswer.answer || '').toLowerCase().trim();
          const correctText = String(question.correctAnswer || '').toLowerCase().trim();
          isCorrect = correctText && studentText === correctText;
        } else if (question.questionType === 'single') {
          // Single choice - check if selected option is correct
          const selectedOption = question.options[studentAnswer.answer];
          isCorrect = selectedOption && selectedOption.isCorrect;
        } else if (question.questionType === 'multiple') {
          // Multiple choice - check if all correct options are selected
          const correctIndexes = question.options
            .map((opt, i) => opt.isCorrect ? i : -1)
            .filter(i => i !== -1);
          const selectedIndexes = studentAnswer.answer || [];
          isCorrect = correctIndexes.length === selectedIndexes.length &&
            correctIndexes.every(i => selectedIndexes.includes(i));
        } else if (question.questionType === 'image') {
          // Same as single for image type
          const selectedOption = question.options[studentAnswer.answer];
          isCorrect = selectedOption && selectedOption.isCorrect;
        }

        if (isCorrect) {
          pointsEarned = question.points;
          totalScore += pointsEarned;
        }
      }

      processedAnswers.push({
        questionIndex: index,
        answer: studentAnswer ? studentAnswer.answer : null,
        isCorrect,
        pointsEarned
      });
    });

    // Round score
    totalScore = Math.round(totalScore * 10) / 10;

    // Save result
    test.results.push({
      student: req.user.id,
      score: totalScore,
      answers: processedAnswers,
      submittedAt: new Date()
    });

    await test.save();

    res.json({
      message: 'Test muvaffaqiyatli topshirildi',
      score: totalScore,
      totalPoints: test.totalPoints,
      percentage: Math.round((totalScore / test.totalPoints) * 100)
    });
  } catch (error) {
    res.status(500).json({ message: 'Testni topshirishda xatolik yuz berdi' });
  }
});

// Get detailed test results for student (with questions and answers)
router.get('/student/results/:testId', auth, authorize('student'), async (req, res) => {
  try {
    const { testId } = req.params;

    const test = await Test.findById(testId)
      .populate('subject', 'name')
      .populate('teacher', 'firstName lastName');

    if (!test) {
      return res.status(404).json({ message: 'Test topilmadi' });
    }

    // Find student's result
    const studentResult = test.results.find(
      r => r.student.toString() === req.user.id
    );

    if (!studentResult) {
      return res.status(404).json({ message: 'Siz bu testni hali topshirmagansiz' });
    }

    // Build detailed results with questions
    const questionsWithAnswers = test.questions.map((question, index) => {
      const studentAnswer = studentResult.answers.find(a => a.questionIndex === index);

      // Get correct answer info
      let correctAnswerText = '';
      let studentAnswerText = '';

      if (question.questionType === 'text') {
        correctAnswerText = question.correctAnswer;
        studentAnswerText = studentAnswer ? studentAnswer.answer : '';
      } else if (question.questionType === 'single' || question.questionType === 'image') {
        const correctOption = question.options.find(opt => opt.isCorrect);
        correctAnswerText = correctOption ? correctOption.text : '';
        if (studentAnswer && studentAnswer.answer !== null && question.options[studentAnswer.answer]) {
          studentAnswerText = question.options[studentAnswer.answer].text;
        }
      } else if (question.questionType === 'multiple') {
        correctAnswerText = question.options
          .filter(opt => opt.isCorrect)
          .map(opt => opt.text)
          .join(', ');
        if (studentAnswer && Array.isArray(studentAnswer.answer)) {
          studentAnswerText = studentAnswer.answer
            .map(i => question.options[i]?.text)
            .filter(Boolean)
            .join(', ');
        }
      }

      return {
        questionNumber: index + 1,
        questionText: question.questionText,
        questionType: question.questionType,
        imageUrl: question.imageUrl,
        points: question.points,
        options: question.options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect
        })),
        studentAnswer: studentAnswer ? studentAnswer.answer : null,
        studentAnswerText,
        correctAnswerText,
        isCorrect: studentAnswer ? studentAnswer.isCorrect : false,
        pointsEarned: studentAnswer ? studentAnswer.pointsEarned : 0
      };
    });

    const percentage = Math.round((studentResult.score / test.totalPoints) * 100);

    res.json({
      testId: test._id,
      title: test.title,
      subject: test.subject,
      teacher: test.teacher,
      totalPoints: test.totalPoints,
      score: studentResult.score,
      percentage,
      submittedAt: studentResult.submittedAt,
      questionsCount: test.questions.length,
      correctCount: questionsWithAnswers.filter(q => q.isCorrect).length,
      questions: questionsWithAnswers
    });
  } catch (error) {
    res.status(500).json({ message: 'Natijalarni yuklashda xatolik yuz berdi' });
  }
});

// Get all tests for a teacher
router.get('/teacher', auth, authorize('teacher'), async (req, res) => {
  try {
    const { year, month, classId, subjectId } = req.query;

    const filter = {
      teacher: req.user.id
    };

    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);
    if (classId) filter.class = classId;
    if (subjectId) filter.subject = subjectId;

    const tests = await Test.find(filter)
      .populate('class', 'name')
      .populate('subject', 'name')
      .populate('results.student', 'firstName lastName')
      .sort({ year: -1, month: -1, testDate: -1 });

    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: 'Testlarni yuklashda xatolik yuz berdi' });
  }
});

// Get teacher's classes and subjects
router.get('/teacher/assigned', auth, authorize('teacher'), async (req, res) => {
  try {
    const Class = require('../../models/academic/Class');

    // Find classes where teacher is assigned to any subject
    const classes = await Class.find({
      'subjects.teacher': req.user.id,
      isActive: true
    }).select('name');

    // Get unique subjects taught by this teacher from all classes
    const classesWithSubjects = await Class.find({
      'subjects.teacher': req.user.id,
      isActive: true
    }).populate('subjects.subject', 'name');

    const subjectsSet = new Set();
    classesWithSubjects.forEach(cls => {
      cls.subjects.forEach(subj => {
        if (subj.teacher && subj.teacher.toString() === req.user.id) {
          subjectsSet.add(JSON.stringify({
            _id: subj.subject._id,
            name: subj.subject.name
          }));
        }
      });
    });

    const subjects = Array.from(subjectsSet).map(s => JSON.parse(s));

    res.json({ classes, subjects });
  } catch (error) {
    res.status(500).json({ message: 'Sinf va fanlarni yuklashda xatolik yuz berdi' });
  }
});

// Create new test
router.post('/', auth, authorize('teacher'), requirePermission('test.create'), async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      classId,
      month,
      year,
      testDate,
      startTime,
      endTime,
      duration,
      questions
    } = req.body;

    // Sanitize text inputs
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedDescription = sanitizeInput(description);

    // Validate required fields
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'Boshlanish va tugash vaqtini kiriting' });
    }

    // Validate times
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({ message: 'Tugash vaqti boshlanish vaqtidan keyin bo\'lishi kerak' });
    }

    // Validate that teacher teaches this subject in this class
    const Class = require('../../models/academic/Class');
    const classDoc = await Class.findById(classId);

    if (!classDoc) {
      return res.status(404).json({ message: 'Sinf topilmadi' });
    }

    const teachesThisSubject = classDoc.subjects.some(
      s => s.subject.toString() === subject && s.teacher.toString() === req.user.id
    );

    if (!teachesThisSubject) {
      return res.status(403).json({
        message: 'Siz bu sinfda ushbu fanni o\'qitmaysiz'
      });
    }

    // Check if test already exists for this month
    const existingTest = await Test.findOne({
      class: classId,
      subject: subject,
      month: month,
      year: year
    });

    if (existingTest) {
      const Subject = require('../../models/academic/Subject');
      const subjectInfo = await Subject.findById(subject).select('name');
      const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

      return res.status(400).json({
        message: `${classDoc?.name || 'Bu sinf'} uchun ${subjectInfo?.name || 'bu fan'} fanidan ${months[month - 1]} oyida test allaqachon mavjud`
      });
    }

    // Sanitize questions
    const sanitizedQuestions = questions ? questions.map(q => ({
      questionText: sanitizeInput(q.questionText),
      questionType: q.questionType || 'single',
      points: parseFloat(q.points) || 1,
      imageUrl: q.imageUrl || '',
      options: q.options ? q.options.map(opt => ({
        text: sanitizeInput(opt.text),
        isCorrect: opt.isCorrect || false
      })) : [],
      correctAnswer: sanitizeInput(q.correctAnswer || '')
    })) : [];

    const test = new Test({
      title: sanitizedTitle,
      description: sanitizedDescription,
      subject,
      class: classId,
      teacher: req.user.id,
      month,
      year,
      testDate: testDate || new Date(),
      startTime: start,
      endTime: end,
      duration: duration || 45,
      questions: sanitizedQuestions
    });

    await test.save();

    const populatedTest = await Test.findById(test._id)
      .populate('class', 'name')
      .populate('subject', 'name');

    res.status(201).json(populatedTest);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Bu test allaqachon mavjud' });
    }
    res.status(500).json({ message: 'Test yaratishda xatolik yuz berdi' });
  }
});

// Add/Update test result for a student (manual by teacher)
router.post('/:testId/results', auth, authorize('teacher'), async (req, res) => {
  try {
    const { testId } = req.params;
    const { studentId, score } = req.body;

    const test = await Test.findById(testId);

    if (!test) {
      return res.status(404).json({ message: 'Test topilmadi' });
    }

    // Check if teacher owns this test
    if (test.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }

    // Check if result already exists
    const existingResultIndex = test.results.findIndex(
      r => r.student.toString() === studentId
    );

    if (existingResultIndex !== -1) {
      // Update existing result
      test.results[existingResultIndex].score = score;
      test.results[existingResultIndex].submittedAt = new Date();
    } else {
      // Add new result
      test.results.push({
        student: studentId,
        score: score
      });
    }

    await test.save();

    const updatedTest = await Test.findById(testId)
      .populate('class', 'name')
      .populate('subject', 'name')
      .populate('results.student', 'firstName lastName');

    res.json(updatedTest);
  } catch (error) {
    res.status(500).json({ message: 'Natija qo\'shishda xatolik yuz berdi' });
  }
});

// Get single test by ID
router.get('/:id', auth, authorize('teacher'), async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('class', 'name')
      .populate('subject', 'name')
      .populate('results.student', 'firstName lastName');

    if (!test) {
      return res.status(404).json({ message: 'Test topilmadi' });
    }

    // Check if teacher owns this test
    if (test.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }

    res.json(test);
  } catch (error) {
    res.status(500).json({ message: 'Test ma\'lumotlarini yuklashda xatolik yuz berdi' });
  }
});

// Update test
router.put('/:id', auth, authorize('teacher'), requirePermission('test.edit'), async (req, res) => {
  try {
    const { title, description, testDate, startTime, endTime, duration, questions } = req.body;

    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Test topilmadi' });
    }

    // Check if teacher owns this test
    if (test.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }

    if (title) test.title = sanitizeInput(title);
    if (description !== undefined) test.description = sanitizeInput(description);
    if (testDate) test.testDate = testDate;
    if (startTime) test.startTime = new Date(startTime);
    if (endTime) test.endTime = new Date(endTime);
    if (duration) test.duration = duration;
    if (questions) {
      test.questions = questions.map(q => ({
        questionText: sanitizeInput(q.questionText),
        questionType: q.questionType || 'single',
        points: parseFloat(q.points) || 1,
        imageUrl: q.imageUrl || '',
        options: q.options ? q.options.map(opt => ({
          text: sanitizeInput(opt.text),
          isCorrect: opt.isCorrect || false
        })) : [],
        correctAnswer: sanitizeInput(q.correctAnswer || '')
      }));
    }

    await test.save();

    const updatedTest = await Test.findById(test._id)
      .populate('class', 'name')
      .populate('subject', 'name')
      .populate('results.student', 'firstName lastName');

    res.json(updatedTest);
  } catch (error) {
    res.status(500).json({ message: 'Testni yangilashda xatolik yuz berdi' });
  }
});

// Delete test
router.delete('/:id', auth, authorize('teacher'), requirePermission('test.delete'), async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Test topilmadi' });
    }

    // Check if teacher owns this test
    if (test.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }

    await Test.findByIdAndDelete(req.params.id);

    res.json({ message: 'Test o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Testni o\'chirishda xatolik yuz berdi' });
  }
});

module.exports = router;
