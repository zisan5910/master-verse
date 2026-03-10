import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Video, Course } from "@/types";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { VideoGridSkeleton } from "@/components/skeletons/VideoCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function CourseContentPage() {
  const { courseId } = useParams();
  const { user, userDoc } = useAuth();
  const navigate = useNavigate();
  const settings = useAppSettings();
  const [videos, setVideos] = useState<Video[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [activeSubject, setActiveSubject] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/auth?mode=login"); return; }
    const fetch = async () => {
      if (!courseId) return;
      const courseSnap = await getDoc(doc(db, "courses", courseId));
      if (courseSnap.exists()) setCourse({ id: courseSnap.id, ...courseSnap.data() } as Course);

      const q = query(collection(db, "videos"), where("courseId", "==", courseId));
      const snap = await getDocs(q);
      const vids = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Video));
      vids.sort((a, b) => (a.order || 0) - (b.order || 0));
      setVideos(vids);
      setSubjects([...new Set(vids.map((v) => v.subjectName))] as string[]);
      setLoading(false);
    };
    fetch();
  }, [courseId, user]);

  if (loading) {
    return <div className="p-4"><Skeleton className="h-6 w-48 mb-3" /><div className="flex gap-2 pb-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-8 w-20 rounded-full" />)}</div><VideoGridSkeleton count={6} /></div>;
  }

  const filtered = activeSubject === "All" ? videos : videos.filter((v) => v.subjectName === activeSubject);

  return (
    <div className="p-4 animate-fade-in">
      {course && <h2 className="text-lg font-semibold text-foreground mb-3">{course.courseName}</h2>}
      
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
        <button onClick={() => setActiveSubject("All")} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium ${activeSubject === "All" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>All</button>
        {subjects.map((sub) => (
          <button key={sub} onClick={() => setActiveSubject(sub)} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium ${activeSubject === sub ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>{sub}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No videos found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((video) => (
            <button key={video.id} onClick={() => navigate(`/video/${video.id}`)} className="bg-card rounded-lg shadow-card overflow-hidden border border-border text-left">
              {video.thumbnail ? <img src={video.thumbnail} alt={video.title} className="w-full h-36 object-cover" /> : <div className="w-full h-36 bg-muted" />}
              <div className="p-3">
                <p className="text-sm font-medium text-foreground line-clamp-2">{video.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{settings.appName || "Darpan Academy"}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
