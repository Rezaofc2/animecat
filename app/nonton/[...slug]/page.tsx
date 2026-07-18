"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Maximize, ChevronLeft, ChevronRight, List, ExternalLink, Download, MonitorPlay, Lock, LockOpen } from "lucide-react";

interface EpisodeData {
  title: string; animeSlug?: string; prevSlug?: string; nextSlug?: string;
  streamUrl?: string;
  downloads: { quality: string; links: { name: string; url: string }[] }[];
  relatedEpisodes: { title: string; slug: string; date: string }[];
}

function NontonPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params.slug as string[])?.join('/') || '';
  const server = searchParams.get("server") || "2";
  const [data, setData] = useState<EpisodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [wakeLocked, setWakeLocked] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true); setError("");
    fetch('/api/animecat?action=episode&slug=' + encodeURIComponent(slug) + '&server=' + server)
      .then(r => r.json())
      .then(d => { if (d && d.title) setData(d); else setError("Episode tidak ditemukan"); setLoading(false); })
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

  const toggleWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLocked(false);
      } else if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLocked(true);
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
          setWakeLocked(false);
        });
      }
    } catch(e) { setWakeLocked(false); }
  }, []);

  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState === 'visible' && wakeLocked && !wakeLockRef.current && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
            setWakeLocked(false);
          });
        } catch(e) {}
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [wakeLocked]);

  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const activate = async () => {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setWakeLocked(true);
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
            setWakeLocked(false);
          });
        } catch(e) {}
      }
    };
    activate();
  }, []);

  const shortEp = (title: string, epSlug: string) => {
    const m = title.match(/Episode\s*(\d+)/i);
    if (m) return 'Episode ' + m[1];
    const sm = epSlug.match(/episode[_-](\d+)/i);
    if (sm) return 'Episode ' + sm[1];
    return 'Episode ?';
  };

  const streamUrl = data?.streamUrl || '';
  const downloadUrl = data?.downloads?.[0]?.links?.[0]?.url || '';

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <div className="text-center text-slate-500"><div className="w-10 h-10 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" /><p className="text-sm">Memuat episode...</p></div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#0a0a12]">
      <header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]"><div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2"><button onClick={() => window.history.back()} className="p-2 -ml-2 text-slate-400 hover:text-white"><ArrowLeft size={18} /></button><span className="text-sm text-slate-400">Episode tidak ditemukan</span></div></header>
      <div className="flex items-center justify-center h-64 text-slate-500">{error}</div>
    </div>
  );

  return (
    <div className={'min-h-screen bg-[#0a0a12] ' + (fullscreen ? 'bg-black' : '')}>
      {!fullscreen && (
        <header className="sticky top-0 z-50 bg-[#0a0a12]/95 backdrop-blur border-b border-white/[0.04]">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
            <button onClick={() => window.history.back()} className="p-2 -ml-2 text-slate-400 hover:text-white shrink-0"><ArrowLeft size={18} /></button>
            <span className="text-sm font-bold text-white truncate flex-1">{data.title}</span>
            <button onClick={toggleWakeLock} className={"p-2 transition-colors rounded-lg hover:bg-white/[0.05] shrink-0 " + (wakeLocked ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-400')} title={wakeLocked ? 'Matikan gembok layar' : 'Aktifkan gembok layar'}>
              {wakeLocked ? <Lock size={16} /> : <LockOpen size={16} />}
            </button>
            <button onClick={toggleFullscreen} className="p-2 text-slate-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-white/[0.05] shrink-0"><Maximize size={16} /></button>
          </div>
        </header>
      )}

      <div ref={containerRef} className={fullscreen ? 'fixed inset-0 z-[9999] bg-black flex flex-col' : ''}>

        {/* VIDEO PLAYER */}
        <div className={'relative bg-black ' + (fullscreen ? 'flex-1' : 'aspect-video max-w-5xl mx-auto mt-4 rounded-xl overflow-hidden border border-white/[0.06]')}>
          {streamUrl ? (
            <iframe key={streamUrl} src={streamUrl} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="no-referrer" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <MonitorPlay size={48} className="mb-3 text-slate-600" />
              <p className="text-sm">Streaming tidak tersedia</p>
              {downloadUrl && (
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="mt-3 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-sm font-semibold">
                  <Download size={14} className="inline mr-1" />Download Video
                </a>
              )}
            </div>
          )}
          {!fullscreen && <button onClick={toggleFullscreen} className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-lg text-white/80 hover:text-white transition-colors z-10"><Maximize size={16} /></button>}
        </div>

        {!fullscreen && (
          <>
            {/* PREV / NEXT */}
            <div className="max-w-5xl mx-auto px-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                {data.prevSlug ? (
                  <Link href={'/nonton/'+data.prevSlug+'?server='+server} className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-slate-300 hover:bg-white/[0.08] hover:text-white hover:border-cyan-400/30 transition-all">
                    <ChevronLeft size={16} />Episode Sebelumnya
                  </Link>
                ) : <span className="flex items-center justify-center px-4 py-3 text-xs text-slate-700 rounded-xl">—</span>}
                {data.nextSlug ? (
                  <Link href={'/nonton/'+data.nextSlug+'?server='+server} className="flex items-center justify-center gap-1.5 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                    Episode Selanjutnya<ChevronRight size={16} />
                  </Link>
                ) : <span className="flex items-center justify-center px-4 py-3 text-xs text-slate-700 rounded-xl">—</span>}
              </div>
            </div>

            {/* DOWNLOAD VIDEO BUTTON */}
            <div className="max-w-5xl mx-auto px-4 mt-4">
              <a
                href={downloadUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all">
                <Download size={18} />
                Download Video
              </a>
            </div>

            {/* SEMUA LINK DOWNLOAD */}
            {data.downloads.length > 0 && (
              <div className="max-w-5xl mx-auto px-4 mt-3 mb-8">
                <details className="group">
                  <summary className="text-[10px] text-slate-600 cursor-pointer hover:text-slate-400 flex items-center gap-1 select-none">
                    <List size={11} />Semua Link Download ({data.downloads.reduce((a,b)=>a+b.links.length,0)} link)
                  </summary>
                  <div className="mt-2 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 max-h-[300px] overflow-y-auto">
                    {data.downloads.map((dl,i) => (
                      <div key={i} className="mb-2 last:mb-0">
                        <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">{dl.quality}</p>
                        <div className="flex flex-wrap gap-1">
                          {dl.links.map((link,j) => <a key={j} href={link.url} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-[10px] text-slate-400 hover:bg-orange-500/15 hover:text-orange-300 hover:border-orange-400/30 transition-all flex items-center gap-1">{link.name}<ExternalLink size={8} /></a>)}
                        </div>
                      </div>
                    ))}
                    <p className="text-[9px] text-slate-600 text-center mt-2">Password RAR: <code className="text-orange-400">Samehadaku.care</code></p>
                  </div>
                </details>
              </div>
            )}

            {/* EPISODE LAINNYA */}
            {data.relatedEpisodes.length > 0 && (
              <div className="max-w-5xl mx-auto px-4 mb-12">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><List size={14} className="text-cyan-400" />Episode Lainnya</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {data.relatedEpisodes.slice(0, 25).map((ep,i) => (
                    <Link key={i} href={'/nonton/'+ep.slug+'?server='+server} className={'px-3 py-2 border rounded-lg text-xs font-medium transition-all shrink-0 ' + (ep.slug === slug ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300' : 'border-white/[0.04] bg-white/[0.01] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200')}>
                      {shortEp(ep.title, ep.slug)}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {fullscreen && (
          <div className="flex items-center justify-between px-4 py-2 bg-black shrink-0">
            {data.prevSlug && <Link href={'/nonton/'+data.prevSlug} className="px-3 py-1.5 text-xs text-white/70 bg-white/10 rounded-full hover:bg-white/20"><ChevronLeft size={14} className="inline -ml-1" />Prev</Link>}
            <span className="text-xs text-white/50 truncate mx-2">{data.title ? shortEp(data.title, slug) : ''}</span>
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

export default function NontonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center text-slate-500"><div className="w-10 h-10 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" /><p className="text-sm">Memuat...</p></div>
      </div>
    }>
      <NontonPageInner />
    </Suspense>
  );
}
