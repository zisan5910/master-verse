import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { examDb } from "@/lib/examFirebase";
import { db } from "@/lib/firebase";
import { Exam, ExamSubmission } from "@/types/exam";
import { Course } from "@/types";
import { toast } from "sonner";
import { Trash2, Edit, Eye, Plus, Download, Upload, Trophy, CheckCircle, XCircle, Image, Save, ArrowLeft } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatTime12 = (d?: Date) => d?.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' }) || "";

export default function AdminExamsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsExam, setResultsExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [activeTab, setActiveTab] = useState("exams");
  const [filterCourse, setFilterCourse] = useState("");
  const [gradingSubmission, setGradingSubmission] = useState<ExamSubmission | null>(null);
  const [writtenMarks, setWrittenMarks] = useState<Record<string, number>>({});
  const [savingGrade, setSavingGrade] = useState(false);
  const fileImportRef = useState<HTMLInputElement | null>(null);

  const fetchExams = async () => {
    setLoading(true);
    const snap = await getDocs(collection(examDb, "exams"));
    setExams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam)));
    setLoading(false);
  };

  const fetchCourses = async () => {
    const snap = await getDocs(collection(db, "courses"));
    setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
  };

  useEffect(() => { fetchExams(); fetchCourses(); }, []);

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(examDb, "exams", id));
    toast.success("Exam deleted");
    fetchExams();
  };

  const viewResults = async (exam: Exam) => {
    setResultsExam(exam);
    setGradingSubmission(null);
    const snap = await getDocs(collection(examDb, "submissions"));
    const subs = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as ExamSubmission))
      .filter(s => s.examId === exam.id)
      .sort((a, b) => b.obtainedMarks - a.obtainedMarks);
    setSubmissions(subs);
    setActiveTab("results");
  };

  // Grading
  const openGrading = (sub: ExamSubmission) => {
    setGradingSubmission(sub);
    const marks: Record<string, number> = {};
    sub.answers.forEach(a => {
      if (a.writtenMarksAwarded !== undefined) marks[a.questionId] = a.writtenMarksAwarded;
    });
    setWrittenMarks(marks);
  };

  const saveGrading = async () => {
    if (!gradingSubmission || !resultsExam) return;
    setSavingGrade(true);
    try {
      const updatedAnswers = gradingSubmission.answers.map(a => {
        const q = resultsExam.questions.find(q => q.id === a.questionId);
        if (q?.type === "written" && writtenMarks[a.questionId] !== undefined) {
          return { ...a, writtenMarksAwarded: writtenMarks[a.questionId] };
        }
        return a;
      });

      // Recalculate marks
      const mcqMarks = updatedAnswers.filter(a => a.isCorrect).reduce((s, a) => s + a.marks, 0);
      const wrongCount = updatedAnswers.filter(a => a.selectedOption !== undefined && !a.isCorrect).length;
      const negativeTotal = wrongCount * (resultsExam.negativeMark || 0);
      const writtenTotal = Object.values(writtenMarks).reduce((s, m) => s + m, 0);
      const obtainedMarks = Math.max(0, mcqMarks - negativeTotal) + writtenTotal;
      const passed = obtainedMarks >= (resultsExam.passMark || 0);

      await updateDoc(doc(examDb, "submissions", gradingSubmission.id), {
        answers: updatedAnswers,
        obtainedMarks,
        passed,
        writtenGraded: true,
        writtenMarks: writtenTotal,
      });

      toast.success("Grades saved");
      setGradingSubmission(null);
      viewResults(resultsExam);
    } catch (err: any) { toast.error(err.message); }
    setSavingGrade(false);
  };

  // Export exams
  const exportExams = (examsToExport: Exam[]) => {
    const data = examsToExport.map(e => {
      const { id, ...rest } = e as any;
      return { id, ...rest };
    });
    const blob = new Blob([JSON.stringify({ exams: data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exams-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${examsToExport.length} exam(s) exported`);
  };

  // Import exams
  const handleImportExams = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const examsData = data.exams || data;
      const arr = Array.isArray(examsData) ? examsData : [examsData];
      for (const exam of arr) {
        const { id, ...rest } = exam;
        if (id) {
          await setDoc(doc(examDb, "exams", id), rest, { merge: true });
        } else {
          const { addDoc } = await import("firebase/firestore");
          await addDoc(collection(examDb, "exams"), rest);
        }
      }
      toast.success(`${arr.length} exam(s) imported`);
      fetchExams();
    } catch (err: any) { toast.error("Import failed: " + err.message); }
    e.target.value = "";
  };

  const downloadRankingPDF = () => {
    if (!resultsExam || submissions.length === 0) return;
    const passMark = resultsExam.passMark || 0;
    const hasWritten = resultsExam.questions.some(q => q.type === "written");
    let html = `<html><head><meta charset="utf-8"><title>${resultsExam.title} - Rankings</title>
    <style>body{font-family:'Segoe UI',sans-serif;padding:40px;color:#333}h1{font-size:22px;margin-bottom:4px}h2{font-size:14px;color:#666;margin-bottom:20px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f5f5f5;text-align:left;padding:10px;border-bottom:2px solid #ddd}td{padding:10px;border-bottom:1px solid #eee}.pass{color:#2e7d32;font-weight:600}.fail{color:#c62828;font-weight:600}img{max-height:60px;border-radius:4px}</style></head><body>
    <h1>${resultsExam.title}</h1>
    <h2>${resultsExam.courseName} • Total: ${resultsExam.totalMarks} • Pass: ${passMark}</h2>
    <table><tr><th>Rank</th><th>Name</th><th>Email</th><th>Marks</th><th>Correct</th><th>Wrong</th>${hasWritten ? '<th>Written</th>' : ''}<th>Status</th></tr>`;
    submissions.forEach((sub, idx) => {
      const passed = sub.obtainedMarks >= passMark;
      html += `<tr><td>${idx+1}</td><td>${sub.userName}</td><td>${sub.userEmail}</td><td>${sub.obtainedMarks}/${sub.totalMarks}</td><td>${sub.correctCount}</td><td>${sub.wrongCount}</td>${hasWritten ? `<td>${sub.writtenMarks ?? 'N/A'}</td>` : ''}<td class="${passed?'pass':'fail'}">${passed?'Pass':'Fail'}</td></tr>`;
    });
    html += `</table></body></html>`;
    const w = window.open('','_blank');
    if (w) { w.document.write(html); w.document.close(); w.onload = () => w.print(); }
  };

  const filteredExams = filterCourse ? exams.filter(e => e.courseId === filterCourse) : exams;

  const getExamTypeLabel = (exam: Exam) => {
    const hasMcq = exam.questions?.some(q => q.type === "mcq");
    const hasWritten = exam.questions?.some(q => q.type === "written");
    if (hasMcq && hasWritten) return "MCQ + Written";
    if (hasWritten) return "Written";
    return "MCQ";
  };

  // Grading view
  if (gradingSubmission && resultsExam) {
    const writtenQuestions = resultsExam.questions.filter(q => q.type === "written");
    return (
      <div className="p-4 max-w-2xl mx-auto animate-fade-in">
        <button onClick={() => setGradingSubmission(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Results
        </button>
        <h2 className="text-lg font-semibold text-foreground mb-1">Grade Written Answers</h2>
        <p className="text-sm text-muted-foreground mb-4">{gradingSubmission.userName} • {gradingSubmission.userEmail}</p>

        <div className="space-y-4">
          {resultsExam.questions.map((q, idx) => {
            const ans = gradingSubmission.answers.find(a => a.questionId === q.id);
            return (
              <div key={q.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${q.type === "mcq" ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground border border-border"}`}>
                    {q.type === "mcq" ? "MCQ" : "Written"} • {q.marks} marks
                  </span>
                </div>
                <p className="text-sm text-foreground mb-2">{q.questionText}</p>
                {q.questionImage && <img src={q.questionImage} alt="" className="h-24 rounded-lg object-contain mb-2" />}

                {q.type === "mcq" && q.options && (
                  <div className="space-y-1">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctAnswer;
                      const isSelected = ans?.selectedOption === oIdx;
                      let bg = "bg-card";
                      if (isCorrect) bg = "bg-green-500/10";
                      if (isSelected && !isCorrect) bg = "bg-red-500/10";
                      return (
                        <div key={oIdx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${bg}`}>
                          {isCorrect && <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />}
                          {isSelected && !isCorrect && <XCircle className="h-3 w-3 text-destructive shrink-0" />}
                          {!isCorrect && !isSelected && <span className="w-3" />}
                          <span className="text-foreground">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === "written" && (
                  <div className="mt-2">
                    {ans?.writtenImageUrl ? (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Student's Answer:</p>
                        <img src={ans.writtenImageUrl} alt="Written answer" className="max-h-64 rounded-lg object-contain border border-border" />
                        <div className="flex items-center gap-2 mt-3">
                          <label className="text-xs font-medium text-muted-foreground">Marks:</label>
                          <input
                            type="number"
                            min={0}
                            max={q.marks}
                            value={writtenMarks[q.id] ?? ""}
                            onChange={e => setWrittenMarks(prev => ({ ...prev, [q.id]: Number(e.target.value) }))}
                            className="w-20 px-2 py-1.5 rounded-lg bg-background border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <span className="text-xs text-muted-foreground">/ {q.marks}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No answer submitted</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={saveGrading} disabled={savingGrade} className="w-full mt-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> {savingGrade ? "Saving..." : "Save Grades"}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-foreground">Exam Management</h1>
        <button onClick={() => navigate("/admin/exams/add")} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>

      {/* Import/Export bar */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => exportExams(filteredExams)} className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-foreground hover:bg-accent">
          <Download className="h-3 w-3" /> Export {filterCourse ? "Filtered" : "All"}
        </button>
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-foreground hover:bg-accent cursor-pointer">
          <Upload className="h-3 w-3" /> Import
          <input type="file" accept=".json" onChange={handleImportExams} className="hidden" />
        </label>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="exams" className="flex-1">Exams</TabsTrigger>
          <TabsTrigger value="results" className="flex-1">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="exams">
          <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm mb-4">
            <option value="">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.courseName}</option>)}
          </select>

          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-8">Loading...</p>
          ) : filteredExams.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No exams yet</p>
          ) : (
            <div className="space-y-3">
              {filteredExams.map(exam => (
                <div key={exam.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground">{exam.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{exam.courseName} • {getExamTypeLabel(exam)} • {exam.questions?.length || 0} Q • {exam.totalMarks} Marks</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Pass: {exam.passMark || 0} • Negative: {exam.negativeMark || 0}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTime12(exam.startTime?.toDate?.())} → {formatTime12(exam.endTime?.toDate?.())}
                      </p>
                      <p className="text-xs text-muted-foreground">Duration: {exam.duration} min</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${exam.resultPublished ? "bg-success/10 text-success" : "bg-accent text-muted-foreground"}`}>
                          {exam.resultPublished ? "Result Published" : "Result Not Published"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button 
                        onClick={async () => {
                          await updateDoc(doc(examDb, "exams", exam.id), { resultPublished: !exam.resultPublished });
                          toast.success(exam.resultPublished ? "Result unpublished" : "Result published");
                          fetchExams();
                        }}
                        title={exam.resultPublished ? "Unpublish Result" : "Publish Result"}
                        className={`p-2 hover:bg-accent rounded-lg ${exam.resultPublished ? "text-success" : "text-muted-foreground"}`}
                      >
                        <Trophy className="h-4 w-4" />
                      </button>
                      <button onClick={() => exportExams([exam])} title="Export" className="p-2 hover:bg-accent rounded-lg"><Download className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => viewResults(exam)} className="p-2 hover:bg-accent rounded-lg"><Eye className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => navigate(`/admin/exams/add?edit=${exam.id}`)} className="p-2 hover:bg-accent rounded-lg"><Edit className="h-4 w-4 text-muted-foreground" /></button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><button className="p-2 hover:bg-accent rounded-lg"><Trash2 className="h-4 w-4 text-destructive" /></button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Exam</AlertDialogTitle><AlertDialogDescription>Are you sure?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(exam.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="results">
          {resultsExam ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">{resultsExam.title} - Results ({submissions.length})</h3>
                <div className="flex gap-2">
                  <button onClick={downloadRankingPDF} className="flex items-center gap-1 px-3 py-1.5 bg-accent border border-border rounded-lg text-xs font-medium text-foreground">
                    <Download className="h-3 w-3" /> PDF
                  </button>
                  <button onClick={() => setResultsExam(null)} className="text-sm text-muted-foreground hover:text-foreground">Back</button>
                </div>
              </div>
              {submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No submissions yet</p>
              ) : (
                <div className="space-y-2">
                  {submissions.map((sub, idx) => {
                    const passed = sub.obtainedMarks >= (resultsExam.passMark || 0);
                    const hasWrittenQ = resultsExam.questions.some(q => q.type === "written");
                    return (
                      <div key={sub.id} className="bg-card border border-border rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx < 3 ? "bg-primary text-primary-foreground" : "bg-accent text-foreground"}`}>{idx + 1}</span>
                            <div>
                              <p className="text-sm font-medium text-foreground">{sub.userName}</p>
                              <p className="text-xs text-muted-foreground">{sub.userEmail}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">{sub.obtainedMarks}/{sub.totalMarks}</p>
                            <div className="flex items-center gap-2 justify-end">
                              <p className="text-xs text-muted-foreground">✓{sub.correctCount} ✗{sub.wrongCount}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${passed ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-destructive"}`}>
                                {passed ? "Pass" : "Fail"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {hasWrittenQ && (
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                            <span className="text-xs text-muted-foreground">
                              Written: {sub.writtenGraded ? `${sub.writtenMarks} marks` : "Not graded"}
                            </span>
                            <button onClick={() => openGrading(sub)} className="flex items-center gap-1 px-3 py-1 bg-accent border border-border rounded-lg text-xs font-medium text-foreground hover:bg-accent/80">
                              <Image className="h-3 w-3" /> {sub.writtenGraded ? "Edit Grade" : "Grade"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-card border border-border text-foreground text-sm mb-3">
                <option value="">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.courseName}</option>)}
              </select>
              <div className="space-y-2">
                {filteredExams.map(exam => (
                  <button key={exam.id} onClick={() => viewResults(exam)} className="w-full text-left bg-card border border-border rounded-xl p-3 hover:bg-accent transition-colors">
                    <p className="text-sm font-medium text-foreground">{exam.title}</p>
                    <p className="text-xs text-muted-foreground">{exam.courseName} • {exam.questions?.length || 0} Q</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
