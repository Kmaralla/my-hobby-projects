import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "";

/**
 * Upload file to S3
 */
export async function uploadToS3(
  file: Express.Multer.File,
  folder: string = "uploads"
): Promise<{ key: string; url: string }> {
  if (!BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET environment variable is not set");
  }

  const key = `${folder}/${randomUUID()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    Metadata: {
      originalName: file.originalname,
    },
  });

  await s3Client.send(command);

  // Generate a presigned URL for accessing the file (valid for 1 hour)
  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

  return { key, url };
}

/**
 * Get presigned URL for a file
 */
export async function getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET environment variable is not set");
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET environment variable is not set");
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Configure multer to use memory storage for S3 uploads
 */
export function getMulterConfig() {
  const storageType = process.env.STORAGE_TYPE || "local";

  if (storageType === "s3") {
    // Use memory storage for S3 (file is kept in memory, then uploaded to S3)
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req: any, file: any, cb: any) => {
        if (file.mimetype === "application/pdf") {
          cb(null, true);
        } else {
          cb(new Error("Only PDF files are allowed"));
        }
      },
    });
  } else {
    // Use disk storage for local development

    // Ensure uploads directory exists
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    return multer({
      storage: multer.diskStorage({
        destination: (req: any, file: any, cb: any) => {
          cb(null, uploadDir);
        },
        filename: (req: any, file: any, cb: any) => {
          const uniqueName = `${randomUUID()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req: any, file: any, cb: any) => {
        if (file.mimetype === "application/pdf") {
          cb(null, true);
        } else {
          cb(new Error("Only PDF files are allowed"));
        }
      },
    });
  }
}
