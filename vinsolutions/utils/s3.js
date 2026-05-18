import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
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
