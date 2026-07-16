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

// ─── Terbaru ──────────────────────────────────────────────────
export async function getTerbaru(page = 1): Promise<AnimeCard[]> {
  const url = page > 1 ? BASE + '/anime-terbaru/page/' + page + '/' : BASE + '/';
  const html = await fetchPage(url); if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('.post-show li, article.post, .animepost, .listupd .bs, div.bs').each((_, el) => {
    const a = $(el).find('h2 a, .data a, .tt a, a.tip').first();
    let title = a.attr('title') || a.text().trim();
    let href = a.attr('href') || '';
    if (!href) { const anyA = $(el).find('a').first(); href = anyA.attr('href') || ''; if (!title) title = anyA.text().trim(); }
    if (!href || seen.has(href)) return;
    seen.add(href);
    const slug = href.replace(BASE, '').replace(/^\/+|\/+$/g, '');
    const poster = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
    const ep = $(el).find('.episode, .ep, .epx, .epxs').text().trim();
    const rating = $(el).find('.numscore, .rating, .score').text().trim();
    if (title && slug) results.push({ title, slug, poster, episode: ep, rating });
  });
  return results;
}

// ─── Populer ──────────────────────────────────────────────────
export async function getPopuler(): Promise<AnimeCard[]> {
  const html = await fetchPage(BASE + '/top10/'); if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('.top-list li, .topten li, .ranking li, article').each((_, el) => {
    const a = $(el).find('a').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || '';
    if (!href || seen.has(href) || !title) return;
    seen.add(href);
    const slug = href.replace(BASE, '').replace(/^\/|\/$/g, '');
    const poster = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
    const rating = $(el).find('.numscore, .rating, .score').text().trim();
    results.push({ title, slug, poster, rating });
  });
  return results;
}

// ─── Search ───────────────────────────────────────────────────
export async function searchAnime(q: string, page = 1): Promise<AnimeCard[]> {
  const url = BASE + '/page/' + page + '/?s=' + encodeURIComponent(q);
  const html = await fetchPage(url); if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('.post-show li, article.post, .animepost, .listupd .bs, div.bs').each((_, el) => {
    const a = $(el).find('h2 a, .data a, .tt a, a.tip').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || $(el).find('a').first().attr('href') || '';
    if (!href || seen.has(href)) return;
    seen.add(href);
    const slug = href.replace(BASE, '').replace(/^\/|\/$/g, '');
    const poster = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
    const ep = $(el).find('.episode, .ep, .epxs').text().trim();
    if (title && slug) results.push({ title, slug, poster, episode: ep });
  });
  return results;
}

// ─── Daftar Anime A-Z (dengan filter genre) ──────────────────
export async function getDaftarAnime(params: {
  page?: number; status?: string; type?: string; order?: string; genre?: string;
}): Promise<AnimeCard[]> {
  const { page = 1, order = 'latest', genre } = params;
  let url = BASE + '/daftar-anime-2/';
  const qs: string[] = [];
  if (genre) qs.push('genre%5B%5D=' + encodeURIComponent(genre));
  if (order && order !== 'latest') {
    if (order === 'popular') { /* daftar-anime handles popular */ }
    else if (order === 'title') qs.push('order=title');
    else if (order === 'title-reverse') qs.push('order=title-reverse');
    else if (order === 'update') qs.push('order=update');
  }
  if (page > 1) qs.push('page=' + page);
  if (qs.length) url += '?' + qs.join('&');

  const html = await fetchPage(url); if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('.listupd .bs, .listupd article, .bsx, .anime-list article').each((_, el) => {
    const a = $(el).find('a.tip, h2 a, .tt a').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || $(el).find('a').first().attr('href') || '';
    if (!href || seen.has(href)) return;
    seen.add(href);
    const slug = href.replace(BASE, '').replace(/^\/|\/$/g, '');
    const poster = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
    const rating = $(el).find('.numscore, .rating, .score').text().trim();
    const type = $(el).find('.typez, .typeflag, span.type').first().text().trim();
    const ep = $(el).find('.epx, .epxs, .episode').text().trim();
    if (title && slug) results.push({ title, slug, poster, rating, type, episode: ep });
  });
  return results;
}

