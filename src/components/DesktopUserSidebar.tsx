import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, User, MessageCircle, Share2, Sun, Moon, ExternalLink, FolderOpen, ClipboardList, Calendar, Globe, Heart, Lock } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course } from "@/types";

export function DesktopUserSidebar() {
  const settings = useAppSettings();
  const { user, userDoc } = useAuth();
  const { dark, toggle } = useTheme();
  const { pathname } = useLocation();
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [isActiveApproved, setIsActiveApproved] = useState(false);

  useEffect(() => {
    if (userDoc?.activeCourseId) {
      getDoc(doc(db, "courses", userDoc.activeCourseId)).then((snap) => {
        if (snap.exists()) setActiveCourse({ id: snap.id, ...snap.data() } as Course);
      });
      if (user) {
        getDocs(query(collection(db, "enrollRequests"), where("userId", "==", user.uid), where("courseId", "==", userDoc.activeCourseId), where("status", "==", "approved"))).then((snap) => {
          setIsActiveApproved(!snap.empty);
        });
      }
    }
  }, [userDoc?.activeCourseId, user]);

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-64 border-r border-border bg-card overflow-y-auto shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
      <nav className="p-2 flex flex-col gap-0.5">
        <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Menu</p>
        <SidebarLink to="/home" icon={Home} label="Home" active={isActive("/home") || isActive("/")} />
        <SidebarLink to="/my-courses" icon={BookOpen} label="My Courses" active={isActive("/my-courses")} />
        <SidebarLink to="/exams" icon={ClipboardList} label="Exams" active={isActive("/exams")} />
        <SidebarLink to="/profile" icon={User} label="Profile" active={isActive("/profile")} />

        {activeCourse && isActiveApproved && (
          <>
            <div className="my-2 border-t border-border" />
            <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Course Resources</p>

            {activeCourse.allMaterialsLink && (
              <a href={activeCourse.allMaterialsLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors">
                <FolderOpen className="h-4 w-4 text-primary" />
                All Materials
                <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
              </a>
            )}

            {activeCourse.routinePDF && (
              <a href={activeCourse.routinePDF} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors">
                <Calendar className="h-4 w-4 text-primary" />
                Routine
                <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
              </a>
            )}

            {activeCourse.discussionGroups?.filter(g => g.name && g.link).length > 0 && (
              <>
                <div className="my-2 border-t border-border" />
                <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Discussion Groups</p>
                {activeCourse.discussionGroups.filter(g => g.name && g.link).map((g, i) => (
                  <a key={i} href={g.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    {g.name}
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                  </a>
                ))}
              </>
            )}
          </>
        )}

        {settings.usefulLinks?.length > 0 && (
          <>
            <div className="my-2 border-t border-border" />
            <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Useful Links</p>
            {settings.usefulLinks.map((link, i) => (
              <a key={i} href={link.link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {link.name}
              </a>
            ))}
          </>
        )}

        {settings.socialLinks?.length > 0 && (
          <>
            <div className="my-2 border-t border-border" />
            <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Follow Us</p>
            {settings.socialLinks.map((sl, i) => (
              <a key={i} href={sl.link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors">
                <Heart className="h-4 w-4 text-muted-foreground" />
                {sl.name}
              </a>
            ))}
          </>
        )}

        <div className="my-2 border-t border-border" />

        <button onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors w-full">
          {dark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          {dark ? "Light Mode" : "Dark Mode"}
        </button>

        <button onClick={() => navigator.share?.({ title: settings.appName, url: window.location.origin })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors w-full">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          Share App
        </button>

        <div className="my-2 border-t border-border" />
        <a href="https://ridoan-zisan.netlify.app" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/80 transition-colors w-full">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
          Md Ridoan Mahmud Zisan
        </a>
      </nav>
    </aside>
  );
}

function SidebarLink({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active: boolean }) {
  return (
    <Link to={to} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-primary text-primary-foreground font-medium" : "text-foreground hover:bg-accent/80"}`}>
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
