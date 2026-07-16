import Link from "next/link";
import { Play, Sparkles, Flame, Clock, Search, Tv, Film } from "lucide-react";

export const revalidate = 300;

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(base + path, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

interface AnimeCard {
  title: string; slug: string; poster: string; episode?: string; rating?: string; type?: string;
}
interface Genre { name: string; slug: string; }

function getGenres(): Genre[] {
  return [
    'Action','Adventure','Comedy','Drama','Ecchi','Fantasy','Game','Harem','Historical','Horror',
    'Isekai','Magic','Martial Arts','Mecha','Military','Music','Mystery','Psychological',
    'Reincarnation','Romance','Samurai','School','Sci-Fi','Seinen','Shoujo','Shounen',
    'Slice of Life','Space','Sports','Super Power','Supernatural','Thriller','Vampire',
  ].map(n => ({ name: n, slug: n.toLowerCase().replace(/\s+/g, '-') }));
}

export default async function HomePage() {
  const [terbaru, populer] = await Promise.all([
    apiGet<AnimeCard[]>('/api/animecat?action=terbaru'),
    apiGet<AnimeCard[]>('/api/animecat?action=populer'),
  ]);

  const genres = getGenres();

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center"><Play size={14} className="text-white" fill="white" /></div>
            <span className="text-lg font-black tracking-tight text-white">Anime<span className="text-cyan-400">Cat</span></span>
          </Link>
          <nav className="flex items-center gap-3 text-sm text-slate-400">
            <Link href="/" className="hover:text-cyan-300 font-medium text-cyan-400">Home</Link>
            <Link href="/search" className="hover:text-cyan-300 flex items-center gap-1"><Search size={14} />Cari</Link>
            <Link href="/daftar" className="hover:text-cyan-300">A-Z</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-10 md:py-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-blue-500/5 to-purple-500/3" />
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Nonton Anime Sub Indo</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-lg mx-auto">Streaming anime subtitle Indonesia gratis, download HD tersedia</p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <Link href="/search" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
              <Search size={15} />Cari Anime
            </Link>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 w-full space-y-10 pb-12">

        {/* Terbaru */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div><h2 className="text-lg font-bold text-white flex items-center gap-2"><Sparkles size={17} className="text-cyan-400" />Terbaru</h2></div>
            <Link href="/search?tab=terbaru" className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold">Lihat Semua →</Link>
          </div>
          {(terbaru || []).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {(terbaru || []).slice(0, 12).map((item, i) => (
                <Link key={i} href={'/anime/' + item.slug} className="block group">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
                    {item.poster ? <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-slate-700"><Tv size={32} /></div>}
                    {item.episode && <span className="absolute top-2 left-2 px-2 py-0.5 bg-cyan-500/90 text-[10px] font-bold text-white rounded-md">{item.episode}</span>}
                    {item.rating && <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-yellow-500/90 text-[10px] font-bold text-black rounded">★ {item.rating}</span>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3"><Play size={28} className="text-white/90" fill="white" /></div>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-slate-200 line-clamp-2 group-hover:text-cyan-300 transition-colors">{item.title}</h3>
                </Link>
              ))}
            </div>
          ) : <div className="text-center py-12 text-slate-500 bg-white/[0.02] rounded-xl text-sm">Memuat...</div>}
        </section>

        {/* Populer */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div><h2 className="text-lg font-bold text-white flex items-center gap-2"><Flame size={17} className="text-orange-400" />Populer</h2></div>
          </div>
          {(populer || []).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {(populer || []).slice(0, 10).map((item, i) => (
                <Link key={i} href={'/anime/' + item.slug} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.04] hover:border-cyan-400/20 transition-all group">
                  <span className="text-lg font-black text-slate-500 w-6 text-center shrink-0">{i + 1}</span>
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/[0.05] shrink-0">
                    {item.poster ? <img src={item.poster} alt={item.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-slate-700"><Tv size={14} /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-2">{item.title}</p>
                    {item.rating && <span className="text-[10px] text-yellow-500">★ {item.rating}</span>}
                  </div>
                </Link>
              ))}
            </div>
          ) : <div className="text-center py-12 text-slate-500 bg-white/[0.02] rounded-xl text-sm">Memuat...</div>}
        </section>

        {/* History */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div><h2 className="text-lg font-bold text-white flex items-center gap-2"><Clock size={17} className="text-purple-400" />Terakhir Ditonton</h2></div>
          </div>
          <div id="history-container" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="text-center py-8 text-slate-500 bg-white/[0.02] rounded-xl text-sm col-span-full">
              <Clock size={28} className="mx-auto mb-2 text-slate-600" />
              <p>Belum ada riwayat tontonan</p>
            </div>
          </div>
        </section>

        {/* Genre */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div><h2 className="text-lg font-bold text-white flex items-center gap-2"><Film size={17} className="text-emerald-400" />Genre</h2></div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {genres.map((g, i) => (
              <Link key={i} href={'/search?genre=' + g.slug} className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full text-xs text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-300 hover:border-cyan-400/30 transition-all">{g.name}</Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.04] py-6 text-center text-[11px] text-slate-600">
        AnimeCat — Nonton anime gratis dari Samehadaku
      </footer>

      {/* Client history loader */}
      <script dangerouslySetInnerHTML={{ __html: `
        try {
          var h=JSON.parse(localStorage.getItem('animecat_history')||'[]');
          var c=document.getElementById('history-container');
          var g=function(item){return '<a href="/anime/'+item.slug+'" class="block group"><div class="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">'+(item.poster?'<img src="'+item.poster+'" alt="" class="w-full h-full object-cover" loading="lazy"/>':'')+'<div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"><span class="text-[10px] text-white/80">'+(item.lastEp||'')+'</span></div></div><h3 class="mt-1.5 text-xs text-slate-300 line-clamp-2">'+item.title+'</h3></a>';};
          if(c&&h.length>0)c.innerHTML=h.slice(0,12).map(g).join('');
        }catch(e){}
      `}} />
    </div>
  );
}
