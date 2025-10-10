import { Client } from '@elastic/elasticsearch';
import type { Artifact, QueryPlan } from './types';
import { embedText } from './fireworks';

const client = new Client({
  node: process.env.ES_HOST || 'http://localhost:9200',
  auth: { username: process.env.ES_USERNAME || 'elastic', password: process.env.ES_PASSWORD || 'changeme' },
});

export function indexNameFromPrefix(prefix = process.env.ES_INDEX_PREFIX || 'life-moments', d = new Date()) {
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${prefix}-${y}-${m}`;
}

export async function createIndexIfNotExists(mapping: any) {
  const index = indexNameFromPrefix();
  const exists = await client.indices.exists({ index });
  if (!exists) {
    await client.indices.create({ index, ...mapping });
  }
  return index;
}

export async function upsertMoment(index: string, id: string, doc: any) {
  await client.index({ index, id, document: doc, refresh: 'wait_for' });
}

export async function searchMoments(params: { index: string; userId: string; plan: QueryPlan }) {
  const must: any[] = [];
  if (params.plan.must_text) must.push({ match: { text: params.plan.must_text } });
  if (params.plan.entities?.length) must.push({ terms: { entities: params.plan.entities } });
  if (params.plan.filters?.type_any_of?.length) must.push({ terms: { type: params.plan.filters.type_any_of } });
  // Add a nested query solely to enable inner_hits for artifacts (caps at 8)
  must.push({
    nested: {
      path: 'artifacts',
      query: { match_all: {} },
      inner_hits: { size: 8, _source: { includes: ['artifacts.*'] } },
    },
  });
  const filter: any[] = [{ term: { user_id: params.userId } }];
  if (params.plan.filters?.date_range) filter.push({ range: { timestamp: params.plan.filters.date_range } });

  const dsl = {
    size: params.plan.size || 1,
    query: { bool: { must, filter } },
    sort: [{ timestamp: { order: params.plan.sort || 'desc' } }],
    _source: { includes: [
      'moment_id','timestamp','type','title','text','text_en','entities','geo.*','artifacts.*'
    ]},
    highlight: { fields: { text: {} }, pre_tags: [''], post_tags: [''] },
    aggs: undefined,
  } as any;

  console.log('[ES] Elasticsearch Query:', JSON.stringify(dsl, null, 2));

  const res = await client.search({
    index: params.index,
    body: dsl,
  } as any);

  const hit = (res.hits.hits[0] as any) || null;
  const highlights = (hit?.highlight?.text || []).map((s: string) => String(s));
  const artifacts: Artifact[] = hit?._source?.artifacts || [];
  return { dsl, hit, highlights, artifacts };
}

/**
 * Enhanced hybrid search that searches both moments AND file contents
 * Uses both keyword (BM25) and vector semantic search
 */
export async function hybridSearch(params: { 
  userId: string; 
  plan: QueryPlan;
  queryText: string;
}) {
  const { userId, plan, queryText } = params;
  const momentIndex = indexNameFromPrefix();
  const fileIndex = 'file-contents';
  
  // Generate query embedding for semantic search
  let queryVector: number[] = [];
  try {
    queryVector = await embedText(queryText);
  } catch (error) {
    console.warn('[ES] Failed to generate query embedding:', error);
  }

  // Build must clauses for keyword search
  const buildMustClauses = (textField: string) => {
    const must: any[] = [];
    
    // Text matching with fuzzy search for typos
    if (plan.must_text || queryText) {
      must.push({
        multi_match: {
          query: plan.must_text || queryText,
          fields: [textField, 'title^2', 'file_name^1.5', 'description^1.2'],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'or',
        }
      });
    }
    
    // Entity matching
    if (plan.entities?.length) {
      must.push({ 
        terms: { 
          entities: plan.entities,
          boost: 1.5 
        } 
      });
    }
    
    // Type filtering
    if (plan.filters?.type_any_of?.length) {
      must.push({ terms: { type: plan.filters.type_any_of } });
    }
    
    // If no must clauses, add match_all to ensure we get results
    if (must.length === 0) {
      must.push({ match_all: {} });
    }
    
    return must;
  };

  // Build filter clauses
  const buildFilterClauses = () => {
    const filter: any[] = [{ term: { user_id: userId } }];
    
    if (plan.filters?.date_range) {
      filter.push({ range: { timestamp: plan.filters.date_range } });
    }
    
    return filter;
  };

  // Search moments index
  const momentsMust = buildMustClauses('text');
  momentsMust.push({
    nested: {
      path: 'artifacts',
      query: { match_all: {} },
      inner_hits: { size: 8, _source: { includes: ['artifacts.*'] } },
    },
  });

  const momentsQuery: any = {
    bool: {
      must: momentsMust,
      filter: buildFilterClauses(),
    }
  };

  // Add vector search if embedding is available
  if (queryVector.length > 0) {
    momentsQuery.bool.should = [
      {
        script_score: {
          query: { match_all: {} },
          script: {
            source: `
              if (doc['vector'].size() == 0) { return 0; }
              return cosineSimilarity(params.query_vector, 'vector') + 1.0;
            `,
            params: { query_vector: queryVector }
          }
        }
      }
    ];
    momentsQuery.bool.minimum_should_match = 0;
  }

  const momentsDsl = {
    size: plan.size || 3,
    query: momentsQuery,
    sort: [{ timestamp: { order: plan.sort || 'desc' } }],
    _source: {
      includes: [
        'moment_id', 'timestamp', 'type', 'title',
        'text', 'text_en', 'entities', 'geo.*', 'artifacts.*'
      ]
    },
    highlight: {
      fields: { text: {}, title: {} },
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
    },
  };

  // Search file contents index
  const filesMust = buildMustClauses('extracted_text');
  
  const filesQuery: any = {
    bool: {
      must: filesMust,
      filter: [
        { term: { user_id: userId } },
        { term: { extraction_status: 'success' } },
      ],
    }
  };

  // Add vector search for files
  if (queryVector.length > 0) {
    filesQuery.bool.should = [
      {
        script_score: {
          query: { match_all: {} },
          script: {
            source: `
              if (doc['content_vector'].size() == 0) { return 0; }
              return cosineSimilarity(params.query_vector, 'content_vector') + 1.0;
            `,
            params: { query_vector: queryVector }
          }
        }
      }
    ];
    filesQuery.bool.minimum_should_match = 0;
  }

  const filesDsl = {
    size: plan.size || 3,
    query: filesQuery,
    sort: [
      '_score',
      { created_at: { order: 'desc' } }
    ],
    _source: {
      includes: [
        'content_id', 'artifact_id', 'moment_id', 'file_name',
        'extracted_text', 'metadata', 'created_at', 'gcs_path'
      ]
    },
    highlight: {
      fields: { 
        extracted_text: { 
          fragment_size: 150, 
          number_of_fragments: 3 
        },
        file_name: {}
      },
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
    },
  };

  console.log('[ES] ========== HYBRID SEARCH STARTING ==========');
  console.log('[ES] Query text:', queryText);
  console.log('[ES] Has query vector:', queryVector.length > 0);
  
  // Write DSL to file for debugging (avoid console clutter)
  try {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logDir, `hybrid-search-${timestamp}.json`);
    fs.writeFileSync(logFile, JSON.stringify({
      queryText,
      momentsDsl,
      filesDsl,
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log('[ES] DSL saved to:', logFile);
  } catch (err) {
    console.warn('[ES] Failed to write DSL to file:', err);
  }

  // Execute both searches in parallel
  const [momentsRes, filesRes] = await Promise.all([
    client.search({ index: momentIndex, body: momentsDsl } as any),
    client.search({ index: fileIndex, body: filesDsl } as any).catch(err => {
      console.warn('[ES] File search failed:', err.message);
      return { hits: { hits: [] } };
    }),
  ]);

  const momentHits = momentsRes.hits.hits as any[];
  const fileHits = filesRes.hits.hits as any[];

  console.log('[ES] ========== HYBRID SEARCH RESULTS ==========');
  console.log(`[ES] Found: ${momentHits.length} moments, ${fileHits.length} files`);
  
  if (fileHits.length > 0) {
    console.log('[ES] *** TOP FILE MATCH ***');
    console.log('[ES] File name:', fileHits[0]._source.file_name);
    console.log('[ES] Score:', fileHits[0]._score);
    console.log('[ES] Has extracted_text:', !!fileHits[0]._source.extracted_text);
    if (fileHits[0]._source.extracted_text) {
      console.log('[ES] Text preview:', fileHits[0]._source.extracted_text.substring(0, 150));
    }
  } else {
    console.log('[ES] *** NO FILE MATCHES FOUND ***');
  }
  
  if (momentHits.length > 0) {
    console.log('[ES] Top moment:', momentHits[0]._source?.title || momentHits[0]._source?.text?.substring(0, 50));
  }

  // Combine and rank results
  const allResults = [
    ...momentHits.map(hit => ({
      type: 'moment' as const,
      score: hit._score,
      hit,
      highlights: [
        ...(hit.highlight?.text || []),
        ...(hit.highlight?.title || [])
      ],
      artifacts: hit._source?.artifacts || [],
    })),
    ...fileHits.map(hit => ({
      type: 'file' as const,
      score: hit._score,
      hit,
      highlights: [
        ...(hit.highlight?.extracted_text || []),
        ...(hit.highlight?.file_name || [])
      ],
      fileContent: hit._source,
    }))
  ];

  // Sort by score
  allResults.sort((a, b) => b.score - a.score);

  // Take top result
  const topResult = allResults[0];

  if (!topResult) {
    console.log('[ES] No results found in hybrid search');
    return {
      dsl: { moments: momentsDsl, files: filesDsl },
      hit: null,
      highlights: [],
      artifacts: [],
      fileContent: null,
    };
  }

  console.log('[ES] ========== TOP RESULT ==========');
  console.log('[ES] Type:', topResult.type);
  console.log('[ES] Score:', topResult.score);
  
  if (topResult.type === 'file') {
    console.log('[ES] *** FILE WAS TOP MATCH - FETCHING PARENT MOMENT ***');
  }

  // If top result is a file, fetch its parent moment
  if (topResult.type === 'file') {
    const momentId = topResult.fileContent.moment_id;
    console.log('[ES] Parent moment_id:', momentId);
    try {
      const momentRes = await client.search({
        index: momentIndex,
        body: {
          query: { term: { moment_id: momentId } },
          size: 1,
        }
      } as any);
      
      const momentHit = momentRes.hits.hits[0] as any;
      
      console.log('[ES] *** RETURNING FILE-BASED RESULT ***');
      console.log('[ES] File content included:', !!topResult.fileContent);
      console.log('[ES] File name:', topResult.fileContent?.file_name);
      
      return {
        dsl: { moments: momentsDsl, files: filesDsl },
        hit: momentHit || topResult.hit,
        highlights: topResult.highlights,
        artifacts: momentHit?._source?.artifacts || [],
        fileContent: topResult.fileContent,
        searchType: 'file',
      };
    } catch (error) {
      console.error('[ES] Failed to fetch parent moment:', error);
    }
  }

  return {
    dsl: { moments: momentsDsl, files: filesDsl },
    hit: topResult.hit,
    highlights: topResult.highlights,
    artifacts: topResult.type === 'moment' ? topResult.artifacts : [],
    fileContent: null,
    searchType: 'moment',
  };
}
