/**
 * CHAT MODULE - Controller
 * ========================
 * Asosiy AI suhbat logikasi.
 * Sessiyalar, tarix, umumiy savollar va barcha action'lar shu modul orqali o'tadi.
 *
 * VAZIFALAR:
 * - chat()        → Asosiy suhbat endpoint'i
 * - getSessions() → Sessiyalar ro'yxati
 * - getChatHistory() → Sessiya tarixi
 * - deleteSession()  → Sessiyanyi o'chirish
 *
 * STRATEGIYA:
 * - Har bir xabar avval tryHandleAiAction() orqali tekshiriladi
 * - Action topilsa → bevosita bajariladi (Gemini API ishlatilmaydi)
 * - Action topilmasa → Gemini AI ga context bilan yuboriladi
 */

const mongoose = require('mongoose');
const AiChatHistory = require('../../models/ai/AiChatHistory');
const { getActiveApiKey, getUsageSummary, incrementKeyUsage } = require('../config/keyManager');
const { createGeminiModelCandidates, runGeminiWithModelFallback, isRetryableGeminiModelError, formatGeminiError } = require('../config/aiConfig');
const { buildChatContext } = require('../utils/contextBuilder');
const { buildChatSystemPrompt } = require('../config/systemPrompts');

// ─── Action handlers (har bir modul controller'idan) ─────────────────────────
const educationController     = require('../education/educationController');
const financeController       = require('../finance/financeController');
const managementController    = require('../management/managementController');
const communicationController = require('../communication/communicationController');
const schedulingController    = require('../scheduling/schedulingController');
const reportsController       = require('../reports/reportsController');

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

// ─── Barcha action'larni sinab ko'rish ───────────────────────────────────────
/**
 * Xabarni barcha action handler'lariga navbat bilan yuboradi.
 * Birinchi ishlov beruvchi handler natijani qaytaradi.
 * @param {string} message - Foydalanuvchi xabari
 * @param {Object} model   - Gemini model instance
 * @param {string} adminId - So'rov yuborgan adminning ID si
 * @returns {Object|null}  - Handled action natijasi yoki null
 */
const tryHandleAiAction = async (message, model, adminId) => {
  // 1. Hisobot/statistika so'rovlari (eng yuqori ustuvor)
  const reportsResult = await reportsController.tryHandleAction(message, model);
  if (reportsResult) return reportsResult;

  // 2. Boshqaruv (xodim) — student qoidalardan oldin tekshirish kerak,
  //    chunki rol so'zlari (o'qituvchi/hisobchi) student so'zidan farq qiladi.
  const managementResult = await managementController.tryHandleAction(message, model);
  if (managementResult) return managementResult;

  // 3. Ta'lim bo'limi action'lari (o'quvchi, sinf, baho, davomat)
  const educationResult = await educationController.tryHandleAction(message, model);
  if (educationResult) return educationResult;

  // 4. Moliya bo'limi (to'lov, balans, jarima, maosh, xarajat)
  const financeResult = await financeController.tryHandleAction(message, model, adminId);
  if (financeResult) return financeResult;

  // 5. Aloqa (lid, e'lon)
  const commResult = await communicationController.tryHandleAction(message, model, adminId);
  if (commResult) return commResult;

  // 6. Jadval/imtihon/vazifa/bayram
  const schedulingResult = await schedulingController.tryHandleAction(message, model, adminId);
  if (schedulingResult) return schedulingResult;

  return null;
};

