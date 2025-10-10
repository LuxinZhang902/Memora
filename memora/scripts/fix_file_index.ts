/**
 * Fix file-contents index by recreating with correct vector dimensions
 */

import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: process.env.ES_HOST || 'http://localhost:9200',
  auth: { 
    username: process.env.ES_USERNAME || 'elastic', 
    password: process.env.ES_PASSWORD || 'changeme' 
  },
});

const FILE_CONTENT_INDEX = 'file-contents';

async function fixFileIndex() {
  try {
    console.log('🔧 Fixing file-contents index...');

    // Delete existing index
    const exists = await client.indices.exists({ index: FILE_CONTENT_INDEX });
    if (exists) {
      await client.indices.delete({ index: FILE_CONTENT_INDEX });
      console.log('✅ Deleted old index');
    }

    console.log('✨ Index fixed! Restart your dev server to recreate with correct dimensions.');
  } catch (error) {
    console.error('❌ Error fixing index:', error);
    process.exit(1);
  }
}

fixFileIndex();
