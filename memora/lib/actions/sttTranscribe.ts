import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log(`[STT] Processing file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    
    // Try DedalusLabs first, fallback to ElevenLabs
    const dedalusKey = process.env.DEDALUS_API_KEY || '';
    const elevenlabsKey = process.env.ELEVENLABS_API_KEY || '';
    
    if (!dedalusKey && !elevenlabsKey) {
      return NextResponse.json({ 
        error: 'No STT API key configured',
        details: 'Please add DEDALUS_API_KEY or ELEVENLABS_API_KEY to .env.local'
      }, { status: 500 });
    }
    
    // Check file size
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large',
        details: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 25MB limit`
      }, { status: 413 });
    }
    
    // Try DedalusLabs first
    if (dedalusKey) {
      try {
        console.log('[STT] Using DedalusLabs...');
        const { transcribeAudio } = await import('../dedalus');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const text = await transcribeAudio(buffer, file.name);
        
        console.log('[STT] DedalusLabs success! Text:', text?.substring(0, 100));
        return NextResponse.json({ 
          text: text || '', 
          language: 'en' 
        });
      } catch (err) {
        console.warn('[STT] DedalusLabs error, trying ElevenLabs...', err);
      }
    }
    
    // Fallback to ElevenLabs
    if (elevenlabsKey) {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('model_id', 'scribe_v1_experimental');
      
      console.log('[STT] Using ElevenLabs...');
      const out = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: { 'xi-api-key': elevenlabsKey },
        body: formData,
      });
      
      if (!out.ok) {
        const errorText = await out.text();
        console.error('[STT] ElevenLabs error:', out.status, errorText);
        
        let errorMessage = 'Transcription failed';
        if (out.status === 401) errorMessage = 'Invalid API key';
        else if (out.status === 422) errorMessage = 'Invalid audio file format or corrupted file';
        else if (out.status === 429) errorMessage = 'Rate limit exceeded';
        
        return NextResponse.json({ 
          error: errorMessage,
          details: errorText,
          status: out.status
        }, { status: out.status });
      }
      
      const json = await out.json();
      console.log('[STT] ElevenLabs success! Text:', json?.text?.substring(0, 100));
      
      return NextResponse.json({ 
        text: json?.text || '', 
        language: json?.language 
      });
    }
    
    return NextResponse.json({ 
      error: 'No working STT service available'
    }, { status: 500 });
    
  } catch (err: any) {
    console.error('[STT] Unexpected error:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err.message || String(err)
    }, { status: 500 });
  }
}
