import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course, Subject, Instructor, DiscussionGroup, Chapter } from "@/types";
import { toast } from "sonner";
import { Plus, Edit, Trash2, X, ChevronUp, ChevronDown, ChevronLeft, GripVertical, BookOpen, Users, MessageSquare, FileText, Link2, Image } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ImageUrlInput } from "@/components/ImageUrlInput";
import { AdminCourseListSkeleton } from "@/components/skeletons/AdminSkeleton";

/* ── Section wrapper ── */
const FormSection = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/30 border-b border-border">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-foreground">{title}</span>
    </div>
    <div className="p-4 space-y-3">{children}</div>
  </div>
);

/* ── Styled input ── */
const FormInput = ({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1">
    {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
    <input {...props} className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/60" />
  </div>
);

export default function AdminCoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(searchParams.get("add") === "true");
  const [editCourse, setEditCourse] = useState<Course | null>(null);

  const [courseName, setCourseName] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [price, setPrice] = useState(0);
  const [overview, setOverview] = useState<string[]>([""]);
  const [subjects, setSubjects] = useState<Subject[]>([{ subjectId: crypto.randomUUID(), subjectName: "", chapters: [] }]);
  const [instructors, setInstructors] = useState<Instructor[]>([{ name: "", subject: "", image: "" }]);
  const [discussionGroups, setDiscussionGroups] = useState<DiscussionGroup[]>([{ name: "", link: "" }]);
  const [routinePDF, setRoutinePDF] = useState("");
  const [allMaterialsLink, setAllMaterialsLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    const snap = await getDocs(collection(db, "courses"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
    list.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    setCourses(list);
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, []);

  const resetForm = () => {
    setCourseName(""); setThumbnailUrl(""); setPrice(0);
    setOverview([""]); setSubjects([{ subjectId: crypto.randomUUID(), subjectName: "", chapters: [] }]);
    setInstructors([{ name: "", subject: "", image: "" }]);
    setDiscussionGroups([{ name: "", link: "" }]); setRoutinePDF(""); setAllMaterialsLink(""); setEditCourse(null);
  };

  const openAdd = () => { resetForm(); setShowForm(true); searchParams.delete("add"); setSearchParams(searchParams, { replace: true }); };
  const closeForm = () => { setShowForm(false); resetForm(); searchParams.delete("add"); setSearchParams(searchParams, { replace: true }); };

  const openEdit = (c: Course) => {
    setEditCourse(c); setCourseName(c.courseName); setThumbnailUrl(c.thumbnail); setPrice(c.price);
    setOverview(c.overview?.length ? c.overview : [""]); setSubjects(c.subjects?.length ? c.subjects : [{ subjectId: crypto.randomUUID(), subjectName: "", chapters: [] }]);
    setInstructors(c.instructors?.length ? c.instructors : [{ name: "", subject: "", image: "" }]);
    setDiscussionGroups(c.discussionGroups?.length ? c.discussionGroups : [{ name: "", link: "" }]);
    setRoutinePDF(c.routinePDF || ""); setAllMaterialsLink(c.allMaterialsLink || ""); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const filteredSubjects = subjects.filter((s) => s.subjectName);
      const data: any = {
        courseName, thumbnail: thumbnailUrl, price, overview: overview.filter(Boolean),
        subjects: filteredSubjects,
        instructors: instructors.filter((i) => i.name),
        discussionGroups: discussionGroups.filter((g) => g.name && g.link),
        routinePDF, allMaterialsLink, createdAt: Timestamp.now(),
      };
      if (editCourse) {
        data.order = (editCourse as any).order || 0;
        await updateDoc(doc(db, "courses", editCourse.id), data);
        toast.success("Course updated");
      } else {
        data.order = courses.length;
        await addDoc(collection(db, "courses"), data);
        toast.success("Course added");
      }
      closeForm(); fetchCourses();
    } catch (err: any) { toast.error(err.message); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "courses", id));
    toast.success("Course deleted"); fetchCourses();
  };

  const moveCourse = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= courses.length) return;
    const batch = writeBatch(db);
    const orderA = (courses[index] as any).order ?? index;
    const orderB = (courses[swapIndex] as any).order ?? swapIndex;
    batch.update(doc(db, "courses", courses[index].id), { order: orderB });
    batch.update(doc(db, "courses", courses[swapIndex].id), { order: orderA });
    await batch.commit();
    toast.success("Order updated");
    fetchCourses();
  };

  if (loading) return <AdminCourseListSkeleton count={4} />;

  // ── Add/Edit Form ──
  if (showForm) {
    return (
      <div className="animate-fade-in w-full max-w-2xl mx-auto overflow-x-hidden overflow-y-auto pb-8 box-border">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
          <button onClick={closeForm} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2 hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="text-lg font-semibold text-foreground">{editCourse ? "Edit Course" : "New Course"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-3 sm:px-4 pt-4 space-y-4 overflow-x-hidden">
          {/* Basic Info */}
          <FormSection icon={BookOpen} title="Basic Information">
            <FormInput label="Course Name" type="text" placeholder="e.g. HSC Physics 2025" value={courseName} onChange={(e) => setCourseName(e.target.value)} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ImageUrlInput label="Thumbnail URL" value={thumbnailUrl} onChange={setThumbnailUrl} placeholder="https://i.postimg.cc/..." />
              <FormInput label="Price (৳)" type="number" placeholder="0" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
          </FormSection>

          {/* Overview */}
          <FormSection icon={FileText} title="Overview Points">
            {overview.map((p, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground/50 w-5 text-center flex-shrink-0">{i + 1}</span>
                <input value={p} onChange={(e) => { const o = [...overview]; o[i] = e.target.value; setOverview(o); }} placeholder={`Point ${i + 1}`} className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                {overview.length > 1 && (
                  <button type="button" onClick={() => setOverview(overview.filter((_, j) => j !== i))} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setOverview([...overview, ""])} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add Point
            </button>
          </FormSection>

          {/* Subjects & Chapters */}
          <FormSection icon={BookOpen} title="Subjects & Chapters">
            {subjects.map((s, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-accent/10 overflow-hidden">
                <div className="flex gap-2 items-center p-3 bg-accent/20">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                  <input value={s.subjectName} onChange={(e) => { const a = [...subjects]; a[i] = { ...a[i], subjectName: e.target.value }; setSubjects(a); }} placeholder="Subject Name" className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  {subjects.length > 1 && (
                    <button type="button" onClick={() => setSubjects(subjects.filter((_, j) => j !== i))} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {/* Chapters */}
                <div className="px-3 pb-3 pt-2 space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Chapters</span>
                  {(s.chapters || []).map((ch, ci) => (
                    <div key={ci} className="flex gap-2 items-center pl-2">
                      <span className="text-[10px] text-muted-foreground/40 w-4 text-center flex-shrink-0">{ci + 1}</span>
                      <input value={ch.chapterName} onChange={(e) => {
                        const a = [...subjects];
                        const chapters = [...(a[i].chapters || [])];
                        chapters[ci] = { ...chapters[ci], chapterName: e.target.value };
                        a[i] = { ...a[i], chapters };
                        setSubjects(a);
                      }} placeholder={`Chapter ${ci + 1}`} className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                      <button type="button" onClick={() => {
                        const a = [...subjects];
                        const chapters = (a[i].chapters || []).filter((_, j) => j !== ci);
                        a[i] = { ...a[i], chapters };
                        setSubjects(a);
                      }} className="p-1 rounded-lg hover:bg-destructive/10 text-destructive/50 hover:text-destructive transition-colors flex-shrink-0">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    const a = [...subjects];
                    const chapters = [...(a[i].chapters || []), { chapterId: crypto.randomUUID(), chapterName: "" }];
                    a[i] = { ...a[i], chapters };
                    setSubjects(a);
                  }} className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 pl-2">
                    <Plus className="h-3 w-3" /> Add Chapter
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setSubjects([...subjects, { subjectId: crypto.randomUUID(), subjectName: "", chapters: [] }])} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add Subject
            </button>
          </FormSection>

          {/* Instructors */}
          <FormSection icon={Users} title="Instructors">
            {instructors.map((inst, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-accent/10 p-3 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <FormInput label="Name" value={inst.name} onChange={(e) => { const a = [...instructors]; a[i] = { ...a[i], name: e.target.value }; setInstructors(a); }} placeholder="Instructor name" />
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Subject</label>
                    <select
                      value={inst.subject}
                      onChange={(e) => { const a = [...instructors]; a[i] = { ...a[i], subject: e.target.value }; setInstructors(a); }}
                      className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                      <option value="">Select Subject</option>
                      {subjects.filter(s => s.subjectName).map((s) => (
                        <option key={s.subjectId} value={s.subjectName}>{s.subjectName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <ImageUrlInput
                  label="Photo URL"
                  value={inst.image}
                  onChange={(url) => { const a = [...instructors]; a[i] = { ...a[i], image: url }; setInstructors(a); }}
                  placeholder="https://i.postimg.cc/..."
                />
                {instructors.length > 1 && (
                  <button type="button" onClick={() => { setInstructors(instructors.filter((_, j) => j !== i)); }} className="text-xs text-destructive/70 hover:text-destructive transition-colors flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => { setInstructors([...instructors, { name: "", subject: "", image: "" }]); }} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add Instructor
            </button>
          </FormSection>

          {/* Discussion Groups */}
          <FormSection icon={MessageSquare} title="Discussion Groups">
            {discussionGroups.map((g, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-accent/10 p-3 space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 min-w-0 space-y-2">
                    <FormInput label="Group Name" value={g.name} onChange={(e) => { const a = [...discussionGroups]; a[i] = { ...a[i], name: e.target.value }; setDiscussionGroups(a); }} placeholder="e.g. Telegram Group" />
                    <FormInput label="Link" value={g.link} onChange={(e) => { const a = [...discussionGroups]; a[i] = { ...a[i], link: e.target.value }; setDiscussionGroups(a); }} placeholder="https://..." />
                  </div>
                  {discussionGroups.length > 1 && (
                    <button type="button" onClick={() => setDiscussionGroups(discussionGroups.filter((_, j) => j !== i))} className="p-1.5 mt-5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors flex-shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setDiscussionGroups([...discussionGroups, { name: "", link: "" }])} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add Group
            </button>
          </FormSection>

          {/* Links */}
          <FormSection icon={Link2} title="Resources">
            <FormInput label="Routine PDF URL" type="text" placeholder="https://..." value={routinePDF} onChange={(e) => setRoutinePDF(e.target.value)} />
            <FormInput label="All Materials Link" type="text" placeholder="https://..." value={allMaterialsLink} onChange={(e) => setAllMaterialsLink(e.target.value)} />
          </FormSection>

          {/* Submit */}
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm">
            {submitting ? "Saving..." : editCourse ? "Update Course" : "Add Course"}
          </button>
        </form>
      </div>
    );
  }

  // ── Course List ──
  return (
    <div className="p-3 sm:p-4 animate-fade-in max-w-4xl mx-auto overflow-x-hidden w-full box-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Courses ({courses.length})</h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-95 shadow-sm font-medium">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="space-y-2.5">
        {courses.map((c, idx) => (
          <div key={c.id} className="p-3 bg-card rounded-xl border border-border flex gap-3 items-center hover:border-primary/20 transition-colors">
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button onClick={() => moveCourse(idx, "up")} disabled={idx === 0} className="p-1 rounded-lg hover:bg-accent disabled:opacity-20 transition-colors">
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => moveCourse(idx, "down")} disabled={idx === courses.length - 1} className="p-1 rounded-lg hover:bg-accent disabled:opacity-20 transition-colors">
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {c.thumbnail ? <img src={c.thumbnail} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0" /> : <div className="w-14 h-14 sm:w-16 sm:h-16 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center"><Image className="h-5 w-5 text-muted-foreground/40" /></div>}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{c.courseName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">৳{c.price} • {c.subjects?.length || 0} subjects</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-accent transition-colors"><Edit className="h-4 w-4 text-muted-foreground" /></button>
              <AlertDialog>
                <AlertDialogTrigger asChild><button className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="h-4 w-4 text-destructive/70" /></button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete Course</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{c.courseName}".</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(c.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
