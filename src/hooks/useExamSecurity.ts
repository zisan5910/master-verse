import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";

interface ExamSecurityOptions {
  enabled: boolean;
  onSuspiciousActivity: () => void;
  onFullscreenExit: () => void;
  maxTabSwitches?: number;
  isUploadingWritten?: boolean;
}

interface SecurityLog {
  type: string;
  timestamp: number;
  detail?: string;
}

export function useExamSecurity({ enabled, onSuspiciousActivity, onFullscreenExit, maxTabSwitches = 3, isUploadingWritten = false }: ExamSecurityOptions) {
  const tabSwitchCount = useRef(0);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const addLog = useCallback((type: string, detail?: string) => {
    setSecurityLogs(prev => [...prev, { type, timestamp: Date.now(), detail }]);
  }, []);

  // Request fullscreen
  const requestFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Tab switch / visibility detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCount.current++;
        addLog("tab_switch", `Switch #${tabSwitchCount.current}`);
        toast.warning(`⚠️ Tab switch detected! (${tabSwitchCount.current}/${maxTabSwitches})`, {
          description: tabSwitchCount.current >= maxTabSwitches
            ? "Your exam will be auto-submitted!"
            : "Do not leave the exam tab.",
        });
        if (tabSwitchCount.current >= maxTabSwitches) {
          onSuspiciousActivity();
        }
      }
    };

    // Window blur (alt-tab etc.)
    const handleBlur = () => {
      if (enabled) {
        addLog("window_blur");
      }
    };

    // Fullscreen change - strict enforcement
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs && enabled) {
        addLog("fullscreen_exit");
        // Allow fullscreen exit only during written question photo upload
        if (isUploadingWritten) {
          toast.warning("⚠️ Fullscreen paused for photo upload. It will resume after upload.", {
            duration: 3000,
          });
        } else {
          toast.error("⚠️ Fullscreen exit detected! Your exam will be auto-submitted.", {
            duration: 5000,
          });
          onFullscreenExit();
        }
      }
    };

    // Copy/Paste disable
    const handleCopyPaste = (e: Event) => {
      e.preventDefault();
      addLog("copy_paste_attempt");
      toast.warning("⚠️ Copy/Paste is disabled during exam!");
    };

    // Right click disable
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      addLog("right_click_attempt");
    };

    // Keyboard shortcuts disable
    const handleKeydown = (e: KeyboardEvent) => {
      // Prevent PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        addLog("screenshot_attempt");
        toast.warning("⚠️ Screenshots are not allowed during exam!");
      }
      // Prevent Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+S, Ctrl+P
      if (e.ctrlKey && ["c", "v", "a", "s", "p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        addLog("shortcut_blocked", e.key);
      }
      // Prevent F12, Ctrl+Shift+I/J/C
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        addLog("devtools_attempt");
      }
    };

    // Select disable
    const handleSelect = (e: Event) => {
      e.preventDefault();
    };

    // Block Escape key to prevent exiting fullscreen
    const handleKeydownEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        addLog("escape_blocked");
        toast.warning("⚠️ Escape key is blocked! Submit the exam to exit.", {
          duration: 3000,
        });
        return false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("keydown", handleKeydownEscape, true); // capture phase
    document.addEventListener("selectstart", handleSelect);

    // Add CSS to prevent selection
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("keydown", handleKeydownEscape, true);
      document.removeEventListener("selectstart", handleSelect);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [enabled, maxTabSwitches, onSuspiciousActivity, onFullscreenExit, addLog, requestFullscreen, isUploadingWritten]);

  return {
    tabSwitchCount: tabSwitchCount.current,
    securityLogs,
    isFullscreen,
    requestFullscreen,
    exitFullscreen,
  };
}

// Get device fingerprint info
export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    touchPoints: navigator.maxTouchPoints,
  };
}
