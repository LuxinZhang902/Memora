/**
 * Test Bonsai Elasticsearch Connection
 * Run: ES_HOST=your-bonsai-url npx tsx scripts/test_bonsai.ts
 */

import { Client } from '@elastic/elasticsearch';

async function testBonsai() {
  const esHost = process.env.ES_HOST;
  
  if (!esHost) {
    console.error('❌ ES_HOST environment variable not set');
    console.log('Usage: ES_HOST=your-url npx tsx scripts/test_bonsai.ts');
    process.exit(1);
  }

  console.log('\n=== Testing Bonsai Connection ===\n');
  console.log('ES_HOST:', esHost.replace(/:[^:]*@/, ':****@')); // Hide password

  try {
    // Create client
    const client = new Client({
      node: esHost,
      // Auth is embedded in URL, but can also be separate
      ...(process.env.ES_USERNAME && {
        auth: {
          username: process.env.ES_USERNAME,
          password: process.env.ES_PASSWORD || '',
        },
      }),
    });

    // Test connection
    console.log('1. Testing connection...');
    const health = await client.cluster.health();
    console.log('✅ Connected! Cluster status:', health.status);

    // List indices
    console.log('\n2. Listing indices...');
    const indices = await client.cat.indices({ format: 'json' });
    console.log(`✅ Found ${indices.length} indices`);
    indices.forEach((idx: any) => {
      console.log(`   - ${idx.index} (${idx['docs.count']} docs, ${idx['store.size']})`);
    });

    // Test creating an index
    console.log('\n3. Testing index creation...');
    const testIndex = 'test-connection-' + Date.now();
    await client.indices.create({ index: testIndex });
    console.log(`✅ Created test index: ${testIndex}`);

    // Clean up
    await client.indices.delete({ index: testIndex });
    console.log(`✅ Deleted test index`);

    console.log('\n=== Connection Test Successful! ===\n');
  } catch (error: any) {
    console.error('\n❌ Connection failed:', error.message);
    if (error.meta) {
      console.error('Status:', error.meta.statusCode);
      console.error('Body:', error.meta.body);
    }
    process.exit(1);
  }
}

testBonsai();
