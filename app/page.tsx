"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Sparkles, Flame, Search, Tv, Film } from "lucide-react";

interface AnimeCard { title: string; slug: string; poster: string; episode?: string; rating?: string; type?: string; }

export default function HomePage() {
  const [terbaru, setTerbaru] = useState<AnimeCard[]>([]);
  const [populer, setPopuler] = useState<AnimeCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [t, p] = await Promise.all([
          fetch('/api/animecat?action=terbaru').then(r => r.json()),
          fetch('/api/animecat?action=populer').then(r => r.json()),
        ]);
        setTerbaru(Array.isArray(t) ? t : []);
        setPopuler(Array.isArray(p) ? p : []);
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  const genres = [
    'Action','Adventure','Comedy','Drama','Fantasy','Harem','Horror',
    'Isekai','Magic','Martial Arts','Mecha','Music','Mystery','Psychological',
    'Reincarnation','Romance','School','Sci-Fi','Seinen','Shoujo','Shounen',
    'Slice of Life','Sports','Super Power','Supernatural','Thriller','Vampire',
  ].map(n => ({ name: n, slug: n.toLowerCase().replace(/\s+/g, '-') }));

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col">
      <header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center"><Play size={14} className="text-white" fill="white" /></div>
            <span className="text-lg font-black text-white">Anime<span className="text-cyan-400">Cat</span></span>
          </Link>
          <nav className="flex items-center gap-3 text-sm text-slate-400">
            <Link href="/" className="text-cyan-400 font-medium">Home</Link>
            <Link href="/search" className="hover:text-cyan-300 flex items-center gap-1"><Search size={14} />Cari</Link>
          </nav>
        </div>
      </header>

      <section className="relative py-10 md:py-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-blue-500/5 to-purple-500/3" />
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-black">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Nonton Anime Sub Indo</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-lg mx-auto">Streaming anime subtitle Indonesia gratis, download HD tersedia</p>
          <div className="flex justify-center gap-3 mt-5">
            <Link href="/search" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all"><Search size={15} />Cari Anime</Link>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 w-full space-y-8 pb-12">

        {/* Terbaru - grid with episode info */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Sparkles size={17} className="text-cyan-400" />Terbaru</h2>
            <Link href="/search?tab=terbaru" className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold">Lihat Semua →</Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({length:8}).map((_,i) => <div key={i} className="aspect-[3/4] rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />)}
            </div>
          ) : terbaru.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {terbaru.slice(0,15).map((item,i) => {
                const epNum = item.episode?.match(/Episode\s*(\d+)/i);
                const isOngoing = item.episode?.toLowerCase().includes('ongoing');
                return (
                <Link key={i} href={'/anime/'+item.slug} className="block group">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
                    {item.poster ? <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center text-slate-700"><Tv size={30} /></div>}
                    <div className="absolute top-2 left-2">
                      <span className="px-1.5 py-0.5 bg-cyan-500/90 text-[9px] font-bold text-white rounded">
                        {epNum ? 'Ep '+epNum[1] : isOngoing ? 'Ongoing' : item.episode || (item.rating ? '★ '+item.rating : '')}
                      </span>
                    </div>
                    {item.type && <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 text-[8px] font-semibold text-white/70 rounded">{item.type}</span>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"><Play size={22} className="text-white/90" fill="white"/></div>
                  </div>
                  <h3 className="mt-1.5 text-[11px] font-medium text-slate-200 line-clamp-2 group-hover:text-cyan-300 transition-colors leading-tight">{item.title}</h3>
                </Link>
              )})}
            </div>
          ) : <div className="text-center py-8 text-slate-500 bg-white/[0.02] rounded-xl text-xs">Gagal memuat data</div>}
        </section>

        {/* Populer list */}
        <section>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Flame size={17} className="text-orange-400" />Populer</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {Array.from({length:5}).map((_,i) => <div key={i} className="h-14 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />)}
            </div>
          ) : populer.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {populer.slice(0,10).map((item,i) => (
                <Link key={i} href={'/anime/'+item.slug} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.04] hover:border-cyan-400/20 transition-all group">
                  <span className="text-lg font-black text-slate-500 w-6 text-center shrink-0">{i+1}</span>
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/[0.05] shrink-0">
                    {item.poster ? <img src={item.poster} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center text-slate-700"><Tv size={14} /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 line-clamp-2">{item.title}</p>
                    {item.rating && <span className="text-[10px] text-yellow-500">★ {item.rating}</span>}
                  </div>
                </Link>
              ))}
            </div>
          ) : <div className="text-center py-8 text-slate-500 bg-white/[0.02] rounded-xl text-xs">Gagal memuat data</div>}
        </section>

        {/* Genres */}
        <section>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Film size={17} className="text-emerald-400" />Genre</h2>
          <div className="flex flex-wrap gap-1.5">
            {genres.map((g,i) => (
              <Link key={i} href={'/search?genre='+g.slug} className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full text-xs text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-300 hover:border-cyan-400/30 transition-all">{g.name}</Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.04] py-5 text-center text-[11px] text-slate-600">AnimeCat — Nonton anime gratis dari Samehadaku</footer>
    </div>
  );
}
