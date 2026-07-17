import * as cheerio from 'cheerio';

// USE samehadaku.li — NO CloudFlare, works from Vercel!
const BASE = 'https://samehadaku.li';
const HOST = 'samehadaku.li';

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
    console.error('[AnimeCat]', url, e.message);
    return null;
  }
}

// Helper: extract real poster from img src/data-src (skip lazyload placeholders)
function getPoster($: any, el: any): string {
  const img = $(el).find('img').first();
  const src = img.attr('src') || '';
  const dataSrc = img.attr('data-src') || '';
  if (dataSrc && !dataSrc.includes('svg+xml') && !dataSrc.includes('js/jquery') && !dataSrc.includes('acscdn')) return dataSrc;
  if (src && !src.includes('svg+xml') && !src.startsWith('data:')) return src;
  return dataSrc || src || '';
}

function cleanSlug(href: string): string {
  return href.replace(BASE, '').replace(/^\/+|\/+$/g, '').replace(/\/$/, '');
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
    const slug = cleanSlug(href);
    const poster = getPoster($, el);
    const ep = $(el).find('.episode, .epx, .epxs, .sb').text().trim();
    const rating = $(el).find('.numscore, .rating, .score').text().trim();
    const type = $(el).find('.typez, .typeflag, .type').first().text().trim();
    if (title && slug) results.push({ title, slug, poster, episode: ep, rating, type });
  });

  // Filter hanya yang tidak Completed
  return results.filter(r => {
    if (!r.episode) return true;
    const ep = r.episode.toLowerCase();
    return !ep.includes('completed');
  });
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
    const slug = cleanSlug(href);
    const poster = getPoster($, el);
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
    const slug = cleanSlug(href);
    const poster = getPoster($, el);
    const ep = $(el).find('.episode, .epx, .epxs, .sb').text().trim();
    if (title && slug) results.push({ title, slug, poster, episode: ep });
  });
  return results;
}

export async function getDaftarAnime(params: {
  page?: number; order?: string; genre?: string;
}): Promise<AnimeCard[]> {
  const { page = 1, order = 'latest', genre } = params;
  let url: string;
  if (genre) {
    if (page <= 1) {
      url = `${BASE}/genres/${encodeURIComponent(genre)}/`;
    } else {
      url = `${BASE}/genres/${encodeURIComponent(genre)}/page/${page}/`;
    }
    if (order === 'title') url += '&order=title';
    else if (order === 'popular') url += '&order=popular';
    else if (order === 'update') url += '&order=update';
  } else {
    url = `${BASE}/anime/?page=${page}`;
    if (order === 'title') url += '&order=title';
    else if (order === 'popular') url += '&order=popular';
    else if (order === 'update') url += '&order=update';
  }

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
    const slug = cleanSlug(href);
    const poster = getPoster($, el);
    const rating = $(el).find('.numscore, .rating, .score').text().trim();
    const type = $(el).find('.typez, .typeflag, .type').first().text().trim();
    const ep = $(el).find('.episode, .epx, .epxs, .sb').text().trim();
    if (title && slug) results.push({ title, slug, poster, rating, type, episode: ep });
  });
  return results;
}

export async function getDetail(slug: string): Promise<AnimeDetail | null> {
  const url = `${BASE}/anime/${slug}/`;
  const html = await fetchPage(url); if (!html) return null;
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();
  const posterImg = $('.thumb img, .poster img, .anime-thumb img').first();
  const poster = (posterImg.attr('data-src') && !posterImg.attr('data-src')?.includes('svg+xml') && !posterImg.attr('data-src')?.includes('acscdn') ? posterImg.attr('data-src') : posterImg.attr('src')) || '';

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

  const genresSet = new Set<string>();
  $('.genxed a, .genres a[rel="tag"]').each((_, el) => {
    const g = $(el).text().trim();
    if (g) genresSet.add(g);
  });
  if (genresSet.size === 0) {
    $('a[rel="tag"]').each((_, el) => {
      const g = $(el).text().trim();
      if (g && g.length < 30) genresSet.add(g);
    });
  }
  const genres = Array.from(genresSet);

  const episodes: AnimeDetail['episodes'] = [];
  const seenEp = new Set<string>();
  for (const sel of ['.eplister li', '.episode-list li', '.episodelist li']) {
    $(sel).each((_, el) => {
      const a = $(el).find('a').first();
      const epTitle = a.text().trim();
      const href = a.attr('href') || '';
      const epSlug = cleanSlug(href);
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
  if (animeLink) animeSlug = cleanSlug(animeLink);

  const prevHref = $('.naveps .nvs a[rel="prev"], .prev a, .naveps .prev a, .prevpost a, .naveps .prevpage a, a[aria-label="prev"]').attr('href') || '';
  const nextHref = $('.naveps .nvs a[rel="next"], .next a, .naveps .next a, .nextpost a, .naveps .nextpage a, a[aria-label="next"]').attr('href') || '';
  const prevSlug = prevHref.replace(BASE, '').replace(/^\/+|\/+$/g, '') || undefined;
  const nextSlug = nextHref.replace(BASE, '').replace(/^\/+|\/+$/g, '') || undefined;

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

  const downloads: EpisodeData['downloads'] = [];
  const foundUrls = new Set<string>();
  $('a').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href || foundUrls.has(href)) return;

    const isDL = /gofile|krakenfiles|acefile|pixeldrain|mediafire|filedon|vidhide|mp4upload|drive\.google|mega\.nz|streamtape|doodstream|voe\.sx|mixdrop|terabox|dropbox|zippyshare|anonfiles|racaty|uqload|streamwish|lvturbo|filelions|upload\.cat|bayfiles/i.test(href);
    if (!isDL) return;
    foundUrls.add(href);

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
    const epSlug = cleanSlug(href);
    const date = $(el).find('.date, .epdate, .epl-date').text().trim();
    if (epTitle && epSlug && !seenRel.has(epSlug)) {
      seenRel.add(epSlug);
      relatedEpisodes.push({ title: epTitle, slug: epSlug, date });
    }
  });

  return { title, animeSlug, prevSlug, nextSlug, streamUrl, downloads, relatedEpisodes };
}

export function getGenres(): { name: string; slug: string }[] {
  const genres = [
    'Action','Adult Cast','Adventure','Anthropomorphic','Avant Garde','Boys Love','CGDC','Childcare',
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
