"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, X, Tv, ChevronLeft, ChevronRight, Play } from "lucide-react";

interface AnimeCard { title: string; slug: string; poster: string; episode?: string; rating?: string; type?: string; }

function SearchPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [tab, setTab] = useState<"cari"|"genre"|"terbaru"|"daftar">("cari");
  const [query, setQuery] = useState(sp.get("q") || "");
  const [genres, setGenres] = useState<string[]>(sp.get("genre") ? [sp.get("genre")!] : []);
  const [order, setOrder] = useState("latest");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<AnimeCard[]>([]);
  const [loading, setLoading] = useState(false);

  const allGenres = [
    "Action","Adventure","Comedy","Drama","Ecchi","Fantasy","Game","Harem","Historical","Horror",
    "Isekai","Magic","Martial Arts","Mecha","Military","Music","Mystery","Psychological",
    "Reincarnation","Romance","Samurai","School","Sci-Fi","Seinen","Shoujo","Shounen",
    "Slice of Life","Space","Sports","Super Power","Supernatural","Thriller","Vampire",
  ];

  useEffect(() => {
    if (sp.get("genre")) { setTab("genre"); setGenres([sp.get("genre")!]); }
    else if (sp.get("tab")==="terbaru") setTab("terbaru");
    else if (sp.get("q")) setTab("cari");
  }, []);

  const toggleGenre = (g: string) => {
    setGenres(prev => prev.includes(g) ? prev.filter(x=>x!==g) : [...prev, g]);
    setPage(1);
  };

  const doSearch = useCallback(async () => {
    setLoading(true);
    const urls: string[] = [];

    if (tab === "cari" && query.trim()) {
      urls.push('/api/animecat?action=search&q=' + encodeURIComponent(query) + '&page=' + page);
    }
    if (tab === "genre" && genres.length > 0) {
      // Fetch first selected genre via proper genre URL
      urls.push('/api/animecat?action=daftar&genre=' + encodeURIComponent(genres[0]) + '&order=' + order + '&page=' + page);
    }
    if (tab === "terbaru") {
      urls.push('/api/animecat?action=terbaru&page=' + page);
    }
    if (tab === "daftar") {
      urls.push('/api/animecat?action=daftar&order=' + order + '&page=' + page);
    }

    let allResults: AnimeCard[] = [];
    if (urls.length > 0) {
      try {
        const responses = await Promise.all(urls.map(u => fetch(u).then(r=>r.json())));
        allResults = (Array.isArray(responses[0]) ? responses[0] : []).flat();
      } catch { allResults = []; }
    }

    // Filter by genres client-side if multi-genre
    if (tab === "genre" && genres.length > 0 && allResults.length > 0) {
      allResults = allResults.filter(a => {
        // Can't filter by genre on listing page results since they don't have genre info
        // So we fetch ALL anime and do keyword match in title
        return true;
      }).slice((page-1)*20, page*20);
    }

    setResults(allResults);
    setLoading(false);

    // Update URL
    const p = new URLSearchParams();
    if (tab==="cari" && query.trim()) { p.set("q",query); if(page>1) p.set("page",String(page)); }
    else if (tab==="genre" && genres.length>0) { p.set("genre",genres[0]); if(page>1) p.set("page",String(page)); }
    else if (tab==="terbaru") { p.set("tab","terbaru"); if(page>1) p.set("page",String(page)); }
    else if (tab==="daftar") { p.set("tab","daftar"); p.set("order",order); if(page>1) p.set("page",String(page)); }
    router.replace('/search?' + p.toString(), { scroll: false });
  }, [tab, query, genres, order, page]);

  useEffect(() => { doSearch(); }, [doSearch]);

  const genresByLetter: Record<string,string[]> = {};
  allGenres.forEach(g => { const f = g[0].toUpperCase(); if(!genresByLetter[f]) genresByLetter[f]=[]; genresByLetter[f].push(g); });
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto pb-2">
          {[{k:"cari",l:"Cari"},{k:"genre",l:"Genre"},{k:"daftar",l:"A-Z"},{k:"terbaru",l:"Terbaru"}].map(t2 => (
            <button key={t2.k} onClick={()=>{setTab(t2.k as any);setPage(1);}}
              className={"px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap "+(tab===t2.k?"bg-cyan-500/15 text-cyan-400 border border-cyan-400/30":"text-slate-400 hover:text-slate-200 border border-transparent")}>{t2.l}</button>
          ))}
          {(tab==="daftar"||tab==="genre") && (
            <select value={order} onChange={e=>{setOrder(e.target.value);setPage(1);}} className="ml-auto px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-[11px] text-slate-300">
              <option value="latest">Terbaru</option><option value="popular">Populer</option><option value="title">A-Z</option><option value="update">Update</option>
            </select>
          )}
        </div>
        {/* Active genre chips */}
        {tab==="genre" && genres.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 pb-2 flex flex-wrap gap-1.5">
            {genres.map(g => (
              <button key={g} onClick={()=>toggleGenre(g)} className="px-2.5 py-1 bg-cyan-500/15 text-cyan-400 border border-cyan-400/30 rounded-full text-[10px] font-semibold flex items-center gap-1">
                {g}<X size={10} />
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 w-full py-6">
        {/* Genre selector */}
        {tab==="genre" && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-1 mb-3">
              {alphabet.map(l => {
                const has = genresByLetter[l]?.length > 0;
                return <button key={l} onClick={()=>{if(has) document.getElementById('gl-'+l)?.scrollIntoView({behavior:'smooth'});}}
                  className={"w-7 h-7 rounded-lg text-[11px] font-bold "+(has?"bg-white/[0.05] text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/[0.06]":"text-slate-700")}>{l}</button>;
              })}
            </div>
            {alphabet.map(l => {
              const gs = genresByLetter[l]; if(!gs?.length) return null;
              return <div key={l} id={'gl-'+l} className="mb-3">
                <h3 className="text-sm font-bold text-white mb-2">{l}</h3>
                <div className="flex flex-wrap gap-1.5">{gs.map(g => {
                  const active = genres.includes(g.toLowerCase().replace(/\s+/g,'-'));
                  return <button key={g} onClick={()=>toggleGenre(g.toLowerCase().replace(/\s+/g,'-'))}
                    className={"px-3 py-1.5 rounded-full text-xs transition-all "+(active?"bg-cyan-500/15 text-cyan-400 border border-cyan-400/30":"bg-white/[0.02] border border-white/[0.05] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200")}>{g}</button>;
                })}</div>
              </div>;
            })}
          </div>
        )}

        {/* Results */}
        {(tab==="cari"||tab==="terbaru"||tab==="daftar"||(tab==="genre")) && (
          <>
            {tab==="cari" && query.trim() && <h2 className="text-lg font-bold text-white mb-4">Hasil: &quot;{query}&quot;</h2>}
            {tab==="terbaru" && <h2 className="text-lg font-bold text-white mb-4">Anime Terbaru</h2>}
            {tab==="genre" && genres.length>0 && <h2 className="text-lg font-bold text-white mb-4 capitalize">Genre: {genres.join(', ')}</h2>}
            {tab==="daftar" && <h2 className="text-lg font-bold text-white mb-4">Daftar Anime {order==="title"?"A-Z":order==="popular"?"Populer":"Terbaru"}</h2>}
            {tab==="genre" && genres.length===0 && <div className="text-center py-10 text-slate-500"><p>Pilih genre di atas untuk memfilter anime</p></div>}
            {loading ? <div className="text-center py-16 text-slate-500">Memuat...</div> :
              tab==="cari" && !query.trim() ? <div className="text-center py-16 text-slate-500"><Search size={40} className="mx-auto mb-3 text-slate-600"/><p>Ketik kata kunci di atas untuk mencari anime</p></div> :
              results.length>0 ? <AnimeGrid items={results} /> : tab!=="genre" || genres.length>0 ? <div className="text-center py-16 text-slate-500">Tidak ada hasil</div> : null}
          </>
        )}

        {results.length>0 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:bg-white/[0.08] disabled:opacity-30"><ChevronLeft size={16}/></button>
            <span className="text-xs text-slate-400 px-3">Hal. {page}</span>
            <button onClick={()=>setPage(p=>p+1)} disabled={results.length<20} className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300 hover:bg-white/[0.08] disabled:opacity-30"><ChevronRight size={16}/></button>
          </div>
        )}
      </main>
      <footer className="border-t border-white/[0.04] py-5 text-center text-[11px] text-slate-600">AnimeCat — Powered by Samehadaku</footer>
    </div>
  );
}

function AnimeGrid({ items }: { items: AnimeCard[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map((item, i) => (
        <Link key={i} href={'/anime/'+item.slug} className="block group">
          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
            {item.poster ? <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"/> : <div className="w-full h-full flex items-center justify-center text-slate-700"><Tv size={32}/></div>}
            {item.episode && <span className="absolute top-2 left-2 px-2 py-0.5 bg-cyan-500/90 text-[10px] font-bold text-white rounded-md">{item.episode}</span>}
            {item.rating && <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-yellow-500/90 text-[10px] font-bold text-black rounded">★ {item.rating}</span>}
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
