import fs from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';

async function main() {
  const client = new Client({ node: process.env.ES_HOST || 'http://localhost:9200', auth: { username: process.env.ES_USERNAME || 'elastic', password: process.env.ES_PASSWORD || 'changeme' } });
  const prefix = process.env.ES_INDEX_PREFIX || 'life-moments';
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const index = `${prefix}-${y}-${m}`;
  const mappingPath = path.resolve(__dirname, '../infrastructure/es-mapping.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
  const exists = await client.indices.exists({ index });
  if (!exists) {
    await client.indices.create({ index, ...mapping });
    console.log('Created index', index);
  } else {
    console.log('Index exists', index);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
