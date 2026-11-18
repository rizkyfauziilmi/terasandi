import { detectContentType } from '@nestjs/storage';
import type { FileCategory } from '@terasandi/contracts';
import { lookup as lookupMimeType } from 'mime-types';

export interface DetectedFileType {
  mimeType: string;
  category: FileCategory;
  /** The extension for the detected type, used for the final storage key. */
  extension: string;
}

const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const RAR = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]);
const SEVEN_ZIP = Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
const GZIP = Buffer.from([0x1f, 0x8b]);
const BZIP2 = Buffer.from('BZh');
const XZ = Buffer.from([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]);
const ZSTD = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const LZ4 = Buffer.from([0x04, 0x22, 0x4d, 0x18]);
const CAB = Buffer.from('MSCF');
const TAR = Buffer.from('ustar');
const TAR_OFFSET = 257;
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const EBML = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
const WEBM = Buffer.from('webm');
const MATROSKA = Buffer.from('matroska');
const CONTENT_TYPES = Buffer.from('[Content_Types].xml');
const ISO9660 = Buffer.from('CD001');
const ISO9660_OFFSET = 0x8001;
const BMP = Buffer.from('BM');
const TIFF_LE = Buffer.from([0x49, 0x49, 0x2a, 0x00]);
const TIFF_BE = Buffer.from([0x4d, 0x4d, 0x00, 0x2a]);
const PSD = Buffer.from('8BPS');
const GLB = Buffer.from('glTF');
const SQLITE = Buffer.from('SQLite format 3\0');
const TTF = Buffer.from([0x00, 0x01, 0x00, 0x00]);
const OTF = Buffer.from('OTTO');
const WOFF = Buffer.from('wOFF');
const WOFF2 = Buffer.from('wOF2');
const MPEG_TS_SYNC = 0x47;
const MPEG_TS_PACKET_SIZE = 188;

const BUILTIN_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/heic',
  'application/pdf',
]);

const MP4_BRANDS = new Set([
  'isom',
  'iso2',
  'avc1',
  'mp41',
  'mp42',
  'M4V ',
  'M4VP',
]);

const HEIC_BRANDS = new Set(['heic', 'heix', 'heim', 'heis', 'heif', 'hevc']);

/** Scripts are executable text and belong outside the document category. */
const EXECUTABLE_SCRIPT_EXTENSIONS = new Set([
  'bat',
  'cmd',
  'command',
  'ps1',
  'vbs',
  'sh',
  'bash',
  'zsh',
  'fish',
  'ksh',
]);

/** Extensions whose bytes are validated as UTF-8 before they are labeled text. */
const TEXT_EXTENSIONS = new Set([
  'txt',
  'csv',
  'md',
  'markdown',
  'json',
  'jsonl',
  'xml',
  'yaml',
  'yml',
  'toml',
  'ini',
  'log',
  'html',
  'htm',
  'css',
  'js',
  'mjs',
  'cjs',
  'jsx',
  'ts',
  'tsx',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'c',
  'h',
  'cpp',
  'cc',
  'cxx',
  'hpp',
  'cs',
  'php',
  'sh',
  'bash',
  'zsh',
  'fish',
  'ksh',
  'bat',
  'cmd',
  'command',
  'ps1',
  'vbs',
  'sql',
  'svg',
  'pem',
  'crt',
  'key',
  'pub',
  'asc',
  'gpg',
  'stl',
  'obj',
  'env',
  'gitignore',
]);

/** Explicit MIME types for extensions that mime-types cannot classify well. */
const TEXT_MIME_OVERRIDES: Record<string, string> = {
  bat: 'application/x-msdos-batch',
  cmd: 'application/x-msdos-batch',
  command: 'application/x-sh',
  sh: 'application/x-sh',
  bash: 'application/x-sh',
  zsh: 'application/x-sh',
  fish: 'application/x-fish',
  ksh: 'application/x-ksh',
  ps1: 'application/x-powershell',
  vbs: 'text/vbscript',
  jsonl: 'application/json',
  toml: 'text/plain',
  cjs: 'text/javascript',
  ts: 'text/plain',
  tsx: 'text/plain',
  py: 'text/x-python',
  rb: 'text/x-ruby',
  go: 'text/x-go',
  rs: 'text/x-rust',
  java: 'text/x-java',
  c: 'text/x-c',
  h: 'text/x-c',
  cpp: 'text/x-c++',
  cc: 'text/x-c++',
  cxx: 'text/x-c++',
  hpp: 'text/x-c++',
  cs: 'text/x-csharp',
  php: 'text/x-php',
};

