/**
 * File Management API - Delete and Update
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@elastic/elasticsearch';
import { deleteFile as deleteFromGCS } from '@/lib/gcs';

const client = new Client({
  node: process.env.ES_HOST || 'http://localhost:9200',
  auth: { 
    username: process.env.ES_USERNAME || 'elastic', 
    password: process.env.ES_PASSWORD || 'changeme' 
  },
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

    // Get file metadata first to get GCS path
    const response = await client.get({
      index: FILE_CONTENT_INDEX,
      id,
    });

    const fileDoc = response._source as any;
    const gcsPath = fileDoc.gcs_path;

    // Delete from GCS if path exists
    if (gcsPath) {
      try {
        await deleteFromGCS(gcsPath);
      } catch (gcsError: any) {
        console.warn(`[FilesAPI] GCS delete failed: ${gcsError.message}`);
        // Continue with ES deletion even if GCS fails
      }
    }

    // Delete from Elasticsearch
    await client.delete({
      index: FILE_CONTENT_INDEX,
      id,
      refresh: true,
    });

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