// ─── POST /ai/chat ────────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Xabar matni kerak' });
    }

    const adminUser = req.user;
    const adminName = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ').trim();
    const chatHistory = await getOrCreateChatHistory(req.user._id, sessionId);

    // API key va model candidates
    const apiKeyDoc       = await getActiveApiKey();
    const modelCandidates = await createGeminiModelCandidates(apiKeyDoc.apiKey);
    const { model }       = modelCandidates[0];

    // Action handler sinab ko'ramiz
    const actionResult = await tryHandleAiAction(message, model, req.user._id);

    if (actionResult?.handled) {
      // Davomat bulk
      if (actionResult.action === 'set_attendance_bulk_pending') {
        const Attendance = require('../../models/academic/Attendance');
        try {
          const records = actionResult.students.map(studentId => ({
            student: studentId, class: actionResult.classId,
            status: actionResult.status, date: actionResult.date,
            period: actionResult.period, teacher: req.user._id
          }));
          await Attendance.insertMany(records);
        } catch (err) {
          actionResult.message = `Guruhli davomatda xato: ${err.message}`;
        }
      }

      // Individual davomat
      if (actionResult.action === 'set_attendance_pending') {
        const Attendance = require('../../models/academic/Attendance');
        try {
          const att = new Attendance({ ...actionResult.data, teacher: req.user._id });
          await att.save();
        } catch (err) {
          actionResult.message = `Davomatni saqlashda xato: ${err.message}`;
        }
      }

      // Baho qo'yish
      if (actionResult.action === 'add_grade_pending') {
        const Grade = require('../../models/academic/Grade');
        try {
          const gradeData = { ...actionResult.data, teacher: req.user._id };
          const newGrade  = new Grade(gradeData);
          await newGrade.save();
          actionResult.message = `${actionResult.studentName}ga ${actionResult.subjectName} fanidan ${gradeData.score} ball qo'yildi.`;
          actionResult.action  = 'add_grade';
        } catch (gradeErr) {
          actionResult.message = `Baho qo'yishda xatolik: ${gradeErr.message}`;
          actionResult.action  = 'add_grade_error';
        }
      }

      await incrementKeyUsage(apiKeyDoc);
      await saveChatExchange(chatHistory, message, actionResult.message);
      const usageSummary = await getUsageSummary();

      return res.json({
        message:   actionResult.message,
        sessionId: chatHistory.sessionId,
        action:    actionResult.action,
        usage: {
          totalDailyUsed:      usageSummary.totalDailyUsed,
          totalDailyLimit:     usageSummary.totalDailyLimit,
          totalDailyRemaining: usageSummary.totalDailyRemaining,
          totalUsage:          usageSummary.totalUsage
        }
      });
    }

    // Action topilmasa — Gemini AI ga yuboramiz
    chatHistory.apiKeyId = apiKeyDoc._id;

    const contextData    = await buildChatContext();
    const systemContext  = buildChatSystemPrompt(adminName, contextData);

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
            { role: 'model', parts: [{ text: "Tushundim. Men My Dream School tizimining AI yordamchisiman. Tizim ma'lumotlariga asoslangan holda javob beraman va ruxsat berilgan amallarni bajaraman." }] },
            ...historyMessages
          ]
        });
        const result   = await chat.sendMessage(message);
        const response = await result.response;
        return { aiMessage: response.text(), modelName: currentModelName };
      },
      { modelCandidates, taskName: 'Gemini chat' }
    );

    chatHistory.aiModel = modelName;
    await saveChatExchange(chatHistory, message, aiMessage);
    await incrementKeyUsage(apiKeyDoc);

    const usageSummary = await getUsageSummary();
    res.json({
      message:   aiMessage,
      sessionId: chatHistory.sessionId,
      usage: {
        dailyUsed:           apiKeyDoc.dailyUsage,
        dailyLimit:          apiKeyDoc.rateLimitPerDay,
        dailyRemaining:      apiKeyDoc.rateLimitPerDay - apiKeyDoc.dailyUsage,
        totalDailyUsed:      usageSummary.totalDailyUsed,
        totalDailyLimit:     usageSummary.totalDailyLimit,
        totalDailyRemaining: usageSummary.totalDailyRemaining,
        totalUsage:          usageSummary.totalUsage
      }
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    const statusCode = isRetryableGeminiModelError(error) ? 503 : 500;
    res.status(statusCode).json({ message: formatGeminiError(error) || error.message || 'AI bilan boglanishda xato' });
  }
};

// ─── GET /ai/sessions ─────────────────────────────────────────────────────────
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

// ─── GET /ai/sessions/:sessionId ─────────────────────────────────────────────
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

// ─── DELETE /ai/sessions/:sessionId ──────────────────────────────────────────
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

// ─── DELETE /ai/sessions (barcha sessiyalar) ──────────────────────────────────
exports.deleteAllSessions = async (req, res) => {
  try {
    const result = await AiChatHistory.deleteMany({ userId: req.user._id });
    res.json({
      message: `Barcha suhbatlar o'chirildi`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};
