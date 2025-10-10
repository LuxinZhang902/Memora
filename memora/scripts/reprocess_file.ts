/**
 * Script to re-process a file's content extraction
 */

import { getElasticsearchClient } from '../lib/es';
import { extractFileContent } from '../lib/contentExtractor';
import { embedText } from '../lib/fireworks';

const FILE_INDEX = process.env.ES_FILE_INDEX || 'file-contents';

async function reprocessFile(fileName: string) {
  const client = getElasticsearchClient();
  
  console.log(`\nSearching for file: ${fileName}...`);
  
  // Find the file
  const searchResult = await client.search({
    index: FILE_INDEX,
    body: {
      query: {
        match: {
          file_name: fileName
        }
      },
      size: 1
    }
  } as any);
  
  const hits = searchResult.hits.hits as any[];
  
  if (hits.length === 0) {
    console.log('❌ File not found');
    return;
  }
  
  const file = hits[0]._source;
  const fileId = hits[0]._id;
  
  console.log(`\n✅ Found file: ${file.file_name}`);
  console.log(`   ID: ${fileId}`);
  console.log(`   GCS Path: ${file.gcs_path}`);
  console.log(`   Current status: ${file.extraction_status}`);
  console.log(`   Has text: ${!!file.extracted_text}`);
  
  // Download from GCS and extract
  console.log('\n🔄 Re-extracting content...');
  
  try {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage();
    const bucket = storage.bucket(process.env.GCS_BUCKET!);
    const gcsFile = bucket.file(file.gcs_path);
    
    // Download file
    const [buffer] = await gcsFile.download();
    
    // Extract content
    const extracted = await extractFileContent(buffer, file.file_name, file.mime_type);
    
    console.log(`✅ Extracted ${extracted.text?.length || 0} characters`);
    
    // Generate embedding if we have text
    let contentVector = null;
    if (extracted.text) {
      console.log('🔄 Generating embedding...');
      contentVector = await embedText(extracted.text);
      console.log(`✅ Generated ${contentVector.length}-dim vector`);
    }
    
    // Update in Elasticsearch
    console.log('🔄 Updating index...');
    await client.update({
      index: FILE_INDEX,
      id: fileId,
      body: {
        doc: {
          extracted_text: extracted.text,
          content_vector: contentVector,
          metadata: extracted.metadata,
          extraction_status: extracted.text ? 'success' : 'no_text',
          extraction_error: null,
          updated_at: new Date().toISOString()
        }
      }
    } as any);
    
    console.log('✅ File re-processed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Text length: ${extracted.text?.length || 0} chars`);
    console.log(`   Has vector: ${!!contentVector}`);
    console.log(`   Metadata: ${JSON.stringify(extracted.metadata, null, 2)}`);
    
  } catch (error: any) {
    console.error('❌ Error re-processing file:', error.message);
    
    // Update with error
    await client.update({
      index: FILE_INDEX,
      id: fileId,
      body: {
        doc: {
          extraction_status: 'error',
          extraction_error: error.message,
          updated_at: new Date().toISOString()
        }
      }
    } as any);
  }
}

// Get filename from command line
const fileName = process.argv[2];

if (!fileName) {
  console.log('Usage: npx tsx scripts/reprocess_file.ts <filename>');
  console.log('Example: npx tsx scripts/reprocess_file.ts birthday.pdf');
  process.exit(1);
}

reprocessFile(fileName).catch(console.error);
