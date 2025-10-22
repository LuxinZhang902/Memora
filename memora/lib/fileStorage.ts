/**
 * File Storage Service with Parent-Child Relationships
 * 
 * Manages the storage of files and their extracted content in Elasticsearch
 * Uses parent-child relationships for efficient querying
 */

import { randomUUID } from 'crypto';
import { Client } from '@elastic/elasticsearch';
import { embedText } from './fireworks';
import {
  FileCategory,
  FileType,
  FileContentDocument,
  ArtifactReference,
  MomentDocument,
  getFileCategory,
  getFileTypeFromExtension,
  shouldExtractContent,
} from './fileTypes';
import { extractContent, ExtractionResult } from './contentExtractor';

// ============================================================================
// ELASTICSEARCH CLIENT
// ============================================================================

const client = new Client({
  node: process.env.ES_HOST || 'http://localhost:9200',
  auth: { 
    username: process.env.ES_USERNAME || 'elastic', 
    password: process.env.ES_PASSWORD || 'changeme' 
  },
  headers: { 'Content-Type': 'application/json' },
  ...(process.env.ES_HOST?.includes('bonsai') && { compatibilityMode: '7' }),
});

// ============================================================================
// INDEX MANAGEMENT
// ============================================================================

const FILE_CONTENT_INDEX = 'file-contents';

/**
 * Create file content index with proper mapping
 */
export async function createFileContentIndex() {
  
  const exists = await client.indices.exists({ index: FILE_CONTENT_INDEX });
  if (exists) {
    console.log(`[FileStorage] Index ${FILE_CONTENT_INDEX} already exists`);
    return;
  }
  
  await client.indices.create({
    index: FILE_CONTENT_INDEX,
    body: {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
        analysis: {
          analyzer: {
            content_analyzer: {
              type: 'standard',
              stopwords: '_english_',
            },
          },
        },
      },
      mappings: {
        properties: {
          // Identity
          content_id: { type: 'keyword' },
          artifact_id: { type: 'keyword' },
          moment_id: { type: 'keyword' },
          user_id: { type: 'keyword' },
          
          // File info
          file_name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          description: { type: 'text' },
          file_type: { type: 'keyword' },
          file_category: { type: 'keyword' },
          mime_type: { type: 'keyword' },
          file_size: { type: 'long' },
          
          // Storage
          gcs_path: { type: 'keyword' },
          thumb_path: { type: 'keyword' },
          
          // Extracted content (searchable)
          extracted_text: { type: 'text', analyzer: 'content_analyzer' },
          extracted_text_en: { type: 'text', analyzer: 'english' },
          
          // Metadata
          metadata: {
            type: 'object',
            properties: {
              page_count: { type: 'integer' },
              word_count: { type: 'integer' },
              author: { type: 'keyword' },
              created_date: { type: 'date' },
              modified_date: { type: 'date' },
              width: { type: 'integer' },
              height: { type: 'integer' },
              duration_seconds: { type: 'float' },
              transcript: { type: 'text' },
              ocr_text: { type: 'text' },
              detected_objects: { type: 'keyword' },
              // EXIF and location data
              camera_make: { type: 'keyword' },
              camera_model: { type: 'keyword' },
              date_taken: { type: 'date' },
              gps_latitude: { type: 'float' },
              gps_longitude: { type: 'float' },
              gps_altitude: { type: 'float' },
              location: { type: 'geo_point' },
            },
          },
          
          // Vector (nomic-embed-text-v1.5 produces 768 dimensions)
          content_vector: { type: 'dense_vector', dims: 768, similarity: 'cosine' },
          
          // Status
          extraction_status: { type: 'keyword' },
          extraction_timestamp: { type: 'date' },
          extraction_error: { type: 'text' },
          
          // Timestamps
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
        },
      },
    },
  });
  
  console.log(`[FileStorage] Created index ${FILE_CONTENT_INDEX}`);
}

// ============================================================================
// FILE INGESTION
// ============================================================================

export interface IngestFileOptions {
  momentId: string;
  userId: string;
  file: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: number;
  };
  gcsPath: string;
  thumbPath?: string;
  extractContent?: boolean;
}

