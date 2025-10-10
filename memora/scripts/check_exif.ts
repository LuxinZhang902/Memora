/**
 * Check EXIF data from an image file
 */

import { Storage } from '@google-cloud/storage';

const storage = new Storage();

async function checkExif(gcsPath: string) {
  try {
    console.log(`\n📷 Checking EXIF data for: ${gcsPath}\n`);
    
    const bucket = storage.bucket(process.env.GCS_BUCKET!);
    const file = bucket.file(gcsPath);
    
    // Download file
    const [buffer] = await file.download();
    console.log(`✅ Downloaded ${buffer.length} bytes`);
    
    // Try to extract EXIF
    try {
      const exifParser = require('exif-parser');
      const parser = exifParser.create(buffer);
      const result = parser.parse();
      
      console.log('\n📊 EXIF Data:');
      console.log('─────────────────────────────────────');
      
      if (result.tags) {
        console.log('\n📝 Tags:');
        console.log(JSON.stringify(result.tags, null, 2));
      }
      
      if (result.imageSize) {
        console.log('\n📐 Image Size:');
        console.log(`   Width: ${result.imageSize.width}px`);
        console.log(`   Height: ${result.imageSize.height}px`);
      }
      
      if (result.tags?.GPSLatitude && result.tags?.GPSLongitude) {
        console.log('\n📍 GPS Location:');
        console.log(`   Latitude: ${result.tags.GPSLatitude}`);
        console.log(`   Longitude: ${result.tags.GPSLongitude}`);
        console.log(`   Altitude: ${result.tags.GPSAltitude || 'N/A'}`);
      } else {
        console.log('\n❌ No GPS data found in EXIF');
      }
      
      if (result.tags?.DateTimeOriginal) {
        console.log('\n📅 Date Taken:');
        console.log(`   ${new Date(result.tags.DateTimeOriginal * 1000).toISOString()}`);
      }
      
    } catch (exifError: any) {
      console.error('❌ EXIF parsing failed:', exifError.message);
      console.log('\nThis could mean:');
      console.log('  1. The image has no EXIF data');
      console.log('  2. The image is not a JPEG (EXIF only works with JPEG)');
      console.log('  3. The EXIF data was stripped');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Get GCS path from command line
const gcsPath = process.argv[2];

if (!gcsPath) {
  console.log('Usage: npx tsx scripts/check_exif.ts <gcs-path>');
  console.log('Example: npx tsx scripts/check_exif.ts users/user-fg44cbdi8/moments/moment-xxx/files/SF.jpg');
  process.exit(1);
}

checkExif(gcsPath);
