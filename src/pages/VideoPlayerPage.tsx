import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Video, Course } from "@/types";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { ChevronLeft, ChevronRight, FileText, Play, Pause, Maximize, Minimize, RotateCcw, RotateCw, ArrowLeft, Filter, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FloatingButtons } from "@/components/FloatingButtons";
import { useIsMobile } from "@/hooks/use-mobile";
import { VideoPlayerSkeleton } from "@/components/skeletons/VideoPlayerSkeleton";

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2];

const getYouTubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&#]+)/);
  return match?.[1] || "";
};

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// Load YT API once globally
let ytApiLoaded = false;
let ytApiCallbacks: (() => void)[] = [];

function ensureYTApi(cb: () => void) {
  if (window.YT && window.YT.Player) { cb(); return; }
  ytApiCallbacks.push(cb);
  if (!ytApiLoaded) {
    ytApiLoaded = true;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      ytApiCallbacks.forEach(fn => fn());
      ytApiCallbacks = [];
    };
  }
}

export default function VideoPlayerPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const settings = useAppSettings();
  const isMobile = useIsMobile();
  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [allChapters, setAllChapters] = useState<{ chapterId: string; chapterName: string }[]>([]);
  const [chapterFilter, setChapterFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<{ side: "left" | "right"; visible: boolean }>({ side: "left", visible: false });
  const seekFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTap = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch video data
  useEffect(() => {
    if (!user) { navigate("/auth?mode=login"); return; }
    if (!videoId) return;

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "videos", videoId));
        if (cancelled) return;
        if (!snap.exists()) { setVideo(null); setLoading(false); return; }
        const v = { id: snap.id, ...snap.data() } as Video;
        setVideo(v);

        // Fetch chapters from course
        try {
          const courseSnap = await getDoc(doc(db, "courses", v.courseId));
          if (!cancelled && courseSnap.exists()) {
            const course = { id: courseSnap.id, ...courseSnap.data() } as Course;
            const sub = course.subjects?.find(s => s.subjectId === v.subjectId);
            setAllChapters(sub?.chapters || []);
          }
        } catch {}

        const q = query(collection(db, "videos"), where("courseId", "==", v.courseId));
        const relSnap = await getDocs(q);
        if (cancelled) return;
        const vids = relSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Video))
          .filter((vid) => vid.subjectId === v.subjectId);
        vids.sort((a, b) => (a.order || 0) - (b.order || 0));
        setRelatedVideos(vids);
        setChapterFilter("All");
      } catch {
        if (!cancelled) setRelatedVideos([]);
      }
      if (!cancelled) setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [videoId, user]);

  // Initialize YouTube player - runs after video data is loaded
  useEffect(() => {
    if (!video || loading) return;
    const ytId = getYouTubeId(video.videoURL);
    if (!ytId) return;

    // Reset state
    setPlayerReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSpeedIndex(0);

    // Destroy old player
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }

    // Recreate the player div
    const container = playerDivRef.current;
    if (!container) return;
    container.innerHTML = '';
    const playerEl = document.createElement('div');
    playerEl.id = `yt-player-${video.id}`;
    playerEl.className = 'absolute inset-0 w-full h-full pointer-events-none';
    container.appendChild(playerEl);

    const currentVideoId = video.id;

    const initPlayer = () => {
      if (!mountedRef.current) return;
      // Verify the element still exists
      const el = document.getElementById(`yt-player-${currentVideoId}`);
      if (!el) return;

      playerRef.current = new window.YT.Player(el, {
        videoId: ytId,
        playerVars: {
          autoplay: 1, controls: 0, modestbranding: 1, rel: 0,
          showinfo: 0, iv_load_policy: 3, fs: 0, disablekb: 1,
          playsinline: 1, origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            if (!mountedRef.current) return;
            setPlayerReady(true);
            setDuration(e.target.getDuration());
            e.target.playVideo();
          },
          onStateChange: (e: any) => {
            if (!mountedRef.current) return;
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    };

    ensureYTApi(() => {
      // Small delay to ensure DOM is ready
      setTimeout(initPlayer, 100);
    });

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [video?.id, loading]);

  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (playerReady && isPlaying) {
      progressInterval.current = setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          setCurrentTime(playerRef.current.getCurrentTime());
          setDuration(playerRef.current.getDuration());
        }
      }, 500);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [playerReady, isPlaying]);

  useEffect(() => {
    if (showControls && isPlaying) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [showControls, isPlaying]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo(); else playerRef.current.playVideo();
  }, [isPlaying]);

  const seek = useCallback((seconds: number) => {
    if (!playerRef.current) return;
    const t = playerRef.current.getCurrentTime() + seconds;
    playerRef.current.seekTo(Math.max(0, Math.min(t, duration)), true);
  }, [duration]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (playerRef.current) playerRef.current.setPlaybackRate(SPEEDS[next]);
  }, [speedIndex]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      try { (screen.orientation as any)?.lock?.("landscape").catch(() => {}); } catch {}
    } else document.exitFullscreen();
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!playerReady) return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": case "j": e.preventDefault(); seek(-10); break;
        case "ArrowRight": case "l": e.preventDefault(); seek(10); break;
        case "f": e.preventDefault(); toggleFullscreen(); break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [playerReady, togglePlay, seek, toggleFullscreen]);

  const handlePlayerTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setShowControls(true);
    const now = Date.now();
    const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const half = rect.width / 2;
    if (now - lastTap.current.time < 300) {
      const side = x < half ? "left" : "right";
      seek(side === "left" ? -10 : 10);
      setSeekFeedback({ side, visible: true });
      if (seekFeedbackTimeout.current) clearTimeout(seekFeedbackTimeout.current);
      seekFeedbackTimeout.current = setTimeout(() => setSeekFeedback(p => ({ ...p, visible: false })), 600);
    }
    lastTap.current = { time: now, x };
  }, [seek]);

  const handleSeekBar = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setCurrentTime(t);
    playerRef.current?.seekTo(t, true);
  }, []);

  if (!video && loading) return <VideoPlayerSkeleton />;
  if (!video && !loading) return <div className="p-4 text-center text-muted-foreground">Video not found.</div>;

  const currentIndex = relatedVideos.findIndex((v) => v.id === videoId);
  const prevVideo = currentIndex > 0 ? relatedVideos[currentIndex - 1] : null;
  const nextVideo = currentIndex < relatedVideos.length - 1 ? relatedVideos[currentIndex + 1] : null;

  return (
    <div className={`animate-fade-in lg:flex lg:gap-4 lg:p-4 ${isMobile ? 'flex flex-col overflow-hidden h-[calc(100vh-7rem)]' : 'h-[calc(100vh-3.5rem)]'}`} onContextMenu={(e) => e.preventDefault()}>
      <div className="lg:flex-1 flex flex-col h-full">
        <div className="z-30 bg-background shrink-0">
          <div
            ref={containerRef}
            className="relative aspect-video bg-black overflow-hidden select-none"
            onClick={handlePlayerTap}
            onMouseMove={() => setShowControls(true)}
          >
            <div ref={playerDivRef} className="absolute inset-0 w-full h-full" />
            <div className="absolute inset-0 z-10" style={{ pointerEvents: "auto" }} />

            {seekFeedback.visible && (
              <div className={`absolute top-1/2 -translate-y-1/2 z-20 bg-foreground/20 rounded-full w-16 h-16 flex items-center justify-center animate-fade-in ${seekFeedback.side === "left" ? "left-8" : "right-8"}`}>
                <span className="text-white text-sm font-medium">{seekFeedback.side === "left" ? "-10s" : "+10s"}</span>
              </div>
            )}

            <div className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
              <input
                type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeekBar}
                className="w-full h-1 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); seek(-10); }} className="text-white p-1">
                    <RotateCcw className="h-5 w-5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white p-1">
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); seek(10); }} className="text-white p-1">
                    <RotateCw className="h-5 w-5" />
                  </button>
                  <span className="text-white text-xs ml-1">{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); cycleSpeed(); }} className="text-white text-xs font-medium px-2 py-0.5 bg-white/20 rounded">
                    {SPEEDS[speedIndex]}x
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white p-1">
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4">
            <h2 className="font-semibold text-foreground">{video.title}</h2>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button onClick={() => prevVideo && navigate(`/video/${prevVideo.id}`)} disabled={!prevVideo}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-card border border-border text-foreground disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button onClick={() => nextVideo && navigate(`/video/${nextVideo.id}`)} disabled={!nextVideo}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-card border border-border text-foreground disabled:opacity-30">
                Next <ChevronRight className="h-4 w-4" />
              </button>
              {video.pdfURL && (
                <a href={video.pdfURL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground">
                  <FileText className="h-4 w-4" /> PDF
                </a>
              )}
              {!isMobile && (
                <button onClick={() => navigate("/my-courses")}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-accent border border-border text-foreground">
                  <ArrowLeft className="h-4 w-4" /> My Courses
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-2 lg:pb-0 p-4 lg:hidden">
           <div className="flex items-center justify-between mb-3">
             <h3 className="font-semibold text-foreground">More Videos</h3>
             {allChapters.length > 0 && (
               <ChapterDropdown chapters={allChapters} value={chapterFilter} onChange={setChapterFilter} />
             )}
           </div>
          <div className="space-y-2">
            {(chapterFilter === "All" ? relatedVideos : relatedVideos.filter(v => v.chapterName === chapterFilter)).map((v) => (
              <VideoListItem key={v.id} v={v} videoId={videoId} settings={settings} />
            ))}
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:w-80 overflow-y-auto h-full">
         <div className="flex items-center justify-between mb-3">
           <h3 className="font-semibold text-foreground">More Videos</h3>
           {allChapters.length > 0 && (
             <ChapterDropdown chapters={allChapters} value={chapterFilter} onChange={setChapterFilter} />
           )}
         </div>
        <div className="space-y-2">
          {(chapterFilter === "All" ? relatedVideos : relatedVideos.filter(v => v.chapterName === chapterFilter)).map((v) => (
            <VideoListItem key={v.id} v={v} videoId={videoId} settings={settings} />
          ))}
        </div>
      </div>
      <FloatingButtons />
    </div>
  );
}

function ChapterDropdown({ chapters, value, onChange }: { chapters: { chapterId: string; chapterName: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-card border border-border text-foreground hover:bg-accent transition-colors">
          <Filter className="h-3.5 w-3.5" />
          <span className="max-w-[120px] truncate">{value === "All" ? "All Chapters" : value}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto min-w-[180px]">
        <DropdownMenuItem onClick={() => onChange("All")} className="flex items-center justify-between gap-2">
          <span>All Chapters</span>
          {value === "All" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>
        {chapters.map(ch => (
          <DropdownMenuItem key={ch.chapterId} onClick={() => onChange(ch.chapterName)} className="flex items-center justify-between gap-2">
            <span className="truncate">{ch.chapterName}</span>
            {value === ch.chapterName && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function VideoListItem({ v, videoId, settings }: { v: Video; videoId?: string; settings: any }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(`/video/${v.id}`)}
      className={`flex gap-3 w-full text-left p-2 rounded-md ${v.id === videoId ? "bg-accent border border-primary/30" : "hover:bg-accent"}`}>
      {v.thumbnail ? (
        <img src={v.thumbnail} alt="" className="w-28 h-16 object-cover rounded-md flex-shrink-0" />
      ) : (
        <div className="w-28 h-16 bg-muted rounded-md flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium line-clamp-2 ${v.id === videoId ? "text-primary" : "text-foreground"}`}>{v.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{settings.appName || "Darpan Academy"}</p>
      </div>
    </button>
  );
}
