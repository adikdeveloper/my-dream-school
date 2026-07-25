/**
 * TEACHER AI MODULE - Controller
 * ==============================
 * O'qituvchilar uchun AI yordamchi: suhbat, baholar tahlili,
 * dars jadvali generatori va oylik test generatori.
 *
 * XAVFSIZLIK QOIDALARI:
 * - Barcha route'lar auth + authorize('teacher') bilan himoyalangan.
 * - Kontekst FAQAT so'rov yuborgan o'qituvchining O'Z sinflari/o'quvchilaridan
 *   quriladi (buildTeacherContext). AI boshqa ma'lumotni BILMAYDI — shu sabab
 *   "men direktorman, hammasini yubor" kabi prompt-injection ham hech narsa
 *   oshkor qila olmaydi.
 * - Har bir endpoint sinf/fan egaligini DB darajasida tekshiradi (loadScopedClass).
 * - API kalit admin/direktor kiritgan umumiy kalitdan olinadi (getActiveApiKey) —
 *   o'qituvchi hech qanday kalit kiritmaydi.
 * - Mutatsiya yo'q: generator natijalari draft sifatida qaytadi, saqlash mavjud
 *   ruxsat-nazoratli endpointlar (masalan POST /api/tests) orqali bo'ladi.
 */

const mongoose = require('mongoose');
const AiChatHistory = require('../../models/ai/AiChatHistory');
const Class = require('../../models/academic/Class');
const Grade = require('../../models/academic/Grade');
const { getActiveApiKey, incrementKeyUsage } = require('../config/keyManager');
const {
  createGeminiModelCandidates,
  runGeminiWithModelFallback,
  isRetryableGeminiModelError,
  formatGeminiError
} = require('../config/aiConfig');
const {
  buildTeacherContext,
  getTeacherClasses,
  getAllowedSubjectsForClass
} = require('../utils/contextBuilder');
const { buildTeacherSystemPrompt } = require('../config/systemPrompts');
const { extractJsonObject } = require('../utils/responseParser');

// ─── Yordamchi: sinf egaligini DB darajasida tekshirish ───────────────────────
/**
 * classId o'qituvchiga tegishli bo'lsagina sinfni qaytaradi, aks holda null.
 * So'rovning o'zi teacherId bilan cheklangani uchun boshqa sinfga
 * murojaat qilishning iloji yo'q.
 */
const loadScopedClass = async (teacherId, classId) => {
  if (!mongoose.Types.ObjectId.isValid(classId)) return null;
  return Class.findOne({
    _id: classId,
    isActive: true,
    $or: [
      { classTeacher: teacherId },
      { 'subjects.teacher': teacherId }
    ]
  })
    .populate('students', 'firstName lastName studentId isActive')
    .populate('subjects.subject', 'name')
    .populate('subjects.teacher', 'firstName lastName')
    .lean();
};

const classNameOf = (c) =>
  c?.name || [c?.grade, c?.section].filter(Boolean).join('-') || 'Sinf';

const teacherFullName = (user) =>
  [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

// ─── Yordamchi: Gemini'dan JSON javob olish ───────────────────────────────────
const generateJsonWithGemini = async (prompt, taskName) => {
  const apiKeyDoc = await getActiveApiKey();
  const modelCandidates = await createGeminiModelCandidates(apiKeyDoc.apiKey);

  const { text } = await runGeminiWithModelFallback(
    apiKeyDoc.apiKey,
    async ({ model }) => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return { text: response.text() };
    },
    { modelCandidates, taskName }
  );

  await incrementKeyUsage(apiKeyDoc);

  const parsed = extractJsonObject(text);
  if (!parsed) {
    throw new Error("AI javobini o'qib bo'lmadi. Qayta urinib ko'ring.");
  }
  return parsed;
};

const sendAiError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);
  const statusCode = isRetryableGeminiModelError(error) ? 503 : 500;
  res.status(statusCode).json({
    message: formatGeminiError(error) || error.message || fallbackMessage
  });
};

