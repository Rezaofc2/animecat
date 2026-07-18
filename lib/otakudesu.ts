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
        'Cookie': 'cf_clearance=fake',
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
  return href.replace(BASE, '').replace(/^\/+/g, '').replace(/\/+$/g, '').replace(/^series\//, '');
}

function shortTitle(t: string): string {
  const clean = t.replace(/\s*Episode\s+\d+\s*Subtitle Indonesia\s*$/i, '').trim();
  if (clean.length > 40) return clean.slice(0, 38) + '...';
  return clean;
}

function epSlugToSeriesSlug(epSlug: string): string {
  return epSlug.replace(/-episode-\d+-.*$/i, '').replace(/\/+$/g, '');
}

// Resolve series slug: try direct URL → search fallback
async function resolveSeriesSlug(slug: string): Promise<string | null> {
  const candidate = slug.includes('episode') ? epSlugToSeriesSlug(slug) : slug;

  // Try direct URL
  const testUrl = `${BASE}/series/${candidate}/`;
  const testHtml = await fetchPage(testUrl);
  if (testHtml) {
    const $$ = cheerio.load(testHtml);
    const h1 = $$('h1').first().text().trim();
    if (h1 && h1.length > 5 && !$$('body').html()?.includes('Latest Release')) {
      return candidate;
    }
  }

  // If slug is episode, fetch episode page for breadcrumb link
  if (slug.includes('episode')) {
    const epUrl = `${BASE}/${slug}/`;
    const epHtml = await fetchPage(epUrl);
    if (epHtml) {
      const $$e = cheerio.load(epHtml);
      const seriesLink = $$e('a[href*="/series/"]').first().attr('href') || '';
      if (seriesLink) {
        const m = seriesLink.match(/\/series\/([^/]+)/);
        if (m) return m[1];
      }
    }
    return null;
  }

  // Fallback: search by keywords extracted from slug
  const words = candidate.replace(/-/g, ' ').split(' ').filter(w => w.length > 3);
  const searchQuery = words.slice(0, 2).join(' ');
  if (!searchQuery) return null;

  const searchUrl = `${BASE}/page/1/?s=${encodeURIComponent(searchQuery)}`;
  const searchHtml = await fetchPage(searchUrl);
  if (searchHtml) {
    const $$s = cheerio.load(searchHtml);
    const seriesLink = $$s('a[href*="/series/"]').first().attr('href') || '';
    if (seriesLink) {
      const m = seriesLink.match(/\/series\/([^/]+)/);
      if (m) return m[1];
    }
  }

  return null;
}

function parseTimeAgo(timeago: string): { date: string; day: string } {
  const idDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
  if (!timeago) return { date: '', day: '' };

  const minutesMatch = timeago.match(/(\d+)\s*minutes?\s*ago/i);
  const hoursMatch = timeago.match(/(\d+)\s*hours?\s*ago/i);
  const daysMatch = timeago.match(/(\d+)\s*days?\s*ago/i);
  const weeksMatch = timeago.match(/(\d+)\s*weeks?\s*ago/i);

  let targetDate = new Date();
  if (minutesMatch) targetDate.setMinutes(targetDate.getMinutes() - parseInt(minutesMatch[1]));
  else if (hoursMatch) targetDate.setHours(targetDate.getHours() - parseInt(hoursMatch[1]));
  else if (daysMatch) targetDate.setDate(targetDate.getDate() - parseInt(daysMatch[1]));
  else if (weeksMatch) targetDate.setDate(targetDate.getDate() - (parseInt(weeksMatch[1]) * 7));
  else {
    const parsed = new Date(timeago);
    if (!isNaN(parsed.getTime())) targetDate = parsed;
  }

  const d = targetDate.getDate();
  const m = enMonths[targetDate.getMonth()];
  const dayName = idDays[targetDate.getDay()];
  return { date: `${d} ${m}`, day: dayName };
}

// ---------- INTERFACES ----------

export interface AnimeCard {
  title: string; slug: string; poster: string; episode?: string; rating?: string; type?: string;
  date?: string; day?: string;
  episodeSlug?: string;
}

export interface AnimeDetail {
  title: string; poster: string; rating: string; type: string; status: string;
  totalEpisodes?: string; duration?: string; releaseDate?: string; studio?: string;
  genres: string[]; synopsis: string;
  episodes: { title: string; slug: string; date: string }[];
}