/** Extensions whose extension-based type should always be `other`. */
const OTHER_EXTENSIONS = new Set([
  ...EXECUTABLE_SCRIPT_EXTENSIONS,
  'exe',
  'dll',
  'so',
  'dylib',
  'apk',
  'msi',
  'deb',
  'rpm',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'bz2',
  'xz',
  'zst',
  'lz4',
  'cab',
  'iso',
  'img',
  'dmg',
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',
  'pem',
  'crt',
  'p12',
  'pfx',
  'key',
  'pub',
  'asc',
  'gpg',
  'dwg',
  'dxf',
  'stl',
  'obj',
  'glb',
  'sqlite',
  'sqlite3',
  'db',
  'parquet',
  'torrent',
]);

const DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/json',
  'application/xml',
  'application/sql',
  'application/epub+zip',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
]);

/** Known byte-detected types keep a canonical extension for the storage key. */
const KNOWN_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/vnd.adobe.photoshop': '.psd',
  'model/gltf-binary': '.glb',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/vnd.oasis.opendocument.spreadsheet': '.ods',
  'application/vnd.oasis.opendocument.presentation': '.odp',
  'application/epub+zip': '.epub',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/flac': '.flac',
  'audio/mp4': '.m4a',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/x-matroska': '.mkv',
  'video/x-msvideo': '.avi',
  'video/mp2t': '.ts',
  'application/zip': '.zip',
  'application/vnd.rar': '.rar',
  'application/x-7z-compressed': '.7z',
  'application/gzip': '.gz',
  'application/x-bzip2': '.bz2',
  'application/x-xz': '.xz',
  'application/zstd': '.zst',
  'application/x-lz4': '.lz4',
  'application/vnd.ms-cab-compressed': '.cab',
  'application/x-tar': '.tar',
  'application/x-iso9660-image': '.iso',
  'application/x-ole-storage': '.ole',
  'application/vnd.sqlite3': '.sqlite',
  'font/ttf': '.ttf',
  'font/otf': '.otf',
  'font/woff': '.woff',
  'font/woff2': '.woff2',
  'application/octet-stream': '.bin',
};

/**
 * Classifies an upload from its first bytes. A recognized signature always
 * wins over the file name. Unrecognized bytes fall back to a sanitized
 * extension, then to `application/octet-stream`; no format is rejected.
 */
