import Link from "next/link";
import { ArrowLeft, Play, Tv, Circle, ChevronRight, MonitorPlay, Download } from "lucide-react";
import { notFound } from "next/navigation";
import { headers as getHeaders } from "next/headers";

export const revalidate = 300;

interface AnimeDetail {
  title: string; poster: string; rating: string; type: string; status: string;
  genres: string[]; synopsis: string;
  episodes: { title: string; slug: string; date: string }[];
  streamUrl?: string;
}

export default async function AnimeDetailPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const awaitedParams = await params;
  const slug = awaitedParams.slug?.join("/") || "";
  if (!slug) notFound();

  const heads = await getHeaders();
  const proto = heads.get('x-forwarded-proto') || 'https';
  const host = heads.get('x-forwarded-host') || heads.get('host') || 'localhost:3000';
  const base = `${proto}://${host}`;
  const res = await fetch(base + '/api/animecat?action=detail&slug=' + encodeURIComponent(slug), { next: { revalidate: 300 } });
  if (!res.ok) notFound();
  const detail: AnimeDetail | null = await res.json();
  if (!detail) notFound();

  // Shorten episode titles: remove anime name prefix
  const shortTitle = (t: string) => {
    const epMatch = t.match(/Episode\s*\d+/i);
    if (epMatch) return epMatch[0];
    return t.length > 30 ? t.slice(0, 28) + '...' : t;
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col">
      <header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-white"><ArrowLeft size={18} /></Link>
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
                {detail.genres.map((g,i) => <Link key={i} href={'/search?genre='+encodeURIComponent(g.toLowerCase().replace(/\s+/g,'-'))} className="px-2.5 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-full text-[10px] text-slate-400 hover:bg-cyan-500/15 hover:text-cyan-300 hover:border-cyan-400/30 transition-all">{g}</Link>)}
              </div>
            )}
            {detail.synopsis && <div className="mt-4"><p className="text-sm text-slate-400 leading-relaxed line-clamp-5">{detail.synopsis}</p></div>}
            {detail.episodes.length>0 && (
              <Link href={'/nonton/'+detail.episodes[detail.episodes.length-1].slug} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                <Play size={14} fill="white" />Nonton Episode Terbaru
              </Link>
            )}
          </div>
        </div>

        <section>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3"><Play size={16} className="text-cyan-400" fill="currentColor" />Daftar Episode <span className="text-sm font-normal text-slate-500">({detail.episodes.length})</span></h2>
          {detail.episodes.length>0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {detail.episodes.map((ep,i) => (
                <Link key={i} href={'/nonton/'+ep.slug} className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:bg-white/[0.05] hover:border-cyan-400/20 transition-all group">
                  <span className="text-[9px] font-bold text-cyan-400 shrink-0">{shortTitle(ep.title)}</span>
                  <span className="text-[10px] text-slate-500 ml-auto shrink-0">{ep.date}</span>
                  <ChevronRight size={12} className="text-slate-600 shrink-0 group-hover:text-cyan-400" />
                </Link>
              ))}
            </div>
          ) : <div className="text-center py-10 text-slate-500 bg-white/[0.02] rounded-xl text-sm">Belum ada episode</div>}
        </section>
      </main>

      <footer className="border-t border-white/[0.04] py-5 text-center text-[11px] text-slate-600">AnimeCat</footer>

      <script dangerouslySetInnerHTML={{ __html: `
        try{
          var h=JSON.parse(localStorage.getItem('animecat_history')||'[]');
          h=h.filter(function(x){return x.slug!=='${slug}'});
          h.unshift({title:${JSON.stringify(detail.title)},slug:'${slug}',poster:${JSON.stringify(detail.poster)},lastEp:${JSON.stringify(detail.episodes[0]?.title||'')}});
          if(h.length>50)h=h.slice(0,50);
          localStorage.setItem('animecat_history',JSON.stringify(h));
        }catch(e){}
      `}} />
    </div>
  );
}
