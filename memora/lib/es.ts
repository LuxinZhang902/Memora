import { Client } from '@elastic/elasticsearch';
import type { Artifact, QueryPlan } from './types';

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

  const res = await client.search({
    index: params.index,
    body: dsl,
  } as any);

  const hit = (res.hits.hits[0] as any) || null;
  const highlights = (hit?.highlight?.text || []).map((s: string) => String(s));
  const artifacts: Artifact[] = hit?._source?.artifacts || [];
  return { dsl, hit, highlights, artifacts };
}
