import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Video, Course, Chapter } from "@/types";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { VideoGridSkeleton } from "@/components/skeletons/VideoCardSkeleton";
import { FloatingButtons } from "@/components/FloatingButtons";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyCoursesPage() {
  const { user, userDoc } = useAuth();
  const navigate = useNavigate();
  const settings = useAppSettings();
  const [searchParams] = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [allSubjects, setAllSubjects] = useState<{ subjectId: string; subjectName: string; chapters?: Chapter[] }[]>([]);
  const [activeSubject, setActiveSubject] = useState("All");
  const [activeChapter, setActiveChapter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subjectParam = searchParams.get("subject");
    if (subjectParam) { setActiveSubject(subjectParam); setActiveChapter("All"); }
  }, [searchParams]);

  useEffect(() => {
    if (!user) { navigate("/auth?mode=login"); return; }
    if (userDoc?.status !== "approved") { setLoading(false); return; }
    const courseId = userDoc.activeCourseId;
    if (!courseId) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        const courseSnap = await getDoc(doc(db, "courses", courseId));
        if (courseSnap.exists()) {
          const course = { id: courseSnap.id, ...courseSnap.data() } as Course;
          setAllSubjects(course.subjects || []);
        }

        const q = query(collection(db, "videos"), where("courseId", "==", courseId));
        const snap = await getDocs(q);
        const vids = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Video));
        vids.sort((a, b) => (a.order || 0) - (b.order || 0));
        setVideos(vids);
      } catch (err) {
        console.error("Error fetching videos:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [user, userDoc]);

  if (!user) return null;

  if (userDoc?.status === "pending") {
    return (
      <div className="p-4 text-center mt-8">
        <div className="p-6 bg-warning/10 rounded-lg border border-warning/20">
          <p className="text-foreground font-medium">Enrollment Pending</p>
          <p className="text-sm text-muted-foreground mt-1">Your enrollment is being reviewed. Please wait for approval.</p>
        </div>
      </div>
    );
  }

  if (userDoc?.status === "rejected") {
    return (
      <div className="p-4 text-center mt-8">
        <div className="p-6 bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-foreground font-medium">Enrollment Rejected</p>
          <p className="text-sm text-muted-foreground mt-1">Your enrollment was rejected. Please contact support.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex gap-2 pb-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />)}</div>
        <VideoGridSkeleton count={6} />
      </div>
    );
  }

  // Get chapters for the selected subject
  const selectedSubjectObj = allSubjects.find(s => s.subjectName === activeSubject);
  const chapters = selectedSubjectObj?.chapters || [];

  // Filter videos
  let filtered = activeSubject === "All" ? videos : videos.filter((v) => v.subjectName === activeSubject);
  if (activeChapter !== "All" && activeSubject !== "All") {
    filtered = filtered.filter((v) => v.chapterName === activeChapter);
  }

  return (
    <div className="fixed inset-x-0 top-14 bottom-14 flex flex-col overflow-hidden sm:static sm:inset-auto sm:top-auto sm:bottom-auto sm:h-full">
      {/* Subject Chips */}
      <div className="sticky top-0 z-10 bg-background px-4 pt-4 pb-2 flex-shrink-0 space-y-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => { setActiveSubject("All"); setActiveChapter("All"); }}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium shrink-0 transition-colors ${activeSubject === "All" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-accent"}`}
          >
            All
          </button>
          {allSubjects.map((sub) => (
            <button
              key={sub.subjectId}
              onClick={() => { setActiveSubject(sub.subjectName); setActiveChapter("All"); }}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium shrink-0 transition-colors ${activeSubject === sub.subjectName ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-accent"}`}
            >
              {sub.subjectName}
            </button>
          ))}
        </div>

        {/* Chapter Chips - show only when a specific subject is selected and has chapters */}
        {activeSubject !== "All" && chapters.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveChapter("All")}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap font-medium shrink-0 transition-colors ${activeChapter === "All" ? "bg-secondary text-secondary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              All Chapters
            </button>
            {chapters.map((ch) => (
              <button
                key={ch.chapterId}
                onClick={() => setActiveChapter(ch.chapterName)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap font-medium shrink-0 transition-colors ${activeChapter === ch.chapterName ? "bg-secondary text-secondary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground"}`}
              >
                {ch.chapterName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video Cards */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No videos found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((video) => (
              <button
                key={video.id}
                onClick={() => navigate(`/video/${video.id}`)}
                className="bg-card rounded-lg sm:rounded-xl overflow-hidden border border-border text-left group hover:shadow-lg hover:border-primary/20 transition-all duration-200 w-full active:scale-[0.98]"
              >
                <div className="relative w-full aspect-video overflow-hidden">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="absolute inset-0 w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
                      No Thumbnail
                    </div>
                  )}
                </div>
                <div className="px-3 py-2.5 sm:p-3">
                  <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{video.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{settings.appName || "Darpan Academy"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <FloatingButtons />
    </div>
  );
}