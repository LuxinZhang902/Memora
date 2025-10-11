/**
 * Server-side PDF text extraction API
 * Uses pdfjs-dist for reliable extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist';

// Force dynamic rendering - don't pre-render this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log(`[PDF-API] Extracting text from ${file.name} (${uint8Array.length} bytes)`);
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    
    const numPages = pdfDocument.numPages;
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    const text = fullText.trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    
    console.log(`[PDF-API] Extracted ${numPages} pages, ${wordCount} words`);
    console.log(`[PDF-API] Text preview: ${text.substring(0, 100)}...`);
    
    return NextResponse.json({
      success: true,
      text,
      metadata: {
        page_count: numPages,
        word_count: wordCount,
        extraction_method: 'pdfjs_dist'
      }
    });
    
  } catch (error: any) {
    console.error('[PDF-API] Extraction failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      text: ''
    }, { status: 500 });
  }
}