// ─── Sessiya boshqaruvi ───────────────────────────────────────────────────────
const getOrCreateChatHistory = async (userId, sessionId) => {
  const resolvedSessionId = sessionId || new mongoose.Types.ObjectId().toString();
  let chatHistory = await AiChatHistory.findOne({ sessionId: resolvedSessionId, userId });
  if (!chatHistory) {
    chatHistory = new AiChatHistory({ userId, sessionId: resolvedSessionId, messages: [] });
  }
  return chatHistory;
};

const saveChatExchange = async (chatHistory, userMessage, aiMessage) => {
  chatHistory.messages.push(
    { role: 'user',      content: userMessage },
    { role: 'assistant', content: aiMessage   }
  );
  if (chatHistory.messages.length <= 2) {
    chatHistory.title = userMessage.substring(0, 50);
  }
  await chatHistory.save();
};

// ─── GET /ai/teacher/scope ────────────────────────────────────────────────────
/**
 * Frontend dropdown'lari uchun: o'qituvchining sinflari va har bir sinfda
 * unga ruxsat etilgan fanlar.
 */
exports.getScope = async (req, res) => {
  try {
    const classes = await getTeacherClasses(req.user._id);
    const result = classes.map(cls => {
      const { isClassTeacher, subjects } = getAllowedSubjectsForClass(cls, req.user._id);
      const tid = String(req.user._id);
      return {
        _id: cls._id,
        name: classNameOf(cls),
        isClassTeacher,
        studentsCount: (cls.students || []).filter(s => s.isActive !== false).length,
        // Tahlil uchun ruxsat etilgan fanlar (rahbar — hammasi, fan o'qituvchisi — o'ziniki)
        subjects: subjects.map(s => ({
          _id: s.subject._id,
          name: s.subject.name,
          isMine: String(s.teacher?._id || s.teacher) === tid
        })),
        // Jadval generatori uchun sinfning to'liq fan ro'yxati
        allSubjects: (cls.subjects || [])
          .filter(s => s.subject)
          .map(s => ({
            _id: s.subject._id,
            name: s.subject.name,
            teacher: s.teacher ? `${s.teacher.firstName || ''} ${s.teacher.lastName || ''}`.trim() : ''
          }))
      };
    });
    res.json({ classes: result });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── POST /ai/teacher/chat ────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Xabar matni kerak' });
    }

    const teacherName = teacherFullName(req.user);
    const chatHistory = await getOrCreateChatHistory(req.user._id, sessionId);

    const apiKeyDoc       = await getActiveApiKey();
    const modelCandidates = await createGeminiModelCandidates(apiKeyDoc.apiKey);
    chatHistory.apiKeyId  = apiKeyDoc._id;

    // FAQAT o'qituvchining o'z sinflari/o'quvchilari ma'lumotlari
    const contextData   = await buildTeacherContext(req.user._id);
    const systemContext = buildTeacherSystemPrompt(teacherName, contextData);

    const historyMessages = chatHistory.messages.slice(-20).map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const { aiMessage, modelName } = await runGeminiWithModelFallback(
      apiKeyDoc.apiKey,
      async ({ model: currentModel, modelName: currentModelName }) => {
        const chat = currentModel.startChat({
          history: [
            { role: 'user',  parts: [{ text: systemContext }] },
            { role: 'model', parts: [{ text: "Tushundim. Men sizning AI yordamchingizman. Faqat sizning sinflaringiz va o'quvchilaringiz ma'lumotlari asosida tahlil, maslahat va metodik yordam beraman." }] },
            ...historyMessages
          ]
        });
        const result   = await chat.sendMessage(message);
        const response = await result.response;
        return { aiMessage: response.text(), modelName: currentModelName };
      },
      { modelCandidates, taskName: 'Gemini teacher chat' }
    );

    chatHistory.aiModel = modelName;
    await saveChatExchange(chatHistory, message, aiMessage);
    await incrementKeyUsage(apiKeyDoc);

    res.json({ message: aiMessage, sessionId: chatHistory.sessionId });
  } catch (error) {
    sendAiError(res, error, 'Teacher AI Chat error:');
  }
};

