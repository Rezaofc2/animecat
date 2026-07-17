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
  // Remove base URL, /series/ prefix, leading/trailing slashes
  return href.replace(BASE, '').replace(/^\/series\//, '').replace(/^\/+/, '').replace(/\/+$/g, '');
}

function shortTitle(t: string): string {
  const epMatch = t.match(/Episode\s*\d+/i);
  if (epMatch) return epMatch[0];
  return t.length > 40 ? t.slice(0, 38) + '...' : t;
}

// Convert episode slug to series slug: "title-episode-X-subtitle-indonesia" -> "title"
function episodeSlugToSeriesSlug(epSlug: string): string {
  return epSlug.replace(/-episode-\d+-subtitle-indonesia\/?$/i, '').replace(/\/+$/g, '');
}

// Parse relative time or date string to simplified date + day
function parseTimeAgo(timeago: string): { date: string; day: string } {
  const idDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  if (!timeago) return { date: '', day: '' };

  // Handle "X minutes/hours/days/weeks ago" (English from otakudesu)
  const minutesMatch = timeago.match(/(\d+)\s*minutes?\s*ago/i);
  const hoursMatch = timeago.match(/(\d+)\s*hours?\s*ago/i);
  const daysMatch = timeago.match(/(\d+)\s*days?\s*ago/i);
  const weeksMatch = timeago.match(/(\d+)\s*weeks?\s*ago/i);

  const now = new Date();
  let targetDate = new Date();

  if (minutesMatch) targetDate.setMinutes(targetDate.getMinutes() - parseInt(minutesMatch[1]));
  else if (hoursMatch) targetDate.setHours(targetDate.getHours() - parseInt(hoursMatch[1]));
  else if (daysMatch) targetDate.setDate(targetDate.getDate() - parseInt(daysMatch[1]));
  else if (weeksMatch) targetDate.setDate(targetDate.getDate() - (parseInt(weeksMatch[1]) * 7));
  else {
    // Try parsing explicit date like "July 17, 2026" or "17 July 2026"
    const parsed = new Date(timeago);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }

  const d = targetDate.getDate();
  const m = enMonths[targetDate.getMonth()];
  const dayName = idDays[targetDate.getDay()];
  return {
    date: `${d} ${m}`,
    day: dayName,
  };
}

export interface AnimeCard {
  title: string; slug: string; poster: string; episode?: string; rating?: string; type?: string;
  date?: string; day?: string;
  // otakudesu-specific: original episode slug for watching directly
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
    const seriesSlug = episodeSlugToSeriesSlug(episodeSlug);
    const poster = getPoster($, el);
    const ep = $(el).find('.epx, .episode, .sb').text().trim();
    const type = $(el).find('.typez, .typeflag, .type').first().text().trim();
    const rating = $(el).find('.numscore, .rating, .score').text().trim();
    const timeago = $(el).find('.timeago').text().trim();

    const { date, day } = parseTimeAgo(timeago);

    if (title && seriesSlug) {
      results.push({
        title: shortTitle(title),
        slug: seriesSlug,           // series slug for detail page
        episodeSlug: episodeSlug,   // episode slug for direct watch
        poster,
        episode: ep,
        rating,
        type,
        date,
        day,
      });
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
    const seriesSlug = slug.includes('episode') ? episodeSlugToSeriesSlug(slug) : slug;
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
    const seriesSlug = slug.includes('episode') ? episodeSlugToSeriesSlug(slug) : slug;
    const poster = getPoster($, el);
    if (title && seriesSlug) results.push({ title: shortTitle(title), slug: seriesSlug, poster });
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
    const seriesSlug = slug.includes('episode') ? episodeSlugToSeriesSlug(slug) : slug;
    const poster = getPoster($, el);
    const rating = $(el).find('.rating, .score').text().trim() || undefined;
    if (title && seriesSlug) results.push({ title: shortTitle(title), slug: seriesSlug, poster, rating });
  });

  return results;
}

export async function getDetail(slug: string): Promise<AnimeDetail | null> {
  // Slug might be an episode slug — convert to series slug
  const seriesSlug = slug.includes('episode') ? episodeSlugToSeriesSlug(slug) : slug.replace(/\/+$/g, '');
  const url = `${BASE}/series/${seriesSlug}/`;
  const html = await fetchPage(url); if (!html) return null;
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();

  // Poster: otakudesu series page has .thumb img
  const posterImg = $('.thumb img, .poster img, img.wp-post-image').first();
  const posterEl = posterImg.parent().length ? posterImg.parent().get(0) : $('body').get(0);
  const poster = getPoster($, posterEl);

  const rating = $('.numscore, .rating_value, .score, .rating').first().text().trim();
  // Synopsis: otakudesu uses .bixbox.synp .entry-content p
  const synopsis = $('.bixbox.synp .entry-content p').first().text().trim()
    || $('.sinopsis, .desc, .synopsis').first().text().trim()
    || $('.entry-content p').first().text().trim();

  const info: Record<string, string> = {};
  $('.spe span, .infoanime span, .infolist li, .series-info span, .data').each((_: number, el: any) => {
    const t = $(el).text().trim();
    const m = t.match(/^([^:]+)\s*:\s*(.+)$/);
    if (m) info[m[1].toLowerCase().trim()] = m[2].trim();
  });

  // Extract additional metadata
  const totalEpisodes = info['total episode'] || info['episodes'] || '';
  const duration = info['duration'] || info['durasi'] || '';
  const releaseDate = info['released on'] || info['released'] || info['tanggal rilis'] || '';
  // Clean studio: remove HTML entities, trim
  const rawStudio = info['studio'] || '';
  const studio = rawStudio.replace(/&[a-z]+;/gi, '').trim();

  const genresSet = new Set<string>();
  // Otakudesu: genre links have /genres/ in href, not /tag/
  $('.genxed a[href*="/genres/"], .genres a[href*="/genres/"]').each((_: number, el: any) => {
    const g = $(el).text().trim();
    if (g && g.length < 30) genresSet.add(g);
  });
  // Fallback: generic a[rel="tag"] but filter by href containing /genres/
  if (genresSet.size === 0) {
    $('a[rel="tag"][href*="/genres/"]').each((_: number, el: any) => {
      const g = $(el).text().trim();
      if (g && g.length < 30) genresSet.add(g);
    });
  }

  // Episodes: otakudesu uses .eplister with <li><a> structure:
  // <li><a href="..."><div class="epl-num">2</div><div class="epl-title">...</div><div class="epl-date">...</div></a></li>
  const episodes: AnimeDetail['episodes'] = [];
  const seenEp = new Set<string>();

  // Primary: .eplister li a (otakudesu structure)
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

  // Fallback: direct .eplister a (without li wrapper)
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

  // Fallback: samehadaku-style .eplister li / .episode-list li
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
    totalEpisodes, duration, releaseDate, studio,
    genres: Array.from(genresSet), synopsis, episodes,
  };
}

export async function getEpisode(slug: string): Promise<EpisodeData | null> {
  const url = `${BASE}/${slug}/`;
  const html = await fetchPage(url); if (!html) return null;
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();

  // Stream URL: check iframe with data-litespeed-src and regular iframes
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

  if (dlMap.size === 0) {
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
