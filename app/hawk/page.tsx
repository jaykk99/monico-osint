'use client';

import { useState } from 'react';
import Shell from '../../components/Shell';
import { parseExif, type ExifResult } from '../../lib/exif';

export default function HawkPage() {
  const [fileName, setFileName] = useState('');
  const [fileInfo, setFileInfo] = useState('');
  const [result, setResult] = useState<ExifResult | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  const onFile = async (f: File | undefined) => {
    setError('');
    setResult(null);
    setPreview('');
    if (!f) return;
    setFileName(f.name);
    setFileInfo(`${(f.size / 1024).toFixed(1)} KB · ${f.type || 'unknown type'}`);

    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));

    try {
      const buf = await f.arrayBuffer();
      const exif = parseExif(buf);
      // Also grab pixel dimensions
      const img = new Image();
      img.onload = () => {
        setFileInfo(
          `${(f.size / 1024).toFixed(1)} KB · ${f.type || 'unknown type'} · ${img.naturalWidth}×${img.naturalHeight}px`,
        );
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(f);
      setResult(exif);
    } catch {
      setError('Could not read this file.');
    }
  };

  const tagCount = result ? Object.keys(result.tags).length : 0;

  return (
    <Shell title="Hawk" sub="Image EXIF & metadata forensics — runs 100% on-device">
      <div className="ns-panel">
        <h2>Analyze a photo</h2>
        <div className="ns-row">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFile(e.target.files?.[0])}
            style={{ color: 'var(--text)', fontSize: 14 }}
          />
        </div>
        <p className="ns-note">
          The file never leaves your phone — EXIF is parsed in your browser.
          Stripped metadata (common on social uploads) means the platform removed it.
        </p>
      </div>

      {error && (
        <div className="ns-panel">
          <p style={{ color: 'var(--red)', margin: 0 }}>{error}</p>
        </div>
      )}

      {fileName && (
        <div className="ns-panel">
          <h2>{fileName}</h2>
          <p className="ns-kv" style={{ color: 'var(--muted)', fontSize: 13 }}>{fileInfo}</p>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="uploaded" style={{ maxWidth: '100%', borderRadius: 10, marginTop: 10 }} />
          )}

          {result && (
            <>
              {result.gps ? (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'var(--gold-dim)', border: '1px solid var(--gold)' }}>
                  <b style={{ color: 'var(--gold)' }}>📍 GPS found: {result.gps.lat.toFixed(6)}, {result.gps.lon.toFixed(6)}</b>
                  <div className="ns-row" style={{ marginTop: 8 }}>
                    <a
                      className="ns-btn-ghost"
                      href={`https://www.google.com/maps?q=${result.gps.lat},${result.gps.lon}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                </div>
              ) : (
                <p className="ns-note">No GPS coordinates in EXIF.</p>
              )}

              <h2 style={{ marginTop: 16 }}>EXIF tags <span className="ns-tag">{tagCount}</span></h2>
              {tagCount > 0 ? (
                <div className="ns-result">
                  <table>
                    <tbody>
                      {Object.entries(result.tags).map(([k, v]) => (
                        <tr key={k}>
                          <td>{k}</td>
                          <td>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="ns-note">No EXIF metadata found — likely stripped by the platform or never embedded.</p>
              )}
            </>
          )}
        </div>
      )}
    </Shell>
  );
}
