import mongoose from 'mongoose';

const goldPriceHistorySchema = new mongoose.Schema({
  pricePerGram: {
    type: mongoose.Types.Decimal128,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
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
  },
  changeAmount: {
    type: mongoose.Types.Decimal128,
    default: 0.0
  },
  direction: {
    type: String,
    enum: ['Increase', 'Decrease', 'No change'],
    default: 'No change'
  }
}, { timestamps: true });

// Index for efficient date-based queries
goldPriceHistorySchema.index({ date: -1 });

export default mongoose.model('GoldPriceHistory', goldPriceHistorySchema);

