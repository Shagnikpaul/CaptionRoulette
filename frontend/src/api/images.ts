import client from './client';

export interface ImageUploadRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface ImageUploadResponse {
  objectKey: string;
  uploadUrl: string;
  httpMethod: string;
}

/**
 * Requests a pre-signed S3 upload URL from the backend.
 */
export async function requestPresignedUrl(
  payload: ImageUploadRequest
): Promise<ImageUploadResponse> {
  const response = await client.post<ImageUploadResponse>(
    '/api/images/presign',
    payload
  );
  return response.data;
}

/**
 * Uploads the file directly to S3 using the pre-signed URL.
 * Accepts an onProgress callback (0–100).
 */
export async function uploadToS3(
  uploadUrl: string,
  httpMethod: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      // S3 pre-signed PUT returns 200 or 204 on success
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during S3 upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open(httpMethod, uploadUrl);
    // Content-Type must match what was signed — set it explicitly
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
