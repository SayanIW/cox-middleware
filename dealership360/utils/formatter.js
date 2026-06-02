/**
 * Format a raw Cyclewise CSV inventory record into the same
 * { name, text } shape used by the VinSolutions formatter.
 */
export function formatInventoryForAI(record) {
  const nameParts = [record["Year"], record["Manufacturer"], record["Model"]]
    .map((v) => String(v || "").trim())
    .filter((v) => v && v !== "0" && v.toLowerCase() !== "null");

  const name = nameParts.join(" ") || record["Stock #"] || record["VIN"] || "Unknown Vehicle";

  const mileage = record["Odometer"] && record["Odometer"] !== "0"
    ? `${record["Odometer"]} ${record["Odometer Unit"] || ""}`.trim()
    : "N/A";

  return {
    name,
    text: `
Stock Number: ${record["Stock #"] || "N/A"}
Vehicle: ${name}
VIN: ${record["VIN"] || "N/A"}
Condition: ${record["Condition"] || "N/A"}
Price: ${record["Price ($)"] || "N/A"}
MSRP: ${record["MSRP ($)"] || "N/A"}

Mileage: ${mileage}
Engine: ${record["Engine Size"] || "N/A"}
Transmission: N/A

Fuel Economy: N/A

Exterior Color: ${record["Color"] || "N/A"}
Interior Color: N/A

Dealer: Cyclewise VT

FAQs:

Q: What is the price of the ${name}?
A: The price is ${record["Price ($)"] || "N/A"} and the MSRP is ${record["MSRP ($)"] || "N/A"}.

Q: What is the mileage of the ${name}?
A: It has ${mileage}.

Q: Is this vehicle new or used?
A: This vehicle is ${record["Condition"] || "N/A"}.
    `.trim()
  };
}
