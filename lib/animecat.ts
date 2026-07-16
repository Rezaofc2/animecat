import * as cheerio from 'cheerio';

const BASE = 'https://v2.samehadaku.how';

async function fetchPage(url: string): Promise<string | null> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 20000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: c.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(t);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } catch (e: any) { console.error('[Animecat]', e.message); return null; }
}

export interface AnimeCard {
  title: string; slug: string; poster: string; episode?: string; rating?: string; type?: string;
}
export interface AnimeDetail {
  title: string; poster: string; rating: string; type: string; status: string;
  genres: string[]; synopsis: string; episodes: { title: string; slug: string; date: string }[];
}
export interface EpisodeData {
  title: string; animeSlug?: string; prevSlug?: string; nextSlug?: string;
  downloads: { quality: string; links: { name: string; url: string }[] }[];
  relatedEpisodes: { title: string; slug: string; date: string }[];
}