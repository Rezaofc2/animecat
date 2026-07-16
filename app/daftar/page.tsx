import Link from "next/link";
import { ArrowLeft, Tv, Play } from "lucide-react";

export const revalidate = 300;

interface AnimeCard { title: string; slug: string; poster: string; rating?: string; type?: string; }

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(base + path, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export default async function DaftarPage() {
  const daftar = await apiGet<AnimeCard[]>('/api/animecat?action=daftar&order=title');
  const items = daftar || [];

  const grouped: Record<string,AnimeCard[]> = {};
  items.forEach(item => {
    const f = item.title[0]?.toUpperCase() || "#";
    if(!grouped[f]) grouped[f]=[];
    grouped[f].push(item);
  });

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col">
      <header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-white"><ArrowLeft size={18} /></Link>
          <span className="text-sm font-bold text-white">Daftar Anime A-Z</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 w-full py-6">
        <div className="flex flex-wrap gap-1 mb-6 sticky top-14 bg-[#0a0a12]/95 py-2 z-40">
          {alphabet.map(l => <a key={l} href={'#s-'+l} className={'w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center '+(grouped[l]?'bg-white/[0.05] text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/[0.06]':'text-slate-700')}>{l}</a>)}
        </div>

        {alphabet.map(l => {
          const a = grouped[l]; if(!a?.length) return null;
          return <div key={l} id={'s-'+l} className="mb-8">
            <h2 className="text-lg font-bold text-white mb-3 border-b border-white/[0.04] pb-2">{l}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {a.map((item,i) => (
                <Link key={i} href={'/anime/'+item.slug} className="block group">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
                    {item.poster ? <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-slate-700"><Tv size={32} /></div>}
                    {item.rating && <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-yellow-500/90 text-[10px] font-bold text-black rounded">★ {item.rating}</span>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3"><Play size={28} className="text-white/90" fill="white" /></div>
                  </div>
                  <h3 className="mt-2 text-xs text-slate-300 line-clamp-2 group-hover:text-cyan-300 transition-colors">{item.title}</h3>
                </Link>
              ))}
            </div>
          </div>;
        })}

        {items.length===0 && <div className="text-center py-16 text-slate-500"><Tv size={40} className="mx-auto mb-3 text-slate-600" /><p>Memuat daftar anime...</p></div>}
      </main>

      <footer className="border-t border-white/[0.04] py-5 text-center text-[11px] text-slate-600">AnimeCat — Daftar Anime A-Z</footer>
    </div>
  );
}
