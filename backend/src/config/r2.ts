
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import "dotenv/config";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const endpoint = process.env.R2_ENDPOINT;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
  throw new Error("Missing required Cloudflare R2 environment variables.");
}

export const r2Client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const R2_BUCKET_NAME = bucketName;

export async function verifyR2Connection(): Promise<void> {
  await r2Client.send(
    new HeadBucketCommand({
      Bucket: R2_BUCKET_NAME,
    }),
  );

  console.log("Cloudflare R2 connection verified.");
}
