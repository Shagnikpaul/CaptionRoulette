import { SQSHandler, SQSBatchResponse, SQSBatchItemFailure } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { RekognitionClient, DetectModerationLabelsCommand } from "@aws-sdk/client-rekognition";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Client } from "pg";
import sharp from "sharp";

const s3 = new S3Client({});
const rekognition = new RekognitionClient({ region: process.env.REKOGNITION_REGION ?? "ap-south-1" });
const secretsClient = new SecretsManagerClient({});

// -------------------------------------------------------------------
// Confidence thresholds per top-level moderation category
// -------------------------------------------------------------------
const THRESHOLDS: Record<string, number> = {
    "Explicit Nudity": 75,
    "Violence": 75,
    "Visually Disturbing": 75,
    "Weapons": 80,
    "Drugs": 80,
    "Suggestive": 85,
};

interface ModerationJob {
    postId: string;
    processedImageKey: string;
    title: string | null;
    tags: string[];
}

// -------------------------------------------------------------------
// Secrets caching (per warm container)
// -------------------------------------------------------------------
let cachedDbUrl: string | undefined;
let cachedGroqKey: string | undefined;

async function getSecretValue(secretArn: string, key: string): Promise<string> {
    const result = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
    const json = JSON.parse(result.SecretString ?? "{}");
    const value = json[key];
    if (!value) throw new Error(`${key} missing in secret ${secretArn}`);
    return value;
}

async function getDbClient(): Promise<Client> {
    if (!cachedDbUrl) {
        cachedDbUrl = await getSecretValue(process.env.DB_SECRET_ARN!, "DATABASE_URL");
    }
    const client = new Client({ connectionString: cachedDbUrl });
    await client.connect();
    return client;
}

async function getGroqKey(): Promise<string> {
    if (!cachedGroqKey) {
        cachedGroqKey = await getSecretValue(process.env.GROQ_SECRET_ARN!, "GROQ_API_KEY");
    }
    return cachedGroqKey;
}

async function streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

// -------------------------------------------------------------------
// Image moderation via Rekognition
// -------------------------------------------------------------------
async function moderateImage(bucket: string, key: string): Promise<{ flagged: boolean; labels: any[] }> {
    const getResult = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const rawBuffer = await streamToBuffer(getResult.Body);

    // Rekognition only accepts JPEG or PNG — convert whatever format we have
    // (processed images are WebP, uploads can be anything)
    const jpegBuffer = await sharp(rawBuffer).jpeg({ quality: 90 }).toBuffer();

    const response = await rekognition.send(
        new DetectModerationLabelsCommand({
            Image: { Bytes: new Uint8Array(jpegBuffer) },
            MinConfidence: 50, // fetch broadly, apply our own per-category thresholds after
        })
    );

    const labels = response.ModerationLabels ?? [];
    let flagged = false;

    for (const label of labels) {
        const topLevelName = label.ParentName || label.Name; // top-level category name
        const threshold = THRESHOLDS[topLevelName ?? ""] ?? THRESHOLDS[label.Name ?? ""];
        if (threshold !== undefined && (label.Confidence ?? 0) >= threshold) {
            flagged = true;
        }
    }

    return { flagged, labels };
}

// -------------------------------------------------------------------
// Text moderation via Groq — structured JSON response
// -------------------------------------------------------------------
async function moderateText(
    title: string | null,
    tags: string[]
): Promise<{ flagged: boolean; reason: string; confidence: number }> {
    if (!title && tags.length === 0) {
        return { flagged: false, reason: "No text content to moderate", confidence: 100 };
    }

    const groqKey = await getGroqKey();

    const prompt = `You are a strict content moderation classifier for a public social platform. Your job is to detect ANY text that violates community guidelines, including casual, indirect, or slang expressions.

Flag content as unsafe (safe: false) if it contains ANY of the following — even in mild or slang form:

1. PROFANITY & OFFENSIVE SLANG — common English swear words, vulgar slang (e.g. f*ck, sh*t, b*tch, a**hole, d*ck, c*nt, bastard, crap used offensively, etc.), or phonetic/creative spellings of the above.
2. SEXUAL CONTENT — explicit or suggestive references, innuendo, or slang for sexual acts or body parts.
3. HATE SPEECH — slurs, derogatory terms, or language targeting a group by race, religion, gender, sexuality, nationality, or disability.
4. HARASSMENT & THREATS — insults, personal attacks, threatening language, or content clearly meant to intimidate or demean.
5. VIOLENCE — glorification of or incitement to violence, gore, or self-harm.
6. ILLEGAL ACTIVITY — promotion of drug use, weapons, or other illegal content.
7. CODED / DOG-WHISTLE LANGUAGE — subtle offensive language that uses euphemisms, slang, or seemingly innocent words to convey hateful or explicit meaning.

Be conservative: if you are uncertain, lean toward flagging (safe: false) with an appropriate confidence score.

Title: ${title ?? "(none)"}
Tags: ${tags.join(", ") || "(none)"}

Respond ONLY with valid JSON in this exact shape, no other text:
{"safe": boolean, "reason": "short explanation of what was detected", "confidence": number}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
            response_format: { type: "json_object" },
        }),
    });

    if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Groq response missing content");

    const parsed = JSON.parse(content);
    return {
        flagged: parsed.safe === false,
        reason: parsed.reason ?? "",
        confidence: parsed.confidence ?? 0,
    };
}

// -------------------------------------------------------------------
// Update posts row with final decision
// -------------------------------------------------------------------
async function updateModerationResult(
    client: Client,
    postId: string,
    shadowBanned: boolean,
    status: "SAFE" | "FLAGGED"
) {
    const result = await client.query(
        `UPDATE posts
     SET shadow_banned = $1,
         ai_moderation_status = $2::ai_moderation_status
     WHERE id = $3`,
        [shadowBanned, status, postId]
    );

    console.log(`[updateModerationResult] postId=${postId} status=${status} rowCount=${result.rowCount}`);
    if (result.rowCount === 0) {
        throw new Error(`No post found for id=${postId} when updating moderation result`);
    }
}

// -------------------------------------------------------------------
// Handler
// -------------------------------------------------------------------
export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
    const batchItemFailures: SQSBatchItemFailure[] = [];
    const dbClient = await getDbClient();

    try {
        for (const record of event.Records) {
            try {
                const job: ModerationJob = JSON.parse(record.body);
                const bucket = process.env.SOURCE_BUCKET!;

                const [imageResult, textResult] = await Promise.all([
                    moderateImage(bucket, job.processedImageKey),
                    moderateText(job.title, job.tags),
                ]);

                const flagged = imageResult.flagged || textResult.flagged;
                const status = flagged ? "FLAGGED" : "SAFE";

                console.log(
                    `[handler] postId=${job.postId} imageFlagged=${imageResult.flagged} textFlagged=${textResult.flagged} → ${status}`
                );

                await updateModerationResult(dbClient, job.postId, flagged, status);
            } catch (err) {
                console.error(`Failed processing moderation record ${record.messageId}:`, err);
                batchItemFailures.push({ itemIdentifier: record.messageId });
            }
        }
    } finally {
        await dbClient.end();
    }

    return { batchItemFailures };
};