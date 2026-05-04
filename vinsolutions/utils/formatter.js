export function formatVehicleForAI(vehicle) {
  const core = vehicle.Core || {};
  const pricing = vehicle.Pricing || {};
  const dealer = vehicle.Dealer || {};

  const nameParts = [core.Year, core.Make, core.Model, core.Trim]
    .map((value) => String(value || "").trim())
    .filter((value) => value && value.toLowerCase() !== "null" && value.toLowerCase() !== "undefined");

  const name = nameParts.join(" ") || core.StockNumber || core.VIN || "Unknown Vehicle";

  return {
    name,
    text: `
Stock Number: ${core.StockNumber || "N/A"}
Vehicle: ${name}
VIN: ${core.VIN || "N/A"}
Condition: ${core.InventoryType || "N/A"}
Price: $${pricing.Price || "N/A"}
MSRP: $${pricing.MSRP || "N/A"}

Mileage: ${core.Mileage || "N/A"} miles
Engine: ${core.Engine || "N/A"}
Transmission: ${core.Transmission || "N/A"}

Fuel Economy: ${core.CityMPG || "N/A"} MPG city / ${core.HwyMPG || "N/A"} MPG highway

Exterior Color: ${core.ExteriorColor || "N/A"}
Interior Color: ${core.InteriorColor || "N/A"}

Dealer: ${dealer.Name || "N/A"}

FAQs:

Q: What is the price of the ${name}?
A: The price is $${pricing.Price || "N/A"} and the MSRP is $${pricing.MSRP || "N/A"}.

Q: What is the mileage of the ${name}?
A: It has ${core.Mileage || "N/A"} miles.

Q: Is this vehicle new or used?
A: This vehicle is ${core.InventoryType || "N/A"}.
    `.trim()
  };
}