export function detectFileType(
  bytes: Buffer,
  filename: string,
): DetectedFileType {
  const ext = safeExtension(filename);
  const builtin = detectContentType(bytes);

  if (builtin && BUILTIN_TYPES.has(builtin)) {
    return typeFor(builtin, ext);
  }

  const brand = isoBrand(bytes);

  if (brand) {
    if (brand === 'avif' || brand === 'avis') {
      return typeFor('image/avif', ext);
    }
    if (HEIC_BRANDS.has(brand)) {
      return typeFor('image/heic', ext);
    }
    if (brand === 'M4A ' || (ext === 'm4a' && !isVideoBrand(brand))) {
      return typeFor('audio/mp4', ext);
    }
    if (brand === 'qt  ' || (ext === 'mov' && MP4_BRANDS.has(brand))) {
      return typeFor('video/quicktime', ext);
    }
    if (MP4_BRANDS.has(brand)) {
      return typeFor('video/mp4', ext);
    }
  }

  if (isRiff(bytes, 'WAVE')) {
    return typeFor('audio/wav', ext);
  }
  if (isRiff(bytes, 'AVI ')) {
    return typeFor('video/x-msvideo', ext);
  }
  if (startsWith(bytes, Buffer.from('OggS'))) {
    return typeFor('audio/ogg', ext);
  }
  if (startsWith(bytes, Buffer.from('fLaC'))) {
    return typeFor('audio/flac', ext);
  }
  if (
    startsWith(bytes, Buffer.from('ID3')) ||
    (ext === 'mp3' && isMp3Frame(bytes))
  ) {
    return typeFor('audio/mpeg', ext);
  }
  if (startsWith(bytes, EBML)) {
    if (bytes.includes(WEBM)) {
      return typeFor('video/webm', ext);
    }
    if (bytes.includes(MATROSKA)) {
      return typeFor('video/x-matroska', ext);
    }
  }
  if (isMpegTs(bytes)) {
    return typeFor('video/mp2t', ext);
  }

  if (startsWith(bytes, ZIP)) {
    if (bytes.includes(CONTENT_TYPES)) {
      const office = officeTypes[ext];

      if (office) {
        return office;
      }
    }

    const openDocument = openDocumentTypes[ext];

    if (openDocument) {
      return openDocument;
    }
    if (ext === 'epub') {
      return typeFor('application/epub+zip', ext);
    }

    return typeFor('application/zip', ext);
  }
  if (startsWith(bytes, RAR)) {
    return typeFor('application/vnd.rar', ext);
  }
  if (startsWith(bytes, SEVEN_ZIP)) {
    return typeFor('application/x-7z-compressed', ext);
  }
  if (startsWith(bytes, GZIP)) {
    return typeFor('application/gzip', ext);
  }
  if (startsWith(bytes, BZIP2)) {
    return typeFor('application/x-bzip2', ext);
  }
  if (startsWith(bytes, XZ)) {
    return typeFor('application/x-xz', ext);
  }
  if (startsWith(bytes, ZSTD)) {
    return typeFor('application/zstd', ext);
  }
  if (startsWith(bytes, LZ4)) {
    return typeFor('application/x-lz4', ext);
  }
  if (startsWith(bytes, CAB)) {
    return typeFor('application/vnd.ms-cab-compressed', ext);
  }
  if (startsWith(bytes, TAR, TAR_OFFSET)) {
    return typeFor('application/x-tar', ext);
  }
  if (startsWith(bytes, OLE)) {
    const legacyOffice = legacyOfficeTypes[ext];

    return legacyOffice ?? typeFor('application/x-ole-storage', ext);
  }
  if (startsWith(bytes, ISO9660, ISO9660_OFFSET)) {
    return typeFor('application/x-iso9660-image', ext);
  }
  if (startsWith(bytes, SQLITE)) {
    return typeFor('application/vnd.sqlite3', ext);
  }
  if (startsWith(bytes, BMP)) {
    return typeFor('image/bmp', ext);
  }
  if (startsWith(bytes, TIFF_LE) || startsWith(bytes, TIFF_BE)) {
    return typeFor('image/tiff', ext);
  }
  if (startsWith(bytes, PSD)) {
    return typeFor('image/vnd.adobe.photoshop', ext);
  }
  if (startsWith(bytes, GLB)) {
    return typeFor('model/gltf-binary', ext);
  }
  if (isFont(bytes)) {
    return fontType(bytes, ext);
  }

  if (looksLikeText(bytes)) {
    return textType(ext);
  }

  return fallbackType(ext);
}

function typeFor(mimeType: string, ext: string): DetectedFileType {
  const base = baseMime(mimeType);
  const knownExtension = KNOWN_EXTENSIONS[base];

  return {
    mimeType,
    category: categoryFor(base),
    extension: knownExtension ?? `.${ext}`,
  };
}

function textType(ext: string): DetectedFileType {
  const textExt = TEXT_EXTENSIONS.has(ext) ? ext : 'txt';
  const override = TEXT_MIME_OVERRIDES[textExt];
  const lookedUp = override ?? lookupMimeType(textExt);
  const base =
    typeof lookedUp === 'string' && lookedUp ? lookedUp : 'text/plain';
  const isText = base.startsWith('text/') && !base.startsWith('text/vbscript');
  const mimeType = isText ? `${base}; charset=utf-8` : base;
  const result = typeFor(mimeType, textExt);

  if (OTHER_EXTENSIONS.has(textExt)) {
    return { ...result, category: 'other', extension: `.${textExt}` };
  }

  return result;
}

