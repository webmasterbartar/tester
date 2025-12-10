import mongoose, { Schema } from 'mongoose';

const ResultSchema = new Schema(
  {
    keyword: { type: String, required: true, index: true },
    url: { type: String, required: true },
    instagram: { type: String, default: null },
    phone: { type: String, default: null },
    page: { type: Number, default: 0 },
    title: { type: String, default: null },
    city: { type: String, default: null },
    province: { type: String, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

ResultSchema.index({ keyword: 1, url: 1 }, { unique: true });

export const ResultModel = mongoose.models.Result || mongoose.model('Result', ResultSchema);

