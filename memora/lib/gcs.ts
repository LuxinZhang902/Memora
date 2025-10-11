import { Storage } from '@google-cloud/storage';

// Check if GCS is properly configured
const isGCSConfigured = () => {
  return !!(
    process.env.GCP_PROJECT_ID && 
    process.env.GCS_BUCKET && 
    (process.env.GOOGLE_APPLICATION_CREDENTIALS || 
     process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
     process.env.GCS_CREDENTIALS)
  );
};

// Initialize Storage with credentials
const initStorage = () => {
  if (!isGCSConfigured()) return null;

  // For Vercel: use base64-encoded JSON credentials
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(
        Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString()
      );
      return new Storage({
        projectId: process.env.GCP_PROJECT_ID,
        credentials,
      });
    } catch (error) {
      console.error('[GCS] Failed to parse credentials JSON:', error);
      return null;
    }
  }

  // For local: use file path or default credentials
  return new Storage({ projectId: process.env.GCP_PROJECT_ID });
};

const storage = initStorage();
const bucketName = process.env.GCS_BUCKET || '';

/**
 * Upload a file buffer to GCS
 */
export async function uploadFile(
  buffer: Buffer,
  gcsPath: string,
  contentType: string
): Promise<string> {
  if (!storage) {
    throw new Error('GCS not configured. Set GOOGLE_APPLICATION_CREDENTIALS in .env.local');
  }

  const [bucket, ...keyParts] = gcsPath.replace('gs://', '').split('/');
  const b = storage.bucket(bucket || bucketName);
  const filePath = keyParts.join('/');
  const file = b.file(filePath);

  await file.save(buffer, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });

  console.log(`[GCS] Uploaded file to ${gcsPath}`);
  return gcsPath;
}

/**
 * Get a public URL for a file (if bucket is public)
 * Or generate a signed URL for private access
 */
export async function getFileUrl(gcsPath: string, signed = true): Promise<string> {
  if (!storage) {
    throw new Error('GCS not configured. Set GOOGLE_APPLICATION_CREDENTIALS in .env.local');
  }

  if (signed) {
    return signRead(gcsPath, 60); // 60 minute signed URL
  }
  
  const [bucket, ...keyParts] = gcsPath.replace('gs://', '').split('/');
  const filePath = keyParts.join('/');
  return `https://storage.googleapis.com/${bucket || bucketName}/${filePath}`;
}

export async function signRead(gcsPath: string, minutes = 10) {
  if (!storage) {
    throw new Error('GCS not configured. Set GOOGLE_APPLICATION_CREDENTIALS in .env.local');
  }

  const [bucket, ...keyParts] = gcsPath.replace('gs://', '').split('/');
  const b = storage.bucket(bucket || bucketName);
  const file = b.file(keyParts.join('/'));
  const [url] = await file.getSignedUrl({ action: 'read', version: 'v4', expires: Date.now() + minutes * 60_000 });
  return url;
}

export async function signWrite(gcsPath: string, minutes = 10, contentType = 'application/octet-stream') {
  if (!storage) {
    throw new Error('GCS not configured. Set GOOGLE_APPLICATION_CREDENTIALS in .env.local');
  }

  const [bucket, ...keyParts] = gcsPath.replace('gs://', '').split('/');
  const b = storage.bucket(bucket || bucketName);
  const file = b.file(keyParts.join('/'));
  const [url] = await file.getSignedUrl({ action: 'write', version: 'v4', expires: Date.now() + minutes * 60_000, contentType });
  return url;
}

/**
 * Delete a file from GCS
 */
export async function deleteFile(gcsPath: string): Promise<void> {
  if (!storage) {
    throw new Error('GCS not configured. Set GOOGLE_APPLICATION_CREDENTIALS in .env.local');
  }

  const [bucket, ...keyParts] = gcsPath.replace('gs://', '').split('/');
  const b = storage.bucket(bucket || bucketName);
  const file = b.file(keyParts.join('/'));
  await file.delete();
  console.log(`[GCS] Deleted file ${gcsPath}`);
}
