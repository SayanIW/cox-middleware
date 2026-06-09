import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  followRegionRedirects: true,
});

/**
 * Downloads and parses a JSON inventory file from S3.
 * The file must be a JSON array of vehicle objects matching the VinSolutions
 * vehicle shape (each object having at least a `Core` property).
 *
 * Config via environment variables (can be overridden per-call):
 *   AWS_REGION          – S3 region            (default: us-east-1)
 *   S3_BUCKET           – bucket name
 *   S3_INVENTORY_KEY    – object key / path
 *
 * @param {object} [options]
 * @param {string} [options.bucket]  Override S3_BUCKET env var
 * @param {string} [options.key]     Override S3_INVENTORY_KEY env var
 * @returns {Promise<Array>} Array of vehicle objects
 */
export async function fetchInventoryFromS3({ bucket, key } = {}) {
  const resolvedBucket = bucket || process.env.S3_BUCKET;
  const resolvedKey = key || process.env.S3_INVENTORY_KEY;

  if (!resolvedBucket) throw new Error("S3 bucket is not configured (set S3_BUCKET env var or pass bucket param)");
  if (!resolvedKey) throw new Error("S3 inventory key is not configured (set S3_INVENTORY_KEY env var or pass key param)");

  const command = new GetObjectCommand({ Bucket: resolvedBucket, Key: resolvedKey });
  const response = await s3Client.send(command);

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf-8");

  const parsed = JSON.parse(body);

  // Accept either a raw array or the VinSolutions paged response shape
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.Vehicles)) return parsed.Vehicles;

  throw new Error("Unexpected S3 inventory format: expected a JSON array or { Vehicles: [...] }");
}

// ─── Jarrett inventory CSV (vendor-drop) ────────────────────────────────────

const JARRETT_PREFIX = "vendor-drop/jarrett_inventory_";

/**
 * Lists all jarrett_inventory_YYYY-MM-DD.csv files in S3 and returns the
 * key of the most recent one (lexicographic date sort, latest first).
 */
async function resolveLatestJarrInventoryKey(bucket) {
  const command = new ListObjectsV2Command({ Bucket: bucket, Prefix: JARRETT_PREFIX });
  const response = await s3Client.send(command);

  const csvKeys = (response.Contents || [])
    .map((obj) => obj.Key)
    .filter((key) => key.endsWith(".csv"))
    .sort()
    .reverse(); // YYYY-MM-DD in name → lexicographic desc = latest first

  if (csvKeys.length === 0) {
    throw new Error(`No jarrett inventory CSV files found in s3://${bucket}/${JARRETT_PREFIX}*`);
  }

  console.log(`[jarrett] Latest inventory file: ${csvKeys[0]}`);
  return csvKeys[0];
}

/**
 * Downloads the latest jarrett_inventory_*.csv from S3 and returns an array
 * of vehicle objects shaped to match the VinSolutions Core/Pricing/Dealer
 * structure used throughout this app.
 *
 * @param {object} [options]
 * @param {string} [options.bucket]  Override S3_BUCKET env var
 * @returns {Promise<Array>} Array of normalised vehicle objects
 */
export async function fetchLatestJarrInventoryFromS3({ bucket } = {}) {
  const resolvedBucket = bucket || process.env.S3_BUCKET;
  if (!resolvedBucket) throw new Error("S3 bucket not configured (set S3_BUCKET env var)");

  const key = await resolveLatestJarrInventoryKey(resolvedBucket);

  const command = new GetObjectCommand({ Bucket: resolvedBucket, Key: key });
  const response = await s3Client.send(command);

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  const csvText = Buffer.concat(chunks).toString("utf-8");

  return parseJarrInventoryCsv(csvText);
}

// ─── CSV parsing helpers ─────────────────────────────────────────────────────

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
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

function parseJarrInventoryCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);

  return lines
    .slice(1)
    .map((line) => {
      const values = parseCsvLine(line);
      const row = headers.reduce((obj, header, idx) => {
        obj[header] = (values[idx] ?? "").trim();
        return obj;
      }, {});
      return mapJarrRowToVehicle(row);
    })
    .filter((v) => v.Core.VIN); // skip rows with no VIN
}

/**
 * Maps a raw CSV row (keyed by column header) to the Core/Pricing/Dealer
 * vehicle shape expected by formatVehicleForAI and the rest of the app.
 *
 * CSV columns:  Vin, Id, Dealership_name, Dealership_phone, Dealership_City,
 *               Dealership_state, Price, MSRP, Condition, Make, Model, Trim,
 *               Year, Mileage, Exterior_color, Interior_color, Body_style,
 *               Drivetrain, Engine, transmission, Image_Link, VDP
 */
function mapJarrRowToVehicle(row) {
  return {
    Core: {
      StockNumber: row.Id || "",
      VIN: row.Vin || "",
      Year: row.Year || "",
      Make: row.Make || "",
      Model: row.Model || "",
      Trim: row.Trim || "",
      InventoryType: row.Condition || "",
      Mileage: row.Mileage || "",
      Engine: row.Engine || "",
      Transmission: row.transmission || "",
      ExteriorColor: row.Exterior_color || "",
      InteriorColor: row.Interior_color || "",
      BodyStyle: row.Body_style || "",
      Drivetrain: row.Drivetrain || "",
    },
    Pricing: {
      Price: row.Price || "",
      MSRP: row.MSRP || "",
    },
    Dealer: {
      Name: row.Dealership_name || "",
      Phone: row.Dealership_phone || "",
      // City: row.Dealership_City || "",
      // State: row.Dealership_state || "",
    },
    Media: {
      ImageLink: row.Image_Link || "",
      VDP: row.VDP || "",
    },
  };
}
