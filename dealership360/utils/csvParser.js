import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Parse a single CSV line that may contain quoted fields with embedded commas.
 */
function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Handle escaped double-quote ("") inside a quoted field
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Load and parse the Cyclewise inventory CSV.
 * Returns an array of objects keyed by the CSV header row.
 */
export function loadInventory() {
  const csvPath = join(__dirname, "..", "Cyclewise_Inventory.csv");
  const raw = readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((obj, header, idx) => {
      obj[header] = values[idx] ?? "";
      return obj;
    }, {});
  });
}

/**
 * Find a single inventory record by its "Stock #" value.
 * Comparison is case-insensitive and trims whitespace.
 */
export function findByStockNumber(stockNumber) {
  const inventory = loadInventory();
  const needle = stockNumber.trim().toLowerCase();
  return inventory.find((item) => item["Stock #"].trim().toLowerCase() === needle) ?? null;
}
