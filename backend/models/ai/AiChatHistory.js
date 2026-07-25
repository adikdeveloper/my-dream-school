const mongoose = require('mongoose');

const aiChatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  title: {
    type: String,
    default: 'Yangi suhbat'
  },
  aiModel: {
    type: String,
    default: 'gemini-2.5-flash'
  },
  apiKeyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AiApiKey'
  }
}, {
  timestamps: true
});

aiChatHistorySchema.index({ userId: 1, sessionId: 1 });
aiChatHistorySchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('AiChatHistory', aiChatHistorySchema);
