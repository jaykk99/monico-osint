/**
 * Minimal client-side JPEG EXIF parser (APP1/TIFF). No dependencies.
 * Returns a flat map of human-readable tag names -> values, plus GPS decimal coords.
 */

export interface ExifResult {
  tags: Record<string, string>;
  gps: { lat: number; lon: number } | null;
}

const TAG_NAMES: Record<number, string> = {
  0x0100: 'ImageWidth',
  0x0101: 'ImageHeight',
  0x010f: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x011a: 'XResolution',
  0x011b: 'YResolution',
  0x0128: 'ResolutionUnit',
  0x0131: 'Software',
  0x0132: 'DateTime',
  0x013b: 'Artist',
  0x0213: 'YCbCrPositioning',
  0x8298: 'Copyright',
  0x8769: 'ExifIFD',
  0x8825: 'GPSIFD',
  0x9000: 'ExifVersion',
  0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized',
  0x9201: 'ShutterSpeedValue',
  0x9202: 'ApertureValue',
  0x9204: 'ExposureBiasValue',
  0x9207: 'MeteringMode',
  0x9208: 'LightSource',
  0x9209: 'Flash',
  0x920a: 'FocalLength',
  0x927c: 'MakerNote',
  0x9286: 'UserComment',
  0x9290: 'SubSecTime',
  0x9291: 'SubSecTimeOriginal',
  0x9292: 'SubSecTimeDigitized',
  0xa000: 'FlashpixVersion',
  0xa001: 'ColorSpace',
  0xa002: 'PixelXDimension',
  0xa003: 'PixelYDimension',
  0xa005: 'InteropIFD',
  0xa20e: 'FocalPlaneXResolution',
  0xa20f: 'FocalPlaneYResolution',
  0xa217: 'SensingMethod',
  0xa300: 'FileSource',
  0xa301: 'SceneType',
  0xa402: 'ExposureMode',
  0xa403: 'WhiteBalance',
  0xa404: 'DigitalZoomRatio',
  0xa406: 'SceneCaptureType',
};

const GPS_TAG_NAMES: Record<number, string> = {
  0x0000: 'GPSVersionID',
  0x0001: 'GPSLatitudeRef',
  0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef',
  0x0004: 'GPSLongitude',
  0x0005: 'GPSAltitudeRef',
  0x0006: 'GPSAltitude',
  0x0007: 'GPSTimeStamp',
  0x0012: 'GPSMapDatum',
  0x001d: 'GPSDateStamp',
};

const TYPE_SIZES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