function fallbackType(ext: string): DetectedFileType {
  const lookedUp = lookupMimeType(ext);
  const hasLookup = typeof lookedUp === 'string' && lookedUp !== '';
  const mimeType = hasLookup ? (lookedUp as string) : 'application/octet-stream';
  const result = typeFor(mimeType, ext);

  if (OTHER_EXTENSIONS.has(ext)) {
    return { ...result, category: 'other', extension: `.${ext}` };
  }

  return result;
}

function categoryFor(mimeType: string): FileCategory {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType.startsWith('text/') || DOCUMENT_MIMES.has(mimeType)) {
    return 'document';
  }

  return 'other';
}

function baseMime(mimeType: string): string {
  return mimeType.split(';', 1)[0].trim().toLowerCase();
}

function safeExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const raw = dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';

  return /^[a-z0-9]{1,16}$/.test(raw) ? raw : 'bin';
}

const officeTypes: Record<string, DetectedFileType> = {
  docx: typeFor(
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'docx',
  ),
  xlsx: typeFor(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xlsx',
  ),
  pptx: typeFor(
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'pptx',
  ),
};

const legacyOfficeTypes: Record<string, DetectedFileType> = {
  doc: typeFor('application/msword', 'doc'),
  xls: typeFor('application/vnd.ms-excel', 'xls'),
  ppt: typeFor('application/vnd.ms-powerpoint', 'ppt'),
};

const openDocumentTypes: Record<string, DetectedFileType> = {
  odt: typeFor('application/vnd.oasis.opendocument.text', 'odt'),
  ods: typeFor('application/vnd.oasis.opendocument.spreadsheet', 'ods'),
  odp: typeFor('application/vnd.oasis.opendocument.presentation', 'odp'),
};

function startsWith(bytes: Buffer, signature: Buffer, offset = 0): boolean {
  return (
    bytes.length >= offset + signature.length &&
    bytes.subarray(offset, offset + signature.length).equals(signature)
  );
}

function isRiff(bytes: Buffer, fourcc: string): boolean {
  return (
    startsWith(bytes, Buffer.from('RIFF')) &&
    startsWith(bytes, Buffer.from(fourcc), 8)
  );
}

function isoBrand(bytes: Buffer): string | undefined {
  if (!startsWith(bytes, Buffer.from('ftyp'), 4) || bytes.length < 12) {
    return undefined;
  }

  return bytes.toString('latin1', 8, 12);
}

function isVideoBrand(brand: string): boolean {
  return MP4_BRANDS.has(brand) || brand === 'qt  ';
}

function isMp3Frame(bytes: Buffer): boolean {
  return bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

function isMpegTs(bytes: Buffer): boolean {
  if (bytes.length < MPEG_TS_PACKET_SIZE * 2) {
    return false;
  }

  for (let offset = 0; offset + MPEG_TS_PACKET_SIZE <= bytes.length; offset += MPEG_TS_PACKET_SIZE) {
    if (bytes[offset] !== MPEG_TS_SYNC) {
      return false;
    }
  }

  return true;
}

function isFont(bytes: Buffer): boolean {
  return (
    startsWith(bytes, TTF) ||
    startsWith(bytes, OTF) ||
    startsWith(bytes, WOFF) ||
    startsWith(bytes, WOFF2)
  );
}

function fontType(bytes: Buffer, ext: string): DetectedFileType {
  if (startsWith(bytes, OTF)) {
    return typeFor('font/otf', ext);
  }
  if (startsWith(bytes, WOFF2)) {
    return typeFor('font/woff2', ext);
  }
  if (startsWith(bytes, WOFF)) {
    return typeFor('font/woff', ext);
  }

  return typeFor('font/ttf', ext);
}

function looksLikeText(bytes: Buffer): boolean {
  if (bytes.length === 0 || !isValidUtf8(bytes)) {
    return false;
  }

  // Allow the whitespace controls, but not binary noise that happens to have
  // no NUL bytes.
  return !bytes.some(
    (byte) => byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d,
  );
}

function isValidUtf8(bytes: Buffer): boolean {
  // The sample may end halfway through a multi-byte character, so retry after
  // dropping up to three trailing bytes before calling the text invalid.
  for (let trailing = 0; trailing <= 3; trailing += 1) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(
        bytes.subarray(0, bytes.length - trailing),
      );
      return true;
    } catch {
      // Try the next possible cut point.
    }
  }

  return false;
}
