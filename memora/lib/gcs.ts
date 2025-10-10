import { Storage } from '@google-cloud/storage';

const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
const bucketName = process.env.GCS_BUCKET || '';

export async function signRead(gcsPath: string, minutes = 10) {
  const [bucket, ...keyParts] = gcsPath.replace('gs://', '').split('/');
  const b = storage.bucket(bucket || bucketName);
  const file = b.file(keyParts.join('/'));
  const [url] = await file.getSignedUrl({ action: 'read', version: 'v4', expires: Date.now() + minutes * 60_000 });
  return url;
}

export async function signWrite(gcsPath: string, minutes = 10, contentType = 'application/octet-stream') {
  const [bucket, ...keyParts] = gcsPath.replace('gs://', '').split('/');
  const b = storage.bucket(bucket || bucketName);
  const file = b.file(keyParts.join('/'));
  const [url] = await file.getSignedUrl({ action: 'write', version: 'v4', expires: Date.now() + minutes * 60_000, contentType });
  return url;
}
