import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Video, Course } from "@/types";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ChevronUp, ChevronDown, ChevronLeft, Search, Film, Filter } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ImageUrlInput } from "@/components/ImageUrlInput";
import { AdminVideoListSkeleton } from "@/components/skeletons/AdminSkeleton";

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [search, setSearch] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");

  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [videoURL, setVideoURL] = useState("");
  const [pdfURL, setPdfURL] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    const [vSnap, cSnap] = await Promise.all([
      getDocs(collection(db, "videos")),
      getDocs(collection(db, "courses")),
    ]);
    const vids = vSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Video));
    vids.sort((a, b) => (a.order || 0) - (b.order || 0));
    setVideos(vids);
    setCourses(cSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const filterCourse = courses.find((c) => c.id === filterCourseId);
  const selectedSubject = selectedCourse?.subjects?.find((s) => s.subjectId === subjectId);

  const resetForm = () => {
    setCourseId(""); setSubjectId(""); setChapterId(""); setTitle(""); setThumbnail(""); setVideoURL(""); setPdfURL(""); setEditVideo(null);
  };

  const openAdd = () => { resetForm(); setShowForm(true); };

  const openEdit = (v: Video) => {
    setEditVideo(v); setCourseId(v.courseId); setSubjectId(v.subjectId); setChapterId(v.chapterId || "");
    setTitle(v.title); setThumbnail(v.thumbnail); setVideoURL(v.videoURL); setPdfURL(v.pdfURL); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const course = courses.find((c) => c.id === courseId);
      const subject = course?.subjects?.find((s) => s.subjectId === subjectId);
      const chapter = subject?.chapters?.find((ch) => ch.chapterId === chapterId);

      const sameSubjectVideos = videos.filter(v => v.courseId === courseId && v.subjectId === subjectId);
      const maxOrder = sameSubjectVideos.length > 0 ? Math.max(...sameSubjectVideos.map(v => v.order || 0)) : -1;

      const data: any = {
        courseId, courseName: course?.courseName || "", subjectId, subjectName: subject?.subjectName || "",
        chapterId: chapterId || "", chapterName: chapter?.chapterName || "",
        title, thumbnail, videoURL, pdfURL, createdAt: Timestamp.now(),
      };
      if (editVideo) {
        data.order = editVideo.order;
        await updateDoc(doc(db, "videos", editVideo.id), data);
        toast.success("Video updated");
      } else {
        data.order = maxOrder + 1;
        await addDoc(collection(db, "videos"), data);
        toast.success("Video added");
      }
      setShowForm(false); resetForm(); fetchData();
    } catch (err: any) { toast.error(err.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "videos", id));
    toast.success("Video deleted"); fetchData();
  };

  const moveVideo = async (index: number, direction: "up" | "down") => {
    const filteredList = [...filtered];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= filteredList.length) return;

    const batch = writeBatch(db);
    const orderA = filteredList[index].order || index;
    const orderB = filteredList[swapIndex].order || swapIndex;

    batch.update(doc(db, "videos", filteredList[index].id), { order: orderB });
    batch.update(doc(db, "videos", filteredList[swapIndex].id), { order: orderA });
    await batch.commit();
    toast.success("Order updated");
    fetchData();
  };

  const filtered = videos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.courseName.toLowerCase().includes(search.toLowerCase()) ||
      v.subjectName.toLowerCase().includes(search.toLowerCase());
    const matchesCourse = !filterCourseId || v.courseId === filterCourseId;
    const matchesSubject = !filterSubjectId || v.subjectId === filterSubjectId;
    return matchesSearch && matchesCourse && matchesSubject;
  });

  if (loading) return <AdminVideoListSkeleton count={5} />;

  // Form view
  if (showForm) {
    return (
      <div className="animate-fade-in w-full max-w-2xl mx-auto overflow-x-hidden overflow-y-auto pb-8" style={{ maxWidth: '100vw' }}>
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
          <button onClick={() => { setShowForm(false); resetForm(); }} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2 hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="text-lg font-semibold text-foreground">{editVideo ? "Edit Video" : "Add Video"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-3 sm:px-4 pt-4 space-y-4 overflow-x-hidden">
          {/* Course & Subject */}
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
                <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
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

          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm">
            {submitting ? "Saving..." : editVideo ? "Update Video" : "Add Video"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 animate-fade-in max-w-4xl mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Film className="h-5 w-5" /> Videos ({videos.length})
        </h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-95 shadow-sm font-medium">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search videos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        <select
          value={filterCourseId}
          onChange={(e) => { setFilterCourseId(e.target.value); setFilterSubjectId(""); }}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        >
          <option value="">All Courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.courseName}</option>)}
        </select>

        {filterCourse?.subjects?.length ? (
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          >
            <option value="">All Subjects</option>
            {filterCourse.subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
          </select>
        ) : null}

        {(filterCourseId || filterSubjectId) && (
          <button
            onClick={() => { setFilterCourseId(""); setFilterSubjectId(""); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      {(search || filterCourseId) && (
        <p className="text-xs text-muted-foreground mb-2">{filtered.length} video{filtered.length !== 1 ? "s" : ""} found</p>
      )}

      {/* Video List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">No videos found</div>
        )}
        {filtered.map((v, idx) => (
          <div key={v.id} className="p-3 bg-card rounded-xl border border-border flex gap-3 items-center hover:border-primary/20 transition-colors">
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button onClick={() => moveVideo(idx, "up")} disabled={idx === 0} className="p-0.5 rounded hover:bg-accent disabled:opacity-20">
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => moveVideo(idx, "down")} disabled={idx === filtered.length - 1} className="p-0.5 rounded hover:bg-accent disabled:opacity-20">
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {v.thumbnail ? (
              <img src={v.thumbnail} alt="" className="w-16 h-10 sm:w-20 sm:h-12 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-10 sm:w-20 sm:h-12 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                <Film className="h-4 w-4 text-muted-foreground/40" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm line-clamp-1">{v.title}</p>
              <p className="text-xs text-muted-foreground truncate">{v.courseName} • {v.subjectName}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(v)} className="p-2 rounded-lg hover:bg-accent transition-colors"><Edit className="h-4 w-4 text-muted-foreground" /></button>
              <AlertDialog>
                <AlertDialogTrigger asChild><button className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="h-4 w-4 text-destructive/70" /></button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete Video</AlertDialogTitle><AlertDialogDescription>Delete "{v.title}"?</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(v.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
