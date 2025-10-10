/**
 * File Type Definitions and Content Extraction
 * 
 * Architecture:
 * - Parent Document: Moment (top-level event/memory)
 * - Child Documents: File Content (extracted text, metadata)
 * 
 * This enables:
 * 1. Search within file contents
 * 2. Proper relevance scoring
 * 3. Efficient storage and retrieval
 */

// ============================================================================
// FILE TYPE TAXONOMY
// ============================================================================

export enum FileCategory {
  DOCUMENT = 'document',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  ARCHIVE = 'archive',
  CODE = 'code',
  DATA = 'data',
  OTHER = 'other',
}

export enum FileType {
  // Documents
  PDF = 'pdf',
  DOCX = 'docx',
  DOC = 'doc',
  TXT = 'txt',
  RTF = 'rtf',
  ODT = 'odt',
  PAGES = 'pages',
  
  // Spreadsheets
  XLSX = 'xlsx',
  XLS = 'xls',
  CSV = 'csv',
  NUMBERS = 'numbers',
  
  // Presentations
  PPTX = 'pptx',
  PPT = 'ppt',
  KEY = 'key',
  
  // Images
  JPG = 'jpg',
  JPEG = 'jpeg',
  PNG = 'png',
  GIF = 'gif',
  WEBP = 'webp',
  HEIC = 'heic',
  SVG = 'svg',
  
  // Audio
  MP3 = 'mp3',
  WAV = 'wav',
  M4A = 'm4a',
  OGG = 'ogg',
  FLAC = 'flac',
  
  // Video
  MP4 = 'mp4',
  MOV = 'mov',
  AVI = 'avi',
  MKV = 'mkv',
  WEBM = 'webm',
  
  // Archives
  ZIP = 'zip',
  RAR = 'rar',
  TAR = 'tar',
  GZ = 'gz',
  
  // Code
  JS = 'js',
  TS = 'ts',
  PY = 'py',
  JAVA = 'java',
  CPP = 'cpp',
  
  // Other
  JSON = 'json',
  XML = 'xml',
  HTML = 'html',
  MD = 'md',
}

export const FILE_TYPE_MAPPING: Record<string, FileCategory> = {
  // Documents
  'application/pdf': FileCategory.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileCategory.DOCUMENT,
  'application/msword': FileCategory.DOCUMENT,
  'text/plain': FileCategory.DOCUMENT,
  'application/rtf': FileCategory.DOCUMENT,
  
  // Images
  'image/jpeg': FileCategory.IMAGE,
  'image/png': FileCategory.IMAGE,
  'image/gif': FileCategory.IMAGE,
  'image/webp': FileCategory.IMAGE,
  'image/heic': FileCategory.IMAGE,
  'image/svg+xml': FileCategory.IMAGE,
  
  // Audio
  'audio/mpeg': FileCategory.AUDIO,
  'audio/mp3': FileCategory.AUDIO,
  'audio/wav': FileCategory.AUDIO,
  'audio/mp4': FileCategory.AUDIO,
  'audio/ogg': FileCategory.AUDIO,
  
  // Video
  'video/mp4': FileCategory.VIDEO,
  'video/quicktime': FileCategory.VIDEO,
  'video/x-msvideo': FileCategory.VIDEO,
  'video/webm': FileCategory.VIDEO,
  
  // Archives
  'application/zip': FileCategory.ARCHIVE,
  'application/x-rar-compressed': FileCategory.ARCHIVE,
  'application/x-tar': FileCategory.ARCHIVE,
  'application/gzip': FileCategory.ARCHIVE,
};

// ============================================================================
// ELASTICSEARCH DOCUMENT STRUCTURE
// ============================================================================

/**
 * Parent Document: Moment
 * Represents a life event/memory with attached files
 */
export interface MomentDocument {
  moment_id: string;
  user_id: string;
  timestamp: string;
  type: string;
  
  // Content
  title?: string;
  text?: string;
  text_en?: string;
  language?: string;
  
  // Metadata
  entities?: string[];
  tags?: string[];
  geo?: {
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lon?: number;
  };
  
  // Vector embedding for semantic search
  vector?: number[];
  
  // File references (lightweight)
  artifacts?: ArtifactReference[];
  
  // Relationship metadata
  has_files?: boolean;
  file_count?: number;
  total_file_size?: number;
}

/**
 * Artifact Reference (stored in parent)
 * Lightweight reference to child documents
 */
export interface ArtifactReference {
  artifact_id: string;
  kind: 'photo' | 'document' | 'audio' | 'video' | 'file';
  name: string;
  mime?: string;
  size?: number;
  gcs_path: string;
  thumb_path?: string;
  
  // Quick metadata
  has_content?: boolean;
  content_language?: string;
  page_count?: number;
  duration_seconds?: number;
}

/**
 * Child Document: File Content
 * Stores extracted content for searchability
 * Uses parent-child relationship with routing
 */
