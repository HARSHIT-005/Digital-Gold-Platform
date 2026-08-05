import mongoose from 'mongoose';

const orderCartSchema = new mongoose.Schema({
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  grams: { 
    type: Number, 
    required: true,
    min: 0
  },
  pricePerGram: { 
    type: Number, 
    required: true 
  },
  totalAmount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'cancelled', 'expired'], 
    default: 'pending' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date,
    default: function() {
      // Cart expires after 30 minutes
      return new Date(Date.now() + 30 * 60 * 1000);
    }
  },
  completedAt: Date,
  isDeleted: { 
    type: Boolean, 
    default: false 
  }
});

// Index for efficient queries
orderCartSchema.index({ customerId: 1, status: 1, createdAt: -1 });
orderCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OrderCart = mongoose.model('OrderCart', orderCartSchema);
export default OrderCart;

