import { SQSHandler, SQSBatchResponse, SQSBatchItemFailure } from "aws-lambda";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

import sharp from "sharp";
import { Client } from "pg";

const s3 = new S3Client({});

interface S3EventRecord {
  s3: {
    bucket: { name: string };
    object: { key: string };
  };
}

interface OutputKeys {
  userId: string;
  uuid: string;
  processedKey: string;
  thumbnailKey: string;
}


const secretsClient = new SecretsManagerClient({});
let cachedConnectionString: string | undefined;

async function getConnectionString(): Promise<string> {
  if (cachedConnectionString) return cachedConnectionString;

  const secretArn = process.env.DB_SECRET_ARN;
  if (!secretArn) throw new Error("DB_SECRET_ARN not set");

  const result = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretArn })
  );

  const secretJson = JSON.parse(result.SecretString ?? "{}");
  cachedConnectionString = secretJson.DATABASE_URL; // matches the key you set in Step 1
  if (!cachedConnectionString) throw new Error("DATABASE_URL missing in secret");
  return cachedConnectionString;
}



function deriveOutputKeys(originalKey: string): OutputKeys {
  // originalKey example: users/81ab/9cb3d0.jpg
  const match = originalKey.match(/^users\/([^/]+)\/([^/.]+)\.[a-zA-Z0-9]+$/);
  if (!match) {
    throw new Error(`Unexpected key format: ${originalKey}`);
  }
  const [, userId, uuid] = match;
  return {
    userId,
    uuid,
    processedKey: `processed/${userId}/${uuid}.webp`,
    thumbnailKey: `thumbnails/${userId}/${uuid}.webp`,
  };
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function getDbClient(): Promise<Client> {
  console.log(`[getDbClient] Fetching connection string from Secrets Manager...`);
  const connectionString = await getConnectionString();
  console.log(`[getDbClient] Connection string retrieved (length=${connectionString.length})`);

  const client = new Client({ connectionString });

  console.log(`[getDbClient] Connecting to Postgres...`);
  try {
    await client.connect();
    console.log(`[getDbClient] Connected successfully`);
  } catch (err) {
    console.error(`[getDbClient] CONNECTION FAILED:`, err);
    throw err;
  }

  return client;
}

async function markStatus(
  client: Client,
  imageKey: string,
  status: "READY" | "FAILED",
  processedKey?: string,
  thumbnailKey?: string
) {
  console.log(`[markStatus] START status=${status} imageKey=${imageKey} processedKey=${processedKey} thumbnailKey=${thumbnailKey}`);

  try {
    let result;

    if (status === "READY") {
      console.log(`[markStatus] Executing READY update query...`);
      result = await client.query(
        `UPDATE posts
         SET processed_image_key = $1,
             thumbnail_key = $2,
             processing_status = $3::processing_status
         WHERE image_key = $4`,
        [processedKey, thumbnailKey, "READY", imageKey]
      );
    } else {
      console.log(`[markStatus] Executing FAILED update query...`);
      result = await client.query(
        `UPDATE posts
         SET processing_status = $1::processing_status
         WHERE image_key = $2`,
        ["FAILED", imageKey]
      );
    }

    console.log(`[markStatus] Query completed. rowCount=${result.rowCount}`);

    if (result.rowCount === 0) {
      console.error(`[markStatus] WARNING: 0 rows matched for image_key=${imageKey} — check exact value in DB`);
    } else {
      console.log(`[markStatus] SUCCESS — ${result.rowCount} row(s) updated`);
    }
  } catch (err) {
    console.error(`[markStatus] QUERY FAILED for imageKey=${imageKey}:`, err);
    throw err;
  }
}


async function processImage(
  bucket: string,
  imageKey: string,
  dbClient: Client
) {
  const { processedKey, thumbnailKey } = deriveOutputKeys(imageKey);

  // Download
  const getResult = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: imageKey })
  );
  const originalBuffer = await streamToBuffer(getResult.Body);

  // Process: strip EXIF (sharp strips metadata by default unless
  // .withMetadata() is called — so simply NOT calling it strips it),
  // resize, convert to WebP, compress via quality setting.
  const processedBuffer = await sharp(originalBuffer)
    .rotate() // apply EXIF orientation before stripping it, so images don't end up sideways
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const thumbnailBuffer = await sharp(originalBuffer)
    .rotate()
    .resize({ width: 300, height: 300, fit: "cover" })
    .webp({ quality: 75 })
    .toBuffer();

  // Upload both outputs
  await Promise.all([
    s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: processedKey,
        Body: Buffer.from(processedBuffer),
        ContentType: "image/webp",
      })
    ),
    s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: Buffer.from(thumbnailBuffer),
        ContentType: "image/webp",
      })
    ),
  ]);

  // Update DB
  await markStatus(dbClient, imageKey, "READY", processedKey, thumbnailKey);
}

// ---------------------------------------------------------------------
// Handler — partial batch failure reporting so SQS only retries
// the messages that actually failed
// ---------------------------------------------------------------------
export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];
  const dbClient = await getDbClient();

  try {
    for (const record of event.Records) {
      try {
        const body = JSON.parse(record.body);

        // S3 event notifications can batch multiple Records per message
        const s3Records: S3EventRecord[] = body.Records ?? [];

        for (const s3Record of s3Records) {
          const bucket = s3Record.s3.bucket.name;
          const key = decodeURIComponent(
            s3Record.s3.object.key.replace(/\+/g, " ")
          );

          try {
            await processImage(bucket, key, dbClient);
          } catch (err) {
            console.error(`Failed processing ${key}:`, err);
            try {
              await markStatus(dbClient, key, "FAILED");
            } catch (dbErr) {
              console.error(`Failed to mark FAILED status for ${key}:`, dbErr);
            }
            throw err; // bubble up to fail this SQS record specifically
          }
        }
      } catch (err) {
        console.error(`Failed processing record ${record.messageId}:`, err);
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
  } finally {
    console.log(`[handler] Closing DB connection...`);
    try {
      await dbClient.end();
      console.log(`[handler] DB connection closed`);
    } catch (endErr) {
      console.error(`[handler] Error closing DB connection:`, endErr);
    }
  }

  return { batchItemFailures };
};