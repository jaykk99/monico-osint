# North Star (monico-osint)

Jay's personal OSINT dashboard — a single Next.js app that groups open-source
intelligence lookups in one place.

Live: none — the Vercel team is paused; the code builds and runs clean locally

## Modules

| Route | What it does |
|---|---|
| `/` | Dashboard home |
| `/cameras` | Public camera feeds |
| `/catalogue` | Company / entity catalogue lookup |
| `/certscan` | Subdomains via Certificate Transparency logs (crt.sh) |
| `/dnslookup` | DNS records (MX/TXT/NS/A…) via Cloudflare DNS-over-HTTPS |
| `/unshorten` | Short-URL expander with redirect chain + phishing heuristics |
| `/mailshield` | Email auth posture: SPF, DMARC, MTA-STS, TLS-RPT, BIMI via DoH |
| `/codetrail` | Public GitHub profile intelligence (no login) |
| `/iconhash` | Favicon fingerprinting (Shodan http.favicon.hash scheme) |
| `/wayback` | Domain snapshot history via the Wayback Machine CDX API |
| `/crypto` | Wallet address lookup |
| `/fisherman` | Link tracking helper |
| `/hawk` | Monitoring view |
| `/netscan` | IP / domain network scan |
| `/skywave` | Skywave view |
| `/username` | Username search across sites |
| `/watchtower` | Watchtower view |

## Run locally

```bash
npm install
npm run build
npm start
# or dev mode:
npm run dev
```

## Stack

Next.js 14, React 18, TypeScript. No build-time secrets required.