export interface EpisodeData {
  title: string; animeSlug?: string; prevSlug?: string; nextSlug?: string;
  streamUrl?: string;
  downloads: { quality: string; links: { name: string; url: string }[] }[];
  relatedEpisodes: { title: string; slug: string; date: string }[];
}

// ---------- SCRAPING ----------

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
    const episodeSlug = cleanSlug(href);
    const seriesSlug = epSlugToSeriesSlug(episodeSlug);
    const poster = getPoster($, el);
    const ep = $(el).find('.epx, .episode, .sb').text().trim();
    const type = $(el).find('.typez, .typeflag, .type').first().text().trim();
    const rating = $(el).find('.numscore, .rating, .score').text().trim();
    const timeago = $(el).find('.timeago').text().trim();
    const { date, day } = parseTimeAgo(timeago);
    if (title && seriesSlug) {
      results.push({ title: shortTitle(title), slug: seriesSlug, episodeSlug, poster, episode: ep, rating, type, date, day });
    }
  });
  return results;
}

export async function getPopuler(): Promise<AnimeCard[]> {
  const html = await fetchPage(`${BASE}/`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const results: AnimeCard[] = [];
  const seen = new Set<string>();

  $('.serieslist li, .popular-post article, .widget-post article').each((_: number, el: any) => {
    const a = $(el).find('a').first();
    const title = a.attr('title') || a.text().trim();
    const href = a.attr('href') || '';
    if (!href || seen.has(href) || !title) return;
    seen.add(href);
    const slug = cleanSlug(href);
    const seriesSlug = slug.includes('/series/') ? cleanSlug(href) : epSlugToSeriesSlug(slug);
    const poster = getPoster($, el);
    const rating = $(el).find('.rating, .score').text().trim() || undefined;
    if (title && seriesSlug) results.push({ title: shortTitle(title), slug: seriesSlug, poster, rating });
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
    const seriesSlug = slug.includes('/series/') ? cleanSlug(href) : epSlugToSeriesSlug(slug);
    const poster = getPoster($, el);
    if (title && seriesSlug) results.push({ title: shortTitle(title), slug: seriesSlug, poster });
  });
  return results;
}

export async function getDaftarAnime(params: { page?: number; order?: string; genre?: string }): Promise<AnimeCard[]> {
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
    const seriesSlug = slug.includes('/series/') ? cleanSlug(href) : epSlugToSeriesSlug(slug);
    const poster = getPoster($, el);
    const rating = $(el).find('.rating, .score').text().trim() || undefined;
    if (title && seriesSlug) results.push({ title: shortTitle(title), slug: seriesSlug, poster, rating });
  });
  return results;
}

export async function getDetail(slug: string): Promise<AnimeDetail | null> {
  const seriesSlug = await resolveSeriesSlug(slug);
  if (!seriesSlug) return null;

  const url = `${BASE}/series/${seriesSlug}/`;
  const html = await fetchPage(url);
  if (!html) return null;
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();
  if (!title || title === 'Otaku Desu' || title.includes('Latest Release')) return null;

  const posterImg = $('.thumb img, .poster img, img.wp-post-image').first();
  const posterEl = posterImg.parent().length ? posterImg.parent().get(0) : $('body').get(0);
  const poster = getPoster($, posterEl);

  const rating = $('.numscore, .rating_value, .score, .rating').first().text().trim();
  const synopsis = $('.bixbox.synp .entry-content p').first().text().trim()
    || $('.sinopsis, .desc, .synopsis').first().text().trim()
    || $('.entry-content p').first().text().trim();

  const info: Record<string, string> = {};
  $('.spe span, .infoanime span, .infolist li, .series-info span, .data').each((_: number, el: any) => {
    const t = $(el).text().trim();
    const m = t.match(/^([^:]+)\s*:\s*(.+)$/);
    if (m) info[m[1].toLowerCase().trim()] = m[2].trim();
  });

  const totalEpisodes = info['total episode'] || info['episodes'] || '';
  const duration = info['duration'] || info['durasi'] || '';
  const releaseDate = info['released on'] || info['released'] || info['tanggal rilis'] || '';
  const rawStudio = info['studio'] || '';
  const studio = rawStudio.replace(/&[a-z]+;/gi, '').trim();

  const genresSet = new Set<string>();
  $('.genxed a[href*="/genres/"], .genres a[href*="/genres/"]').each((_: number, el: any) => {
    const g = $(el).text().trim();
    if (g && g.length < 30) genresSet.add(g);
  });
  if (genresSet.size === 0) {
    $('a[rel="tag"][href*="/genres/"]').each((_: number, el: any) => {
      const g = $(el).text().trim();
      if (g && g.length < 30) genresSet.add(g);
    });
  }

  const episodes: AnimeDetail['episodes'] = [];
  const seenEp = new Set<string>();

  $('.eplister li a').each((_: number, el: any) => {
    const href = $(el).attr('href') || '';
    if (!href) return;
    const epSlug = cleanSlug(href);
    if (!epSlug || seenEp.has(epSlug)) return;
    seenEp.add(epSlug);
    const num = $(el).find('.epl-num').text().trim();
    const epTitle = $(el).find('.epl-title').text().trim() || ('Episode ' + num);
    const date = $(el).find('.epl-date').text().trim();
    episodes.push({ title: epTitle, slug: epSlug, date });
  });

  if (episodes.length === 0) {
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
  }

  return { title, poster, rating, type: info['type'] || info['tipe'] || $('.typez').first().text().trim() || '', status: info['status'] || $('.status').text().trim() || '', totalEpisodes, duration, releaseDate, studio, genres: Array.from(genresSet), synopsis, episodes };
}

