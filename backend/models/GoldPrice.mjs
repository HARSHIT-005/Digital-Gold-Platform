import mongoose from 'mongoose';

const goldPriceSchema = new mongoose.Schema({
  pricePerGram: {
    type: mongoose.Types.Decimal128,
    required: true,
    default: 0.0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  source: {
    type: String,
    enum: ['manual', 'api'],
    default: 'manual'
  }
}, { timestamps: true });

export default mongoose.model('GoldPrice', goldPriceSchema);