function getStr(view: DataView, off: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    const c = view.getUint8(off + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function readValue(
  view: DataView,
  tiffStart: number,
  entryOff: number,
  little: boolean,
): string {
  const type = view.getUint16(entryOff + 2, little);
  const count = view.getUint32(entryOff + 4, little);
  const size = (TYPE_SIZES[type] || 1) * count;
  let valOff = entryOff + 8;
  if (size > 4) {
    valOff = tiffStart + view.getUint32(entryOff + 8, little);
  }
  if (valOff < 0 || valOff + Math.min(size, 64) > view.byteLength) return '';

  if (type === 2) return getStr(view, valOff, count).trim();
  if (type === 3) {
    const vals: number[] = [];
    for (let i = 0; i < Math.min(count, 8); i++) vals.push(view.getUint16(valOff + i * 2, little));
    return vals.join(', ');
  }
  if (type === 4 || type === 9) {
    const vals: number[] = [];
    for (let i = 0; i < Math.min(count, 8); i++)
      vals.push(type === 4 ? view.getUint32(valOff + i * 4, little) : view.getInt32(valOff + i * 4, little));
    return vals.join(', ');
  }
  if (type === 5 || type === 10) {
    const vals: string[] = [];
    for (let i = 0; i < Math.min(count, 8); i++) {
      const num = type === 5 ? view.getUint32(valOff + i * 8, little) : view.getInt32(valOff + i * 8, little);
      const den = type === 5 ? view.getUint32(valOff + i * 8 + 4, little) : view.getInt32(valOff + i * 8 + 4, little);
      vals.push(den === 0 ? '0' : den === 1 ? String(num) : `${num}/${den}`);
    }
    return vals.join(', ');
  }
  return `${count} value(s)`;
}

function readRational(view: DataView, off: number, little: boolean): number {
  const num = view.getUint32(off, little);
  const den = view.getUint32(off + 4, little);
  return den === 0 ? 0 : num / den;
}

function parseIFD(
  view: DataView,
  tiffStart: number,
  ifdOff: number,
  little: boolean,
  names: Record<number, string>,
): { tags: Record<string, string>; raw: Record<number, string> } {
  const tags: Record<string, string> = {};
  const raw: Record<number, string> = {};
  if (ifdOff < 0 || tiffStart + ifdOff + 2 > view.byteLength) return { tags, raw };
  const count = view.getUint16(tiffStart + ifdOff, little);
  for (let i = 0; i < count; i++) {
    const e = tiffStart + ifdOff + 2 + i * 12;
    if (e + 12 > view.byteLength) break;
    const tag = view.getUint16(e, little);
    const val = readValue(view, tiffStart, e, little);
    raw[tag] = val;
    const name = names[tag];
    if (name && val) tags[name] = val;
  }
  return { tags, raw };
}

function dmsToDecimal(dms: string, ref: string): number | null {
  // dms like "49/1, 53/1, 3021/100"
  const parts = dms.split(',').map((p) => p.trim());
  if (parts.length < 3) return null;
  const toNum = (s: string) => {
    const [n, d] = s.split('/').map(Number);
    return d ? n / d : n;
  };
  const deg = toNum(parts[0]) + toNum(parts[1]) / 60 + toNum(parts[2]) / 3600;
  const sign = ref === 'S' || ref === 'W' ? -1 : 1;
  return sign * deg;
}

export function parseExif(buffer: ArrayBuffer): ExifResult {
  const tags: Record<string, string> = {};
  let gps: { lat: number; lon: number } | null = null;
  const view = new DataView(buffer);

  try {
    if (view.byteLength < 4 || view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return { tags, gps };

    let off = 2;
    while (off + 4 < view.byteLength) {
      if (view.getUint8(off) !== 0xff) break;
      const marker = view.getUint8(off + 1);
      const segLen = view.getUint16(off + 2, false);
      if (marker === 0xe1 && segLen > 8) {
        const header = getStr(view, off + 4, 6);
        if (header.startsWith('Exif')) {
          const tiffStart = off + 10;
          const order = view.getUint16(tiffStart, false);
          const little = order === 0x4949;
          if (order !== 0x4949 && order !== 0x4d4d) break;
          const ifd0 = view.getUint32(tiffStart + 4, little);
          const main = parseIFD(view, tiffStart, ifd0, little, TAG_NAMES);
          Object.assign(tags, main.tags);

          // Sub-IFDs: Exif + GPS
          for (const [ptrTag, names] of [
            [0x8769, TAG_NAMES],
            [0x8825, GPS_TAG_NAMES],
          ] as [number, Record<number, string>][]) {
            const ptrVal = main.raw[ptrTag];
            if (ptrVal) {
              const subOff = parseInt(ptrVal.split(',')[0], 10);
              if (!Number.isNaN(subOff)) {
                const sub = parseIFD(view, tiffStart, subOff, little, names);
                Object.assign(tags, sub.tags);
                if (ptrTag === 0x8825) {
                  const lat = sub.raw[0x0002];
                  const latRef = sub.raw[0x0001] || 'N';
                  const lon = sub.raw[0x0004];
                  const lonRef = sub.raw[0x0003] || 'E';
                  if (lat && lon) {
                    const la = dmsToDecimal(lat, latRef);
                    const lo = dmsToDecimal(lon, lonRef);
                    if (la !== null && lo !== null) gps = { lat: la, lon: lo };
                  }
                }
              }
            }
          }
          break;
        }
      }
      if (marker === 0xda || marker === 0xd9) break; // SOS / EOI
      off += 2 + segLen;
    }
  } catch {
    // corrupted or truncated EXIF — return what we have
  }

  return { tags, gps };
}
