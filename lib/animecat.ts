import * as cheerio from 'cheerio';

// USE samehadaku.li — NO CloudFlare, works from Vercel!
const BASE = 'https://samehadaku.li';

async function fetchPage(url: string): Promise<string | null> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 15000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: c.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e: any) {
    console.error('[AnimeCat]', url, e.message);
    return null;
  }
}

export interface AnimeCard {
  title: string; slug: string; poster: string; episode?: string; rating?: string; type?: string;
}

export interface AnimeDetail {
  title: string; poster: string; rating: string; type: string; status: string;
  genres: string[]; synopsis: string;
  episodes: { title: string; slug: string; date: string }[];
}

export interface EpisodeData {
  title: string; animeSlug?: string; prevSlug?: string; nextSlug?: string;
  downloads: { quality: string; links: { name: string; url: string }[] }[];
  relatedEpisodes: { title: string; slug: string; date: string }[];
}

export async function getTerbaru(page = 1): Promise<AnimeCard[]> {
  const url = `${BASE}/anime/?page=${page}`;
  const html = await fetchPage(url); if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('.listupd .bs, .listupd .bsx, .serieslist li').each((_, el) => {
    const a = $(el).find('a').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || '';
    if (!href || seen.has(href) || !title) return;
    seen.add(href);
    const slug = href.replace(BASE, '').replace(/^\/+|\/+$/g, '');
    const poster = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
    const ep = $(el).find('.episode, .epx, .epxs').text().trim();
    const rating = $(el).find('.numscore, .rating, .score').text().trim();
    const type = $(el).find('.typez, .typeflag, .type').first().text().trim();
    if (title && slug) results.push({ title, slug, poster, episode: ep, rating, type });
  });
  return results;
}

