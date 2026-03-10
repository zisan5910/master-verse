import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";

function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || navigator.vendor || "";
  return /FBAN|FBAV|Instagram|Messenger|WhatsApp|Snapchat|Line|Twitter|TikTok/i.test(ua);
}

export function ExternalRedirect() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(isInAppBrowser());
  }, []);

  if (!show) return null;

  const openExternal = () => {
    const url = window.location.href;
    // Try intent for Android Chrome
    window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
    // Fallback
    setTimeout(() => {
      window.open(url, "_system");
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full space-y-4">
        <p className="text-lg font-semibold text-foreground">
          সেরা অভিজ্ঞতার জন্য Chrome-এ খুলুন।
        </p>
        <p className="text-sm text-muted-foreground">
          এই অ্যাপটি ইন-অ্যাপ ব্রাউজারে সঠিকভাবে কাজ নাও করতে পারে।
        </p>
        <button
          onClick={openExternal}
          className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          🔗 Open in External Browser
        </button>
        <button onClick={() => setShow(false)} className="text-xs text-muted-foreground">
          এখানেই চালিয়ে যান
        </button>
      </div>
    </div>
  );
}
