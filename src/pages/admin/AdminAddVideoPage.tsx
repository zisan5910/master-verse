import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course, Video } from "@/types";
import { toast } from "sonner";
import { ImageUrlInput } from "@/components/ImageUrlInput";
import { Film, CheckCircle } from "lucide-react";

export default function AdminAddVideoPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [videoURL, setVideoURL] = useState("");
  const [pdfURL, setPdfURL] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, "courses")),
      getDocs(collection(db, "videos")),
    ]).then(([cSnap, vSnap]) => {
      setCourses(cSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
      setVideos(vSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Video)));
    });
  }, []);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const selectedSubject = selectedCourse?.subjects?.find((s) => s.subjectId === subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const course = courses.find((c) => c.id === courseId);
      const subject = course?.subjects?.find((s) => s.subjectId === subjectId);
      const chapter = subject?.chapters?.find((ch) => ch.chapterId === chapterId);
      
      const sameSubjectVideos = videos.filter(v => v.courseId === courseId && v.subjectId === subjectId);
      const maxOrder = sameSubjectVideos.length > 0 ? Math.max(...sameSubjectVideos.map(v => v.order || 0)) : -1;

      await addDoc(collection(db, "videos"), {
        courseId, courseName: course?.courseName || "", subjectId, subjectName: subject?.subjectName || "",
        chapterId: chapterId || "", chapterName: chapter?.chapterName || "",
        title, thumbnail, videoURL, pdfURL, order: maxOrder + 1, createdAt: Timestamp.now(),
      });
      toast.success("Video added successfully!");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setTitle(""); setThumbnail(""); setVideoURL(""); setPdfURL(""); setChapterId("");
      // Refresh videos for order calc
      const vSnap = await getDocs(collection(db, "videos"));
      setVideos(vSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Video)));
    } catch (err: any) { toast.error(err.message); }
    setSubmitting(false);
  };

  return (
    <div className="animate-fade-in w-full max-w-2xl mx-auto overflow-x-hidden overflow-y-auto pb-8 px-3 sm:px-4 pt-4" style={{ maxWidth: '100vw' }}>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Film className="h-5 w-5" /> Quick Add Video
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/30 border-b border-border">
            <Film className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Video Details</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Course</label>
              <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setSubjectId(""); setChapterId(""); }} required className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                <option value="">Select Course</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.courseName}</option>)}
              </select>
            </div>

            {selectedCourse?.subjects?.length ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(""); }} required className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                  <option value="">Select Subject</option>
                  {selectedCourse.subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
                </select>
              </div>
            ) : null}

            {selectedSubject?.chapters?.length ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Chapter (Optional)</label>
                <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                  <option value="">Select Chapter</option>
                  {selectedSubject.chapters.map((ch) => <option key={ch.chapterId} value={ch.chapterId}>{ch.chapterName}</option>)}
                </select>
              </div>
            ) : null}

            <div>
              <label className="text-xs font-medium text-muted-foreground">Video Title</label>
              <input type="text" placeholder="Video Title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>

            <ImageUrlInput label="Thumbnail URL" value={thumbnail} onChange={setThumbnail} placeholder="https://i.postimg.cc/..." />

            <div>
              <label className="text-xs font-medium text-muted-foreground">YouTube Video URL</label>
              <input type="text" placeholder="https://youtube.com/..." value={videoURL} onChange={(e) => setVideoURL(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">PDF URL (Optional)</label>
              <input type="text" placeholder="https://..." value={pdfURL} onChange={(e) => setPdfURL(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={submitting} className={`w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 ${
          success ? "bg-success text-white" : "bg-primary text-primary-foreground"
        }`}>
          {success ? <><CheckCircle className="h-4 w-4" /> Added!</> :
           submitting ? "Adding..." : "Add Video"}
        </button>
      </form>
    </div>
  );
}
