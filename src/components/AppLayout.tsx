import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { BottomNav } from "@/components/BottomNav";
import { UserSidebar } from "@/components/UserSidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DesktopUserSidebar } from "@/components/DesktopUserSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userDoc } = useAuth();
  const isAdmin = userDoc?.role === "admin";
  const isMobile = useIsMobile();
  const { pathname } = useLocation();

  // Desktop user panel: no bottom nav. Admin panel: always bottom nav. Mobile: always bottom nav.
  const showBottomNav = isMobile || isAdmin;

  // Show desktop sidebar for user on non-video pages
  const isVideoPage = pathname.startsWith("/video/");
  const showDesktopSidebar = !isMobile && !isAdmin && !isVideoPage;

  // Hide hamburger menu on pages that already have a visible sidebar
  const hasVisibleSidebar = (!isMobile && isAdmin) || showDesktopSidebar;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav onMenuClick={() => setSidebarOpen(true)} hideMenu={hasVisibleSidebar} />
      
      {isAdmin ? (
        <>
          {isMobile && <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
          <div className="flex flex-1">
            {!isMobile && <AdminSidebar open={true} onClose={() => {}} />}
            <main className="flex-1 pb-16 overflow-x-hidden">
              <Outlet />
            </main>
          </div>
        </>
      ) : (
        <>
          <UserSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex flex-1">
            {showDesktopSidebar && <DesktopUserSidebar />}
            <main className={`flex-1 overflow-x-hidden ${showBottomNav ? "pb-16" : ""}`}>
              <Outlet />
            </main>
          </div>
        </>
      )}

      {showBottomNav && <BottomNav onMoreClick={() => setSidebarOpen(true)} />}
    </div>
  );
}