/**
 * Ingest a file and extract its content
 * Creates both artifact reference and file content document
 */
export async function ingestFile(options: IngestFileOptions): Promise<{
  artifactId: string;
  contentId: string;
  artifactReference: ArtifactReference;
  extractionResult?: ExtractionResult;
}> {
  const { momentId, userId, file, gcsPath, thumbPath, extractContent: shouldExtract = true } = options;
  
  const artifactId = randomUUID();
  const contentId = randomUUID();
  const now = new Date().toISOString();
  
  // Determine file category and type
  const fileCategory = getFileCategory(file.mimeType);
  const fileType = getFileTypeFromExtension(file.filename);
  
  console.log(`[FileStorage] Ingesting file: ${file.filename} (${fileCategory})`);
  
  // Create artifact reference (lightweight, stored in parent)
  const artifactReference: ArtifactReference = {
    artifact_id: artifactId,
    kind: mapCategoryToKind(fileCategory),
    name: file.filename,
    mime: file.mimeType,
    size: file.size,
    gcs_path: gcsPath,
    thumb_path: thumbPath,
    has_content: false,
  };
  
  // Extract content if applicable
  let extractionResult: ExtractionResult | undefined;
  let contentVector: number[] | undefined;
  
  if (shouldExtract && shouldExtractContent(fileCategory)) {
    console.log(`[FileStorage] Extracting content from ${file.filename}`);
    extractionResult = await extractContent(file.buffer, file.filename, file.mimeType, fileCategory);
    
    if (extractionResult.success && extractionResult.text) {
      // Generate vector embedding for content
      try {
        contentVector = await embedText(extractionResult.text);
        artifactReference.has_content = true;
        artifactReference.content_language = 'en'; // TODO: Detect language
      } catch (error) {
        console.error('[FileStorage] Failed to generate embedding:', error);
      }
    }
  }
  
  // Create file content document
  const fileContentDoc: FileContentDocument = {
    content_id: contentId,
    artifact_id: artifactId,
    moment_id: momentId,
    user_id: userId,
    
    file_name: file.filename,
    file_type: fileType || ('other' as FileType),
    file_category: fileCategory,
    mime_type: file.mimeType,
    file_size: file.size,
    
    gcs_path: gcsPath,
    thumb_path: thumbPath,
    
    extracted_text: extractionResult?.text,
    extracted_text_en: extractionResult?.text, // TODO: Translate if needed
    
    metadata: extractionResult?.metadata || {},
    
    content_vector: contentVector,
    
    extraction_status: extractionResult
      ? extractionResult.success
        ? 'success'
        : extractionResult.error
        ? 'failed'
        : 'success'
      : 'not_applicable',
    extraction_timestamp: extractionResult ? now : undefined,
    extraction_error: extractionResult?.error,
    
    created_at: now,
    updated_at: now,
  };
  
  // Store in Elasticsearch
  await client.index({
    index: FILE_CONTENT_INDEX,
    id: contentId,
    body: fileContentDoc,
    refresh: true,
  });
  
  console.log(`[FileStorage] Stored file content: ${contentId}`);
  
  return {
    artifactId,
    contentId,
    artifactReference,
    extractionResult,
  };
}

/**
 * Ingest multiple files for a moment
 */
export async function ingestFiles(
  momentId: string,
  userId: string,
  files: Array<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: number;
    gcsPath: string;
    thumbPath?: string;
  }>
): Promise<ArtifactReference[]> {
  console.log(`[FileStorage] Ingesting ${files.length} files for moment ${momentId}`);
  
  const results = await Promise.all(
    files.map(file =>
      ingestFile({
        momentId,
        userId,
        file,
        gcsPath: file.gcsPath,
        thumbPath: file.thumbPath,
      })
    )
  );
  
  return results.map(r => r.artifactReference);
}

// ============================================================================
// SEARCH
// ============================================================================

export interface SearchFilesOptions {
  userId: string;
  query: string;
  fileCategories?: FileCategory[];
  momentIds?: string[];
  limit?: number;
}

/**
 * Search within file contents
 * Returns matching files with highlighted excerpts
 */
