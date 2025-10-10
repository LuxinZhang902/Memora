import { randomUUID } from 'crypto';
import { Client } from '@elastic/elasticsearch';
import { Storage } from '@google-cloud/storage';

async function main() {
  const userId = process.env.DEMO_USER_ID || 'u_demo';
  const bucketName = process.env.GCS_BUCKET || '';
  const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
  const client = new Client({ node: process.env.ES_HOST || 'http://localhost:9200', auth: { username: process.env.ES_USERNAME || 'elastic', password: process.env.ES_PASSWORD || 'changeme' } });
  const prefix = process.env.ES_INDEX_PREFIX || 'life-moments';
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const index = `${prefix}-${y}-${m}`;

  // Ensure index exists
  try { await client.indices.create({ index }); } catch {}

  const now = new Date().toISOString();

  // Seed Paris trip
  const parisId = randomUUID();
  const parisBase = `users/${userId}/moments/2023/05/20/${parisId}`;
  const photo = storage.bucket(bucketName).file(`${parisBase}/media/eiffel.jpg`);
  const pdf = storage.bucket(bucketName).file(`${parisBase}/media/itinerary.pdf`);
  const note = storage.bucket(bucketName).file(`${parisBase}/media/note.txt`);
  await photo.save(Buffer.from('demo image placeholder'));
  await pdf.save(Buffer.from('%PDF-1.4 demo pdf'));
  await note.save(Buffer.from('We visited the Eiffel Tower in Paris.'));

  const parisDoc = {
    moment_id: parisId,
    user_id: userId,
    timestamp: '2023-05-20T10:00:00Z',
    type: 'travel',
    language: 'en',
    title: 'Paris Trip',
    text: 'Visited the Eiffel Tower and walked along the Seine in Paris.',
    entities: ['Paris', 'Eiffel Tower'],
    geo: { city: 'Paris', country: 'France' },
    tags: ['travel','photo','receipt','note'],
    artifacts: [
      { kind: 'photo', name: 'eiffel.jpg', gcs_path: `gs://${bucketName}/${parisBase}/media/eiffel.jpg`, mime: 'image/jpeg' },
      { kind: 'file', name: 'itinerary.pdf', gcs_path: `gs://${bucketName}/${parisBase}/media/itinerary.pdf`, mime: 'application/pdf' },
      { kind: 'file', name: 'note.txt', gcs_path: `gs://${bucketName}/${parisBase}/media/note.txt`, mime: 'text/plain' },
    ],
  };

  await client.index({ index, id: parisId, document: parisDoc, refresh: 'wait_for' });

  // Seed DMV renewal
  const dmvId = randomUUID();
  const dmvBase = `users/${userId}/moments/2024/10/01/${dmvId}`;
  const dmvPhoto = storage.bucket(bucketName).file(`${dmvBase}/media/selfie.jpg`);
  const dmvPdf = storage.bucket(bucketName).file(`${dmvBase}/media/receipt.pdf`);
  const dmvNote = storage.bucket(bucketName).file(`${dmvBase}/media/note.txt`);
  await dmvPhoto.save(Buffer.from('demo image placeholder'));
  await dmvPdf.save(Buffer.from('%PDF-1.4 demo pdf'));
  await dmvNote.save(Buffer.from('DMV renewal completed. New license issued.'));

  const dmvDoc = {
    moment_id: dmvId,
    user_id: userId,
    timestamp: '2024-10-01T16:30:00Z',
    type: 'dmv',
    language: 'en',
    title: 'Driver License Renewal',
    text: 'Renewed my driver’s license at the DMV and saved the receipt.',
    entities: ['DMV','driver license'],
    geo: { city: 'San Francisco', country: 'USA' },
    tags: ['dmv','renewal','receipt','note'],
    artifacts: [
      { kind: 'photo', name: 'selfie.jpg', gcs_path: `gs://${bucketName}/${dmvBase}/media/selfie.jpg`, mime: 'image/jpeg' },
      { kind: 'file', name: 'receipt.pdf', gcs_path: `gs://${bucketName}/${dmvBase}/media/receipt.pdf`, mime: 'application/pdf' },
      { kind: 'file', name: 'note.txt', gcs_path: `gs://${bucketName}/${dmvBase}/media/note.txt`, mime: 'text/plain' },
    ],
  };

  await client.index({ index, id: dmvId, document: dmvDoc, refresh: 'wait_for' });

  // Quick query test
  const res = await client.search({ index, body: { size: 1, query: { bool: { must: [{ match: { text: 'Paris' }}], filter: [{ term: { user_id: userId }}] } }, sort: [{ timestamp: { order: 'desc' }}], _source: { includes: ['moment_id','timestamp','type','title','text','entities','geo.*','artifacts.*'] } } as any });
  console.log('Test search hits:', res.hits.hits.length);
}

main().catch((e) => { console.error(e); process.exit(1); });
