export interface Sector {
  id: string;
  name: string;
  icon: string;
  blurb: string;
}

export const SECTORS: Sector[] = [
  { id: 'cameras', name: 'Camera Globe', icon: '📷', blurb: 'Public live webcams around the world' },
  { id: 'username', name: 'Username Research', icon: '🔎', blurb: 'Hunt a username across platforms' },
  { id: 'crypto', name: 'Crypto Tracing', icon: '₿', blurb: 'Track wallets on block explorers' },
  { id: 'netscan', name: 'NetScan', icon: '🌐', blurb: 'WHOIS, DNS, Shodan recon on domains & IPs' },
  { id: 'hawk', name: 'Hawk', icon: '🦅', blurb: 'Image EXIF & metadata forensics' },
  { id: 'skywave', name: 'Skywave', icon: '📻', blurb: 'Public SDR radio receivers' },
  { id: 'fisherman', name: 'Fisherman', icon: '🎣', blurb: 'Link shortener for controlled sharing' },
  { id: 'catalogue', name: 'Catalogue', icon: '📚', blurb: 'Public corporate & government registries' },
  { id: 'watchtower', name: 'Watchtower', icon: '🗼', blurb: 'Live flights, ships, weather & more' },
];
