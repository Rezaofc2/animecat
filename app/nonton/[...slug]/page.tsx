"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Maximize, ChevronLeft, ChevronRight, List, ExternalLink, Download, MonitorPlay } from "lucide-react";

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
  const [selectedQuality, setSelectedQuality] = useState('');
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true); setError("");
    fetch('/api/animecat?action=episode&slug=' + encodeURIComponent(slug))
      .then(r => r.json())
      .then(d => {
        if (d && d.title) {
          setData(d);
          // Default stream: blogger embed URL
          if (!selectedQuality && d.streamUrl) setSelectedQuality(d.streamUrl);
        } else setError("Episode tidak ditemukan");
        setLoading(false);
      })
      .catch(() => { setError("Gagal memuat data"); setLoading(false); });
  }, [slug]);

  useEffect(() => {
    if (!data) return;
    try {
      const h = JSON.parse(localStorage.getItem('animecat_history') || '[]');
      h.unshift({ title: data.title, slug: data.animeSlug || slug.split('/')[0], poster: '', lastEp: data.title, date: new Date().toISOString() });
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

  const shortEp = (t: string) => {
    const m = t.match(/Episode\s*(\d+)/i);
    if (m) return 'Ep ' + m[1];
    return t.length > 20 ? t.slice(0, 18) + '...' : t;
  };

  const currentStream = selectedQuality || data?.streamUrl || '';

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <div className="text-center text-slate-500"><div className="w-10 h-10 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" /><p className="text-sm">Memuat episode...</p></div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#0a0a12]">
      <header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]"><div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2"><Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-white"><ArrowLeft size={18} /></Link><span className="text-sm text-slate-400">Episode tidak ditemukan</span></div></header>
      <div className="flex items-center justify-center h-64 text-slate-500">{error}</div>
    </div>
  );

  return (
    <div className={'min-h-screen bg-[#0a0a12] ' + (fullscreen ? 'bg-black' : '')}>
      {!fullscreen && (
        <header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
            <Link href={data.animeSlug ? '/anime/' + data.animeSlug : '/'} className="p-2 -ml-2 text-slate-400 hover:text-white shrink-0"><ArrowLeft size={18} /></Link>
            <span className="text-sm font-bold text-white truncate flex-1">{data.title}</span>
            <button onClick={toggleFullscreen} className="p-2 text-slate-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-white/[0.05] shrink-0"><Maximize size={16} /></button>
          </div>
        </header>
      )}

      <div ref={containerRef} className={fullscreen ? 'fixed inset-0 z-[9999] bg-black flex flex-col' : ''}>

        {/* VIDEO PLAYER */}
        <div className={'relative bg-black ' + (fullscreen ? 'flex-1' : 'aspect-video max-w-5xl mx-auto mt-4 rounded-xl overflow-hidden border border-white/[0.06]')}>
          {currentStream ? (
            <iframe key={currentStream} src={currentStream} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="no-referrer" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <MonitorPlay size={48} className="mb-3 text-slate-600" />
              <p className="text-sm">Pilih kualitas video di bawah</p>
            </div>
          )}
          {!fullscreen && <button onClick={toggleFullscreen} className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-lg text-white/80 hover:text-white transition-colors z-10"><Maximize size={16} /></button>}
        </div>

        {!fullscreen && (
          <>
            {/* ===== KUALITAS STREAMING ===== */}
            <div className="max-w-5xl mx-auto px-4 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <MonitorPlay size={13} className="text-cyan-400" />
                <span className="text-[11px] text-slate-400 font-medium">Kualitas Streaming</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* Blogger stream */}
                {data.streamUrl && (
                  <button
                    onClick={() => setSelectedQuality(data.streamUrl!)}
                    className={'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border '
                      + (currentStream === data.streamUrl
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-300 hover:bg-white/[0.06]')}>
                    <MonitorPlay size={12} />Default
                  </button>
                )}
                {/* Download link streams (mega/gofile etc bisa buka di tab baru) */}
                {data.downloads.map((dl, i) => (
                  <a
                    key={'s-'+i}
                    href={dl.links[0]?.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-slate-300 hover:bg-white/[0.06] hover:text-cyan-300 hover:border-cyan-400/30 transition-all font-semibold">
                    {dl.quality} <ExternalLink size={10} />
                  </a>
                ))}
              </div>
              {data.streamUrl && (
                <p className="text-[9px] text-slate-600 mt-1">Klik kualitas untuk ganti sumber video streaming</p>
              )}
            </div>

            {/* ===== PREV / NEXT ===== */}
            <div className="max-w-5xl mx-auto px-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                {data.prevSlug ? (
                  <Link href={'/nonton/'+data.prevSlug} className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-slate-300 hover:bg-white/[0.08] hover:text-white hover:border-cyan-400/30 transition-all">
                    <ChevronLeft size={16} />Episode Sebelumnya
                  </Link>
                ) : <span className="flex items-center justify-center px-4 py-3 text-xs text-slate-700 rounded-xl">—</span>}
                {data.nextSlug ? (
                  <Link href={'/nonton/'+data.nextSlug} className="flex items-center justify-center gap-1.5 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                    Episode Selanjutnya<ChevronRight size={16} />
                  </Link>
                ) : <span className="flex items-center justify-center px-4 py-3 text-xs text-slate-700 rounded-xl">—</span>}
              </div>
            </div>

            {/* ===== DOWNLOAD SECTION (terpisah) ===== */}
            <div className="max-w-5xl mx-auto px-4 mt-5 mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Download size={13} className="text-orange-400" />
                <span className="text-[11px] text-slate-400 font-medium">Download Video</span>
              </div>
              {data.downloads.length > 0 ? (
                <div className="space-y-2">
                  {data.downloads.map((dl, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                      <p className="text-[10px] font-bold text-orange-400 uppercase mb-2">{dl.quality}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {dl.links.map((link, j) => (
                          <a key={j} href={link.url} target="_blank" rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] rounded-full text-[10px] text-slate-300 hover:bg-orange-500/15 hover:text-orange-300 hover:border-orange-400/30 transition-all inline-flex items-center gap-1">
                            {link.name} <ExternalLink size={9} />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="text-[9px] text-slate-600 text-center mt-2">Password RAR: <code className="text-cyan-500">Samehadaku.care</code></p>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 text-center py-3">Buka di <a href={'https://samehadaku.li/'+slug+'/'} target="_blank" className="text-cyan-400 underline">Samehadaku</a> untuk download.</p>
              )}
            </div>

            {/* ===== EPISODE LAINNYA ===== */}
            {data.relatedEpisodes.length > 0 && (
              <div className="max-w-5xl mx-auto px-4 mb-12">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><List size={14} className="text-cyan-400" />Episode Lainnya</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {data.relatedEpisodes.slice(0, 25).map((ep, i) => (
                    <Link key={i} href={'/nonton/'+ep.slug} className={'px-3 py-2 border rounded-lg text-xs font-medium transition-all shrink-0 ' + (ep.slug === slug ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300' : 'border-white/[0.04] bg-white/[0.01] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200')}>
                      {shortEp(ep.title)}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {fullscreen && (
          <div className="flex items-center justify-between px-4 py-2 bg-black shrink-0">
            <div className="flex items-center gap-2">
              {data.prevSlug && <Link href={'/nonton/'+data.prevSlug} className="px-3 py-1.5 text-xs text-white/70 bg-white/10 rounded-full hover:bg-white/20"><ChevronLeft size={14} className="inline -ml-1" />Prev</Link>}
            </div>
            <span className="text-xs text-white/50 truncate mx-2">{shortEp(data.title)}</span>
            <div className="flex items-center gap-2">
              <button onClick={toggleFullscreen} className="p-1.5 text-white/70 hover:text-white"><Maximize size={16} /></button>
              {data.nextSlug && <Link href={'/nonton/'+data.nextSlug} className="px-3 py-1.5 text-xs text-white/70 bg-white/10 rounded-full hover:bg-white/20">Next<ChevronRight size={14} className="inline -mr-1" /></Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
