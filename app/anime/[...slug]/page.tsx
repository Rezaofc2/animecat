"use client";

import Link from "next/link";
import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Tv, Circle, ChevronRight, MonitorPlay, Download, Loader2 } from "lucide-react";

interface AnimeDetail {
  title: string; poster: string; rating: string; type: string; status: string;
  totalEpisodes?: string; duration?: string; releaseDate?: string; studio?: string;
  genres: string[]; synopsis: string;
  episodes: { title: string; slug: string; date: string }[];
  streamUrl?: string;
}

export default function AnimeDetailPage() {
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [slug, setSlug] = useState("");
  const [server, setServer] = useState("2");

  useEffect(() => {
    const path = window.location.pathname.replace(/^\/anime\//, '');
    const sp = new URLSearchParams(window.location.search);
    const sv = sp.get('server') || '2';
    setSlug(path);
    setServer(sv);
    if (path) {
      fetch(`/api/animecat?action=detail&slug=${encodeURIComponent(path)}&server=${sv}`)
        .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
        .then((d: AnimeDetail) => { setDetail(d); setLoading(false); })
        .catch(() => { setError(true); setLoading(false); });
    }
  }, []);

  const shortTitle = (t: string) => {
    const epMatch = t.match(/Episode\s*\d+/i);
    if (epMatch) return epMatch[0];
    return t.length > 25 ? t.slice(0, 23) + '...' : t;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={32} className="text-cyan-400 animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Memuat detail anime...</p>
      </div>
    </div>
  );

  if (error || !detail) return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 text-lg mb-2">Anime tidak ditemukan</p>
        <Link href="/" className="text-cyan-400 text-sm hover:underline">← Kembali ke Beranda</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col">
      <header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <span className="text-sm font-bold text-white truncate">{detail.title}</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 w-full py-6">
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <div className="w-40 shrink-0 mx-auto sm:mx-0">
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
              {detail.poster ? <img src={detail.poster} alt={detail.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-700"><Tv size={40} /></div>}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">{detail.title}</h1>
            {detail.rating && <div className="flex items-center gap-1 mt-1"><span className="text-yellow-400 text-sm">★</span><span className="text-yellow-400 font-bold text-sm">{detail.rating}</span></div>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-400">
              {detail.type && <span className="flex items-center gap-1"><Tv size={12} />{detail.type}</span>}
              {detail.status && <span className="flex items-center gap-1"><Circle size={8} className={(detail.status.toLowerCase().includes('complete')?'text-green-400':'text-cyan-400')+' fill-current'} />{detail.status}</span>}
            </div>
            {detail.genres.length>0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {detail.genres.map((g,i) => <Link key={i} href={'/search?genre='+encodeURIComponent(g.toLowerCase().replace(/\s+/g,'-'))+'&server='+server} className="px-2.5 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-[10px] text-slate-400 hover:bg-cyan-500/15 hover:text-cyan-300 hover:border-cyan-400/30 transition-all">{g}</Link>)}
              </div>
            )}
            {detail.episodes.length>0 && (
              <div className="flex items-center gap-3 mt-4">
                <Link href={'/nonton/'+detail.episodes[0].slug+'?server='+server} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                  <Play size={14} fill="white" />Episode {detail.episodes.length}
                </Link>
                <Link href={'/nonton/'+detail.episodes[detail.episodes.length-1].slug+'?server='+server} className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.08] text-white rounded-full text-sm font-semibold hover:bg-white/[0.08] hover:border-cyan-400/30 transition-all">
                  <Play size={14} />Episode 1
                </Link>
              </div>
            )}
          </div>
        </div>

        {(detail.totalEpisodes || detail.duration || detail.releaseDate || detail.studio) && (
          <div className="mb-6 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {detail.totalEpisodes && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-500">Total Episode:</span> <span className="text-slate-200 font-medium">{detail.totalEpisodes}</span>
                </div>
              )}
              {detail.duration && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-500">Durasi:</span> <span className="text-slate-200 font-medium">{detail.duration}</span>
                </div>
              )}
              {detail.releaseDate && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-500">Tanggal Rilis:</span> <span className="text-slate-200 font-medium">{detail.releaseDate}</span>
                </div>
              )}
              {detail.studio && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-500">Studio:</span> <span className="text-slate-200 font-medium">{detail.studio}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {detail.synopsis && (
          <div className="mb-6 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
            <p className="text-sm text-slate-400 leading-relaxed">{detail.synopsis}</p>
          </div>
        )}

        <section>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3"><Play size={16} className="text-cyan-400" fill="currentColor" />Daftar Episode <span className="text-sm font-normal text-slate-500">({detail.episodes.length})</span></h2>
          {detail.episodes.length>0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {detail.episodes.map((ep,i) => (
                <Link key={i} href={'/nonton/'+ep.slug+'?server='+server} className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.05] hover:border-cyan-400/20 transition-all group">
                  <span className="text-[10px] font-medium text-white/80 line-clamp-1 truncate">{shortTitle(ep.title)}</span>
                  <ChevronRight size={12} className="text-slate-600 shrink-0 group-hover:text-cyan-400" />
                </Link>
              ))}
            </div>
          ) : <div className="text-center py-10 text-slate-500 bg-white/[0.02] rounded-xl text-sm">Belum ada episode</div>}
        </section>
      </main>

      <footer className="border-t border-white/[0.04] py-5 text-center text-[11px] text-slate-600">AnimeCat</footer>
    </div>
  );
}
