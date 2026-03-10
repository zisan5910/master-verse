import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { examDb } from "@/lib/examFirebase";
import { useAuth } from "@/contexts/AuthContext";
import { Exam } from "@/types/exam";
import { Link } from "react-router-dom";
import { Clock, CheckCircle, AlertCircle, BookOpen } from "lucide-react";
import { FloatingButtons } from "@/components/FloatingButtons";

export default function ExamListPage() {
  const { userDoc } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userDoc?.activeCourseId) return;
    const fetchExams = async () => {
      setLoading(true);
      const snap = await getDocs(query(collection(examDb, "exams"), where("courseId", "==", userDoc.activeCourseId)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam));
      list.sort((a, b) => (b.startTime?.toMillis?.() || 0) - (a.startTime?.toMillis?.() || 0));
      setExams(list);
      setLoading(false);
    };
    fetchExams();
  }, [userDoc?.activeCourseId]);

  const now = Date.now();

  const getStatus = (exam: Exam) => {
    const start = exam.startTime?.toMillis?.() || 0;
    const end = exam.endTime?.toMillis?.() || 0;
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "ended";
  };

  if (!userDoc?.activeCourseId) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground text-sm py-8">Please select an active course from your profile to view exams.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5" /> Exams
      </h1>

      {loading ? (
        <p className="text-muted-foreground text-sm text-center py-8">Loading...</p>
      ) : exams.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No exams available for this course.</p>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => {
            const status = getStatus(exam);
            return (
              <Link key={exam.id} to={`/exams/${exam.id}`} className="block bg-card border border-border rounded-lg p-4 hover:bg-accent transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{exam.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {exam.questions.filter(q => q.type === "mcq").length > 0 && "MCQ"}{exam.questions.filter(q => q.type === "mcq").length > 0 && exam.questions.filter(q => q.type === "written").length > 0 && " + "}{exam.questions.filter(q => q.type === "written").length > 0 && "Written"} • {exam.totalMarks} Marks • {exam.duration} min
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {exam.startTime?.toDate?.()?.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    {status === "upcoming" && (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent text-muted-foreground">
                        <Clock className="h-3 w-3" /> Upcoming
                      </span>
                    )}
                    {status === "live" && (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                        <AlertCircle className="h-3 w-3" /> Live
                      </span>
                    )}
                    {status === "ended" && (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent text-muted-foreground">
                        <CheckCircle className="h-3 w-3" /> Ended
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <FloatingButtons />
    </div>
  );
}
