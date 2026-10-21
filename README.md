# North Star (monico-osint)

Jay's personal OSINT dashboard — a single Next.js app that groups open-source
intelligence lookups in one place.

Live: https://monico-osint.vercel.app (currently returns 402 — the Vercel
team is paused; the code builds and runs clean locally)

## Modules

| Route | What it does |
|---|---|
| `/` | Dashboard home |
| `/cameras` | Public camera feeds |
| `/catalogue` | Company / entity catalogue lookup |
| `/certscan` | Subdomains via Certificate Transparency logs (crt.sh) |
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
