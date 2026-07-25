const mongoose = require('mongoose');

const aiApiKeySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  apiKey: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
  isPrimary: { type: Boolean, default: false },
  provider: { type: String, enum: ['gemini', 'openai', 'other'], default: 'gemini' },
  usageCount: { type: Number, default: 0 },
  lastUsed: { type: Date, default: null },
  rateLimitPerDay: { type: Number, default: 1500 },
  dailyUsage: { type: Number, default: 0 },
  dailyUsageReset: { type: Date, default: () => new Date() },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

aiApiKeySchema.pre('save', async function(next) {
  if (this.isPrimary && this.isModified('isPrimary')) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isPrimary: true },
      { isPrimary: false }
    );
  }
  next();
});

aiApiKeySchema.methods.getMaskedKey = function() {
  const key = this.apiKey;
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
};

module.exports = mongoose.model('AiApiKey', aiApiKeySchema);
