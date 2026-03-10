import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppSettings } from "@/types";

const defaultSettings: AppSettings = {
  appName: "Darpan Academy",
  appLogo: "",
  youtubeChannel: "",
  googleDrive: "",
  paymentMethods: [],
  socialLinks: [],
  usefulLinks: [],
};

const AppSettingsContext = createContext<AppSettings>(defaultSettings);

export function useAppSettings() {
  return useContext(AppSettingsContext);
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "app"), (snap) => {
      if (snap.exists()) {
        setSettings({ ...defaultSettings, ...snap.data() } as AppSettings);
      }
    });
    return unsub;
  }, []);

  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  );
}
