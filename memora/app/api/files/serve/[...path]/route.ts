/**
 * File Serving API - Serve uploaded files from GCS
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@elastic/elasticsearch';
import { getFileUrl } from '@/lib/gcs';

const client = new Client({
  node: process.env.ES_HOST || 'http://localhost:9200',
  auth: { 
    username: process.env.ES_USERNAME || 'elastic', 
    password: process.env.ES_PASSWORD || 'changeme' 
  },
});

const FILE_CONTENT_INDEX = 'file-contents';

/**
 * GET /api/files/serve/[contentId] - Get signed URL for file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const contentId = params.path[0];

    // Get file metadata from Elasticsearch
    const response = await client.get({
      index: FILE_CONTENT_INDEX,
      id: contentId,
    });

    const fileDoc = response._source as any;
    const gcsPath = fileDoc.gcs_path;

    if (!gcsPath) {
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    // Generate signed URL (valid for 60 minutes)
    const signedUrl = await getFileUrl(gcsPath, true);

    // Redirect to signed URL
    return NextResponse.redirect(signedUrl);
  } catch (error: any) {
    console.error('[FileServe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to serve file', details: error.message },
      { status: 500 }
    );
  }
}