export interface FileContentDocument {
  // Identity
  content_id: string;
  artifact_id: string;
  moment_id: string; // Parent reference
  user_id: string;
  
  // File metadata
  file_name: string;
  description?: string;
  file_type: FileType;
  file_category: FileCategory;
  mime_type: string;
  file_size: number;
  
  // Storage
  gcs_path: string;
  thumb_path?: string;
  
  // Extracted content
  extracted_text?: string;
  extracted_text_en?: string;
  
  // Content-specific metadata
  metadata: FileMetadata;
  
  // Vector embedding for content
  content_vector?: number[];
  
  // Processing status
  extraction_status: 'pending' | 'success' | 'failed' | 'not_applicable';
  extraction_timestamp?: string;
  extraction_error?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * File-specific metadata
 */
export interface FileMetadata {
  // Document metadata
  page_count?: number;
  word_count?: number;
  author?: string;
  created_date?: string;
  modified_date?: string;
  
  // Image metadata
  width?: number;
  height?: number;
  format?: string;
  color_space?: string;
  has_faces?: boolean;
  detected_objects?: string[];
  ocr_text?: string;
  
  // EXIF and location data
  camera_make?: string;
  camera_model?: string;
  date_taken?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;
  location?: {
    lat: number;
    lon: number;
  };
  
  // Audio/Video metadata
  duration_seconds?: number;
  bitrate?: number;
  codec?: string;
  sample_rate?: number;
  channels?: number;
  transcript?: string;
  
  // Archive metadata
  compressed_size?: number;
  uncompressed_size?: number;
  file_list?: string[];
  
  // Code metadata
  language?: string;
  lines_of_code?: number;
  
  // Generic
  checksum?: string;
  [key: string]: any;
}

// ============================================================================
// ELASTICSEARCH MAPPING
// ============================================================================

export const FILE_CONTENT_MAPPING = {
  mappings: {
    properties: {
      // Identity
      content_id: { type: 'keyword' },
      artifact_id: { type: 'keyword' },
      moment_id: { type: 'keyword' },
      user_id: { type: 'keyword' },
      
      // File info
      file_name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      file_type: { type: 'keyword' },
      file_category: { type: 'keyword' },
      mime_type: { type: 'keyword' },
      file_size: { type: 'long' },
      
      // Storage
      gcs_path: { type: 'keyword' },
      thumb_path: { type: 'keyword' },
      
      // Extracted content (searchable)
      extracted_text: { type: 'text', analyzer: 'standard' },
      extracted_text_en: { type: 'text', analyzer: 'english' },
      
      // Metadata
      metadata: {
        type: 'object',
        properties: {
          page_count: { type: 'integer' },
          word_count: { type: 'integer' },
          author: { type: 'keyword' },
          created_date: { type: 'date' },
          modified_date: { type: 'date' },
          width: { type: 'integer' },
          height: { type: 'integer' },
          duration_seconds: { type: 'float' },
          transcript: { type: 'text' },
          ocr_text: { type: 'text' },
          detected_objects: { type: 'keyword' },
        },
      },
      
      // Vector
      content_vector: { type: 'dense_vector', dims: 1024, similarity: 'cosine' },
      
      // Status
      extraction_status: { type: 'keyword' },
      extraction_timestamp: { type: 'date' },
      extraction_error: { type: 'text' },
      
      // Timestamps
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getFileCategory(mimeType: string): FileCategory {
  return FILE_TYPE_MAPPING[mimeType] || FileCategory.OTHER;
}

export function getFileTypeFromExtension(filename: string): FileType | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  
  const typeMap: Record<string, FileType> = {
    pdf: FileType.PDF,
    docx: FileType.DOCX,
    doc: FileType.DOC,
    txt: FileType.TXT,
    jpg: FileType.JPG,
    jpeg: FileType.JPEG,
    png: FileType.PNG,
    gif: FileType.GIF,
    mp3: FileType.MP3,
    wav: FileType.WAV,
    mp4: FileType.MP4,
    mov: FileType.MOV,
    // Add more as needed
  };
  
  return typeMap[ext] || null;
}

export function shouldExtractContent(category: FileCategory): boolean {
  return [
    FileCategory.DOCUMENT,
    FileCategory.IMAGE,
    FileCategory.AUDIO,
  ].includes(category);
}

export function getContentExtractionPriority(category: FileCategory): number {
  const priorities: Record<FileCategory, number> = {
    [FileCategory.DOCUMENT]: 1, // Highest priority
    [FileCategory.IMAGE]: 2,
    [FileCategory.AUDIO]: 3,
    [FileCategory.VIDEO]: 4,
    [FileCategory.CODE]: 5,
    [FileCategory.DATA]: 6,
    [FileCategory.ARCHIVE]: 7,
    [FileCategory.OTHER]: 8,
  };
  return priorities[category] || 10;
}
