/**
 * Check if files have extracted text in Elasticsearch
 */

import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: process.env.ES_HOST || 'http://localhost:9200',
  auth: {
    username: process.env.ES_USERNAME || 'elastic',
    password: process.env.ES_PASSWORD || 'changeme'
  },
});

async function checkFileContent() {
  try {
    console.log('Checking file-contents index...\n');
    
    // Get all files
    const response = await client.search({
      index: 'file-contents',
      body: {
        query: { match_all: {} },
        size: 100,
        sort: [{ created_at: { order: 'desc' } }],
      }
    });

    const hits = response.hits.hits as any[];
    console.log(`Found ${hits.length} files\n`);

    for (const hit of hits) {
      const source = hit._source;
      console.log('─'.repeat(80));
      console.log(`File: ${source.file_name}`);
      console.log(`ID: ${hit._id}`);
      console.log(`User ID: ${source.user_id}`);
      console.log(`Status: ${source.extraction_status}`);
      console.log(`Has extracted_text: ${!!source.extracted_text}`);
      console.log(`Has content_vector: ${!!source.content_vector}`);
      
      if (source.extracted_text) {
        const preview = source.extracted_text.substring(0, 200);
        console.log(`Text preview: ${preview}...`);
      }
      
      if (source.extraction_error) {
        console.log(`Error: ${source.extraction_error}`);
      }
      
      console.log();
    }

    // Test search for "driver license"
    console.log('\n' + '='.repeat(80));
    console.log('Testing search for "driver license"...\n');
    
    const searchRes = await client.search({
      index: 'file-contents',
      body: {
        query: {
          multi_match: {
            query: 'driver license',
            fields: ['extracted_text', 'file_name', 'description'],
            fuzziness: 'AUTO',
          }
        },
        highlight: {
          fields: {
            extracted_text: { fragment_size: 150, number_of_fragments: 3 },
            file_name: {}
          }
        },
        size: 5,
      }
    });

    const searchHits = searchRes.hits.hits as any[];
    console.log(`Found ${searchHits.length} matching files\n`);

    for (const hit of searchHits) {
      const source = hit._source;
      console.log('─'.repeat(80));
      console.log(`File: ${source.file_name}`);
      console.log(`Score: ${hit._score}`);
      
      if (hit.highlight?.extracted_text) {
        console.log('Highlights:');
        hit.highlight.extracted_text.forEach((h: string) => {
          console.log(`  - ${h}`);
        });
      }
      
      console.log();
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.meta?.body?.error) {
      console.error('ES Error:', JSON.stringify(error.meta.body.error, null, 2));
    }
  }
}

checkFileContent();
