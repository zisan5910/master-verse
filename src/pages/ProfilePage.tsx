import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { doc, updateDoc, getDoc, addDoc, collection, getDocs, arrayUnion, Timestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LogOut, KeyRound, FileText, MessageCircle, ExternalLink, PlusCircle, Copy, Check, ClipboardList, Lock, Clock, Calendar, FolderOpen, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Course } from "@/types";
import { FloatingButtons } from "@/components/FloatingButtons";
import { uploadToImgBB } from "@/lib/imgbb";
import { ImagePreview } from "@/components/ImagePreview";

export default function ProfilePage() {
  const { user, userDoc, logout, resetPassword, refreshUserDoc } = useAuth();
  const settings = useAppSettings();
  const navigate = useNavigate();
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [courseRequestStatuses, setCourseRequestStatuses] = useState<Record<string, string>>({});

  useEffect(() => { if (!user) navigate("/auth?mode=login"); }, [user]);

  useEffect(() => {
    if (userDoc?.activeCourseId) {
      getDoc(doc(db, "courses", userDoc.activeCourseId)).then((snap) => {
        if (snap.exists()) setActiveCourse({ id: snap.id, ...snap.data() } as Course);
      });
    }
  }, [userDoc?.activeCourseId]);

  useEffect(() => {
    if (enrollOpen) {
      getDocs(collection(db, "courses")).then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
        setAllCourses(list);
      });
    }
  }, [enrollOpen]);

  useEffect(() => {
    if (user && userDoc?.enrolledCourses?.length) {
      getDocs(query(collection(db, "enrollRequests"), where("userId", "==", user.uid))).then((snap) => {
        const statuses: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as { courseId: string; status: string };
          statuses[data.courseId] = data.status;
        });
        setCourseRequestStatuses(statuses);
      });
    }
  }, [user, userDoc?.enrolledCourses]);

  if (!user || !userDoc) return null;

  const enrolledIds = userDoc.enrolledCourses?.map((c) => c.courseId) || [];
  const availableCourses = allCourses.filter((c) => !enrolledIds.includes(c.id));
  const isActiveApproved = activeCourse && courseRequestStatuses[activeCourse.id] === "approved";
  const isActiveRejected = activeCourse && courseRequestStatuses[activeCourse.id] === "rejected";

  const handleLogout = async () => { await logout(); navigate("/"); };
  const handleResetPassword = async () => {
    try { await resetPassword(userDoc.email); toast.success("Password reset email sent"); }
    catch { toast.error("Failed to send reset email"); }
  };
  const handleSwitchCourse = async (courseId: string) => {
    await updateDoc(doc(db, "users", user.uid), { activeCourseId: courseId });
    await refreshUserDoc();
    toast.success("Active course changed");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const resetEnrollForm = () => {
    setSelectedCourse(null); setPaymentMethod(""); setPaymentNumber(""); setTransactionId(""); setScreenshotFile(null);
  };

  const handleEnrollSubmit = async () => {
    if (!selectedCourse) { toast.error("Please select a course"); return; }
    if (!paymentMethod && settings.paymentMethods?.length > 0) { toast.error("Please select a payment method"); return; }
    setSubmitting(true);
    try {
      let screenshotUrl = "";
      if (screenshotFile) screenshotUrl = await uploadToImgBB(screenshotFile);
      await addDoc(collection(db, "enrollRequests"), {
        userId: user.uid, name: userDoc.name, email: userDoc.email,
        courseId: selectedCourse.id, courseName: selectedCourse.courseName,
        paymentMethod, paymentNumber, transactionId, screenshot: screenshotUrl,
        status: "pending", createdAt: Timestamp.now(),
      });
      await updateDoc(doc(db, "users", user.uid), {
        enrolledCourses: arrayUnion({
          courseId: selectedCourse.id, courseName: selectedCourse.courseName,
          courseThumbnail: selectedCourse.thumbnail || "", enrolledAt: Timestamp.now(),
        }),
      });
      await refreshUserDoc();
      toast.success("Enrollment request submitted! Waiting for approval.");
      setEnrollOpen(false); resetEnrollForm();
    } catch (err: any) { toast.error(err.message || "Enrollment failed"); }
    setSubmitting(false);
  };

  return (
    <div className="p-4 max-w-lg mx-auto animate-fade-in space-y-4">
      {/* Profile Header */}
      <div className="bg-card rounded-xl border border-border p-5 text-center">
        <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold mx-auto">
          {userDoc.name?.[0]?.toUpperCase() || "U"}
        </div>
        <h2 className="text-lg font-semibold text-foreground mt-3">{userDoc.name}</h2>
        <p className="text-sm text-muted-foreground">{userDoc.email}</p>
      </div>

      {/* Enrolled Courses */}
      {userDoc.enrolledCourses?.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Enrolled Courses</h3>
          <div className="space-y-2">
            {userDoc.enrolledCourses.map((c) => {
              const reqStatus = courseRequestStatuses[c.courseId] || "approved";
              const isApproved = reqStatus === "approved";
              const isPending = reqStatus === "pending";
              const isRejected = reqStatus === "rejected";
              return (
                <div key={c.courseId} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${c.courseId === userDoc.activeCourseId ? "border-primary bg-accent" : "border-border"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {c.courseThumbnail && <img src={c.courseThumbnail} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />}
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground block truncate">{c.courseName}</span>
                      {isPending && (
                        <p className="text-[11px] text-warning flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </p>
                      )}
                      {isRejected && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Rejected
                        </p>
                      )}
                    </div>
                  </div>
                  {isApproved && c.courseId !== userDoc.activeCourseId && userDoc.enrolledCourses.length > 1 && (
                    <button onClick={() => handleSwitchCourse(c.courseId)} className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground shrink-0">Select</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enroll in More Courses */}
      <Dialog open={enrollOpen} onOpenChange={(open) => { setEnrollOpen(open); if (!open) resetEnrollForm(); }}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 w-full p-3 bg-primary/10 border border-primary/20 rounded-xl text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
            <PlusCircle className="h-4 w-4" /> Enroll in More Courses
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Enroll in a New Course</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            {!selectedCourse ? (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Select a Course</p>
                {availableCourses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No new courses available.</p>
                ) : (
                  <div className="space-y-2">
                    {availableCourses.map((course) => (
                      <button key={course.id} onClick={() => setSelectedCourse(course)} className="flex items-center gap-3 w-full p-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors text-left">
                        {course.thumbnail && <img src={course.thumbnail} alt="" className="w-12 h-12 rounded-md object-cover" />}
                        <div>
                          <p className="text-sm font-medium text-foreground">{course.courseName}</p>
                          <p className="text-xs text-muted-foreground">৳{course.price}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="p-3 bg-accent border border-border rounded-lg flex items-center gap-3">
                  {selectedCourse.thumbnail && <img src={selectedCourse.thumbnail} alt="" className="w-12 h-12 rounded-md object-cover" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{selectedCourse.courseName}</p>
                    <p className="text-xs text-muted-foreground">৳{selectedCourse.price}</p>
                  </div>
                  <button onClick={() => setSelectedCourse(null)} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
                </div>

                {settings.paymentMethods?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Payment Method</p>
                    <div className="space-y-2">
                      {settings.paymentMethods.map((pm, i) => (
                        <label key={i} className={`flex items-center justify-between p-3 rounded-md border cursor-pointer ${paymentMethod === pm.name ? "border-primary bg-accent" : "border-border bg-card"}`}>
                          <div className="flex items-center gap-2">
                            <input type="radio" name="enroll-payment" value={pm.name} checked={paymentMethod === pm.name} onChange={() => setPaymentMethod(pm.name)} className="accent-primary" />
                            <span className="text-sm text-foreground">{pm.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">{pm.number}</span>
                            <button type="button" onClick={() => handleCopy(pm.number)} className="p-1">
                              {copied === pm.number ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                            </button>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <input type="text" placeholder="Payment Number" value={paymentNumber} onChange={(e) => setPaymentNumber(e.target.value)} className="w-full px-4 py-3 rounded-md bg-card border border-border text-foreground text-sm" />
                <input type="text" placeholder="Transaction ID" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full px-4 py-3 rounded-md bg-card border border-border text-foreground text-sm" />

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payment Screenshot</p>
                  <input type="file" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} className="w-full text-sm text-foreground" />
                  <ImagePreview file={screenshotFile} />
                </div>

                <button onClick={handleEnrollSubmit} disabled={submitting} className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">
                  {submitting ? "Submitting..." : "Submit Enrollment Request"}
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Resources - only for approved active course */}
      {isActiveApproved ? (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <h3 className="font-semibold text-foreground text-sm mb-2">🎓 Course Resources</h3>

          {activeCourse?.allMaterialsLink && (
            <a href={activeCourse.allMaterialsLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
              <FolderOpen className="h-5 w-5 text-primary" />
              <span className="flex-1">All Materials</span>
              <ExternalLink className="h-4 w-4 text-primary" />
            </a>
          )}

          {activeCourse?.routinePDF && (
            <a href={activeCourse.routinePDF} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="flex-1">Routine</span>
              <ExternalLink className="h-4 w-4 text-primary" />
            </a>
          )}

          {activeCourse?.discussionGroups?.filter(g => g.name && g.link).map((g, i) => (
            <a key={i} href={g.link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
              <MessageCircle className="h-5 w-5 text-primary" />
              <span className="flex-1">{g.name}</span>
              <ExternalLink className="h-4 w-4 text-primary" />
            </a>
          ))}

          <Link to="/exams" className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
            <ClipboardList className="h-5 w-5 text-primary" />
            <span className="flex-1">Exams</span>
          </Link>
        </div>
      ) : isActiveRejected ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center space-y-2">
          <XCircle className="h-6 w-6 text-destructive mx-auto" />
          <p className="text-sm text-destructive font-medium">Enrollment Rejected</p>
          <p className="text-xs text-muted-foreground">You cannot access this course's content.</p>
        </div>
      ) : activeCourse && courseRequestStatuses[activeCourse.id] === "pending" ? (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-center space-y-2">
          <Clock className="h-6 w-6 text-warning mx-auto" />
          <p className="text-sm text-warning font-medium">Enrollment Pending</p>
          <p className="text-xs text-muted-foreground">Course resources will be available after approval.</p>
        </div>
      ) : null}

      {/* Actions */}
      <div className="space-y-2">
        <button onClick={handleResetPassword} className="flex items-center gap-3 w-full p-3 bg-card border border-border rounded-xl text-sm text-foreground hover:bg-accent transition-colors">
          <KeyRound className="h-4 w-4 text-muted-foreground" /> Reset Password
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center gap-3 w-full p-3 bg-card border border-border rounded-xl text-sm text-destructive hover:bg-accent transition-colors">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Logout</AlertDialogTitle><AlertDialogDescription>Are you sure you want to logout?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <FloatingButtons />
    </div>
  );
}
