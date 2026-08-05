// 🪙 Utility: Fetch live gold price in INR (minor formatting change only)
import fetch from "node-fetch";

export const fetchGoldPriceInINR = async () => {
  const url = "https://www.goldapi.io/api/XAU/INR";
  const apiKey = process.env.GOLDAPI_KEY;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-access-token": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`GoldAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // ✅ goldapi.io returns `price_gram_24k` for price per gram in INR
    if (!data.price_gram_24k) {
      throw new Error("No price_gram_24k in response");
    }

    // 🧮 Convert to float and return
    return parseFloat(data.price_gram_24k);
  } catch (err) {
    console.error("Failed to fetch gold price from GoldAPI:", err.message);
    throw new Error("Failed to fetch gold price from GoldAPI");
  }

  const json = await response.json();
  // ASP.NET WebMethod typically wraps result under "d"
  const payload = typeof json?.d === 'string' ? JSON.parse(json.d) : (json?.d ?? json);
  return payload;
};

// Removed legacy Muthoot implementation; MCX is the sole source now

export const fetchDetailedGoldPrice = async ({ commodity = 'GOLD', expiry = '05DEC2025' } = {}) => {
  const quote = await fetchMcxQuote({ commodity, expiry });
  const rawPrice = quote?.LTP ?? quote?.LastTradedPrice ?? quote?.Price ?? quote?.ltp;
  const price = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/,/g, '')) : Number(rawPrice);

  const rawChange = quote?.Change ?? quote?.Chng ?? quote?.change ?? quote?.chg;
  let changeAmount = 0;
  if (rawChange !== undefined && rawChange !== null && rawChange !== '') {
    changeAmount = typeof rawChange === 'string' ? parseFloat(rawChange.replace(/,/g, '')) : Number(rawChange);
  }

  let direction = 'No change';
  if (!Number.isNaN(changeAmount)) {
    if (changeAmount > 0) direction = 'Increase';
    else if (changeAmount < 0) direction = 'Decrease';
    changeAmount = Math.abs(changeAmount) || 0;
  } else {
    changeAmount = 0;
  }

  if (Number.isNaN(price) || !isFinite(price)) {
    throw new Error('Invalid MCX price');
  }

  return {
    price,
    changeAmount,
    direction,
    lastUpdated: new Date().toISOString(),
    source: 'MCX'
  };
};
