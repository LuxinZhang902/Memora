/**
 * File Management API - Delete and Update
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@elastic/elasticsearch';
import { deleteFile as deleteFromGCS } from '@/lib/gcs';

const esHost = process.env.ES_HOST || 'http://localhost:9200';
const isBonsai = esHost.includes('bonsai');

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

const FILE_CONTENT_INDEX = 'file-contents';

/**
 * DELETE /api/files/[id] - Delete a file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`[FilesAPI] Deleting file: ${id}`);

    // Try to get file metadata first to get GCS path
    let gcsPath: string | null = null;
    try {
      const response = await client.get({
        index: FILE_CONTENT_INDEX,
        id,
      });

      const fileDoc = response._source as any;
      gcsPath = fileDoc.gcs_path;
    } catch (getError: any) {
      // File might not exist in ES, but could exist in GCS
      console.warn(`[FilesAPI] File not found in ES: ${id}`);
    }

    // Delete from GCS if path exists
    if (gcsPath) {
      try {
        await deleteFromGCS(gcsPath);
        console.log(`[GCS] Deleted file ${gcsPath}`);
      } catch (gcsError: any) {
        console.warn(`[FilesAPI] GCS delete failed: ${gcsError.message}`);
        // Continue with ES deletion even if GCS fails
      }
    }

    // Delete from Elasticsearch (ignore if not found)
    try {
      await client.delete({
        index: FILE_CONTENT_INDEX,
        id,
        refresh: true,
      });
      console.log(`[ES] Deleted file ${id} from index`);
    } catch (deleteError: any) {
      if (deleteError.meta?.statusCode === 404) {
        console.log(`[ES] File ${id} already deleted from index`);
      } else {
        throw deleteError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[FilesAPI] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/files/[id] - Update file metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { fileName, description } = body;

    if (!fileName && !description) {
      return NextResponse.json(
        { error: 'At least one field (fileName or description) is required' },
        { status: 400 }
      );
    }

    console.log(`[FilesAPI] Updating file ${id}`);

    const updateDoc: any = {
      updated_at: new Date().toISOString(),
    };

    if (fileName) {
      updateDoc.file_name = fileName;
    }

    if (description !== undefined) {
      updateDoc.description = description;
    }

    await client.update({
      index: FILE_CONTENT_INDEX,
      id,
      body: {
        doc: updateDoc,
      },
      refresh: true,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[FilesAPI] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update file', details: error.message },
      { status: 500 }
    );
  }
}