export async function getPopuler(): Promise<AnimeCard[]> {
  const html = await fetchPage(`${BASE}/anime/?order=popular`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('.listupd .bs, .listupd .bsx').each((_, el) => {
    const a = $(el).find('a').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || '';
    if (!href || seen.has(href) || !title) return;
    seen.add(href);
    const slug = href.replace(BASE, '').replace(/^\/+|\/+$/g, '');
    const poster = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
    const rating = $(el).find('.numscore, .rating, .score').text().trim();
    results.push({ title, slug, poster, rating });
  });
  return results;
}

export async function searchAnime(q: string, page = 1): Promise<AnimeCard[]> {
  const url = `${BASE}/?s=${encodeURIComponent(q)}&page=${page}`;
  const html = await fetchPage(url); if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('.listupd .bs, .listupd .bsx, .search-results article').each((_, el) => {
    const a = $(el).find('a').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || '';
    if (!href || seen.has(href)) return;
    seen.add(href);
    const slug = href.replace(BASE, '').replace(/^\/+|\/+$/g, '');
    const poster = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
    const ep = $(el).find('.episode, .epx, .epxs').text().trim();
    if (title && slug) results.push({ title, slug, poster, episode: ep });
  });
  return results;
}

export async function getDaftarAnime(params: {
  page?: number; order?: string; genre?: string;
}): Promise<AnimeCard[]> {
  const { page = 1, order = 'latest', genre } = params;
  let url = `${BASE}/anime/?page=${page}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  if (order === 'title') url += '&order=title';
  else if (order === 'title-reverse') url += '&order=title&orderby=desc';
  else if (order === 'popular') url += '&order=popular';
  else if (order === 'update') url += '&order=update';

  const html = await fetchPage(url); if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('.listupd .bs, .listupd .bsx').each((_, el) => {
    const a = $(el).find('a').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || '';
    if (!href || seen.has(href)) return;
    seen.add(href);
    const slug = href.replace(BASE, '').replace(/^\/+|\/+$/g, '');
    const poster = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
    const rating = $(el).find('.numscore, .rating, .score').text().trim();
    const type = $(el).find('.typez, .typeflag, .type').first().text().trim();
    const ep = $(el).find('.episode, .epx, .epxs').text().trim();
    if (title && slug) results.push({ title, slug, poster, rating, type, episode: ep });
  });
  return results;
}

export async function getDetail(slug: string): Promise<AnimeDetail | null> {
  const url = `${BASE}/anime/${slug}/`;
  const html = await fetchPage(url); if (!html) return null;
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();
  const poster = $('.thumb img, .poster img, .anime-thumb img').first().attr('src') || '';
  const rating = $('.numscore, .rating_value, .score, .rating').first().text().trim();
  const synopsis = $('.entry-content p, .sinopsis, .desc, .synopsis').first().text().trim()
    || $('.summary .text').first().text().trim();

  const info: Record<string, string> = {};
  $('.spe span, .infoanime span, .infolist li, .sertoinfo span').each((_, el) => {
    const t = $(el).text().trim();
    const m = t.match(/^([^:]+)\s*:\s*(.+)$/);
    if (m) info[m[1].toLowerCase().trim()] = m[2].trim();
  });
  $('body').text().match(/Status\s*:\s*(\w+)/i) && (info['status'] = RegExp.$1);
  $('body').text().match(/Type\s*:\s*(\w+)/i) && (info['type'] = RegExp.$1);

  const genres = $('.genres a, .genre a, a[rel="tag"]').map((_, el) => $(el).text().trim()).get();

  const episodes: AnimeDetail['episodes'] = [];
  const seenEp = new Set<string>();
  for (const sel of ['.eplister li', '.episode-list li', '.episodelist li']) {
    $(sel).each((_, el) => {
      const a = $(el).find('a').first();
      const epTitle = a.text().trim();
      const href = a.attr('href') || '';
      const epSlug = href.replace(BASE, '').replace(/^\/+|\/+$/g, '');
      const date = $(el).find('.date, .epdate, .epl-date').text().trim();
      if (epTitle && epSlug && !seenEp.has(epSlug)) {
        seenEp.add(epSlug);
        episodes.push({ title: epTitle, slug: epSlug, date });
      }
    });
    if (episodes.length > 0) break;
  }

  return {
    title, poster, rating,
    type: info['type'] || info['tipe'] || $('.type').text().trim() || '',
    status: info['status'] || $('.status').text().trim() || '',
    genres, synopsis, episodes,
  };
}

export async function getEpisode(slug: string): Promise<EpisodeData | null> {
  const url = `${BASE}/${slug}/`;
  const html = await fetchPage(url); if (!html) return null;
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();

  let animeSlug: string | undefined;
  const animeLink = $('a[href*="/anime/"]').first().attr('href') || '';
  if (animeLink) animeSlug = animeLink.replace(BASE, '').replace(/^\/+|\/+$/g, '');

  const prevHref = $('.prev a, .naveps .prev a, .prevpost a').attr('href') || '';
  const nextHref = $('.next a, .naveps .next a, .nextpost a').attr('href') || '';
  const prevSlug = prevHref.replace(BASE, '').replace(/^\/+|\/+$/g, '') || undefined;
  const nextSlug = nextHref.replace(BASE, '').replace(/^\/+|\/+$/g, '') || undefined;

  const downloads: EpisodeData['downloads'] = [];
  const found = new Set<string>();
  $('a').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href || found.has(href)) return;
    const isDL = /gofile|krakenfiles|acefile|pixeldrain|mediafire|filedon|vidhide|mp4upload|drive\.google|mega\.nz/i.test(href);
    if (!isDL) return;
    found.add(href);
    const parentText = $(el).parent().text() + ' ' + $(el).parent().parent().text();
    const qMatch = parentText.match(/(360p|480p|720p|1080p|4K|MP4HD|FULLHD|x265|x264|MKV|MP4)/gi);
    let quality = qMatch ? qMatch[qMatch.length - 1].toUpperCase() : 'Download';
    if (quality === 'MKV' || quality === 'MP4') {
      const r = parentText.match(/(360p|480p|720p|1080p|4K)/i);
      quality = r ? r[1].toUpperCase() : quality;
    }
    let dlGroup = downloads.find(d => d.quality === quality);
    if (!dlGroup) { dlGroup = { quality, links: [] }; downloads.push(dlGroup); }
    const linkName = $(el).text().trim() || href.split('/')[2] || 'Download';
    if (!dlGroup.links.find(l => l.url === href)) dlGroup.links.push({ name: linkName, url: href });
  });

  const relatedEpisodes: EpisodeData['relatedEpisodes'] = [];
  const seenRel = new Set<string>();
  $('.eplister li, .episode-list li, .episodelist li').each((_, el) => {
    const a = $(el).find('a').first();
    const epTitle = a.text().trim();
    const href = a.attr('href') || '';
    const epSlug = href.replace(BASE, '').replace(/^\/+|\/+$/g, '');
    const date = $(el).find('.date, .epdate, .epl-date').text().trim();
    if (epTitle && epSlug && !seenRel.has(epSlug)) {
      seenRel.add(epSlug);
      relatedEpisodes.push({ title: epTitle, slug: epSlug, date });
    }
  });

  return { title, animeSlug, prevSlug, nextSlug, downloads, relatedEpisodes };
}

export function getGenres(): { name: string; slug: string }[] {
  const genres = [
    'Action','Adult Cast','Adventure','Anthropomorphic','Avant Garde','Boys Love','CGDCT','Childcare',
    'Comedy','Crossdressing','Delinquents','Detective','Drama','Ecchi','Educational','Erotica',
    'Fantasy','Gag Humor','Girls Love','Gore','Gourmet','Harem','Hentai','High Stakes Game',
    'Historical','Horror','Idols (Female)','Idols (Male)','Isekai','Iyashikei','Josei','Kids',
    'Love Polygon','Love Status Quo','Magical Sex Shift','Mahou Shoujo','Martial Arts','Mecha',
    'Medical','Military','Music','Mystery','Mythology','Organized Crime','Otaku Culture','Parody',
    'Performing Arts','Pets','Psychological','Racing','Reincarnation','Reverse Harem','Romance',
    'Romantic Subtext','Samurai','School','Sci-Fi','Seinen','Shoujo','Shounen','Showbiz',
    'Slice of Life','Space','Sports','Strategy Game','Super Power','Supernatural','Survival',
    'Suspense','Team Sports','Time Travel','Urban Fantasy','Vampire','Video Game','Villainess',
    'Visual Arts','Workplace',
  ];
  return genres.map(name => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
  }));
}
