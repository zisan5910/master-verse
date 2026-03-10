import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Link } from "react-router-dom";
import { Users, Clock, BookOpen, Video, Youtube, HardDrive, FileText } from "lucide-react";
import { AdminDashboardSkeleton } from "@/components/skeletons/AdminSkeleton";

export default function AdminDashboard() {
  const settings = useAppSettings();
  const [stats, setStats] = useState({ users: 0, pending: 0, courses: 0, videos: 0, exams: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { examDb } = await import("@/lib/examFirebase");
      const { collection: col2, getDocs: gd2 } = await import("firebase/firestore");
      const [usersSnap, pendingSnap, coursesSnap, videosSnap, enrollRequestsSnap, examsSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "student"))),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "courses")),
        getDocs(collection(db, "videos")),
        getDocs(query(collection(db, "enrollRequests"), where("status", "==", "pending"))),
        gd2(col2(examDb, "exams")),
      ]);
      const allUsers = pendingSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const pendingUsers = allUsers.filter((u: any) => u.status === "pending" && u.role === "student");
      const pendingRequestUserIds = new Set(enrollRequestsSnap.docs.map(d => d.data().userId));
      const approvedWithPending = allUsers.filter((u: any) => u.role === "student" && u.status !== "pending" && pendingRequestUserIds.has(u.id));
      const pendingCount = pendingUsers.length + approvedWithPending.length;
      setStats({
        users: usersSnap.size,
        pending: pendingCount,
        courses: coursesSnap.size,
        videos: videosSnap.size,
        exams: examsSnap.size,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const cards = [
    { label: "Total Students", value: stats.users, icon: Users, to: "/admin/users" },
    { label: "Pending", value: stats.pending, icon: Clock, to: "/admin/users?status=pending" },
    { label: "Courses", value: stats.courses, icon: BookOpen, to: "/admin/courses" },
    { label: "Videos", value: stats.videos, icon: Video, to: "/admin/videos" },
    { label: "Exams", value: stats.exams, icon: FileText, to: "/admin/exams" },
  ];

  if (loading) return <AdminDashboardSkeleton />;

  return (
    <div className="p-4 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground mb-4">Dashboard</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="p-4 bg-card rounded-lg border border-border shadow-card"
          >
            <card.icon className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-2xl font-semibold text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {settings.youtubeChannel && (
          <a
            href={settings.youtubeChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-card rounded-lg border border-border shadow-card"
          >
            <Youtube className="h-6 w-6 text-destructive mb-2" />
            <p className="text-sm font-medium text-foreground">YouTube</p>
            <p className="text-xs text-muted-foreground mt-1">Open in new tab</p>
          </a>
        )}
        {settings.googleDrive && (
          <a
            href={settings.googleDrive}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-card rounded-lg border border-border shadow-card"
          >
            <HardDrive className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">Google Drive</p>
            <p className="text-xs text-muted-foreground mt-1">Open in new tab</p>
          </a>
        )}
      </div>
    </div>
  );
}
