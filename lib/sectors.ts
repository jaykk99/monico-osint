export interface Sector {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  accent: 'blue' | 'green' | 'gold' | 'red' | 'purple' | 'cyan' | 'orange' | 'pink' | 'teal';
}

export const SECTORS: Sector[] = [
  { id: 'cameras', name: 'Camera Globe', icon: '📷', blurb: 'Live public webcams worldwide', accent: 'cyan' },
  { id: 'username', name: 'Username Hunt', icon: '🔎', blurb: 'Check a handle across 20+ platforms', accent: 'blue' },
  { id: 'crypto', name: 'Crypto Trace', icon: '₿', blurb: 'Live wallet balances & transactions', accent: 'gold' },
  { id: 'netscan', name: 'NetScan', icon: '🌐', blurb: 'IP geolocation, DNS & WHOIS intel', accent: 'green' },
  { id: 'hawk', name: 'Hawk', icon: '🦅', blurb: 'Photo EXIF & metadata forensics', accent: 'orange' },
  { id: 'skywave', name: 'Skywave', icon: '📻', blurb: 'Live public radio receivers', accent: 'purple' },
  { id: 'fisherman', name: 'Fisherman', icon: '🎣', blurb: 'Shorten & share tracked links', accent: 'pink' },
  { id: 'catalogue', name: 'Catalogue', icon: '📚', blurb: 'Company & public record search', accent: 'teal' },
  { id: 'watchtower', name: 'Watchtower', icon: '🗼', blurb: 'Live flights, ships & threats', accent: 'red' },
];
