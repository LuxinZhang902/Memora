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
 */
export async function extractExifMetadata(buffer: Buffer): Promise<Partial<FileMetadata>> {
  try {
    const exifParser = require('exif-parser');
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
 * In production, use: pdf-parse, pdfjs-dist, or AWS Textract
 */
export async function extractPdfContent(buffer: Buffer): Promise<ExtractionResult> {
  const startTime = Date.now();
  
  try {
    // TODO: Implement with pdf-parse library
    // const pdfParse = require('pdf-parse');
    // const data = await pdfParse(buffer);
    
    // For now, return placeholder
    console.log('[PDF] Extraction not yet implemented');
    
    return {
      success: false,
      error: 'PDF extraction not implemented. Install pdf-parse library.',
      processingTimeMs: Date.now() - startTime,
    };
    
    // Production implementation:
    /*
    const data = await pdfParse(buffer);
    return {
      success: true,
      text: data.text,
      metadata: {
        page_count: data.numpages,
        word_count: data.text.split(/\s+/).length,
        author: data.info?.Author,
        created_date: data.info?.CreationDate,
      },
      processingTimeMs: Date.now() - startTime,
    };
    */
  } catch (error: any) {
    return {
      success: false,
      error: `PDF extraction failed: ${error.message}`,
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
    const exifMetadata = await extractExifMetadata(buffer);
    
    // Option 1: Use OpenAI Vision API (GPT-4V)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const ocrResult = await extractImageWithOpenAI(buffer, mimeType);
      // Merge EXIF metadata with OCR result
      return {
        ...ocrResult,
        metadata: {
          ...ocrResult.metadata,
          ...exifMetadata,
        },
      };
    }
    
    // Option 2: Use Google Vision API
    // const vision = require('@google-cloud/vision');
    // const client = new vision.ImageAnnotatorClient();
    // const [result] = await client.textDetection(buffer);
    
    // If no OCR is available, still return EXIF metadata
    console.log('[IMAGE] OCR not configured, returning EXIF metadata only');
    
    return {
      success: Object.keys(exifMetadata).length > 0,
      metadata: exifMetadata as FileMetadata,
      error: Object.keys(exifMetadata).length === 0 ? 'No EXIF data found' : undefined,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Image processing failed: ${error.message}`,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Extract text from image using OpenAI Vision API
 */
async function extractImageWithOpenAI(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  const startTime = Date.now();
  
  try {
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all visible text from this image. Return only the text, no commentary.',
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || '';
    
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
    const blob = new Blob([buffer], { type: 'audio/mpeg' });
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
    // TODO: Implement with mammoth library
    // const mammoth = require('mammoth');
    // const result = await mammoth.extractRawText({ buffer });
    
    console.log('[DOCX] Extraction not yet implemented');
    
    return {
      success: false,
      error: 'DOCX extraction not implemented. Install mammoth library.',
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
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
