"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, X, Tv, ChevronLeft, ChevronRight, Play, ChevronDown, Calendar } from "lucide-react";

interface AnimeCard { title: string; slug: string; poster: string; episode?: string; rating?: string; type?: string; date?: string; day?: string; }

function SearchPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [tab, setTab] = useState<"cari"|"genre"|"terbaru"|"daftar">("cari");
  const [query, setQuery] = useState(sp.get("q") || "");
  const [genre, setGenre] = useState(sp.get("genre") || "");
  const [order, setOrder] = useState("latest");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<AnimeCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const server = sp.get("server") || "2";

  const allGenres = [
    "Action","Adventure","Comedy","Drama","Ecchi","Fantasy","Game","Harem","Historical","Horror",
    "Isekai","Magic","Martial Arts","Mecha","Military","Music","Mystery","Psychological",
    "Reincarnation","Romance","Samurai","School","Sci-Fi","Seinen","Shoujo","Shounen",
    "Slice of Life","Space","Sports","Super Power","Supernatural","Thriller","Vampire",
  ];

  useEffect(() => {
    if (sp.get("genre")) { setTab("genre"); setGenre(sp.get("genre")!); }
    else if (sp.get("tab")==="terbaru") setTab("terbaru");
    else if (sp.get("q")) setTab("cari");
    const urlPage = parseInt(sp.get("page") || "1");
    if (urlPage > 1) setPage(urlPage);
  }, []);

  const selectGenre = (g: string) => {
    if (genre === g) { setGenre(""); setPage(1); setShowGenrePicker(false); return; }
    setGenre(g); setPage(1); setShowGenrePicker(false);
    setTab("genre");
  };

  const doSearch = useCallback(async () => {
    setLoading(true);
    let allResults: AnimeCard[] = [];

    if (tab === "cari" && query.trim()) {
      try { const r = await fetch('/api/animecat?action=search&q=' + encodeURIComponent(query) + '&page=' + page + '&server=' + server); const d = await r.json(); allResults = Array.isArray(d)?d:[]; } catch { allResults = []; }
    } else if (tab === "genre" && genre) {
      try { const r = await fetch('/api/animecat?action=daftar&genre=' + encodeURIComponent(genre) + '&page=' + page + '&server=' + server); const d = await r.json(); allResults = Array.isArray(d)?d:[]; } catch { allResults = []; }
    } else if (tab === "terbaru") {
      try { const r = await fetch('/api/animecat?action=terbaru&page=' + page + '&server=' + server); const d = await r.json(); allResults = Array.isArray(d)?d:[]; } catch { allResults = []; }
    } else if (tab === "daftar") {
      try { const r = await fetch('/api/animecat?action=daftar&order=' + order + '&page=' + page + '&server=' + server); const d = await r.json(); allResults = Array.isArray(d)?d:[]; } catch { allResults = []; }
    }

    setResults(allResults);
    setLoading(false);

    const p = new URLSearchParams();
    p.set("server", server);
    if (tab==="cari" && query.trim()) { p.set("q",query); if(page>1) p.set("page",String(page)); }
    else if (tab==="genre" && genre) { p.set("genre",genre); if(page>1) p.set("page",String(page)); }
    else if (tab==="terbaru") { p.set("tab","terbaru"); if(page>1) p.set("page",String(page)); }
    else if (tab==="daftar") { p.set("tab","daftar"); p.set("order",order); if(page>1) p.set("page",String(page)); }
    router.push('/search?' + p.toString(), { scroll: false });
  }, [tab, query, genre, order, page]);

  useEffect(() => { doSearch(); }, [doSearch]);

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col">
      <header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-white"><ArrowLeft size={18} /></Link>
          <form onSubmit={e => { e.preventDefault(); setPage(1); doSearch(); }} className="flex-1 relative">
            <input type="text" value={query} onChange={e => { setQuery(e.target.value); if(!e.target.value) setTab("cari"); }}
              placeholder="Cari anime..." className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/40 transition-all" />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            {query && <button type="button" onClick={() => { setQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={14} /></button>}
          </form>
        </div>
        {/* Merged nav: tabs + sort + genre picker */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto pb-2">
          {[{k:"cari",l:"Cari"},{k:"genre",l:"Genre"},{k:"terbaru",l:"Terbaru"}].map(t2 => (
            <button key={t2.k} onClick={()=>{setTab(t2.k as any);setPage(1);if(t2.k==="genre")setShowGenrePicker(true);}}
              className={"px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap "+(tab===t2.k?"bg-cyan-500/15 text-cyan-400 border border-cyan-400/30":"text-slate-400 hover:text-slate-200 border border-transparent")}>{t2.l}</button>
          ))}
          {tab==="genre" && (
            <button onClick={()=>setShowGenrePicker(d=>!d)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 bg-cyan-500/10 text-cyan-400 border border-cyan-400/30 whitespace-nowrap">
              {genre ? genre.replace(/-/g,' ') : 'Pilih Genre'} <ChevronDown size={12} className={showGenrePicker?'rotate-180':''} />
            </button>
          )}
          {(tab==="daftar"||tab==="genre"||tab==="terbaru") && (
            <select value={order} onChange={e=>{setOrder(e.target.value);setPage(1);}} className="ml-auto px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-[11px] text-slate-300 focus:outline-none whitespace-nowrap">
              <option value="latest">Terbaru</option><option value="popular">Populer</option><option value="title">A-Z</option>
            </select>
          )}
        </div>
        {/* Genre dropdown */}
        {tab==="genre" && showGenrePicker && (
          <div className="max-w-7xl mx-auto px-4 pb-2 pt-1">
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {allGenres.map((g,i) => {
                const slug = g.toLowerCase().replace(/\s+/g,'-');
                const active = genre === slug;
                return (
                  <button key={i} onClick={()=>selectGenre(slug)}
                    className={"px-2.5 py-1 rounded-full text-[10px] font-medium transition-all "
                      + (active ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400/40" : "bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200")}>
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 w-full py-6">
        {(tab==="cari"||tab==="terbaru"||tab==="daftar"||tab==="genre") && (
          <>
            {tab==="cari" && query.trim() && <h2 className="text-lg font-bold text-white mb-4">Hasil: "{query}"</h2>}
            {tab==="terbaru" && <h2 className="text-lg font-bold text-white mb-4">Anime Terbaru</h2>}
            {tab==="genre" && genre && <h2 className="text-lg font-bold text-white mb-4 capitalize">Genre: {genre.replace(/-/g,' ')}</h2>}
            {tab==="daftar" && <h2 className="text-lg font-bold text-white mb-4">Daftar Anime {order==="title"?"A-Z":order==="popular"?"Populer":"Terbaru"}</h2>}
            {tab==="genre" && !genre && <div className="text-center py-10 text-slate-500"><p>Klik "Pilih Genre" di atas untuk memfilter anime</p></div>}
            {loading ? <div className="text-center py-16 text-slate-500">Memuat...</div> :
              tab==="cari" && !query.trim() ? <div className="text-center py-16 text-slate-500"><Search size={40} className="mx-auto mb-3 text-slate-600"/><p>Ketik kata kunci di atas untuk mencari anime</p></div> :
              results.length>0 ? <AnimeGrid items={results} server={server} /> : (tab!=="genre"||genre) ? <div className="text-center py-16 text-slate-500">Tidak ada hasil</div> : null}
          </>
        )}

        {results.length>0 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft size={18}/></button>
            <span className="text-xs text-slate-400 px-2 font-medium">Hal. {page}</span>
            <button onClick={()=>setPage(p=>p+1)} disabled={results.length===0} className="p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight size={18}/></button>
          </div>
        )}
      </main>
      <footer className="border-t border-white/[0.04] py-5 text-center text-[11px] text-slate-600">AnimeCat — {server==="1"?'Samehadaku':'Otakudesu'}</footer>
    </div>
  );
}

function AnimeGrid({ items, server }: { items: AnimeCard[]; server: string }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map((item, i) => (
        <Link key={i} href={'/anime/'+item.slug+'?server='+server} className="block group">
          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
            {item.poster ? <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"/> : <div className="w-full h-full flex items-center justify-center text-slate-700"><Tv size={32}/></div>}
            {item.episode && <span className="absolute top-2 left-2 px-2 py-0.5 bg-cyan-500/90 text-[10px] font-bold text-white rounded-md">{item.episode}</span>}
            {item.rating && <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-yellow-500/90 text-[10px] font-bold text-black rounded">★ {item.rating}</span>}
            {/* Release date & day overlay */}
            {item.date && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-6 pb-2 px-2">
                <div className="flex items-center gap-1.5">
                  <Calendar size={10} className="text-cyan-400 shrink-0" />
                  <span className="text-[10px] font-semibold text-white/90 leading-none">{item.date}</span>
                  {item.day && (
                    <span className="text-[9px] font-medium text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded leading-none ml-auto">{item.day}</span>
                  )}
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3"><Play size={28} className="text-white/90" fill="white"/></div>
          </div>
          <h3 className="mt-2 text-sm font-medium text-slate-200 line-clamp-2 group-hover:text-cyan-300 transition-colors">{item.title}</h3>
        </Link>
      ))}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0a0a12] flex items-center justify-center text-slate-500">Memuat...</div>}><SearchPageInner/></Suspense>;
}
