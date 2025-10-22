/**
 * Test Elasticsearch Connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@elastic/elasticsearch';

export async function GET(request: NextRequest) {
  try {
    const esHost = process.env.ES_HOST || 'http://localhost:9200';
    const isBonsai = esHost.includes('bonsai');

    console.log('[TestES] ES_HOST:', esHost.replace(/:[^:]*@/, ':****@'));
    console.log('[TestES] Is Bonsai:', isBonsai);
    console.log('[TestES] Username:', process.env.ES_USERNAME);

    const client = new Client({
      node: esHost,
      auth: { 
        username: process.env.ES_USERNAME || 'elastic', 
        password: process.env.ES_PASSWORD || 'changeme' 
      },
      ...(isBonsai && {
        headers: { 'Content-Type': 'application/json' },
        compatibilityMode: '7',
      }),
    });

    // Test connection
    const health = await client.cluster.health();
    
    // List indices
    const indices = await client.cat.indices({ format: 'json' });

    return NextResponse.json({
      success: true,
      connection: {
        host: esHost.replace(/:[^:]*@/, ':****@'),
        isBonsai,
        username: process.env.ES_USERNAME,
      },
      cluster: {
        status: health.status,
        numberOfNodes: health.number_of_nodes,
      },
      indices: indices.map((idx: any) => ({
        name: idx.index,
        docs: idx['docs.count'],
        size: idx['store.size'],
      })),
    });
  } catch (error: any) {
    console.error('[TestES] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.meta?.body || error.stack,
    }, { status: 500 });
  }
}