// ─── GET /ai/teacher/sessions ─────────────────────────────────────────────────
exports.getSessions = async (req, res) => {
  try {
    const sessions = await AiChatHistory.find({ userId: req.user._id })
      .select('_id sessionId title createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
    res.json({
      sessions: sessions.map(s => ({ ...s, lastActivity: s.updatedAt || s.createdAt }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── GET /ai/teacher/sessions/:sessionId ──────────────────────────────────────
exports.getChatHistory = async (req, res) => {
  try {
    const history = await AiChatHistory.findOne({
      sessionId: req.params.sessionId,
      userId:    req.user._id
    });
    if (!history) return res.status(404).json({ message: 'Suhbat topilmadi' });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── DELETE /ai/teacher/sessions/:sessionId ───────────────────────────────────
exports.deleteSession = async (req, res) => {
  try {
    const result = await AiChatHistory.findOneAndDelete({
      _id:    req.params.sessionId,
      userId: req.user._id
    });
    if (!result) return res.status(404).json({ message: 'Suhbat topilmadi' });
    res.json({ message: "Suhbat o'chirildi" });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// ─── POST /ai/teacher/analyze-grades ──────────────────────────────────────────
/**
 * Tanlangan sinf (va ixtiyoriy fan/oy) bo'yicha baholar tahlili.
 * Sinf rahbari — sinfning barcha fanlari, fan o'qituvchisi — faqat o'z fanlari.
 */
exports.analyzeGrades = async (req, res) => {
  try {
    const { classId, subjectId, month, year } = req.body;
    if (!classId) return res.status(400).json({ message: 'Sinfni tanlang' });

    const classDoc = await loadScopedClass(req.user._id, classId);
    if (!classDoc) {
      return res.status(403).json({ message: 'Bu sinf sizga biriktirilmagan' });
    }

    const { isClassTeacher, subjects: allowedSubjects } =
      getAllowedSubjectsForClass(classDoc, req.user._id);
    const allowedSubjectIds = allowedSubjects.map(s => String(s.subject._id));

    // Fan tanlangan bo'lsa — ruxsat etilganlardan biri ekanini tekshiramiz
    let subjectFilter = null;
    if (subjectId) {
      if (!allowedSubjectIds.includes(String(subjectId))) {
        return res.status(403).json({ message: "Bu fan bo'yicha tahlil olish huquqingiz yo'q" });
      }
      subjectFilter = subjectId;
    }

    const gradeQuery = { class: classDoc._id };
    if (subjectFilter) {
      gradeQuery.subject = subjectFilter;
    } else if (!isClassTeacher) {
      // Fan o'qituvchisi fan tanlamasa — faqat o'zi o'qitadigan fanlar
      gradeQuery.subject = { $in: allowedSubjectIds };
    }

    const numYear  = parseInt(year, 10);
    const numMonth = parseInt(month, 10);
    if (numYear && numMonth >= 1 && numMonth <= 12) {
      gradeQuery.date = {
        $gte: new Date(numYear, numMonth - 1, 1),
        $lt:  new Date(numYear, numMonth, 1)
      };
    } else if (numYear) {
      gradeQuery.date = {
        $gte: new Date(numYear, 0, 1),
        $lt:  new Date(numYear + 1, 0, 1)
      };
    }

    const grades = await Grade.find(gradeQuery)
      .populate('student', 'firstName lastName')
      .populate('subject', 'name')
      .sort({ date: -1 })
      .limit(3000)
      .lean();

    if (grades.length === 0) {
      return res.json({
        analysis: "Tanlangan davr va fan bo'yicha baholar topilmadi. Avval jurnalga baho kiriting yoki boshqa davrni tanlang.",
        stats: { totalGrades: 0, students: [] }
      });
    }

    // ── Server tomonida statistika (AI hisob-kitobiga ishonmaymiz) ──
    const perStudent = new Map();
    for (const g of grades) {
      const sid = String(g.student?._id || 'nomalum');
      if (!perStudent.has(sid)) {
        perStudent.set(sid, {
          name: g.student ? `${g.student.firstName} ${g.student.lastName}` : "Noma'lum o'quvchi",
          dailySum: 0, dailyCount: 0,
          examEarned: 0, examMax: 0, examCount: 0
        });
      }
      const st = perStudent.get(sid);
      if (g.isExam) {
        st.examEarned += g.score || 0;
        st.examMax    += g.examMaxScore || g.maxScore || 100;
        st.examCount  += 1;
      } else {
        st.dailySum   += g.score || 0;
        st.dailyCount += 1;
      }
    }

    const students = [...perStudent.values()].map(st => ({
      name: st.name,
      dailySum: Math.round(st.dailySum * 10) / 10,
      dailyCount: st.dailyCount,
      examCount: st.examCount,
      examPercent: st.examMax > 0 ? Math.round((st.examEarned / st.examMax) * 100) : null
    })).sort((a, b) => (b.examPercent ?? -1) - (a.examPercent ?? -1) || b.dailySum - a.dailySum);

    const subjectNames = subjectFilter
      ? [allowedSubjects.find(s => String(s.subject._id) === String(subjectFilter))?.subject?.name].filter(Boolean)
      : [...new Set(grades.map(g => g.subject?.name).filter(Boolean))];

    const statsTable = students.map(st =>
      `- ${st.name}: kunlik ballar yig'indisi ${st.dailySum} (${st.dailyCount} ta baho)` +
      (st.examCount ? `, imtihonlar: ${st.examCount} ta, o'zlashtirish ${st.examPercent}%` : ', imtihon topshirmagan')
    ).join('\n');

    const periodLabel = numYear && numMonth
      ? `${numMonth}/${numYear}` : (numYear ? `${numYear}-yil` : "so'nggi baholar");

    const prompt =
      `Sen "My Dream School" maktabining o'qituvchilar uchun AI tahlilchisisan. Faqat O'zbek tilida, markdown belgilarisiz (*, #, ** ishlatmasdan) javob ber.\n\n` +
      `O'qituvchi: ${teacherFullName(req.user)}\n` +
      `Sinf: ${classNameOf(classDoc)} | Fan(lar): ${subjectNames.join(', ') || '-'} | Davr: ${periodLabel}\n` +
      `Jami baholar soni: ${grades.length}\n\n` +
      `O'quvchilar statistikasi (tizim tomonidan aniq hisoblangan):\n${statsTable}\n\n` +
      `Eslatma: kunlik baho maksimal 0.5 ball, imtihon foizi o'zlashtirish darajasini bildiradi.\n\n` +
      `Quyidagi tartibda chuqur pedagogik tahlil tayyorla:\n` +
      `1. Umumiy holat (sinf darajasi, o'rtacha o'zlashtirish)\n` +
      `2. Eng yaxshi natija ko'rsatayotgan 3-5 o'quvchi va ularni qanday rag'batlantirish\n` +
      `3. E'tibor talab qiladigan o'quvchilar (past natija yoki kam baho olganlar) va ularga individual yondashuv bo'yicha aniq tavsiyalar\n` +
      `4. O'qituvchi uchun amaliy metodik tavsiyalar (3-5 ta)\n` +
      `Javob aniq, raqamlarga asoslangan va amaliy bo'lsin.`;

    const apiKeyDoc       = await getActiveApiKey();
    const modelCandidates = await createGeminiModelCandidates(apiKeyDoc.apiKey);

    const { analysis } = await runGeminiWithModelFallback(
      apiKeyDoc.apiKey,
      async ({ model }) => {
        const result   = await model.generateContent(prompt);
        const response = await result.response;
        return { analysis: response.text() };
      },
      { modelCandidates, taskName: 'Gemini teacher grade analysis' }
    );

    await incrementKeyUsage(apiKeyDoc);

    res.json({
      analysis,
      stats: {
        totalGrades: grades.length,
        className: classNameOf(classDoc),
        subjects: subjectNames,
        period: periodLabel,
        students
      }
    });
  } catch (error) {
    sendAiError(res, error, 'Teacher AI grade analysis error:');
  }
};

// ─── POST /ai/teacher/generate-schedule ───────────────────────────────────────
/**
 * Sinf uchun haftalik dars jadvali DRAFT'ini generatsiya qiladi.
 * Vaqt slotlari serverda hisoblanadi (AI vaqt arifmetikasiga ishonmaymiz),
 * AI faqat fanlarni slotlarga taqsimlaydi. Natija saqlanmaydi — faqat tavsiya.
 */
exports.generateSchedule = async (req, res) => {
  try {
    const {
      classId,
      days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      lessonsPerDay = 5,
      startTime = '08:30',
      lessonDuration = 45,
      breakDuration = 10,
      wishes = ''
    } = req.body;

    if (!classId) return res.status(400).json({ message: 'Sinfni tanlang' });

    const classDoc = await loadScopedClass(req.user._id, classId);
    if (!classDoc) {
      return res.status(403).json({ message: 'Bu sinf sizga biriktirilmagan' });
    }

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesUz = {
      Monday: 'Dushanba', Tuesday: 'Seshanba', Wednesday: 'Chorshanba',
      Thursday: 'Payshanba', Friday: 'Juma', Saturday: 'Shanba'
    };
    const selectedDays = (Array.isArray(days) ? days : []).filter(d => validDays.includes(d));
    if (selectedDays.length === 0) {
      return res.status(400).json({ message: 'Kamida bitta kun tanlang' });
    }

    const numLessons  = Math.min(Math.max(parseInt(lessonsPerDay, 10) || 5, 1), 10);
    const numDuration = Math.min(Math.max(parseInt(lessonDuration, 10) || 45, 20), 90);
    const numBreak    = Math.min(Math.max(parseInt(breakDuration, 10) || 10, 0), 30);

    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(String(startTime))) {
      return res.status(400).json({ message: "Boshlanish vaqti noto'g'ri formatda (HH:MM)" });
    }

    const classSubjects = (classDoc.subjects || [])
      .filter(s => s.subject)
      .map(s => ({
        name: s.subject.name,
        teacher: s.teacher ? `${s.teacher.firstName || ''} ${s.teacher.lastName || ''}`.trim() : ''
      }));

    if (classSubjects.length === 0) {
      return res.status(400).json({ message: "Bu sinfga fanlar biriktirilmagan. Avval administrator sinfga fan qo'shishi kerak." });
    }

    // ── Vaqt slotlarini serverda hisoblaymiz ──
    const [sh, sm] = String(startTime).split(':').map(Number);
    const slots = [];
    let cursor = sh * 60 + sm;
    const fmt = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    for (let i = 0; i < numLessons; i += 1) {
      slots.push({ startTime: fmt(cursor), endTime: fmt(cursor + numDuration) });
      cursor += numDuration + numBreak;
    }

    const sanitizedWishes = String(wishes || '').slice(0, 500);

    const prompt =
      `Sen maktab dars jadvali tuzuvchi yordamchisan.\n` +
      `Sinf: ${classNameOf(classDoc)}\n` +
      `Fanlar ro'yxati (FAQAT shulardan foydalan):\n${classSubjects.map(s => `- ${s.name}`).join('\n')}\n\n` +
      `Kunlar: ${selectedDays.join(', ')}\n` +
      `Har kuni darslar soni: ${numLessons}\n` +
      (sanitizedWishes ? `O'qituvchi istaklari: ${sanitizedWishes}\n` : '') +
      `\nQOIDALAR:\n` +
      `- Fanlarni hafta bo'ylab iloji boricha teng taqsimla.\n` +
      `- Murakkab fanlarni (matematika, fizika, kimyo, ona tili) kunning birinchi yarmiga qo'y.\n` +
      `- Bitta fan bir kunda ko'pi bilan 2 marta bo'lsin.\n` +
      `- Har bir slot uchun yuqoridagi ro'yxatdan ANIQ fan nomini yoz.\n\n` +
      `FAQAT quyidagi formatda JSON qaytar, boshqa hech qanday matn yozma:\n` +
      `{"days": [{"day": "Monday", "lessons": ["Fan nomi 1", "Fan nomi 2", ...]}]}\n` +
      `Har bir kun uchun "lessons" massivida aniq ${numLessons} ta element bo'lsin.`;

    const parsed = await generateJsonWithGemini(prompt, 'Gemini teacher schedule generation');

    // ── AI javobini tekshirib, faqat sinf fanlarini qabul qilamiz ──
    const subjectByName = new Map(classSubjects.map(s => [s.name.toLowerCase().trim(), s]));
    const resolveSubject = (name) => {
      const key = String(name || '').toLowerCase().trim();
      if (!key) return null;
      if (subjectByName.has(key)) return subjectByName.get(key);
      // qisman moslik (AI nomni biroz o'zgartirgan bo'lishi mumkin)
      for (const [k, v] of subjectByName) {
        if (k.includes(key) || key.includes(k)) return v;
      }
      return null;
    };

    const aiDays = Array.isArray(parsed.days) ? parsed.days : [];
    const draft = selectedDays.map((day, dayIndex) => {
      const aiDay = aiDays.find(d => d?.day === day) || aiDays[dayIndex] || {};
      const lessons = Array.isArray(aiDay.lessons) ? aiDay.lessons : [];
      return {
        day,
        dayUz: dayNamesUz[day],
        periods: slots.map((slot, i) => {
          const subj = resolveSubject(lessons[i]) ||
            classSubjects[(dayIndex * numLessons + i) % classSubjects.length];
          return {
            startTime: slot.startTime,
            endTime:   slot.endTime,
            subject:   subj.name,
            teacher:   subj.teacher
          };
        })
      };
    });

    res.json({
      draft: {
        className: classNameOf(classDoc),
        days: draft,
        settings: {
          startTime, lessonsPerDay: numLessons,
          lessonDuration: numDuration, breakDuration: numBreak
        }
      },
      note: "Bu tavsiya etilgan jadval loyihasi. Rasmiy jadvalni administrator tizimga kiritadi."
    });
  } catch (error) {
    sendAiError(res, error, 'Teacher AI schedule generation error:');
  }
};

// ─── POST /ai/teacher/generate-lesson-plan ────────────────────────────────────
/**
 * Dars reja (dars ishlanmasi) generatsiya qiladi — o'qituvchi darslarini
 * oldindan rejalashtirib qo'yishi uchun. Faqat o'zi o'qitadigan fan bo'yicha.
 */
exports.generateLessonPlan = async (req, res) => {
  try {
    const {
      classId,
      subjectId,
      topic = '',
      duration = 45,
      lessonsCount = 1
    } = req.body;

    if (!classId || !subjectId) {
      return res.status(400).json({ message: 'Sinf va fanni tanlang' });
    }
    if (!String(topic).trim()) {
      return res.status(400).json({ message: 'Dars mavzusini kiriting' });
    }

    const classDoc = await loadScopedClass(req.user._id, classId);
    if (!classDoc) {
      return res.status(403).json({ message: 'Bu sinf sizga biriktirilmagan' });
    }

    const tid = String(req.user._id);
    const subjectEntry = (classDoc.subjects || []).find(
      s => s.subject && String(s.subject._id) === String(subjectId) &&
           String(s.teacher?._id || s.teacher) === tid
    );
    if (!subjectEntry) {
      return res.status(403).json({ message: "Siz bu sinfda ushbu fanni o'qitmaysiz" });
    }

    const numDuration = Math.min(Math.max(parseInt(duration, 10) || 45, 20), 90);
    const numLessons  = Math.min(Math.max(parseInt(lessonsCount, 10) || 1, 1), 5);
    const sanitizedTopic = String(topic).slice(0, 600);
    const gradeLevel = classDoc.grade ? `${classDoc.grade}-sinf` : classNameOf(classDoc);
    const studentsCount = (classDoc.students || []).filter(s => s.isActive !== false).length;

    const prompt =
      `Sen tajribali metodist-o'qituvchisan. O'zbekiston maktab dasturi asosida professional dars ishlanmasi (dars reja) tuzasan.\n\n` +
      `Fan: ${subjectEntry.subject.name}\n` +
      `Sinf: ${gradeLevel} (${studentsCount} o'quvchi)\n` +
      `Mavzu(lar): ${sanitizedTopic}\n` +
      `Dars davomiyligi: ${numDuration} daqiqa\n` +
      `Darslar soni: ${numLessons} ta\n\n` +
      `Faqat O'zbek tilida, markdown belgilarisiz (*, #, ** ishlatmasdan) javob ber.\n` +
      `Har bir dars uchun quyidagi tuzilmada batafsil reja yoz:\n\n` +
      `DARS 1: (mavzu nomi)\n` +
      `Maqsadlar: ta'limiy, tarbiyaviy va rivojlantiruvchi maqsadlar\n` +
      `Kerakli jihozlar: ro'yxat\n` +
      `Darsning borishi (${numDuration} daqiqa taqsimoti):\n` +
      `- Tashkiliy qism (necha daqiqa): nima qilinadi\n` +
      `- O'tilgan mavzuni takrorlash (necha daqiqa): savollar\n` +
      `- Yangi mavzu bayoni (necha daqiqa): asosiy tushunchalar, misollar bilan\n` +
      `- Mustahkamlash (necha daqiqa): mashqlar/topshiriqlar\n` +
      `- Baholash va uyga vazifa (necha daqiqa): aniq vazifa\n` +
      `Kutilayotgan natijalar: o'quvchilar nimani o'rganadi\n` +
      `\nRejalar amaliy, sinf darajasiga mos va darhol qo'llash mumkin bo'lsin.`;

    const apiKeyDoc       = await getActiveApiKey();
    const modelCandidates = await createGeminiModelCandidates(apiKeyDoc.apiKey);

    const { plan } = await runGeminiWithModelFallback(
      apiKeyDoc.apiKey,
      async ({ model }) => {
        const result   = await model.generateContent(prompt);
        const response = await result.response;
        return { plan: response.text() };
      },
      { modelCandidates, taskName: 'Gemini teacher lesson plan' }
    );

    await incrementKeyUsage(apiKeyDoc);

    res.json({
      plan,
      subjectName: subjectEntry.subject.name,
      className: classNameOf(classDoc),
      topic: sanitizedTopic,
      duration: numDuration,
      lessonsCount: numLessons
    });
  } catch (error) {
    sendAiError(res, error, 'Teacher AI lesson plan error:');
  }
};

// ─── POST /ai/teacher/generate-test ───────────────────────────────────────────
/**
 * Oylik test savollarini generatsiya qiladi (draft).
 * Faqat o'qituvchi USHBU sinfda USHBU fanni o'qitsa ruxsat beriladi —
 * POST /api/tests dagi tekshiruv bilan bir xil qoida.
 */
exports.generateTest = async (req, res) => {
  try {
    const {
      classId,
      subjectId,
      topic = '',
      questionCount = 10,
      difficulty = "o'rta",
      questionType = 'single'
    } = req.body;

    if (!classId || !subjectId) {
      return res.status(400).json({ message: 'Sinf va fanni tanlang' });
    }

    const classDoc = await loadScopedClass(req.user._id, classId);
    if (!classDoc) {
      return res.status(403).json({ message: 'Bu sinf sizga biriktirilmagan' });
    }

    const tid = String(req.user._id);
    const subjectEntry = (classDoc.subjects || []).find(
      s => s.subject && String(s.subject._id) === String(subjectId) &&
           String(s.teacher?._id || s.teacher) === tid
    );
    if (!subjectEntry) {
      return res.status(403).json({ message: "Siz bu sinfda ushbu fanni o'qitmaysiz" });
    }

    const numQuestions = Math.min(Math.max(parseInt(questionCount, 10) || 10, 1), 30);
    const allowedDifficulties = ['oson', "o'rta", 'qiyin', 'aralash'];
    const safeDifficulty = allowedDifficulties.includes(difficulty) ? difficulty : "o'rta";
    const allowedTypes = ['single', 'multiple', 'text', 'mixed'];
    const safeType = allowedTypes.includes(questionType) ? questionType : 'single';
    const sanitizedTopic = String(topic || '').slice(0, 600);

    const gradeLevel = classDoc.grade ? `${classDoc.grade}-sinf` : classNameOf(classDoc);

    const typeInstruction = {
      single:   `Barcha savollar "single" turida bo'lsin (4 ta variant, faqat bittasi to'g'ri).`,
      multiple: `Barcha savollar "multiple" turida bo'lsin (4-5 ta variant, 2-3 tasi to'g'ri).`,
      text:     `Barcha savollar "text" turida bo'lsin (yozma javob, "correctAnswer" maydonida namunaviy to'g'ri javob).`,
      mixed:    `Savollarning ~60% "single" (4 variant, bittasi to'g'ri), ~25% "multiple" (4-5 variant, 2-3 tasi to'g'ri), ~15% "text" (yozma, "correctAnswer" bilan) turida bo'lsin.`
    }[safeType];

    const prompt =
      `Sen tajribali metodist-o'qituvchisan. O'zbekiston maktab dasturi asosida test tuzasan.\n\n` +
      `Fan: ${subjectEntry.subject.name}\n` +
      `Sinf darajasi: ${gradeLevel}\n` +
      `Qiyinlik: ${safeDifficulty}\n` +
      `Savollar soni: ${numQuestions}\n` +
      (sanitizedTopic ? `Mavzu(lar): ${sanitizedTopic}\n` : `Mavzu: shu sinf dasturining asosiy mavzulari\n`) +
      `\n${typeInstruction}\n\n` +
      `QOIDALAR:\n` +
      `- Savollar O'zbek tilida, aniq va sinf darajasiga mos bo'lsin.\n` +
      `- Variantlar bir-biridan mazmunan farq qilsin, "Barchasi to'g'ri" kabi variantlar ishlatma.\n` +
      `- Har bir savol "points" maydonida 1 ball bo'lsin.\n\n` +
      `FAQAT quyidagi formatda JSON qaytar, boshqa hech qanday matn yozma:\n` +
      `{"title": "Test sarlavhasi", "questions": [{"questionText": "Savol matni?", "questionType": "single", "points": 1, "options": [{"text": "Variant A", "isCorrect": false}, {"text": "Variant B", "isCorrect": true}, {"text": "Variant C", "isCorrect": false}, {"text": "Variant D", "isCorrect": false}], "correctAnswer": ""}]}\n` +
      `"text" turidagi savollarda "options" bo'sh massiv bo'lsin va "correctAnswer" to'ldirilsin.`;

    const parsed = await generateJsonWithGemini(prompt, 'Gemini teacher test generation');

    // ── AI javobini qat'iy tekshirish va tozalash ──
    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions = [];
    for (const q of rawQuestions) {
      if (questions.length >= numQuestions) break;
      const questionText = String(q?.questionText || '').trim();
      if (!questionText) continue;

      let qType = ['single', 'multiple', 'text'].includes(q?.questionType) ? q.questionType : 'single';
      let options = Array.isArray(q?.options)
        ? q.options
            .map(o => ({ text: String(o?.text || '').trim(), isCorrect: Boolean(o?.isCorrect) }))
            .filter(o => o.text)
            .slice(0, 6)
        : [];
      const correctAnswer = String(q?.correctAnswer || '').trim();

      if (qType === 'text') {
        if (!correctAnswer) continue;
        options = [];
      } else {
        if (options.length < 2) continue;
        const correctCount = options.filter(o => o.isCorrect).length;
        if (correctCount === 0) continue;
        if (qType === 'single' && correctCount > 1) {
          // faqat birinchisini to'g'ri qoldiramiz
          let found = false;
          options = options.map(o => {
            if (o.isCorrect && !found) { found = true; return o; }
            return { ...o, isCorrect: false };
          });
        }
      }

      const points = Math.min(Math.max(parseFloat(q?.points) || 1, 0.1), 25);
      questions.push({ questionText, questionType: qType, points, imageUrl: '', options, correctAnswer: qType === 'text' ? correctAnswer : '' });
    }

    if (questions.length === 0) {
      return res.status(500).json({ message: "AI yaroqli savollar yarata olmadi. Mavzuni aniqroq yozib, qayta urinib ko'ring." });
    }

    const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    const now = new Date();
    const suggestedTitle = String(parsed.title || '').trim().slice(0, 120) ||
      `${subjectEntry.subject.name} — ${monthNames[now.getMonth()]} oylik testi`;

    res.json({
      title: suggestedTitle,
      subjectName: subjectEntry.subject.name,
      className: classNameOf(classDoc),
      questions,
      totalPoints: Math.round(questions.reduce((s, q) => s + q.points, 0) * 10) / 10,
      note: "Savollarni ko'rib chiqing va kerak bo'lsa tahrirlang. Saqlashda test odatiy tartibda (Testlar bo'limi qoidalari bilan) yaratiladi."
    });
  } catch (error) {
    sendAiError(res, error, 'Teacher AI test generation error:');
  }
};
