import { FILE_CATEGORIES } from '@terasandi/contracts';
import { detectFileType } from './file-detector.js';

const ascii = (value: string) => Buffer.from(value, 'ascii');

/** An ISO base-media header with the given major brand. */
function isoContainer(brand: string): Buffer {
  const bytes = Buffer.alloc(16);
  bytes.writeUInt32BE(16, 0);
  ascii('ftyp').copy(bytes, 4);
  ascii(brand).copy(bytes, 8);
  return bytes;
}

/** An ISO 9660 disc image with its identifier at sector 16. */
function iso9660(): Buffer {
  const bytes = Buffer.alloc(0x8001 + 5);
  ascii('CD001').copy(bytes, 0x8001);
  return bytes;
}

/** Two MPEG-TS packets with the transport error indicator set. */
function mpegTs(): Buffer {
  const bytes = Buffer.alloc(188 * 2);
  bytes[0] = 0x47;
  bytes[188] = 0x47;
  return bytes;
}

describe('detectFileType', () => {
  it('recognizes image and document signatures', () => {
    expect(
      detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'x.jpg'),
    ).toMatchObject({
      mimeType: 'image/jpeg',
      category: 'image',
    });
    expect(
      detectFileType(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        'x.png',
      ),
    ).toMatchObject({ mimeType: 'image/png', category: 'image' });
    expect(detectFileType(ascii('%PDF-1.7'), 'x.pdf')).toMatchObject({
      mimeType: 'application/pdf',
      category: 'document',
    });
    expect(detectFileType(Buffer.concat([ascii('BM'), Buffer.alloc(10)]), 'x.bin'))
      .toMatchObject({ mimeType: 'image/bmp', category: 'image' });
    expect(
      detectFileType(Buffer.concat([ascii('II*\0'), Buffer.alloc(10)]), 'x.bin'),
    ).toMatchObject({ mimeType: 'image/tiff', category: 'image' });
    expect(detectFileType(ascii('8BPS'), 'x.bin')).toMatchObject({
      mimeType: 'image/vnd.adobe.photoshop',
      category: 'image',
    });
  });

  it('recognizes ISO container brands as images, audio, or video', () => {
    expect(detectFileType(isoContainer('avif'), 'x.heic')).toMatchObject({
      mimeType: 'image/avif',
      category: 'image',
    });
    expect(detectFileType(isoContainer('heic'), 'x.heic')).toMatchObject({
      mimeType: 'image/heic',
      category: 'image',
    });
    expect(detectFileType(isoContainer('M4A '), 'song.mp3')).toMatchObject({
      mimeType: 'audio/mp4',
      extension: '.m4a',
      category: 'audio',
    });
    expect(detectFileType(isoContainer('isom'), 'movie.m4a')).toMatchObject({
      mimeType: 'video/mp4',
      category: 'video',
    });
  });

  it('recognizes audio and video container signatures', () => {
    const wave = Buffer.concat([
      ascii('RIFF'),
      Buffer.alloc(4),
      ascii('WAVEfmt '),
    ]);
    expect(detectFileType(wave, 'sound.bin')).toMatchObject({
      mimeType: 'audio/wav',
      category: 'audio',
    });
    expect(detectFileType(ascii('OggS'), 'sound.ogg')).toMatchObject({
      mimeType: 'audio/ogg',
      category: 'audio',
    });
    expect(detectFileType(ascii('fLaC'), 'sound.flac')).toMatchObject({
      mimeType: 'audio/flac',
      category: 'audio',
    });
    expect(detectFileType(ascii('ID3'), 'song.mp3')).toMatchObject({
      mimeType: 'audio/mpeg',
      category: 'audio',
    });

    const webm = Buffer.concat([
      Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
      ascii('webm'),
    ]);
    expect(detectFileType(webm, 'clip.bin')).toMatchObject({
      mimeType: 'video/webm',
      category: 'video',
    });
    expect(detectFileType(mpegTs(), 'clip.ts')).toMatchObject({
      mimeType: 'video/mp2t',
      category: 'video',
      extension: '.ts',
    });
  });

  it('classifies validated text and source code as documents', () => {
    expect(detectFileType(ascii('a,b\n1,2\n'), 'table.csv')).toMatchObject({
      mimeType: 'text/csv; charset=utf-8',
      category: 'document',
    });
    expect(detectFileType(ascii('# Title\n'), 'notes.md')).toMatchObject({
      mimeType: 'text/markdown; charset=utf-8',
      category: 'document',
    });
    expect(detectFileType(ascii('{"a":1}'), 'data.json')).toMatchObject({
      mimeType: 'application/json',
      category: 'document',
    });
    expect(detectFileType(ascii('{"a":1}\n'), 'data.jsonl')).toMatchObject({
      mimeType: 'application/json',
      category: 'document',
      extension: '.jsonl',
    });
    expect(detectFileType(ascii('a = "b"\n'), 'config.toml')).toMatchObject({
      mimeType: 'text/plain; charset=utf-8',
      category: 'document',
    });
    expect(
      detectFileType(ascii('<script>alert(1)</script>'), 'page.html'),
    ).toMatchObject({
      mimeType: 'text/html; charset=utf-8',
      category: 'document',
    });
    expect(detectFileType(ascii('const x = 1;\n'), 'app.js')).toMatchObject({
      mimeType: 'text/javascript; charset=utf-8',
      category: 'document',
    });
    expect(detectFileType(ascii('const x = 1;\n'), 'app.ts')).toMatchObject({
      mimeType: 'text/plain; charset=utf-8',
      category: 'document',
      extension: '.ts',
    });
    expect(detectFileType(ascii('print("hi")\n'), 'app.py')).toMatchObject({
      mimeType: 'text/x-python; charset=utf-8',
      category: 'document',
    });
    expect(detectFileType(ascii('<?php echo 1;'), 'app.php')).toMatchObject({
      mimeType: 'text/x-php; charset=utf-8',
      category: 'document',
    });
    expect(detectFileType(ascii('<svg></svg>'), 'icon.svg')).toMatchObject({
      mimeType: 'image/svg+xml',
      category: 'image',
      extension: '.svg',
    });
  });

  it('classifies text scripts and executables as other', () => {
    const script = ascii('echo hi\n');

    expect(detectFileType(script, 'run.bat')).toMatchObject({
      mimeType: 'application/x-msdos-batch',
      category: 'other',
      extension: '.bat',
    });
    expect(detectFileType(script, 'run.cmd')).toMatchObject({
      mimeType: 'application/x-msdos-batch',
      category: 'other',
      extension: '.cmd',
    });
    expect(detectFileType(script, 'run.command')).toMatchObject({
      mimeType: 'application/x-sh',
      category: 'other',
      extension: '.command',
    });
    expect(detectFileType(script, 'run.sh')).toMatchObject({
      mimeType: 'application/x-sh',
      category: 'other',
      extension: '.sh',
    });
    expect(detectFileType(script, 'run.ps1')).toMatchObject({
      mimeType: 'application/x-powershell',
      category: 'other',
      extension: '.ps1',
    });
    expect(detectFileType(script, 'run.vbs')).toMatchObject({
      mimeType: 'text/vbscript',
      category: 'other',
      extension: '.vbs',
    });
  });

  it('lets recognized bytes win over a misleading name', () => {
    expect(detectFileType(ascii('a,b\n1,2\n'), 'table.exe')).toMatchObject({
      mimeType: 'text/plain; charset=utf-8',
      category: 'document',
    });
    expect(
      detectFileType(ascii('<script>alert(1)</script>'), 'x.png'),
    ).toMatchObject({
      mimeType: 'text/plain; charset=utf-8',
      category: 'document',
    });
  });

  it('accepts archives and disk images as other files', () => {
    const zipHeader = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.alloc(20),
      ascii('[Content_Types].xml'),
    ]);
    expect(detectFileType(zipHeader, 'report.docx')).toMatchObject({
      category: 'document',
      extension: '.docx',
    });
    expect(detectFileType(zipHeader, 'archive.zip')).toMatchObject({
      mimeType: 'application/zip',
      category: 'other',
      extension: '.zip',
    });
    expect(detectFileType(iso9660(), 'ubuntu.iso')).toMatchObject({
      mimeType: 'application/x-iso9660-image',
      category: 'other',
      extension: '.iso',
    });

    const binary = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);

    for (const ext of [
      'rar',
      '7z',
      'gz',
      'bz2',
      'xz',
      'zst',
      'lz4',
      'cab',
      'tar',
      'img',
      'dmg',
    ]) {
      expect(detectFileType(binary, `archive.${ext}`)).toMatchObject({
        category: 'other',
        extension: `.${ext}`,
      });
    }

    expect(
      detectFileType(Buffer.concat([ascii('\x28\xb5\x2f\xfd'), binary]), 'x.bin'),
    ).toMatchObject({ mimeType: 'application/zstd', extension: '.zst' });
    expect(
      detectFileType(Buffer.concat([ascii('\x04\x22\x4d\x18'), binary]), 'x.bin'),
    ).toMatchObject({ mimeType: 'application/x-lz4', extension: '.lz4' });
    expect(detectFileType(ascii('MSCF'), 'x.bin')).toMatchObject({
      mimeType: 'application/vnd.ms-cab-compressed',
      extension: '.cab',
    });
    expect(
      detectFileType(ascii('SQLite format 3\0'), 'data.db'),
    ).toMatchObject({
      mimeType: 'application/vnd.sqlite3',
      category: 'other',
      extension: '.sqlite',
    });
  });

  it('recognizes fonts, 3D models, and binary executables as other', () => {
    expect(
      detectFileType(
        Buffer.concat([Buffer.from([0, 1, 0, 0]), Buffer.alloc(10)]),
        'x.bin',
      ),
    ).toMatchObject({ mimeType: 'font/ttf', category: 'other', extension: '.ttf' });
    expect(detectFileType(ascii('OTTO'), 'x.bin')).toMatchObject({
      mimeType: 'font/otf',
      category: 'other',
      extension: '.otf',
    });
    expect(detectFileType(ascii('wOFF'), 'x.bin')).toMatchObject({
      mimeType: 'font/woff',
      category: 'other',
      extension: '.woff',
    });
    expect(detectFileType(ascii('wOF2'), 'x.bin')).toMatchObject({
      mimeType: 'font/woff2',
      category: 'other',
      extension: '.woff2',
    });
    expect(detectFileType(ascii('glTF'), 'model.bin')).toMatchObject({
      mimeType: 'model/gltf-binary',
      category: 'other',
      extension: '.glb',
    });

    const binary = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);

    for (const ext of [
      'exe',
      'dll',
      'so',
      'dylib',
      'apk',
      'msi',
      'deb',
      'rpm',
    ]) {
      expect(detectFileType(binary, `app.${ext}`)).toMatchObject({
        category: 'other',
        extension: `.${ext}`,
      });
    }
  });

  it('classifies certificates, 3D assets, and data files as other', () => {
    expect(
      detectFileType(ascii('-----BEGIN CERTIFICATE-----\n'), 'cert.pem'),
    ).toMatchObject({ category: 'other', extension: '.pem' });
    expect(
      detectFileType(ascii('-----BEGIN PGP PUBLIC KEY BLOCK-----\n'), 'key.asc'),
    ).toMatchObject({ category: 'other', extension: '.asc' });

    const binary = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);

    for (const ext of [
      'p12',
      'pfx',
      'gpg',
      'dwg',
      'dxf',
      'stl',
      'obj',
      'sqlite',
      'sqlite3',
      'db',
      'parquet',
      'torrent',
    ]) {
      expect(detectFileType(binary, `asset.${ext}`)).toMatchObject({
        category: 'other',
        extension: `.${ext}`,
      });
    }
  });

  it('falls back to the extension, then to octet-stream', () => {
    const binary = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);

    expect(detectFileType(binary, 'setup.exe')).toMatchObject({
      category: 'other',
      extension: '.exe',
    });
    expect(detectFileType(binary, 'no-extension')).toMatchObject({
      mimeType: 'application/octet-stream',
      category: 'other',
      extension: '.bin',
    });
    expect(detectFileType(binary, 'weird.$name')).toMatchObject({
      mimeType: 'application/octet-stream',
      category: 'other',
      extension: '.bin',
    });
  });

  it('always returns a valid type for every covered extension', () => {
    const extensions = [
      'txt',
      'md',
      'json',
      'csv',
      'xml',
      'yaml',
      'toml',
      'html',
      'css',
      'js',
      'ts',
      'tsx',
      'py',
      'go',
      'rs',
      'java',
      'cpp',
      'php',
      'bat',
      'cmd',
      'command',
      'sh',
      'ps1',
      'vbs',
      'exe',
      'dll',
      'so',
      'apk',
      'zip',
      'rar',
      '7z',
      'gz',
      'xz',
      'zst',
      'iso',
      'img',
      'dmg',
      'ttf',
      'otf',
      'woff',
      'woff2',
      'pem',
      'crt',
      'p12',
      'key',
      'asc',
      'dwg',
      'stl',
      'obj',
      'glb',
      'sqlite',
      'db',
      'parquet',
      'torrent',
      'jpg',
      'png',
      'gif',
      'webp',
      'bmp',
      'tiff',
      'svg',
      'mp3',
      'wav',
      'ogg',
      'flac',
      'mp4',
      'mov',
      'webm',
      'mkv',
      'avi',
      'mpg',
      'ts',
      'unknown-ext',
    ];

    const samples = [
      ascii('plain text\n'),
      ascii('{"json":true}'),
      Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]),
      Buffer.alloc(0),
    ];

    for (const ext of extensions) {
      for (const bytes of samples) {
        const detected = detectFileType(bytes, `coverage.${ext}`);

        expect(detected.mimeType.length).toBeGreaterThan(0);
        expect(FILE_CATEGORIES).toContain(detected.category);
        expect(detected.extension).toMatch(/^\.[a-z0-9]{1,16}$/);
      }
    }
  });
});
