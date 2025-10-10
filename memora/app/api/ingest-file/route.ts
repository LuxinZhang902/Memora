/**
 * File Ingestion API Endpoint
 * 
 * Handles file uploads with content extraction
 * Creates parent-child relationship in Elasticsearch
 */

import { NextRequest, NextResponse } from 'next/server';
import { ingestFile, createFileContentIndex } from '@/lib/fileStorage';
import { upsertMoment, indexNameFromPrefix } from '@/lib/es';
import { Buffer } from 'buffer';

export async function POST(request: NextRequest) {
  try {
    // Ensure file content index exists
    await createFileContentIndex();
    
    // Parse multipart form data
    const formData = await request.formData();
    
    const momentId = formData.get('moment_id') as string;
    const userId = formData.get('user_id') as string;
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const text = formData.get('text') as string;
    
    if (!momentId || !userId || !file) {
      return NextResponse.json(
        { error: 'Missing required fields: moment_id, user_id, file' },
        { status: 400 }
      );
    }
    
    console.log(`[IngestFile] Processing file: ${file.name} for moment ${momentId}`);
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate GCS path (in production, upload to GCS first)
    const timestamp = new Date().toISOString().split('T')[0];
    const gcsPath = `gs://${process.env.GCS_BUCKET}/users/${userId}/moments/${momentId}/files/${file.name}`;
    
    // Ingest file with content extraction
    const result = await ingestFile({
      momentId,
      userId,
      file: {
        buffer,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      },
      gcsPath,
      extractContent: true,
    });
    
    // Update parent moment document with artifact reference
    const momentIndex = indexNameFromPrefix();
    const momentDoc: any = {
      moment_id: momentId,
      user_id: userId,
      timestamp: new Date().toISOString(),
      type: 'file_upload',
      title: title || `Uploaded ${file.name}`,
      text: text || result.extractionResult?.text?.substring(0, 500),
      artifacts: [result.artifactReference],
      has_files: true,
      file_count: 1,
      total_file_size: file.size,
    };
    
    // Propagate GPS location from file metadata to parent moment
    const metadata = result.extractionResult?.metadata;
    if (metadata?.gps_latitude && metadata?.gps_longitude) {
      momentDoc.geo = {
        lat: metadata.gps_latitude,
        lon: metadata.gps_longitude,
      };
      console.log(`[IngestFile] Added GPS location to moment: ${metadata.gps_latitude}, ${metadata.gps_longitude}`);
    }
    
    await upsertMoment(momentIndex, momentId, momentDoc);
    
    console.log(`[IngestFile] Successfully ingested file: ${result.contentId}`);
    
    return NextResponse.json({
      success: true,
      momentId,
      artifactId: result.artifactId,
      contentId: result.contentId,
      extraction: {
        status: result.extractionResult?.success ? 'success' : 'failed',
        textLength: result.extractionResult?.text?.length || 0,
        processingTimeMs: result.extractionResult?.processingTimeMs,
        error: result.extractionResult?.error,
        metadata: result.extractionResult?.metadata,
      },
      artifact: result.artifactReference,
      gpsLocation: metadata?.gps_latitude && metadata?.gps_longitude ? {
        lat: metadata.gps_latitude,
        lon: metadata.gps_longitude,
      } : null,
    });
  } catch (error: any) {
    console.error('[IngestFile] Error:', error);
    console.error('[IngestFile] Stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'File ingestion failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
