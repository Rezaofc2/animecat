"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Maximize, Minimize, Download, ChevronLeft, ChevronRight, List, X, ExternalLink, Play } from "lucide-react";

interface EpisodeData {
  title: string; animeSlug?: string; prevSlug?: string; nextSlug?: string;
  streamUrl?: string;
  downloads: { quality: string; links: { name: string; url: string }[] }[];
  relatedEpisodes: { title: string; slug: string; date: string }[];
}

export default function NontonPage() {
  const params = useParams();
  const slug = (params.slug as string[])?.join('/') || '';
  const [data, setData] = useState<EpisodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [error, setError] = useState("");
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true); setError("");
    fetch('/api/animecat?action=episode&slug=' + encodeURIComponent(slug))
      .then(r => r.json())
      .then(d => { if (d && d.title) setData(d); else setError("Episode tidak ditemukan"); setLoading(false); })
      .catch(() => { setError("Gagal memuat data"); setLoading(false); });
  }, [slug]);

  useEffect(() => {
    if (!data) return;
    try {
      const h = JSON.parse(localStorage.getItem('animecat_history') || '[]');
      h.unshift({ title: data.title, slug: data.animeSlug || slug.split('/')[0], poster: '', lastEp: data.title, progress: 100, date: new Date().toISOString() });
      const seen = new Set(); const unique = h.filter((x: any) => { if (seen.has(x.slug)) return false; seen.add(x.slug); return true; }).slice(0, 50);
      localStorage.setItem('animecat_history', JSON.stringify(unique));
    } catch(e) {}
  }, [data]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center"><div className="text-center text-slate-500"><div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" /><p>Memuat episode...</p></div></div>;
  if (error || !data) return <div className="min-h-screen bg-[#0a0a12]"><header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]"><div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2"><Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-white"><ArrowLeft size={18} /></Link><span className="text-sm text-slate-400">Episode tidak ditemukan</span></div></header><div className="flex items-center justify-center h-64 text-slate-500">{error}</div></div>;

  // Build iframe URL - try to convert samehadaku page to embed
  const samehadakuUrl = `https://samehadaku.li/${slug}/`;
  const embedUrl = data.streamUrl || `https://samehadaku.li/${slug}/`;

  return (
    <div className={'min-h-screen bg-[#0a0a12] ' + (fullscreen ? 'bg-black' : '')}>
      {!fullscreen && (
        <header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
            <Link href={data.animeSlug ? '/anime/' + data.animeSlug : '/'} className="p-2 -ml-2 text-slate-400 hover:text-white"><ArrowLeft size={18} /></Link>
            <span className="text-sm font-bold text-white truncate flex-1">{data.title}</span>
          </div>
        </header>
      )}

      <div ref={containerRef} className={fullscreen ? 'fixed inset-0 z-[9999] bg-black flex flex-col' : ''}>

        {/* Video Area */}
        <div className={'relative bg-black ' + (fullscreen ? 'flex-1' : 'aspect-video max-w-5xl mx-auto mt-4 rounded-xl overflow-hidden border border-white/[0.06]')}>
          {!fullscreen && !iframeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10">
              <Play size={48} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm">Klik untuk menonton</p>
              <button onClick={() => setIframeLoaded(true)} className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-sm font-semibold">
                🎬 Tonton Sekarang
              </button>
            </div>
          )}
          {iframeLoaded && (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              referrerPolicy="no-referrer"
            />
          )}
          {!iframeLoaded && (
            <div className="absolute top-3 right-3">
              <button onClick={toggleFullscreen} className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors z-10" title="Fullscreen"><Maximize size={16} /></button>
            </div>
          )}
        </div>

        {fullscreen && (
          <div className="flex items-center justify-between px-4 py-2 bg-black/90 shrink-0">
            <span className="text-sm text-slate-300 truncate">{data.title}</span>
            <div className="flex items-center gap-2">
              {data.prevSlug && <Link href={'/nonton/'+data.prevSlug} className="p-2 text-white/60 hover:text-white"><ChevronLeft size={18} /></Link>}
              {data.nextSlug && <Link href={'/nonton/'+data.nextSlug} className="p-2 text-white/60 hover:text-white"><ChevronRight size={18} /></Link>}
              <button onClick={toggleFullscreen} className="p-2 text-white/70 hover:text-white"><Minimize size={18} /></button>
            </div>
          </div>
        )}

        {!fullscreen && (
          <>
            {/* Quality selector (download links as stream quality) */}
            {data.downloads.length > 0 && (
              <div className="max-w-5xl mx-auto px-4 mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-500">Kualitas:</span>
                  {data.downloads.map((dl,i) => (
                    <a key={i} href={dl.links[0]?.url || '#'} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-white/[0.04] border border-white/[0.08] rounded-full text-[10px] text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-300 hover:border-cyan-400/30 transition-all flex items-center gap-1">
                      {dl.quality}
                      <ExternalLink size={9} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <div className="max-w-5xl mx-auto px-4 mt-4">
              <div className="grid grid-cols-3 gap-2">
                <div>{data.prevSlug ? <Link href={'/nonton/'+data.prevSlug} className="flex items-center justify-center gap-1 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"><ChevronLeft size={14} />Sebelumnya</Link> : <span className="flex items-center justify-center gap-1 px-3 py-2.5 text-xs text-slate-700">—</span>}</div>
                <button onClick={()=>setShowDownload(d=>!d)} className={'flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all '+(showDownload?'bg-cyan-500/15 text-cyan-400 border border-cyan-400/30':'bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:bg-white/[0.06]')}><Download size={14} />Download</button>
                <div>{data.nextSlug ? <Link href={'/nonton/'+data.nextSlug} className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all">Berikutnya<ChevronRight size={14} /></Link> : <span className="flex items-center justify-center gap-1 px-3 py-2.5 text-xs text-slate-700">—</span>}</div>
              </div>
            </div>

            {/* Download panel */}
            {showDownload && (
              <div className="max-w-5xl mx-auto px-4 mt-4 mb-8">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2"><Download size={14} className="text-cyan-400" />Download Links</h2>
                    <button onClick={()=>setShowDownload(false)} className="p-1 text-slate-500 hover:text-white"><X size={14} /></button>
                  </div>
                  {data.downloads.length>0 ? (
                    <div className="space-y-3">
                      {data.downloads.map((dl,i) => (
                        <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5">
                          <p className="text-[10px] font-bold text-cyan-400 uppercase mb-2">{dl.quality}</p>
                          <div className="flex flex-wrap gap-1">
                            {dl.links.map((link,j) => <a key={j} href={link.url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] rounded-full text-[10px] text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-300 hover:border-cyan-400/30 transition-all inline-flex items-center gap-1">{link.name}<ExternalLink size={9} /></a>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-500 text-center py-4">Tidak ada link download.</p>}
                  <p className="text-[10px] text-slate-600 mt-3 text-center">Password RAR: <code className="text-cyan-500">Samehadaku.care</code></p>
                </div>
              </div>
            )}

            {/* Related episodes */}
            {data.relatedEpisodes.length>0 && (
              <div className="max-w-5xl mx-auto px-4 mt-6 mb-12">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><List size={14} className="text-cyan-400" />Episode Lainnya</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {data.relatedEpisodes.slice(0, 20).map((ep,i) => (
                    <Link key={i} href={'/nonton/'+ep.slug} className={'px-3 py-2 bg-white/[0.02] border rounded-lg text-xs transition-all flex items-center gap-2 shrink-0 '+(ep.slug===slug?'border-cyan-400/30 bg-cyan-500/10 text-cyan-300':'border-white/[0.04] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200')}>
                      <span className="truncate max-w-[120px]">{ep.title.replace(/^Episode\s*\d+/i,'Ep ')}</span>
                      {ep.date && <span className="text-[9px] text-slate-600 ml-1 shrink-0">{ep.date}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Fullscreen nav */}
        {fullscreen && (
          <div className="flex items-center justify-center gap-4 px-4 py-3 bg-black/90 shrink-0">
            {data.prevSlug && <Link href={'/nonton/'+data.prevSlug} className="p-2 text-white/60 hover:text-white"><ChevronLeft size={20} /></Link>}
            {data.nextSlug && <Link href={'/nonton/'+data.nextSlug} className="p-2 text-white/60 hover:text-white"><ChevronRight size={20} /></Link>}
          </div>
        )}
      </div>
    </div>
  );
}
