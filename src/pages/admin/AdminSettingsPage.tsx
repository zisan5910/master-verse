import { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { PaymentMethod, SocialLink, UsefulLink } from "@/types";
import { toast } from "sonner";
import { X, Plus, Save, Settings, CreditCard, Share2, Link2 } from "lucide-react";
import { ImageUrlInput } from "@/components/ImageUrlInput";

export default function AdminSettingsPage() {
  const settings = useAppSettings();
  const [appName, setAppName] = useState(settings.appName);
  const [appLogo, setAppLogo] = useState(settings.appLogo);
  const [youtubeChannel, setYoutubeChannel] = useState(settings.youtubeChannel);
  const [googleDrive, setGoogleDrive] = useState(settings.googleDrive);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(settings.paymentMethods?.length ? settings.paymentMethods : [{ name: "", number: "" }]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(settings.socialLinks?.length ? settings.socialLinks : [{ name: "", link: "" }]);
  const [usefulLinks, setUsefulLinks] = useState<UsefulLink[]>(settings.usefulLinks?.length ? settings.usefulLinks : [{ name: "", link: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAppName(settings.appName);
    setAppLogo(settings.appLogo);
    setYoutubeChannel(settings.youtubeChannel);
    setGoogleDrive(settings.googleDrive);
    if (settings.paymentMethods?.length) setPaymentMethods(settings.paymentMethods);
    if (settings.socialLinks?.length) setSocialLinks(settings.socialLinks);
    if (settings.usefulLinks?.length) setUsefulLinks(settings.usefulLinks);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "app"), {
        appName, appLogo, youtubeChannel, googleDrive,
        paymentMethods: paymentMethods.filter((p) => p.name && p.number),
        socialLinks: socialLinks.filter((s) => s.name && s.link),
        usefulLinks: usefulLinks.filter((u) => u.name && u.link),
      });
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const FormSection = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/30 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );

  return (
    <div className="p-3 sm:p-4 max-w-2xl mx-auto animate-fade-in overflow-x-hidden pb-8 box-border w-full">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Settings className="h-5 w-5" /> App Settings
      </h2>

      <div className="space-y-4">
        {/* App Info */}
        <FormSection icon={Settings} title="App Info">
          <div>
            <label className="text-xs font-medium text-muted-foreground">App Name</label>
            <input type="text" placeholder="App Name" value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
          </div>
          <ImageUrlInput label="App Logo URL" value={appLogo} onChange={setAppLogo} placeholder="https://i.postimg.cc/..." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">YouTube Channel</label>
              <input type="text" placeholder="YouTube Link" value={youtubeChannel} onChange={(e) => setYoutubeChannel(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Google Drive</label>
              <input type="text" placeholder="Google Drive Link" value={googleDrive} onChange={(e) => setGoogleDrive(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>
          </div>
        </FormSection>

        {/* Payment Methods */}
        <FormSection icon={CreditCard} title="Payment Methods">
          {paymentMethods.map((pm, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 min-w-0 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                <input value={pm.name} onChange={(e) => { const a = [...paymentMethods]; a[i] = { ...a[i], name: e.target.value }; setPaymentMethods(a); }} placeholder="Method Name" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                <input value={pm.number} onChange={(e) => { const a = [...paymentMethods]; a[i] = { ...a[i], number: e.target.value }; setPaymentMethods(a); }} placeholder="Number" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              {paymentMethods.length > 1 && (
                <button type="button" onClick={() => setPaymentMethods(paymentMethods.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors flex-shrink-0 mt-0.5">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setPaymentMethods([...paymentMethods, { name: "", number: "" }])} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add Payment Method
          </button>
        </FormSection>

        {/* Social Links */}
        <FormSection icon={Share2} title="Social Media Links">
          {socialLinks.map((sl, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 min-w-0 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                <input value={sl.name} onChange={(e) => { const a = [...socialLinks]; a[i] = { ...a[i], name: e.target.value }; setSocialLinks(a); }} placeholder="Platform Name" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                <input value={sl.link} onChange={(e) => { const a = [...socialLinks]; a[i] = { ...a[i], link: e.target.value }; setSocialLinks(a); }} placeholder="Link" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              {socialLinks.length > 1 && (
                <button type="button" onClick={() => setSocialLinks(socialLinks.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors flex-shrink-0 mt-0.5">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setSocialLinks([...socialLinks, { name: "", link: "" }])} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add Social Link
          </button>
        </FormSection>

        {/* Useful Links */}
        <FormSection icon={Link2} title="Useful Links">
          {usefulLinks.map((ul, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 min-w-0 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                <input value={ul.name} onChange={(e) => { const a = [...usefulLinks]; a[i] = { ...a[i], name: e.target.value }; setUsefulLinks(a); }} placeholder="Link Name" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                <input value={ul.link} onChange={(e) => { const a = [...usefulLinks]; a[i] = { ...a[i], link: e.target.value }; setUsefulLinks(a); }} placeholder="URL" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              {usefulLinks.length > 1 && (
                <button type="button" onClick={() => setUsefulLinks(usefulLinks.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors flex-shrink-0 mt-0.5">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setUsefulLinks([...usefulLinks, { name: "", link: "" }])} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add Useful Link
          </button>
        </FormSection>

        <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
