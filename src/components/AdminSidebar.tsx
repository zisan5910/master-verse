import { Link, useLocation } from "react-router-dom";
import { X, LayoutDashboard, Users, BookOpen, Video, Settings, LogOut, Sun, Moon, Download, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/courses", icon: BookOpen, label: "Courses" },
  { to: "/admin/videos", icon: Video, label: "Videos" },
  { to: "/admin/exams", icon: ClipboardList, label: "Exams" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminSidebar({ open, onClose }: Props) {
  const { logout } = useAuth();
  const { dark, toggle } = useTheme();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const sidebarContent = (
    <nav className="p-2">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
        const isActive = pathname === to || (to !== "/admin" && pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            onClick={isMobile ? onClose : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${isActive ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent"}`}
          >
            <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
            {label}
          </Link>
        );
      })}

      <div className="my-2 border-t border-border" />
      <Link
        to="/admin/data"
        onClick={isMobile ? onClose : undefined}
        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${pathname === "/admin/data" ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent"}`}
      >
        <Download className={`h-4 w-4 ${pathname === "/admin/data" ? "text-primary" : "text-muted-foreground"}`} />
        Backup
      </Link>

      <div className="my-2 border-t border-border" />
      <button onClick={toggle} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent w-full">
        {dark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
        {dark ? "Light Mode" : "Dark Mode"}
      </button>

      <div className="my-2 border-t border-border" />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-destructive hover:bg-accent w-full">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to logout?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </nav>
  );

  // Desktop: always-visible sidebar
  if (!isMobile) {
    return (
      <div className="w-60 border-r border-border bg-background shrink-0 overflow-y-auto h-[calc(100vh-3.5rem)]">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm">Admin Panel</h2>
        </div>
        {sidebarContent}
      </div>
    );
  }

  // Mobile: overlay sidebar
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/20 z-50" onClick={onClose} />
      <div className="fixed top-0 left-0 bottom-0 w-72 bg-background z-50 border-r border-border flex flex-col animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground">Admin Panel</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto pb-20">
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
