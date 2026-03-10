import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Course } from "@/types";
import { FileText, Users, Clock, BookOpen, MessageSquare, ExternalLink, Lock, ClipboardList, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { CourseDetailsSkeleton } from "@/components/skeletons/CourseDetailsSkeleton";
import { FloatingButtons } from "@/components/FloatingButtons";

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const { user, userDoc } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      const snap = await getDoc(doc(db, "courses", courseId));
      if (snap.exists()) setCourse({ id: snap.id, ...snap.data() } as Course);
      
      if (user) {
        const q = query(collection(db, "enrollRequests"), where("userId", "==", user.uid), where("courseId", "==", courseId));
        const reqSnap = await getDocs(q);
        if (!reqSnap.empty) {
          const statuses = reqSnap.docs.map(d => d.data().status as string);
          if (statuses.includes("approved")) setEnrollmentStatus("approved");
          else if (statuses.includes("pending")) { setEnrollmentStatus("pending"); setHasPendingRequest(true); }
          else setEnrollmentStatus(statuses[0]);
        }
      }
      
      setLoading(false);
    };
    fetchData();
  }, [courseId, user]);

  if (loading) return <CourseDetailsSkeleton />;
  if (!course) return <div className="p-4 text-center text-muted-foreground">Course not found.</div>;

  const isEnrolled = userDoc?.enrolledCourses?.some((c) => c.courseId === courseId);
  const isApproved = enrollmentStatus === "approved";
  const isPending = enrollmentStatus === "pending";

  const handleEnroll = () => {
    if (!user) navigate(`/auth?mode=register&courseId=${courseId}`);
    else if (!isEnrolled) navigate(`/auth?mode=register&courseId=${courseId}`);
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  return (
    <div className="animate-fade-in">
      <div className="max-w-2xl mx-auto">
        {/* Thumbnail - always on top */}
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.courseName} className="w-full aspect-video object-cover" />
        ) : (
          <div className="w-full aspect-video bg-muted flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        <div className="p-4 lg:p-6 space-y-5">
          {/* Course Name & Price */}
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">{course.courseName}</h1>
            <p className="text-lg font-semibold text-primary mt-1">৳{course.price}</p>
            {isPending && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm font-medium">
                <Clock className="h-4 w-4" /> Your enrollment is pending approval
              </div>
            )}
          </div>

          {/* Routine PDF */}
          {course.routinePDF && (
            <a href={course.routinePDF} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="flex-1">Routine</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          )}

          {/* Overview */}
          {course.overview?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Overview
              </h3>
              <ul className="space-y-2">
                {course.overview.map((point, i) => (
                  <li key={i} className="text-muted-foreground text-sm flex gap-2.5">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Subjects + Chapters */}
          {course.subjects?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Subjects ({course.subjects.length})
              </h3>
              <div className="space-y-2">
                {course.subjects.map((s) => (
                  <div key={s.subjectId} className="rounded-lg bg-accent/30 overflow-hidden">
                    <button
                      onClick={() => s.chapters?.length && toggleSubject(s.subjectId)}
                      className="flex items-center justify-between w-full px-3 py-2.5 text-left"
                    >
                      <span className="text-sm font-medium text-foreground">{s.subjectName}</span>
                      <div className="flex items-center gap-2">
                        {s.chapters?.length ? (
                          <>
                            <span className="text-xs text-muted-foreground">{s.chapters.length} chapters</span>
                            {expandedSubjects[s.subjectId] ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          </>
                        ) : null}
                      </div>
                    </button>
                    {s.chapters?.length > 0 && expandedSubjects[s.subjectId] && (
                      <div className="px-3 pb-2.5 space-y-1">
                        {s.chapters.map((ch, ci) => (
                          <div key={ch.chapterId} className="text-xs text-muted-foreground pl-3 flex items-center gap-2">
                            <span className="text-primary/50">{ci + 1}.</span> {ch.chapterName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructors */}
          {course.instructors?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Instructors
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {course.instructors.map((inst, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                    {inst.image ? (
                      <img src={inst.image} alt={inst.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/20" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{inst.name[0]}</div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{inst.name}</p>
                      <p className="text-xs text-muted-foreground">{inst.subject}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enrolled-only content */}
          {isEnrolled && isApproved ? (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                🎓 Enrolled Content
              </h3>
              
              {course.allMaterialsLink && (
                <a href={course.allMaterialsLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="flex-1">All Materials</span>
                  <ExternalLink className="h-4 w-4 text-primary" />
                </a>
              )}

              {course.discussionGroups?.filter(g => g.name && g.link).length > 0 && (
                <div className="space-y-2">
                  {course.discussionGroups.filter(g => g.name && g.link).map((g, i) => (
                    <a key={i} href={g.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <span className="flex-1">{g.name}</span>
                      <ExternalLink className="h-4 w-4 text-primary" />
                    </a>
                  ))}
                </div>
              )}

              <Link to="/exams"
                className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
                <ClipboardList className="h-5 w-5 text-primary" />
                <span className="flex-1">Exams</span>
              </Link>
            </div>
          ) : isEnrolled && !isApproved ? (
            <div className="bg-accent/50 border border-border rounded-xl p-4 text-center space-y-2">
              <Lock className="h-6 w-6 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">All Materials, Discussion Groups & Exams will be available after enrollment approval.</p>
            </div>
          ) : null}

          {/* Enroll / Start CTA */}
          <div className="pt-2 pb-4">
            {isEnrolled && isApproved ? (
              <Link to="/my-courses" className="block w-full text-center px-6 py-3.5 text-sm font-semibold rounded-xl bg-success text-success-foreground shadow-sm hover:opacity-90 transition-opacity">
                ✅ Start Course
              </Link>
            ) : isPending ? (
              <div className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-medium rounded-xl bg-warning/15 text-warning border border-warning/30">
                <Clock className="h-4 w-4" /> Pending Enrollment
              </div>
            ) : (
              <button onClick={handleEnroll} className="w-full px-6 py-3.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity active:scale-[0.98]">
                Enroll Now — ৳{course.price}
              </button>
            )}
          </div>
        </div>
      </div>

      <FloatingButtons course={course} />
    </div>
  );
}
