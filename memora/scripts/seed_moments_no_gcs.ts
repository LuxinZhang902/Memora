import { randomUUID } from 'crypto';
import { Client } from '@elastic/elasticsearch';

async function main() {
  const userId = process.env.DEMO_USER_ID || 'u_demo';
  const client = new Client({ 
    node: process.env.ES_HOST || 'http://localhost:9200', 
    auth: { 
      username: process.env.ES_USERNAME || 'elastic', 
      password: process.env.ES_PASSWORD || 'changeme' 
    } 
  });
  const prefix = process.env.ES_INDEX_PREFIX || 'life-moments';
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const index = `${prefix}-${y}-${m}`;

  console.log(`Seeding demo moments to index: ${index}`);

  // Seed Paris trip (without GCS artifacts)
  const parisId = randomUUID();
  const parisDoc = {
    moment_id: parisId,
    user_id: userId,
    timestamp: '2023-05-20T10:00:00Z',
    type: 'travel',
    language: 'en',
    title: 'Paris Trip',
    text: 'Visited the Eiffel Tower and walked along the Seine in Paris. Had amazing croissants for breakfast.',
    text_en: 'Visited the Eiffel Tower and walked along the Seine in Paris. Had amazing croissants for breakfast.',
    entities: ['Paris', 'Eiffel Tower', 'Seine'],
    geo: { city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
    tags: ['travel', 'photo', 'europe'],
    artifacts: [],
    // Omit vector field - ES will handle it
  };

  await client.index({ index, id: parisId, document: parisDoc, refresh: 'wait_for' });
  console.log(`✅ Seeded Paris trip: ${parisId}`);

  // Seed DMV renewal
  const dmvId = randomUUID();
  const dmvDoc = {
    moment_id: dmvId,
    user_id: userId,
    timestamp: '2024-03-15T14:30:00Z',
    type: 'document',
    language: 'en',
    title: 'Driver License Renewal',
    text: 'Renewed my California driver license at the DMV. New license expires in 2029.',
    text_en: 'Renewed my California driver license at the DMV. New license expires in 2029.',
    entities: ['DMV', 'California', 'driver license'],
    geo: { city: 'San Francisco', state: 'CA', country: 'USA' },
    tags: ['document', 'government', 'license'],
    artifacts: [],
  };

  await client.index({ index, id: dmvId, document: dmvDoc, refresh: 'wait_for' });
  console.log(`✅ Seeded DMV renewal: ${dmvId}`);

  // Seed grocery shopping
  const groceryId = randomUUID();
  const groceryDoc = {
    moment_id: groceryId,
    user_id: userId,
    timestamp: '2024-10-08T18:00:00Z',
    type: 'receipt',
    language: 'en',
    title: 'Grocery Shopping',
    text: 'Bought groceries at Whole Foods. Spent $87.50 on organic vegetables, fruits, and almond milk.',
    text_en: 'Bought groceries at Whole Foods. Spent $87.50 on organic vegetables, fruits, and almond milk.',
    entities: ['Whole Foods', 'groceries'],
    geo: { city: 'San Francisco', state: 'CA', country: 'USA' },
    tags: ['receipt', 'shopping', 'food'],
    artifacts: [],
  };

  await client.index({ index, id: groceryId, document: groceryDoc, refresh: 'wait_for' });
  console.log(`✅ Seeded grocery shopping: ${groceryId}`);

  // Test search
  const res = await client.search({
    index,
    body: {
      query: { bool: { filter: [{ term: { user_id: userId } }] } },
      size: 10,
    },
  });

  console.log(`\n✅ Seeding complete! Total moments: ${res.hits.hits.length}`);
  console.log('\nTest queries:');
  console.log('  - "When was the last time I went to Paris?"');
  console.log('  - "When did I renew my driver license?"');
  console.log('  - "What did I buy at the grocery store?"');
}

main().catch(console.error);
