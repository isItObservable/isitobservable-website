import { YOUTUBE_CHANNEL_ID } from './site';

export interface Video { id: string; title: string; url: string; thumbnail: string }

let cache: Promise<Video | null> | undefined;

/**
 * Newest upload of the channel, fetched once per build from the public RSS feed (no API key).
 * null → the home page shows the channel link instead.
 * Rebuild to refresh.
 */
export const latestVideo = () => (cache ??= (async () => {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`YouTube RSS ${res.status}`);
    const xml = await res.text();
    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => ({
      id: entry.match(/<yt:videoId>([^<]+)/)?.[1] ?? '',
      title: entry.match(/<title>([^<]+)/)?.[1] ?? '',
      published: entry.match(/<published>([^<]+)/)?.[1] ?? '',
    })).filter((v) => v.id);
    // The feed is not strictly sorted (old uploads can come first), so sort by publish date.
    const newest = videos.sort((a, b) => b.published.localeCompare(a.published))[0];
    if (!newest) return null;
    return { id: newest.id, title: newest.title, url: `https://www.youtube.com/watch?v=${newest.id}`, thumbnail: `https://i.ytimg.com/vi/${newest.id}/sddefault.jpg` };
  } catch (error) {
    console.warn(`[youtube] latest video unavailable, using channel fallback: ${error}`);
    return null;
  }
})());
