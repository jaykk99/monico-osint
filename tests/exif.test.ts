import { describe, expect, it } from 'vitest';
import { parseExif } from '../lib/exif';

// --- Synthetic JPEG builder: SOI + APP1(Exif) with a little-endian TIFF ---
// IFD0: Make, Model, ExifIFD ptr, GPSIFD ptr. Exif IFD: DateTimeOriginal.
// GPS IFD: 49°53'30.21"N 97°8'45.00"W.

const u16le = (v: number) => [v & 0xff, (v >> 8) & 0xff];
const u32le = (v: number) => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff];
const str = (s: string) => [...s].map((c) => c.charCodeAt(0));
const rat = (n: number, d: number) => [...u32le(n), ...u32le(d)];
const entry = (tag: number, type: number, count: number, val: number[]) => [
  ...u16le(tag), ...u16le(type), ...u32le(count), ...val,
];

function buildJpeg(): ArrayBuffer {
  // Offsets relative to TIFF start:
  // IFD0 @8 (2 + 4*12 + 4 = 54B) → strings @62,68 → exif IFD @75 → gps IFD @93
  // → lat rationals @147 → lon rationals @171 → date string @195
  const ifd0 = [
    ...u16le(4),
    ...entry(0x010f, 2, 6, u32le(62)), // Make = "Canon\0"
    ...entry(0x0110, 2, 7, u32le(68)), // Model = "EOS-1D\0"
    ...entry(0x8769, 4, 1, u32le(75)), // ExifIFD ptr
    ...entry(0x8825, 4, 1, u32le(93)), // GPSIFD ptr
    ...u32le(0), // no next IFD
  ];
  const exifIfd = [
    ...u16le(1),
    ...entry(0x9003, 2, 20, u32le(195)), // DateTimeOriginal
    ...u32le(0),
  ];
  const gpsIfd = [
    ...u16le(4),
    ...entry(0x0001, 2, 2, [0x4e, 0x00, 0x00, 0x00]), // "N\0" inline
    ...entry(0x0002, 5, 3, u32le(147)), // lat rationals
    ...entry(0x0003, 2, 2, [0x57, 0x00, 0x00, 0x00]), // "W\0" inline
    ...entry(0x0004, 5, 3, u32le(171)), // lon rationals
    ...u32le(0),
  ];
  const tiff = [
    0x49, 0x49, ...u16le(42), ...u32le(8),
    ...ifd0,
    ...str('Canon'), 0,
    ...str('EOS-1D'), 0,
    ...exifIfd,
    ...gpsIfd,
    ...rat(49, 1), ...rat(53, 1), ...rat(3021, 100),
    ...rat(97, 1), ...rat(8, 1), ...rat(4500, 100),
    ...str('2024:01:02 03:04:05'), 0,
  ];
  const payload = [...str('Exif'), 0, 0, ...tiff];
  const segLen = payload.length + 2;
  const bytes = [
    0xff, 0xd8, // SOI
    0xff, 0xe1, (segLen >> 8) & 0xff, segLen & 0xff, // APP1
    ...payload,
  ];
  return new Uint8Array(bytes).buffer;
}

describe('parseExif', () => {
  it('extracts tags and GPS from a real EXIF structure', () => {
    const r = parseExif(buildJpeg());
    expect(r.tags['Make']).toBe('Canon');
    expect(r.tags['Model']).toBe('EOS-1D');
    expect(r.tags['DateTimeOriginal']).toBe('2024:01:02 03:04:05');
    expect(r.gps).not.toBeNull();
    // 49°53'30.21"N, 97°8'45.00"W
    expect(r.gps!.lat).toBeCloseTo(49.891725, 5);
    expect(r.gps!.lon).toBeCloseTo(-97.145833, 5);
  });

  it('returns empty for non-JPEG data', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;
    const r = parseExif(png);
    expect(r.tags).toEqual({});
    expect(r.gps).toBeNull();
  });

  it('returns empty for a JPEG with no EXIF segment', () => {
    const bare = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer;
    const r = parseExif(bare);
    expect(r.tags).toEqual({});
    expect(r.gps).toBeNull();
  });

  it('never throws on truncated or garbage input', () => {
    const cut = buildJpeg().slice(0, 40);
    expect(() => parseExif(cut)).not.toThrow();
    const garbage = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x05, 0x99, 0x99]).buffer;
    expect(() => parseExif(garbage)).not.toThrow();
  });
});
