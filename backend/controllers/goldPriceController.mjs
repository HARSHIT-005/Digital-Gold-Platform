import GoldPrice from '../models/GoldPrice.mjs';
import GoldPriceHistory from '../models/GoldPriceHistory.mjs';
import { logAudit } from '../utils/logAudit.mjs';

// Get current gold price
export const getCurrentPrice = async (req, res, next) => {
  try {
    let currentPrice = await GoldPrice.findOne().sort({ lastUpdated: -1 });

    // If no price exists, return default or error
    if (!currentPrice) {
      return res.status(404).json({ 
        message: 'Gold price not set. Please set a price first.',
        price: 0,
        lastUpdated: null
      });
    }

    const price = parseFloat(currentPrice.pricePerGram.toString());
    const previousPrice = await GoldPriceHistory.findOne()
      .sort({ date: -1 })
      .skip(1); // Skip the most recent to get previous

    let changeAmount = 0;
    let direction = 'No change';

    if (previousPrice) {
      const prevPrice = parseFloat(previousPrice.pricePerGram.toString());
      changeAmount = price - prevPrice;
      if (changeAmount > 0) direction = 'Increase';
      else if (changeAmount < 0) direction = 'Decrease';
      changeAmount = Math.abs(changeAmount);
    }

    // Check if price has been set for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayHistory = await GoldPriceHistory.findOne({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    res.json({
      price,
      changeAmount,
      direction,
      lastUpdated: currentPrice.lastUpdated,
      source: currentPrice.source,
      priceSetForToday: !!todayHistory,
      todayPrice: todayHistory ? parseFloat(todayHistory.pricePerGram.toString()) : null
    });
  } catch (err) {
    next(err);
  }
};

// Update gold price (admin only)
export const updatePrice = async (req, res, next) => {
  try {
    const { price } = req.body;
    const adminId = req.user._id;

    if (!price || isNaN(price) || price <= 0) {
      return res.status(400).json({ message: 'Invalid price. Price must be a positive number.' });
    }

    // Get previous price for history
    const previousPrice = await GoldPrice.findOne().sort({ lastUpdated: -1 });
    const prevPriceValue = previousPrice ? parseFloat(previousPrice.pricePerGram.toString()) : null;

    // Calculate change
    let changeAmount = 0;
    let direction = 'No change';
    if (prevPriceValue !== null) {
      changeAmount = price - prevPriceValue;
      if (changeAmount > 0) direction = 'Increase';
      else if (changeAmount < 0) direction = 'Decrease';
    }

    // Update or create current price
    const priceValue = parseFloat(price);
    const currentPrice = await GoldPrice.findOneAndUpdate(
      {},
      {
        pricePerGram: priceValue,
        lastUpdated: new Date(),
        updatedBy: adminId,
        source: 'manual'
      },
      { upsert: true, new: true }
    );

    // Get today's date at midnight for grouping
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if price history entry exists for today
    const todayHistory = await GoldPriceHistory.findOne({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    // Prevent setting price more than once per day
    if (todayHistory) {
      // Audit failed attempt to set price (already set today)
      await logAudit({
        action: 'attempt_update_gold_price_blocked',
        performedBy: adminId,
        targetModel: 'GoldPriceHistory',
        targetId: todayHistory._id,
        changes: {
          attemptedPrice: priceValue,
          existingPrice: parseFloat(todayHistory.pricePerGram.toString()),
          reason: 'Price already set for today',
          date: today
        }
      });

      return res.status(400).json({ 
        message: 'Price has already been set for today. You can only set the price once per day.',
        existingPrice: parseFloat(todayHistory.pricePerGram.toString()),
        setAt: todayHistory.createdAt
      });
    }

    // Create new history entry for today
    const newHistoryEntry = await GoldPriceHistory.create({
      pricePerGram: priceValue,
      date: today,
      updatedBy: adminId,
      source: 'manual',
      changeAmount: Math.abs(changeAmount),
      direction
    });

    // Log audit for successful price update
    await logAudit({
      action: 'update_gold_price',
      performedBy: adminId,
      targetModel: 'GoldPriceHistory',
      targetId: newHistoryEntry._id,
      changes: {
        previousPrice: prevPriceValue,
        newPrice: priceValue,
        changeAmount: Math.abs(changeAmount),
        direction,
        date: today,
        source: 'manual',
        goldPriceId: currentPrice._id
      }
    });

    res.json({
      price: priceValue,
      changeAmount: Math.abs(changeAmount),
      direction,
      message: 'Price updated successfully',
      lastUpdated: currentPrice.lastUpdated
    });
  } catch (err) {
    next(err);
  }
};

// Get price history (admin only - with full details)
export const getPriceHistory = async (req, res, next) => {
  try {
    const { limit = 30, startDate, endDate } = req.query;

    let query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const history = await GoldPriceHistory.find(query)
      .populate('updatedBy', 'name email')
      .sort({ date: -1 })
      .limit(parseInt(limit));

    const formattedHistory = history.map(item => ({
      _id: item._id,
      price: parseFloat(item.pricePerGram.toString()),
      date: item.date,
      changeAmount: parseFloat(item.changeAmount.toString()),
      direction: item.direction,
      source: item.source,
      updatedBy: item.updatedBy ? {
        name: item.updatedBy.name,
        email: item.updatedBy.email
      } : null,
      timestamp: item.createdAt
    }));

    res.json({ history: formattedHistory });
  } catch (err) {
    next(err);
  }
};

// Get public price history (for users - without sensitive info)
export const getPublicPriceHistory = async (req, res, next) => {
  try {
    const { limit = 30, startDate, endDate } = req.query;

    let query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const history = await GoldPriceHistory.find(query)
      .sort({ date: 1 }) // Sort ascending for chart (oldest to newest)
      .limit(parseInt(limit));

    console.log(`Found ${history.length} price history entries`);

    const formattedHistory = history.map(item => ({
      date: item.date instanceof Date ? item.date.toISOString() : item.date,
      price: parseFloat(item.pricePerGram.toString()),
      changeAmount: parseFloat(item.changeAmount.toString()),
      direction: item.direction
    }));

    res.json({ history: formattedHistory });
  } catch (err) {
    next(err);
  }
};

// Get current price from database (utility function for other controllers)
export const getCurrentPriceFromDB = async () => {
  try {
    const currentPrice = await GoldPrice.findOne().sort({ lastUpdated: -1 });
    if (!currentPrice) {
      throw new Error('Gold price not set. Please set a price first.');
    }
    return parseFloat(currentPrice.pricePerGram.toString());
  } catch (err) {
    throw err;
  }
};

