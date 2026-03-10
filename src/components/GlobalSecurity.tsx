import { useEffect } from "react";

export function GlobalSecurity() {
  useEffect(() => {
    // Disable right-click globally
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Disable dev tools shortcuts
    const handleKeydown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element picker)
      if (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeydown);

    // Devtools detection via debugger timing
    const detectDevTools = () => {
      const threshold = 160;
      const before = performance.now();
      // This is a common detection technique
      (function() {})();
      const after = performance.now();
      if (after - before > threshold) {
        // DevTools might be open - just log, don't break app
        console.clear();
      }
    };

    const interval = setInterval(detectDevTools, 3000);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeydown);
      clearInterval(interval);
    };
  }, []);

  return null;
}
