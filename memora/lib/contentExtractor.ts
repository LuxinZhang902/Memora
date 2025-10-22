/**
 * Content Extraction Service
 * 
 * Extracts searchable text from various file types:
 * - PDFs: Text extraction
 * - Images: OCR (Optical Character Recognition) + EXIF metadata
 * - Audio: Speech-to-Text transcription
 * - Documents: Text extraction from DOCX, etc.
 */

import { FileCategory, FileType, FileMetadata } from './fileTypes';

// ============================================================================
// EXIF EXTRACTION
// ============================================================================

/**
 * Extract EXIF metadata from images including GPS location
 * Note: EXIF only works with JPEG files, not PNG/GIF/etc
 */
export async function extractExifMetadata(buffer: Buffer, mimeType?: string): Promise<Partial<FileMetadata>> {
  try {
    // EXIF works with JPEG and HEIC files
    const supportsExif = mimeType && (
      mimeType.includes('jpeg') || 
      mimeType.includes('jpg') || 
      mimeType.includes('heic') || 
      mimeType.includes('heif')
    );
    
    if (!supportsExif) {
      console.log(`[EXIF] Skipping EXIF extraction for ${mimeType} (only works with JPEG/HEIC)`);
      return {};
    }

    // Try to load exif-parser, gracefully handle if not installed
    let exifParser;
    try {
      exifParser = require('exif-parser');
    } catch (e) {
      console.log('[EXIF] exif-parser not installed, skipping EXIF extraction');
      return {};
    }
    
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    
    const metadata: Partial<FileMetadata> = {};
    
    // Image dimensions
    if (result.imageSize) {
      metadata.width = result.imageSize.width;
      metadata.height = result.imageSize.height;
    }
    
    // Camera info
    if (result.tags) {
      if (result.tags.Make) {
        metadata.camera_make = result.tags.Make;
      }
      if (result.tags.Model) {
        metadata.camera_model = result.tags.Model;
      }
      if (result.tags.DateTimeOriginal) {
        metadata.date_taken = new Date(result.tags.DateTimeOriginal * 1000).toISOString();
      }
    }
    
    // GPS location
    if (result.tags && result.tags.GPSLatitude && result.tags.GPSLongitude) {
      metadata.gps_latitude = result.tags.GPSLatitude;
      metadata.gps_longitude = result.tags.GPSLongitude;
      
      // Create geo_point for Elasticsearch
      metadata.location = {
        lat: result.tags.GPSLatitude,
        lon: result.tags.GPSLongitude,
      };
      
      if (result.tags.GPSAltitude) {
        metadata.gps_altitude = result.tags.GPSAltitude;
      }
      
      console.log(`[EXIF] Extracted location: ${metadata.gps_latitude}, ${metadata.gps_longitude}`);
    }
    
    return metadata;
  } catch (error: any) {
    console.error('[EXIF] Failed to extract metadata:', error.message);
    return {};
  }
}

// ============================================================================
// CONTENT EXTRACTION INTERFACE
// ============================================================================

export interface ExtractionResult {
  success: boolean;
  text?: string;
  metadata?: FileMetadata;
  error?: string;
  processingTimeMs?: number;
}

// ============================================================================
// PDF EXTRACTION
// ============================================================================

/**
 * Extract text from PDF files
 * Uses pdf-parse library for reliable extraction
 */
