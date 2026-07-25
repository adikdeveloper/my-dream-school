const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Coin = require('../../models/academic/Coin');
const { auth, authorize } = require('../../middleware/auth');

const toInt = (v) => (v !== undefined && v !== null && v !== '' ? parseInt(v) : undefined);

// @route   GET /api/coins/leaderboard?month=&year=&limit=
// @desc    Eng ko'p coin yiqqan o'quvchilar ro'yxati (admin/direktor)
// @access  admin, director, accountant
router.get('/leaderboard', auth, authorize('admin', 'director', 'accountant'), async (req, res) => {
  try {
    const month = toInt(req.query.month);
    const year = toInt(req.query.year);
    const limit = toInt(req.query.limit) || 50;

    const match = {};
    if (month) match.month = month;
    if (year) match.year = year;

    const rows = await Coin.aggregate([
      { $match: match },
      { $group: { _id: '$student', totalCoins: { $sum: '$amount' } } },
      { $sort: { totalCoins: -1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $lookup: { from: 'classes', localField: 'student.classId', foreignField: '_id', as: 'cls' } },
      {
        $project: {
          _id: 1,
          totalCoins: 1,
          firstName: '$student.firstName',
          lastName: '$student.lastName',
          studentNumber: '$student.studentId',
          profileImage: '$student.profileImage',
          className: { $ifNull: [{ $arrayElemAt: ['$cls.name', 0] }, '—'] }
        }
      }
    ]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Coin reytingini yuklashda xatolik', error: error.message });
  }
});

// @route   GET /api/coins/teacher?subjectId=&classId=&month=&year=
// @desc    O'qituvchining O'Z fanidan bergan coinlari (har o'quvchi bo'yicha).
//          teacher=req.user bo'yicha filtrlangani uchun bir sinfga ikkita bir xil
//          fan o'qituvchisi kirsa ham, har biri faqat O'ZI bergan coinlarni ko'radi.
// @access  teacher
router.get('/teacher', auth, authorize('teacher'), async (req, res) => {
  try {
    const month = toInt(req.query.month);
    const year = toInt(req.query.year);

    const match = { teacher: new mongoose.Types.ObjectId(req.user._id) };
    if (req.query.subjectId && mongoose.Types.ObjectId.isValid(req.query.subjectId)) {
      match.subject = new mongoose.Types.ObjectId(req.query.subjectId);
    }
    if (req.query.classId && mongoose.Types.ObjectId.isValid(req.query.classId)) {
      match.class = new mongoose.Types.ObjectId(req.query.classId);
    }
    if (month) match.month = month;
    if (year) match.year = year;

    const rows = await Coin.aggregate([
      { $match: match },
      { $group: { _id: '$student', totalCoins: { $sum: '$amount' } } },
      { $sort: { totalCoins: -1 } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      {
        $project: {
          _id: 1,
          totalCoins: 1,
          firstName: '$student.firstName',
          lastName: '$student.lastName',
          studentNumber: '$student.studentId'
        }
      }
    ]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Coinlarni yuklashda xatolik', error: error.message });
  }
});

// @route   GET /api/coins/my?month=&year=
// @desc    O'quvchining o'z coinlari (jami + fan bo'yicha)
// @access  student
router.get('/my', auth, authorize('student'), async (req, res) => {
  try {
    const month = toInt(req.query.month);
    const year = toInt(req.query.year);

    const match = { student: new mongoose.Types.ObjectId(req.user._id) };
    if (month) match.month = month;
    if (year) match.year = year;

    const [totalAgg, bySubject] = await Promise.all([
      Coin.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Coin.aggregate([
        { $match: match },
        { $group: { _id: '$subject', coins: { $sum: '$amount' } } },
        { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'subject' } },
        { $unwind: '$subject' },
        { $project: { _id: 0, coins: 1, name: '$subject.name' } },
        { $sort: { coins: -1 } }
      ])
    ]);

    res.json({ total: (totalAgg[0] && totalAgg[0].total) || 0, bySubject });
  } catch (error) {
    res.status(500).json({ message: 'Coinlarni yuklashda xatolik', error: error.message });
  }
});

module.exports = router;
