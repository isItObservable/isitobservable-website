export const SITE_URL = 'https://isitobservable.io';
export const SITE_NAME = 'Is It Observable';
export const DEFAULT_DESCRIPTION = "Watch tutorials on Observability. Each episode covers a specific technology or framework. Let's explore if your technology is observable!";
export const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/isitobservable';
export const YOUTUBE_CHANNEL_ID = 'UCRiin4u8YZGlVQRZp7qOOaw';

export const SOCIAL = [
  { name: 'YouTube', icon: 'youtube', href: YOUTUBE_CHANNEL_URL },
  { name: 'X', icon: 'x', href: 'https://x.com/IsitObservable' },
  { name: 'Bluesky', icon: 'bluesky', href: 'https://bsky.app/profile/isitobservable.bsky.social' },
  { name: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/company/76975270' },
] as const;

/** Main navigation. Categories open a dropdown with their children. */
export const NAV = [
  { title: 'Site Reliability Engineering', category: 'site-reliability-engineering' },
  { title: 'Observability', category: 'observability' },
  { title: 'OpenTelemetry', category: 'open-telemetry' },
  { title: 'Events', category: 'events' },
  { title: 'About', href: '/about' },
] as const;