export async function extractPdfContent(buffer: Buffer): Promise<ExtractionResult> {
  const startTime = Date.now();
  
  try {
    console.log('[PDF] Extracting text using pdf-parse...');
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    
    const text = data.text?.trim() || '';
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    console.log(`[PDF] Extracted ${data.numpages} pages, ${wordCount} words`);
    
    return {
      success: true,
      text,
      metadata: {
        page_count: data.numpages,
        word_count: wordCount,
        extraction_method: 'pdf_parse'
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('[PDF] Extraction failed:', error.message);
    
    // Return empty result but mark as success so file is still stored
    return {
      success: true,
      text: '',
      metadata: {
        page_count: 0,
        word_count: 0,
        extraction_method: 'error',
        error: error.message
      },
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// IMAGE OCR
// ============================================================================

/**
 * Extract text from images using OCR
 * In production, use: Tesseract.js, Google Vision API, or AWS Textract
 */
export async function extractImageContent(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  const startTime = Date.now();
  
  try {
    // Extract EXIF metadata first (including GPS location)
    const exifMetadata = await extractExifMetadata(buffer, mimeType);
    
    // Option 1: Use DedalusLabs Vision API
    const dedalusKey = process.env.DEDALUS_API_KEY;
    if (dedalusKey) {
      try {
        const ocrResult = await extractImageWithDedalus(buffer, mimeType);
        // Check if OCR was successful
        if (ocrResult.success) {
          // Merge EXIF metadata with OCR result
          return {
            ...ocrResult,
            metadata: {
              ...ocrResult.metadata,
              ...exifMetadata,
            },
          };
        } else {
          console.log('[IMAGE] DedalusLabs Vision returned failure, continuing without OCR');
          // Continue to fallback below
        }
      } catch (error: any) {
        console.log('[IMAGE] DedalusLabs Vision failed, continuing without OCR:', error.message);
        // Continue to fallback below
      }
    }
    
    // Option 2: Use Google Vision API
    // const vision = require('@google-cloud/vision');
    // const client = new vision.ImageAnnotatorClient();
    // const [result] = await client.textDetection(buffer);
    
    // If no OCR is available, still return success with EXIF metadata
    console.log('[IMAGE] OCR not configured, returning EXIF metadata only');
    
    return {
      success: true, // Mark as success even without OCR
      metadata: exifMetadata as FileMetadata,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('[IMAGE] Image processing failed:', error.message);
    // Still return success=true since file upload should succeed
    // even if EXIF/OCR extraction fails
    return {
      success: true,
      metadata: {},
      error: `Image processing failed: ${error.message}`,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Extract text from image using DedalusLabs Vision API
 */
async function extractImageWithDedalus(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  const startTime = Date.now();
  
  try {
    const { extractImageText } = await import('./dedalus');
    const extractedText = await extractImageText(buffer, mimeType);
    
    return {
      success: true,
      text: extractedText,
      metadata: {
        ocr_text: extractedText,
        word_count: extractedText.split(/\s+/).length,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `OpenAI Vision extraction failed: ${error.message}`,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// AUDIO TRANSCRIPTION
// ============================================================================

/**
 * Transcribe audio to text
 * Uses OpenAI Whisper API
 */
export async function extractAudioContent(buffer: Buffer, filename: string): Promise<ExtractionResult> {
  const startTime = Date.now();
  
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return {
        success: false,
        error: 'OPENAI_API_KEY not configured',
        processingTimeMs: Date.now() - startTime,
      };
    }
    
    // Create form data
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/mpeg' });
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-1');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status}`);
    }
    
    const data = await response.json();
    const transcript = data.text || '';
    
    return {
      success: true,
      text: transcript,
      metadata: {
        transcript,
        word_count: transcript.split(/\s+/).length,
        duration_seconds: data.duration,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Audio transcription failed: ${error.message}`,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// DOCUMENT EXTRACTION
// ============================================================================

/**
 * Extract text from DOCX files
 * In production, use: mammoth, docx, or Apache Tika
 */
export async function extractDocxContent(buffer: Buffer): Promise<ExtractionResult> {
  const startTime = Date.now();
  
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    
    const text = result.value?.trim() || '';
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    console.log(`[DOCX] Extracted ${wordCount} words from DOCX`);
    
    return {
      success: true,
      text,
      metadata: {
        word_count: wordCount,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('[DOCX] Extraction failed:', error);
    return {
      success: false,
      error: `DOCX extraction failed: ${error.message}`,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Extract text from plain text files
 */
export async function extractTextContent(buffer: Buffer): Promise<ExtractionResult> {
  const startTime = Date.now();
  
  try {
    const text = buffer.toString('utf-8');
    
    return {
      success: true,
      text,
      metadata: {
        word_count: text.split(/\s+/).length,
        lines_of_code: text.split('\n').length,
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Text extraction failed: ${error.message}`,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// MAIN EXTRACTION ROUTER
// ============================================================================

/**
 * Main content extraction function
 * Routes to appropriate extractor based on file type
 */
export async function extractContent(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  fileCategory: FileCategory
): Promise<ExtractionResult> {
  console.log(`[ContentExtractor] Processing ${filename} (${mimeType}, ${fileCategory})`);
  
  try {
    switch (fileCategory) {
      case FileCategory.DOCUMENT:
        if (mimeType === 'application/pdf') {
          return await extractPdfContent(buffer);
        } else if (mimeType.includes('wordprocessingml')) {
          return await extractDocxContent(buffer);
        } else if (mimeType === 'text/plain') {
          return await extractTextContent(buffer);
        }
        break;
        
      case FileCategory.IMAGE:
        return await extractImageContent(buffer, mimeType);
        
      case FileCategory.AUDIO:
        return await extractAudioContent(buffer, filename);
        
      case FileCategory.CODE:
        return await extractTextContent(buffer);
        
      default:
        return {
          success: false,
          error: `No extractor available for category: ${fileCategory}`,
        };
    }
    
    return {
      success: false,
      error: `Unsupported file type: ${mimeType}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Content extraction failed: ${error.message}`,
    };
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process multiple files in batch
 * Useful for ingesting multiple files at once
 */
export async function extractContentBatch(
  files: Array<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
    fileCategory: FileCategory;
  }>
): Promise<ExtractionResult[]> {
  console.log(`[ContentExtractor] Batch processing ${files.length} files`);
  
  // Process in parallel with concurrency limit
  const CONCURRENCY = 3;
  const results: ExtractionResult[] = [];
  
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(file =>
        extractContent(file.buffer, file.filename, file.mimeType, file.fileCategory)
      )
    );
    results.push(...batchResults);
  }
  
  return results;
}
