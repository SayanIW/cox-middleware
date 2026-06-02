const EMPTY = new Set(["", "n/a", "null", "undefined", "0"]);

function val(v) {
  const s = String(v || "").trim();
  return EMPTY.has(s.toLowerCase()) ? null : s;
}

function line(label, value, prefix = "", suffix = "") {
  const v = val(value);
  return v ? `${label}: ${prefix}${v}${suffix}` : null;
}

export function formatVehicleForAI(vehicle) {
  const core = vehicle.Core || {};
  const pricing = vehicle.Pricing || {};
  const dealer = vehicle.Dealer || {};

  const nameParts = [core.Year, core.Make, core.Model, core.Trim]
    .map((v) => String(v || "").trim())
    .filter((v) => v && !EMPTY.has(v.toLowerCase()));

  const name = nameParts.join(" ") || core.StockNumber || core.VIN || "Unknown Vehicle";

  const fuelEconomy = (() => {
    const city = val(core.CityMPG);
    const hwy = val(core.HwyMPG);
    if (!city && !hwy) return null;
    if (city && hwy) return `Fuel Economy: ${city} MPG city / ${hwy} MPG highway`;
    return `Fuel Economy: ${city || hwy} MPG`;
  })();

  const priceAnswer = (() => {
    const price = val(pricing.Price);
    const msrp = val(pricing.MSRP);
    if (!price) return "N/A";
    return msrp ? `$${price} and the MSRP is $${msrp}` : `$${price}`;
  })();

  const fields = [
    line("Stock Number", core.StockNumber),
    `Vehicle: ${name}`,
    line("VIN", core.VIN),
    line("Condition", core.InventoryType),
    line("Price", pricing.Price, "$"),
    line("MSRP", pricing.MSRP, "$"),
    "",
    line("Mileage", core.Mileage, "", " miles"),
    line("Engine", core.Engine),
    line("Transmission", core.Transmission),
    line("Drivetrain", core.Drivetrain),
    "",
    fuelEconomy,
    "",
    line("Exterior Color", core.ExteriorColor),
    line("Interior Color", core.InteriorColor),
    line("Body Style", core.BodyStyle),
    "",
    line("Dealer", dealer.Name),
    line("Phone", dealer.Phone),
    line("Location", dealer.City && dealer.State ? `${dealer.City}, ${dealer.State}` : (dealer.City || dealer.State)),
  ]
    .filter((l) => l !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // collapse multiple blank lines
    .trim();

  const text = `${fields}

FAQs:

Q: What is the price of the ${name}?
A: The price is ${priceAnswer}.

Q: What is the mileage of the ${name}?
A: It has ${val(core.Mileage) ? `${val(core.Mileage)} miles` : "mileage not listed"}.

Q: Is this vehicle new or used?
A: This vehicle is ${val(core.InventoryType) || "condition not listed"}.`;

  return { name, text };
}