export async function searchFileContents(options: SearchFilesOptions) {
  const { userId, query, fileCategories, momentIds, limit = 10 } = options;
  
  // Build query
  const must: any[] = [
    { term: { user_id: userId } },
  ];
  
  if (fileCategories && fileCategories.length > 0) {
    must.push({ terms: { file_category: fileCategories } });
  }
  
  if (momentIds && momentIds.length > 0) {
    must.push({ terms: { moment_id: momentIds } });
  }
  
  // Search in extracted text
  must.push({
    multi_match: {
      query,
      fields: ['extracted_text^2', 'extracted_text_en', 'file_name^1.5'],
      type: 'best_fields',
      fuzziness: 'AUTO',
    },
  });
  
  const response = await client.search({
    index: FILE_CONTENT_INDEX,
    body: {
      query: {
        bool: { must },
      },
      highlight: {
        fields: {
          extracted_text: { fragment_size: 150, number_of_fragments: 3 },
          extracted_text_en: { fragment_size: 150, number_of_fragments: 3 },
        },
      },
      size: limit,
    },
  });
  
  return response.hits.hits.map((hit: any) => ({
    contentId: hit._id,
    score: hit._score,
    document: hit._source as FileContentDocument,
    highlights: hit.highlight,
  }));
}

/**
 * Search using vector similarity
 */
export async function searchFileContentsByVector(
  userId: string,
  queryVector: number[],
  limit: number = 10
) {
  
  const response = await client.search({
    index: FILE_CONTENT_INDEX,
    body: {
      query: {
        bool: {
          must: [
            { term: { user_id: userId } },
            { exists: { field: 'content_vector' } },
          ],
        },
      },
      knn: {
        field: 'content_vector',
        query_vector: queryVector,
        k: limit,
        num_candidates: limit * 2,
      },
      size: limit,
    },
  });
  
  return response.hits.hits.map((hit: any) => ({
    contentId: hit._id,
    score: hit._score,
    document: hit._source as FileContentDocument,
  }));
}

// ============================================================================
// RETRIEVAL
// ============================================================================

/**
 * Get file content by ID
 */
export async function getFileContent(contentId: string): Promise<FileContentDocument | null> {
  
  try {
    const response = await client.get({
      index: FILE_CONTENT_INDEX,
      id: contentId,
    });
    
    return response._source as FileContentDocument;
  } catch (error) {
    console.error('[FileStorage] Failed to get file content:', error);
    return null;
  }
}

/**
 * Get all file contents for a moment
 */
export async function getFileContentsForMoment(momentId: string): Promise<FileContentDocument[]> {
  
  const response = await client.search({
    index: FILE_CONTENT_INDEX,
    body: {
      query: {
        term: { moment_id: momentId },
      },
      size: 100,
    },
  });
  
  return response.hits.hits.map((hit: any) => hit._source as FileContentDocument);
}

// ============================================================================
// UTILITIES
// ============================================================================

function mapCategoryToKind(category: FileCategory): 'photo' | 'document' | 'audio' | 'video' | 'file' {
  switch (category) {
    case FileCategory.IMAGE:
      return 'photo';
    case FileCategory.DOCUMENT:
      return 'document';
    case FileCategory.AUDIO:
      return 'audio';
    case FileCategory.VIDEO:
      return 'video';
    default:
      return 'file';
  }
}

/**
 * Get storage statistics for a user
 */
export async function getUserStorageStats(userId: string) {
  
  const response = await client.search({
    index: FILE_CONTENT_INDEX,
    body: {
      query: {
        term: { user_id: userId },
      },
      aggs: {
        total_size: { sum: { field: 'file_size' } },
        by_category: {
          terms: { field: 'file_category' },
          aggs: {
            total_size: { sum: { field: 'file_size' } },
          },
        },
        extraction_status: {
          terms: { field: 'extraction_status' },
        },
      },
      size: 0,
    },
  });
  
  return {
    totalFiles: response.hits.total,
    totalSize: (response.aggregations?.total_size as any)?.value || 0,
    byCategory: (response.aggregations?.by_category as any)?.buckets || [],
    extractionStatus: (response.aggregations?.extraction_status as any)?.buckets || [],
  };
}
