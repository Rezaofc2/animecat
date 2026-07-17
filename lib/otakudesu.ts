import * as cheerio from 'cheerio';

const BASE = 'https://otakudesu.fit';

async function fetchPage(url: string): Promise<string | null> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      },
      signal: c.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e: any) {
    console.error('[Otakudesu]', url, e.message);
    return null;
  }
}

function getPoster($: any, el: any): string {
  const img = $(el).find('img').first();
  const src = img.attr('src') || '';
  const dataSrc = img.attr('data-src') || '';
  if (dataSrc && !dataSrc.includes('svg+xml') && !dataSrc.includes('data:') && !dataSrc.includes('acscdn')) return dataSrc;
  if (src && !src.includes('svg+xml') && !src.startsWith('data:')) return src;
  return dataSrc || src || '';
}

function cleanSlug(href: string): string {
  return href.replace(BASE, '').replace(/^\/+/, '').replace(/\/+$/g, '');
}

function shortTitle(t: string): string {
  const epMatch = t.match(/Episode\s*\d+/i);
  if (epMatch) return epMatch[0];
  return t.length > 40 ? t.slice(0, 38) + '...' : t;
}

export interface AnimeCard {
  title: string; slug: string; poster: string; episode?: string; rating?: string; type?: string;
  date?: string; day?: string;
}

export interface AnimeDetail {
  title: string; poster: string; rating: string; type: string; status: string;
  genres: string[]; synopsis: string;
  episodes: { title: string; slug: string; date: string }[];
}

export interface EpisodeData {
  title: string; animeSlug?: string; prevSlug?: string; nextSlug?: string;
  streamUrl?: string;
  downloads: { quality: string; links: { name: string; url: string }[] }[];
  relatedEpisodes: { title: string; slug: string; date: string }[];
}

export async function getTerbaru(page = 1): Promise<AnimeCard[]> {
  const url = page <= 1 ? `${BASE}/` : `${BASE}/page/${page}/`;
  const html = await fetchPage(url); if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('.bsx').each((_: number, el: any) => {
    const a = $(el).find('a').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || '';
    if (!href || seen.has(href) || !title) return;
    seen.add(href);
    const slug = cleanSlug(href);
    const poster = getPoster($, el);
    const ep = $(el).find('.epx, .episode, .sb').text().trim();
    const type = $(el).find('.typez, .typeflag, .type').first().text().trim();
    const rating = $(el).find('.numscore, .rating, .score').text().trim();
    if (title && slug) results.push({ title: shortTitle(title), slug, poster, episode: ep, rating, type });
  });

  return results;
}