// ─── Detail Anime ─────────────────────────────────────────────
export async function getDetail(slug: string): Promise<AnimeDetail | null> {
  const url = BASE + '/' + slug + '/';
  const html = await fetchPage(url); if (!html) return null;
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();
  const poster = $('.thumb img, .poster img').first().attr('src') || '';

  const rating = $('.numscore, .rating_value, .score').first().text().trim();

  const info: Record<string, string> = {};
  $('.infoanime span, .spe span, .infolist li').each((_, el) => {
    const t = $(el).text().trim();
    const m = t.match(/^(.+?)\s*:\s*(.+)$/);
    if (m) info[m[1].toLowerCase().trim()] = m[2].trim();
  });

  const genres = $('.genres a, .genre a, .genres a[rel="tag"]').map((_, el) => $(el).text().trim()).get();

  const synopsis = $('.entry-content p, .sinopsis, .desc').first().text().trim()
    || $('.entry-content').first().text().trim();

  const episodes: AnimeDetail['episodes'] = [];
  const seenEp = new Set<string>();

  for (const sel of ['.episode-list li', '.episodelist li', '.eplister li']) {
    $(sel).each((_, el) => {
      const a = $(el).find('a').first();
      const epTitle = a.text().trim();
      const href = a.attr('href') || '';
      const epSlug = href.replace(BASE, '').replace(/^\/|\/$/g, '');
      const date = $(el).find('.date, .epdate, .zeebr').text().trim();
      if (epTitle && epSlug && !seenEp.has(epSlug)) {
        seenEp.add(epSlug);
        episodes.push({ title: epTitle, slug: epSlug, date });
      }
    });
    if (episodes.length > 0) break;
  }

  return {
    title, poster, rating,
    type: info['type'] || info['tipe'] || '',
    status: info['status'] || '',
    genres, synopsis, episodes,
  };
}

// ─── Nonton / Episode ────────────────────────────────────────
export async function getEpisode(slug: string): Promise<EpisodeData | null> {
  const url = BASE + '/' + slug + '/';
  const html = await fetchPage(url); if (!html) return null;
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();

  let animeSlug: string | undefined;
  const animeLink = $('a[href*="/anime/"]').first().attr('href') || '';
  if (animeLink) animeSlug = animeLink.replace(BASE, '').replace(/^\/|\/$/g, '');

  const prevHref = $('.prevpost a, .prev a, .naveps .prev a').attr('href') || '';
  const nextHref = $('.nextpost a, .next a, .naveps .next a').attr('href') || '';
  const prevSlug = prevHref.replace(BASE, '').replace(/^\/|\/$/g, '') || undefined;
  const nextSlug = nextHref.replace(BASE, '').replace(/^\/|\/$/g, '') || undefined;

  const downloads: EpisodeData['downloads'] = [];
  const found = new Set<string>();

  // Comprehensive download link scraping
  $('a').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    const text = $(el).text().trim();
    if (!href || found.has(href)) return;
    const isDownload = /gofile|krakenfiles|acefile|pixeldrain|mediafire|filedon|vidhide|mp4upload/i.test(href);
    if (!isDownload) return;
    found.add(href);

    const parentText = $(el).parent().text().trim() + ' ' + $(el).parent().parent().text().trim();
    const qMatch = parentText.match(/(360p|480p|720p|1080p|4K|MP4HD|FULLHD|x265|x264|MKV|MP4)/gi);
    let quality = qMatch ? qMatch[qMatch.length - 1].toUpperCase() : 'Download';
    if (quality === 'MKV' || quality === 'MP4') {
      const r = parentText.match(/(360p|480p|720p|1080p|4K)/i);
      quality = r ? r[1].toUpperCase() : quality;
    }

    let dlGroup = downloads.find(d => d.quality === quality);
    if (!dlGroup) { dlGroup = { quality, links: [] }; downloads.push(dlGroup); }
    const linkName = text || href.split('/')[2] || 'Download';
    if (!dlGroup.links.find(l => l.url === href)) dlGroup.links.push({ name: linkName, url: href });
  });

  // Related episodes
  const relatedEpisodes: EpisodeData['relatedEpisodes'] = [];
  const seenRel = new Set<string>();
  $('.episode-list li, .episodelist li, .related-episode li, .eplister li').each((_, el) => {
    const a = $(el).find('a').first();
    const epTitle = a.text().trim();
    const href = a.attr('href') || '';
    const epSlug = href.replace(BASE, '').replace(/^\/|\/$/g, '');
    const date = $(el).find('.date, .epdate, .zeebr').text().trim();
    if (epTitle && epSlug && !seenRel.has(epSlug)) {
      seenRel.add(epSlug);
      relatedEpisodes.push({ title: epTitle, slug: epSlug, date });
    }
  });

  return { title, animeSlug, prevSlug, nextSlug, downloads, relatedEpisodes };
}

// ─── Genre List (exact from Samehadaku daftar-anime page) ────
export function getGenres(): { name: string; slug: string }[] {
  const genres = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Game', 'Harem',
    'Historical', 'Horror', 'Isekai', 'Magic', 'Martial Arts', 'Mecha', 'Military',
    'Music', 'Mystery', 'Psychological', 'Reincarnation', 'Romance', 'Samurai',
    'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai',
    'Slice of Life', 'Space', 'Sports', 'Super Power', 'Supernatural', 'Thriller',
    'Vampire', 'Yaoi', 'Yuri',
    // Additional genres from real Samehadaku anime pages
    'Adult Cast', 'Demons', 'Gore', 'Gourmet', 'Iyashikei', 'Love Status Quo',
    'Mahou Shoujo', 'Medical', 'Mythology', 'Otaku Culture', 'Parody', 'Police',
    'Strategy Game', 'Team Sports', 'Villainess', 'Time Travel', 'Urban Fantasy',
    'Gag Humor', 'Organized Crime',
  ];
  return genres.map(name => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
  }));
}
