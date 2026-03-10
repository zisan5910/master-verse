import { Link } from "react-router-dom";
import { X, Home, BookOpen, User, FileText, MessageCircle, Share2, Download, Sun, Moon, ExternalLink, ClipboardList, Lock, Globe, Heart, FolderOpen, Calendar } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UserSidebar({ open, onClose }: Props) {
  const settings = useAppSettings();
  const { user, userDoc } = useAuth();
  const { dark, toggle } = useTheme();
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isActiveApproved, setIsActiveApproved] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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

  if (!open) return null;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: settings.appName, url: window.location.origin });
    }
    onClose();
  };

  const handleInstall = async () => {
    if (installPrompt) { installPrompt.prompt(); setInstallPrompt(null); }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-foreground/20 z-50" onClick={onClose} />
      <div className="fixed top-0 left-0 bottom-0 w-72 bg-background z-50 border-r border-border flex flex-col animate-fade-in">
        <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
          {settings.appLogo ? (
            <img src={settings.appLogo} alt="" className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <img src="/logo.jpg" alt="" className="h-8 w-8 rounded-lg object-contain" />
          )}
          <h2 className="font-semibold text-foreground">{settings.appName || "Darpan Academy"}</h2>
          <button onClick={onClose} className="ml-auto"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <nav className="p-2 flex-1 overflow-y-auto pb-20">
          <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Menu</p>
          <SidebarLink to="/home" icon={Home} label="Home" onClick={onClose} />
          <SidebarLink to="/my-courses" icon={BookOpen} label="My Courses" onClick={onClose} />
          <SidebarLink to="/profile" icon={User} label="Profile" onClick={onClose} />

          {activeCourse && (
            <>
              <div className="my-3 border-t border-border" />
              <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Course Resources</p>

              {isActiveApproved ? (
                <>
                  <SidebarLink to="/exams" icon={ClipboardList} label="Exams" onClick={onClose} highlight />

                  {activeCourse.allMaterialsLink && (
                    <a href={activeCourse.allMaterialsLink} target="_blank" rel="noopener noreferrer" onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors my-0.5">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <span className="flex-1">All Materials</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}

                  {activeCourse.routinePDF && (
                    <a href={activeCourse.routinePDF} target="_blank" rel="noopener noreferrer" onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors my-0.5">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="flex-1">Routine</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}

                  {activeCourse.discussionGroups?.filter(g => g.name && g.link).length > 0 && (
                    <>
                      <div className="my-3 border-t border-border" />
                      <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Discussion Groups</p>
                      {activeCourse.discussionGroups.filter(g => g.name && g.link).map((g, i) => (
                        <a key={i} href={g.link} target="_blank" rel="noopener noreferrer" onClick={onClose}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors my-0.5">
                          <MessageCircle className="h-4 w-4 text-primary" />
                          <span className="flex-1">{g.name}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <div className="px-3 py-3 rounded-lg text-xs text-muted-foreground flex items-center gap-2 bg-accent/50 my-0.5">
                  <Lock className="h-3.5 w-3.5" />
                  Resources available after approval
                </div>
              )}
            </>
          )}

          {settings.usefulLinks?.length > 0 && (
            <>
              <div className="my-3 border-t border-border" />
              <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Useful Links</p>
              {settings.usefulLinks.map((link, i) => (
                <a key={i} href={link.link} target="_blank" rel="noopener noreferrer" onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors my-0.5">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{link.name}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </>
          )}

          {settings.socialLinks?.length > 0 && (
            <>
              <div className="my-3 border-t border-border" />
              <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Follow Us</p>
              {settings.socialLinks.map((sl, i) => (
                <a key={i} href={sl.link} target="_blank" rel="noopener noreferrer" onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors my-0.5">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{sl.name}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </>
          )}

          <div className="my-3 border-t border-border" />
          <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Settings</p>

          <button onClick={toggle} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors w-full my-0.5">
            {dark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
            {dark ? "Light Mode" : "Dark Mode"}
          </button>

          <button onClick={handleShare} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors w-full my-0.5">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            Share App
          </button>

          {installPrompt && (
            <button onClick={handleInstall} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors w-full my-0.5">
              <Download className="h-4 w-4 text-muted-foreground" />
              Install App
            </button>
          )}

          <div className="my-3 border-t border-border" />
          <a href="https://ridoan-zisan.netlify.app" target="_blank" rel="noopener noreferrer" onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent/80 transition-colors w-full my-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
            Md Ridoan Mahmud Zisan
          </a>
        </nav>
      </div>
    </>
  );
}

function SidebarLink({ to, icon: Icon, label, onClick, highlight }: { to: string; icon: any; label: string; onClick: () => void; highlight?: boolean }) {
  return (
    <Link to={to} onClick={onClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent/80 transition-colors my-0.5 ${highlight ? "bg-primary/5 border border-primary/15" : ""}`}>
      <Icon className={`h-4 w-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      {label}
    </Link>
  );
}