export async function getPopuler(): Promise<AnimeCard[]> {
  // otakudesu doesn't have a separate popular endpoint, use trending section
  const html = await fetchPage(`${BASE}/`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  // Look for popular/trending section
  $('.serieslist li, .popular-post article, .widget-post article').each((_: number, el: any) => {
    const a = $(el).find('a').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || '';
    if (!href || seen.has(href) || !title) return;
    seen.add(href);
    const slug = cleanSlug(href);
    const poster = getPoster($, el);
    const rating = $(el).find('.rating, .score').text().trim() || undefined;
    if (title && slug) results.push({ title: shortTitle(title), slug, poster, rating });
  });

  return results.slice(0, 10);
}

export async function searchAnime(q: string, page = 1): Promise<AnimeCard[]> {
  const url = `${BASE}/page/${page}/?s=${encodeURIComponent(q)}`;
  const html = await fetchPage(url); if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('article, .animepost, .post').each((_: number, el: any) => {
    const a = $(el).find('a').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || '';
    if (!href || seen.has(href) || !title) return;
    seen.add(href);
    const slug = cleanSlug(href);
    const poster = getPoster($, el);
    if (title && slug) results.push({ title: shortTitle(title), slug, poster });
  });
  return results;
}

export async function getDaftarAnime(params: {
  page?: number; order?: string; genre?: string;
}): Promise<AnimeCard[]> {
  const { page = 1, order = 'latest', genre } = params;
  let url: string;
  if (genre) {
    url = `${BASE}/genres/${encodeURIComponent(genre)}/page/${page}/`;
  } else {
    url = `${BASE}/page/${page}/`;
  }

  const html = await fetchPage(url); if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('article, .animepost, .post').each((_: number, el: any) => {
    const a = $(el).find('a').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || '';
    if (!href || seen.has(href) || !title) return;
    seen.add(href);
    const slug = cleanSlug(href);
    const poster = getPoster($, el);
    const rating = $(el).find('.rating, .score').text().trim() || undefined;
    if (title && slug) results.push({ title: shortTitle(title), slug, poster, rating });
  });

  return results;
}

export async function getDetail(slug: string): Promise<AnimeDetail | null> {
  const url = `${BASE}/series/${slug.replace(/\/$/, '')}/`;
  const html = await fetchPage(url); if (!html) return null;
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();
  const posterImg = $('.thumb img, .poster img, img.wp-post-image').first();
  const poster = getPoster($, posterImg.parent().length ? posterImg.parent().get(0) : $('body').get(0));

  const rating = $('.numscore, .rating_value, .score, .rating').first().text().trim();
  const synopsis = $('.entry-content p, .sinopsis, .desc, .synopsis, .summary p, .bixbox p').first().text().trim();

  const info: Record<string, string> = {};
  $('.spe span, .infoanime span, .infolist li, .series-info span, .data').each((_: number, el: any) => {
    const t = $(el).text().trim();
    const m = t.match(/^([^:]+)\s*:\s*(.+)$/);
    if (m) info[m[1].toLowerCase().trim()] = m[2].trim();
  });

  const genresSet = new Set<string>();
  $('.genxed a, .genres a, a[rel="tag"]').each((_: number, el: any) => {
    const g = $(el).text().trim();
    if (g && g.length < 30) genresSet.add(g);
  });

  // Episodes: otakudesu uses .eplister with direct <a> tags (no <li>)
  const episodes: AnimeDetail['episodes'] = [];
  const seenEp = new Set<string>();
  
  // Try .eplister a (otakudesu structure)
  $('.eplister a').each((_: number, el: any) => {
    const href = $(el).attr('href') || '';
    if (!href || !href.includes('episode')) return;
    const epSlug = cleanSlug(href);
    if (!epSlug || seenEp.has(epSlug)) return;
    seenEp.add(epSlug);
    const num = $(el).find('.epl-num').text().trim();
    const epTitle = $(el).find('.epl-title').text().trim() || ('Episode ' + num);
    const date = $(el).find('.epl-date').text().trim();
    episodes.push({ title: epTitle, slug: epSlug, date });
  });
  
  // Fallback: .eplister li (samehadaku-style)
  if (episodes.length === 0) {
    for (const sel of ['.eplister li', '.episode-list li', '.episodelist li']) {
      $(sel).each((_: number, el: any) => {
        const a = $(el).find('a').first();
        const epTitle = a.text().trim();
        const href = a.attr('href') || '';
        const epSlug = cleanSlug(href);
        const date = $(el).find('.date').text().trim();
        if (epTitle && epSlug && !seenEp.has(epSlug)) {
          seenEp.add(epSlug);
          episodes.push({ title: shortTitle(epTitle), slug: epSlug, date });
        }
      });
      if (episodes.length > 0) break;
    }
  }

  return {
    title, poster, rating,
    type: info['type'] || info['tipe'] || $('.typez').first().text().trim() || '',
    status: info['status'] || $('.status').text().trim() || '',
    genres: Array.from(genresSet), synopsis, episodes,
  };
}

export async function getEpisode(slug: string): Promise<EpisodeData | null> {
  const url = `${BASE}/${slug}/`;
  const html = await fetchPage(url); if (!html) return null;
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();

  // Stream URL: check iframe with data-litespeed-src (same as samehadaku) and regular iframes
  let streamUrl: string | undefined;
  const lazyIframe = $('iframe[data-litespeed-src]').first().attr('data-litespeed-src');
  if (lazyIframe && (lazyIframe.includes('video.g') || lazyIframe.includes('blogger') || lazyIframe.includes('embed'))) {
    streamUrl = lazyIframe;
  }
  if (!streamUrl) {
    const iframeSrc = $('iframe').first().attr('src');
    if (iframeSrc && !iframeSrc.includes('about:blank') && !iframeSrc.includes('facebook')) {
      streamUrl = iframeSrc;
    }
  }

  // Anime slug for history
  let animeSlug: string | undefined;
  const animeLink = $('a[href*="/series/"]').first().attr('href') || '';
  if (animeLink) animeSlug = cleanSlug(animeLink);

  // Prev/Next navigation
  const prevHref = $('.naveps .prev a, a[rel="prev"], .prevpost a').attr('href') || '';
  const nextHref = $('.naveps .next a, a[rel="next"], .nextpost a').attr('href') || '';
  const prevSlug = prevHref ? cleanSlug(prevHref) : undefined;
  const nextSlug = nextHref ? cleanSlug(nextHref) : undefined;

  // Downloads
  const downloads: EpisodeData['downloads'] = [];
  const dlMap = new Map<string, { name: string; url: string }[]>();

  // Each download link
  $('.download ul li, .listdownload li, .soraddl a, .entry-content a[href*="gofile"], .entry-content a[href*="drive"], .entry-content a[href*="acefile"], .entry-content a[href*="mega"]').each((_: number, el: any) => {
    const a = $(el).is('a') ? $(el) : $(el).find('a').first();
    const href = a.attr('href') || '';
    const text = a.text().trim() || $(el).text().trim();
    if (!href || href.includes('#')) return;

    // Determine quality from text or parent
    let quality = 'Download';
    const parentText = $(el).parent().text() || '';
    const qMatch = parentText.match(/(\d+p)/) || text.match(/(\d+p)/);
    if (qMatch) quality = qMatch[1];

    if (!dlMap.has(quality)) dlMap.set(quality, []);
    dlMap.get(quality)!.push({ name: text.replace(quality, '').replace(/[\(\)]/g, '').trim() || 'Link', url: href });
  });

  if (dlMap.size === 0) {
    // Fallback: find any download link
    $('a[href*="gofile"], a[href*="acefile"], a[href*="drive"], a[href*="mega"]').each((_: number, el: any) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim() || 'Download';
      if (href) {
        if (!dlMap.has('Download')) dlMap.set('Download', []);
        dlMap.get('Download')!.push({ name: text, url: href });
      }
    });
  }

  for (const [quality, links] of dlMap) {
    downloads.push({ quality, links });
  }

  // Related episodes
  const relatedEpisodes: EpisodeData['relatedEpisodes'] = [];
  $('.eplister li, .episodelist li').each((_: number, el: any) => {
    const a = $(el).find('a').first();
    const epTitle = a.text().trim();
    const href = a.attr('href') || '';
    const epSlug = cleanSlug(href);
    const date = $(el).find('.date, .epdate, .epl-date').text().trim();
    if (epTitle && epSlug) {
      relatedEpisodes.push({ title: shortTitle(epTitle), slug: epSlug, date });
    }
  });

  return {
    title: shortTitle(title),
    animeSlug,
    prevSlug,
    nextSlug,
    streamUrl,
    downloads,
    relatedEpisodes,
  };
}

export function getGenres(): string[] {
  return [
    'Action','Adventure','Comedy','Drama','Ecchi','Fantasy','Game','Harem','Historical','Horror',
    'Isekai','Magic','Martial Arts','Mecha','Military','Music','Mystery','Psychological',
    'Reincarnation','Romance','Samurai','School','Sci-Fi','Seinen','Shoujo','Shounen',
    'Slice of Life','Space','Sports','Super Power','Supernatural','Thriller','Vampire',
  ];
}
