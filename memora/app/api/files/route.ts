/**
 * Files API Endpoint
 * 
 * Retrieves all uploaded files for a user with metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: process.env.ES_HOST || 'http://localhost:9200',
  auth: { 
    username: process.env.ES_USERNAME || 'elastic', 
    password: process.env.ES_PASSWORD || 'changeme' 
  },
});

const FILE_CONTENT_INDEX = 'file-contents';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || 'user-default';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log(`[FilesAPI] Fetching files for user: ${userId}`);
    
    // Query all files for the user
    const response = await client.search({
      index: FILE_CONTENT_INDEX,
      body: {
        query: {
          term: { user_id: userId },
        },
        sort: [
          { created_at: { order: 'desc' } }
        ],
        size: limit,
        from: offset,
      },
    });
    
    const files = response.hits.hits.map((hit: any) => {
      const source = hit._source;
      return {
        contentId: hit._id,
        artifactId: source.artifact_id,
        momentId: source.moment_id,
        fileName: source.file_name,
        fileType: source.file_type,
        fileCategory: source.file_category,
        mimeType: source.mime_type,
        fileSize: source.file_size,
        gcsPath: source.gcs_path,
        thumbPath: source.thumb_path,
        extractedText: source.extracted_text?.substring(0, 200), // Preview only
        metadata: source.metadata,
        extractionStatus: source.extraction_status,
        createdAt: source.created_at,
        updatedAt: source.updated_at,
      };
    });
    
    const total = typeof response.hits.total === 'number' 
      ? response.hits.total 
      : response.hits.total?.value || 0;
    
    return NextResponse.json({
      success: true,
      files,
      total,
      limit,
      offset,
      hasMore: offset + files.length < total,
    });
  } catch (error: any) {
    console.error('[FilesAPI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files', details: error.message },
      { status: 500 }
    );
  }
}
