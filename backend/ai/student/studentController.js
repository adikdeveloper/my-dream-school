/**
 * STUDENT AI MODULE - Controller
 * ==============================
 * O'quvchilar uchun AI o'qituvchi-yordamchi.
 *
 * XAVFSIZLIK QOIDALARI:
 * - Barcha route'lar auth + authorize('student') bilan himoyalangan.
 * - Kontekst FAQAT so'rov yuborgan o'quvchining O'Z ma'lumotlaridan quriladi
 *   (buildStudentContext(req.user._id)).
 * - Admin action-handler'lar (baho qo'yish, to'lov, o'quvchi yaratish va h.k.)
 *   bu modulda UMUMAN chaqirilmaydi — o'quvchi hech qanday mutatsiya qila olmaydi.
 * - Sessiyalar AiChatHistory'da userId bo'yicha ajratilgan.
 */

const mongoose = require('mongoose');
const AiChatHistory = require('../../models/ai/AiChatHistory');
const { getActiveApiKey, incrementKeyUsage } = require('../config/keyManager');
const {
  createGeminiModelCandidates,
  runGeminiWithModelFallback,
  isRetryableGeminiModelError,
  formatGeminiError
} = require('../config/aiConfig');
const { buildStudentContext } = require('../utils/contextBuilder');
const { buildStudentSystemPrompt } = require('../config/systemPrompts');

// ─── Sessiya boshqaruvi (o'quvchining o'z userId si bilan) ────────────────────
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

// ─── POST /ai/student/chat ────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Xabar matni kerak' });
    }

    const studentUser = req.user;
    const studentName = [studentUser.firstName, studentUser.lastName].filter(Boolean).join(' ').trim();
    const chatHistory = await getOrCreateChatHistory(req.user._id, sessionId);

    const apiKeyDoc       = await getActiveApiKey();
    const modelCandidates = await createGeminiModelCandidates(apiKeyDoc.apiKey);
    chatHistory.apiKeyId  = apiKeyDoc._id;

    // FAQAT o'quvchining o'z ma'lumotlari
    const contextData   = await buildStudentContext(req.user._id);
    const systemContext = buildStudentSystemPrompt(studentName, contextData);

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
            { role: 'model', parts: [{ text: "Tushundim. Men sening shaxsiy AI o'qituvchi-yordamchingman. Faqat sening o'quv ma'lumotlaring asosida yordam beraman, dars mavzularini tushuntiraman va mustaqil o'rganishingga ko'maklashaman." }] },
            ...historyMessages
          ]
        });
        const result   = await chat.sendMessage(message);
        const response = await result.response;
        return { aiMessage: response.text(), modelName: currentModelName };
      },
      { modelCandidates, taskName: 'Gemini student chat' }
    );

    chatHistory.aiModel = modelName;
    await saveChatExchange(chatHistory, message, aiMessage);
    await incrementKeyUsage(apiKeyDoc);

    res.json({ message: aiMessage, sessionId: chatHistory.sessionId });
  } catch (error) {
    console.error('Student AI Chat error:', error);
    const statusCode = isRetryableGeminiModelError(error) ? 503 : 500;
    res.status(statusCode).json({ message: formatGeminiError(error) || error.message || "AI bilan bog'lanishda xato" });
  }
};

// ─── GET /ai/student/sessions ─────────────────────────────────────────────────
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

// ─── GET /ai/student/sessions/:sessionId ──────────────────────────────────────
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

// ─── DELETE /ai/student/sessions/:sessionId ───────────────────────────────────
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
