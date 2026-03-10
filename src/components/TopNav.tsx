import { Menu, Download, Sun, Moon } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useTheme } from "@/hooks/use-theme";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  onMenuClick: () => void;
  hideMenu?: boolean;
}

export function TopNav({ onMenuClick, hideMenu }: Props) {
  const settings = useAppSettings();
  const { dark, toggle } = useTheme();
  const isMobile = useIsMobile();
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (installPrompt) { installPrompt.prompt(); setInstallPrompt(null); }
  };

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {!hideMenu && (
            <button onClick={onMenuClick} className="text-foreground">
              <Menu className="h-5 w-5" />
            </button>
          )}
          {settings.appLogo && (
            <img src={settings.appLogo} alt="" className="h-7 w-7 rounded-md object-contain" />
          )}
          <h1 className="text-lg font-semibold text-foreground">{settings.appName || "Darpan Academy"}</h1>
        </div>
        <div className="flex items-center gap-1">
          {installPrompt && (
            isMobile ? (
              <button onClick={handleInstall} className="p-2 text-foreground rounded-md hover:bg-accent" title="Install App">
                <Download className="h-5 w-5" />
              </button>
            ) : (
              <button onClick={handleInstall} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground">
                <Download className="h-4 w-4" /> Install
              </button>
            )
          )}
          <button onClick={toggle} className="p-2 text-foreground rounded-md hover:bg-accent">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