export async function getEpisode(slug: string): Promise<EpisodeData | null> {
  const url = `${BASE}/${slug}/`;
  const html = await fetchPage(url); if (!html) return null;
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim();

  let streamUrl: string | undefined;
  const lazyIframe = $('iframe[data-litespeed-src]').first().attr('data-litespeed-src');
  if (lazyIframe && (lazyIframe.includes('video.g') || lazyIframe.includes('blogger') || lazyIframe.includes('embed'))) streamUrl = lazyIframe;
  if (!streamUrl) {
    const iframeSrc = $('iframe').first().attr('src');
    if (iframeSrc && !iframeSrc.includes('about:blank') && !iframeSrc.includes('facebook')) streamUrl = iframeSrc;
  }

  let animeSlug: string | undefined;
  const animeLink = $('a[href*="/series/"]').first().attr('href') || '';
  if (animeLink) animeSlug = cleanSlug(animeLink);

  const prevHref = $('.naveps .prev a, a[rel="prev"], .prevpost a').attr('href') || '';
  const nextHref = $('.naveps .next a, a[rel="next"], .nextpost a').attr('href') || '';
  const prevSlug = prevHref ? cleanSlug(prevHref) : undefined;
  const nextSlug = nextHref ? cleanSlug(nextHref) : undefined;

  const downloads: EpisodeData['downloads'] = [];
  const dlMap = new Map<string, { name: string; url: string }[]>();
  $('.download ul li, .listdownload li, .soraddl a, .entry-content a[href*="gofile"], .entry-content a[href*="drive"], .entry-content a[href*="acefile"], .entry-content a[href*="mega"]').each((_: number, el: any) => {
    const a = $(el).is('a') ? $(el) : $(el).find('a').first();
    const href = a.attr('href') || '';
    const text = a.text().trim() || $(el).text().trim();
    if (!href || href.includes('#')) return;
    let quality = 'Download';
    const parentText = $(el).parent().text() || '';
    const qMatch = parentText.match(/(\d+p)/) || text.match(/(\d+p)/);
    if (qMatch) quality = qMatch[1];
    if (!dlMap.has(quality)) dlMap.set(quality, []);
    dlMap.get(quality)!.push({ name: text.replace(quality, '').replace(/[\(\)]/g, '').trim() || 'Link', url: href });
  });

  for (const [quality, links] of dlMap) downloads.push({ quality, links });

  const relatedEpisodes: EpisodeData['relatedEpisodes'] = [];
  $('.eplister li, .episodelist li').each((_: number, el: any) => {
    const a = $(el).find('a').first();
    const epTitle = a.text().trim();
    const href = a.attr('href') || '';
    const epSlug = cleanSlug(href);
    const date = $(el).find('.date, .epdate, .epl-date').text().trim();
    if (epTitle && epSlug) relatedEpisodes.push({ title: shortTitle(epTitle), slug: epSlug, date });
  });

  return { title: shortTitle(title), animeSlug, prevSlug, nextSlug, streamUrl, downloads, relatedEpisodes };
}

export function getGenres(): string[] {
  return ['Action','Adventure','Comedy','Drama','Ecchi','Fantasy','Game','Harem','Historical','Horror','Isekai','Magic','Martial Arts','Mecha','Military','Music','Mystery','Psychological','Reincarnation','Romance','Samurai','School','Sci-Fi','Seinen','Shoujo','Shounen','Slice of Life','Space','Sports','Super Power','Supernatural','Thriller','Vampire'];
}
