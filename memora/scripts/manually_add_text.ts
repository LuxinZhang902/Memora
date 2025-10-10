/**
 * Manually add text to a file and generate embedding
 */

import { Client } from '@elastic/elasticsearch';
import { embedText } from '../lib/fireworks';

const client = new Client({
  node: process.env.ES_HOST || 'http://localhost:9200',
  auth: {
    username: process.env.ES_USERNAME || 'elastic',
    password: process.env.ES_PASSWORD || 'changeme'
  },
});

const FILE_INDEX = 'file-contents';

async function addTextToFile(fileId: string, text: string) {
  try {
    console.log(`\n📝 Adding text to file: ${fileId}`);
    console.log(`Text: ${text}\n`);
    
    // Generate embedding
    console.log('🔄 Generating embedding...');
    const vector = await embedText(text);
    console.log(`✅ Generated ${vector.length}-dim vector`);
    
    // Update file in ES
    console.log('🔄 Updating Elasticsearch...');
    await client.update({
      index: FILE_INDEX,
      id: fileId,
      body: {
        doc: {
          extracted_text: text,
          content_vector: vector,
          extraction_status: 'success',
          extraction_error: null,
          updated_at: new Date().toISOString()
        }
      },
      refresh: true
    } as any);
    
    console.log('✅ File updated successfully!');
    
    // Verify
    const result = await client.get({
      index: FILE_INDEX,
      id: fileId,
      _source: ['file_name', 'extracted_text', 'content_vector']
    } as any);
    
    const doc = result._source as any;
    console.log(`\n📊 Verification:`);
    console.log(`   File: ${doc.file_name}`);
    console.log(`   Text length: ${doc.extracted_text?.length || 0} chars`);
    console.log(`   Has vector: ${!!doc.content_vector}`);
    console.log(`   Text preview: ${doc.extracted_text?.substring(0, 50)}...`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Get file ID and text from command line
const fileId = process.argv[2];
const text = process.argv[3];

if (!fileId || !text) {
  console.log('Usage: npx tsx scripts/manually_add_text.ts <file-id> "<text>"');
  console.log('Example: npx tsx scripts/manually_add_text.ts 7bd511b3-9800-45a3-8b4e-73f372388101 "Sep.2, 2025\\nToday is my birthday."');
  process.exit(1);
}

addTextToFile(fileId, text);
