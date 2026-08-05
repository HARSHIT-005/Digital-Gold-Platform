import CustomerHolding from "../models/CustomerHolding.mjs";
import GoldPrice from "../models/GoldPrice.mjs";

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const getMyHoldings = async (req, res, next) => {
  try {
    const customerId = req.user.id;

    const holdings = await CustomerHolding.find({
      customerId,
      isDeleted: false,
    });

    // Get current gold price for calculating mark-to-market value
    const currentPriceDoc = await GoldPrice.findOne().sort({ createdAt: -1 });
    const currentPrice = currentPriceDoc?.price || 0;

    // Format holdings for frontend and filter out holdings with 0 or negative grams
    const formattedHoldings = holdings
      .filter((holding) => (holding.totalGrams || 0) > 0) // Only include holdings with positive grams
      .map((holding) => {
        const quantity = holding.totalGrams || 0;
        const avgPrice = holding.averagePricePerGram || 0;
        const valuationPrice =
          currentPrice > 0 ? currentPrice : avgPrice > 0 ? avgPrice : 0;
        const investedAmount =
          typeof holding.totalInvested === "number" && holding.totalInvested > 0
            ? holding.totalInvested
            : quantity * avgPrice;
        const currentValue = quantity * valuationPrice;

        return {
          id: holding._id,
          type: "Gold",
          quantity: Number(quantity.toFixed(4)),
          currentValue: Number(currentValue.toFixed(2)),
          investedAmount: Number(investedAmount.toFixed(2)),
          avgBuyPricePerGram: Number(avgPrice.toFixed(2)),
          purchaseDate: formatDate(
            holding.lastTransactionAt || holding.createdAt
          ),
          updatedAt: holding.updatedAt,
          currentPricePerGram: valuationPrice,
        };
      });

    // Calculate total portfolio value and total grams
    const totalValue = formattedHoldings.reduce(
      (sum, holding) => sum + holding.currentValue,
      0
    );
    const totalGrams = formattedHoldings.reduce(
      (sum, holding) => sum + holding.quantity,
      0
    );
    const totalInvested = formattedHoldings.reduce(
      (sum, holding) => sum + holding.investedAmount,
      0
    );

    res.status(200).json({
      holdings: formattedHoldings,
      totalValue: Number(totalValue.toFixed(2)),
      totalGrams: Number(totalGrams.toFixed(4)),
      totalInvested: Number(totalInvested.toFixed(2)),
      currentPricePerGram:
        currentPrice > 0
          ? currentPrice
          : formattedHoldings.length > 0
          ? formattedHoldings[0].avgBuyPricePerGram
          : 0,
    });
  } catch (err) {
    next(err);
  }
};
