import { findByStockNumber } from "../utils/csvParser.js";
import { formatInventoryForAI } from "../utils/formatter.js";

export async function handleDealershipPerformance(req, res) {
  try {
    // Placeholder: Add dealership performance 360 CRM logic here
    res.status(200).json({ message: "Dealership Performance 360 CRM endpoint" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function handleInventoryLookup(req, res) {
  try {
    const { stock, stockNumber } = req.query;
    const requestedStockNumber = stockNumber ?? stock;

    if (!requestedStockNumber) {
      return res.status(400).json({ error: "Missing required query parameter: stockNumber (or stock)" });
    }

    const record = findByStockNumber(requestedStockNumber);

    if (!record) {
      return res.status(404).json({ error: `No inventory record found for stock number: ${requestedStockNumber}` });
    }

    res.status(200).json(formatInventoryForAI(record));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export function setupDealership360Routes(app) {
  app.get("/dealership-performance", handleDealershipPerformance);
  app.get("/dealership_performance", handleDealershipPerformance);
  app.get("/cyclewise-inventory", handleInventoryLookup);
}
