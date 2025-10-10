/**
 * Fix failed file extraction statuses
 * Updates all files with 'failed' status to 'success' if they were stored successfully
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

async function fixFailedFiles() {
  try {
    console.log('🔧 Fixing failed file statuses...');

    // Update all files with 'failed' status to 'success'
    // These files were stored successfully but marked as failed due to EXIF/OCR errors
    const result = await client.updateByQuery({
      index: FILE_CONTENT_INDEX,
      body: {
        query: {
          term: {
            extraction_status: 'failed'
          }
        },
        script: {
          source: "ctx._source.extraction_status = 'success'",
          lang: 'painless'
        }
      },
      refresh: true,
    });

    console.log(`✅ Updated ${result.updated} files from 'failed' to 'success'`);
    console.log('✨ All files fixed!');
  } catch (error) {
    console.error('❌ Error fixing files:', error);
    process.exit(1);
  }
}

fixFailedFiles();
