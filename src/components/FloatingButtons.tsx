import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ArrowLeft, BookOpen, CreditCard, Phone, GraduationCap, ExternalLink, FileText, Users } from "lucide-react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course } from "@/types";
import ReactMarkdown from "react-markdown";

const WHATSAPP_ICON = (
  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

type MenuScreen = 
  | "main" 
  | "courses" 
  | "course-detail" 
  | "enrollment-guide" 
  | "payment-info" 
  | "contact" 
  | "my-courses" 
  | "my-course-detail"
  | "useful-links";

interface FloatingButtonsProps {
  course?: Course | null;
}

export function FloatingButtons({ course }: FloatingButtonsProps = {}) {
  const settings = useAppSettings();
  const { user, userDoc } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = userDoc?.role === "admin";

  const [chatOpen, setChatOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState("");
  const [waHistory, setWaHistory] = useState<{ role: "user"; content: string }[]>([]);

  // Menu-based chatbot state
  const [screen, setScreen] = useState<MenuScreen>("main");
  const [screenHistory, setScreenHistory] = useState<MenuScreen[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedEnrolledCourse, setSelectedEnrolledCourse] = useState<Course | null>(null);
  const [coursesLoaded, setCoursesLoaded] = useState(false);

  // Chat messages
  const [chatMessages, setChatMessages] = useState<{ role: "bot" | "user"; content: string; screen?: MenuScreen }[]>([
    { role: "bot", content: "স্বাগতম! 👋 নিচের অপশন থেকে বেছে নিন অথবা আপনার প্রশ্ন লিখুন:" }
  ]);
  const [chatInput, setChatInput] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [screen, chatMessages]);

  // Load courses when chatbot opens
  useEffect(() => {
    if (chatOpen && !coursesLoaded) {
      getDocs(collection(db, "courses")).then((snap) => {
        setAllCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
        setCoursesLoaded(true);
      });
    }
  }, [chatOpen, coursesLoaded]);

  if (isAdmin || pathname.startsWith("/admin")) return null;

  const navigateTo = (next: MenuScreen) => {
    setScreenHistory(prev => [...prev, screen]);
    setScreen(next);
  };

  const goBack = () => {
    const prev = [...screenHistory];
    const last = prev.pop();
    setScreenHistory(prev);
    setScreen(last || "main");
  };

  const resetChat = () => {
    setScreen("main");
    setScreenHistory([]);
    setSelectedCourse(null);
    setSelectedEnrolledCourse(null);
  };

  const enrolledCourseIds = userDoc?.enrolledCourses?.map(c => c.courseId) || [];
  const enrolledCoursesList = allCourses.filter(c => enrolledCourseIds.includes(c.id));

  // Keyword-based chat response
  const handleChatSend = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages(prev => [...prev, { role: "user", content: text }]);
    setChatInput("");

    const lower = text.toLowerCase();
    const keywords: { match: string[]; reply: string; nav?: MenuScreen }[] = [
      { match: ["কোর্স", "course", "সকল কোর্স", "কি কি কোর্স"], reply: "📚 সকল কোর্সের তথ্য দেখুন:", nav: "courses" },
      { match: ["এনরোল", "enroll", "ভর্তি", "admit", "admission"], reply: "📝 এনরোলমেন্ট প্রক্রিয়া দেখুন:", nav: "enrollment-guide" },
      { match: ["পেমেন্ট", "payment", "টাকা", "বিকাশ", "bkash", "নগদ", "nagad", "send money"], reply: "💳 পেমেন্ট তথ্য দেখুন:", nav: "payment-info" },
      { match: ["যোগাযোগ", "contact", "ফোন", "phone", "নাম্বার", "number", "সোশ্যাল", "social"], reply: "📞 যোগাযোগের তথ্য:", nav: "contact" },
      { match: ["আমার কোর্স", "my course", "আমার", "enrolled"], reply: "🎓 আপনার কোর্সসমূহ:", nav: "my-courses" },
      { match: ["লিংক", "link", "দরকারি"], reply: "🔗 দরকারি লিংকসমূহ:", nav: "useful-links" },
      { match: ["হাই", "hi", "hello", "হ্যালো", "আসসালামু"], reply: "ওয়ালাইকুম আসসালাম! 😊 কিভাবে সাহায্য করতে পারি? নিচের অপশন থেকে বেছে নিন:" },
      { match: ["ধন্যবাদ", "thanks", "thank"], reply: "আপনাকেও ধন্যবাদ! 🙏 আর কোনো প্রশ্ন থাকলে জানাবেন।" },
      { match: ["প্রাইস", "price", "দাম", "মূল্য", "কত"], reply: "💰 কোর্সের মূল্য জানতে কোর্স তালিকা দেখুন:", nav: "courses" },
    ];

    // Check for course name match
    const matchedCourse = allCourses.find(c => lower.includes(c.courseName.toLowerCase()));
    if (matchedCourse) {
      setSelectedCourse(matchedCourse);
      setChatMessages(prev => [...prev, { role: "bot", content: `📚 "${matchedCourse.courseName}" কোর্সের বিবরণ দেখুন:`, screen: "course-detail" }]);
      navigateTo("course-detail");
      return;
    }

    for (const kw of keywords) {
      if (kw.match.some(m => lower.includes(m))) {
        setChatMessages(prev => [...prev, { role: "bot", content: kw.reply, screen: kw.nav }]);
        if (kw.nav) navigateTo(kw.nav);
        return;
      }
    }

    // Default fallback
    setChatMessages(prev => [...prev, { role: "bot", content: "দুঃখিত, আমি আপনার প্রশ্নটি বুঝতে পারিনি। 😅 নিচের অপশন থেকে বেছে নিন অথবা WhatsApp এ যোগাযোগ করুন।" }]);
  };

  // --- Capsule Button Component ---
  const CapsuleButton = ({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }) => (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all border ${
        accent
          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm"
          : "bg-background text-foreground border-border hover:bg-accent hover:border-accent"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );

  // --- Render screen content ---
  const renderScreen = () => {
    switch (screen) {
      case "main":
        return (
          <div className="flex flex-wrap gap-2">
            <CapsuleButton icon={<BookOpen className="h-3.5 w-3.5" />} label="সকল কোর্স" onClick={() => navigateTo("courses")} />
            <CapsuleButton icon={<CreditCard className="h-3.5 w-3.5" />} label="এনরোলমেন্ট গাইড" onClick={() => navigateTo("enrollment-guide")} />
            <CapsuleButton icon={<CreditCard className="h-3.5 w-3.5" />} label="পেমেন্ট তথ্য" onClick={() => navigateTo("payment-info")} />
            {user && enrolledCourseIds.length > 0 && (
              <CapsuleButton icon={<GraduationCap className="h-3.5 w-3.5" />} label="আমার কোর্সসমূহ" onClick={() => navigateTo("my-courses")} accent />
            )}
            <CapsuleButton icon={<Phone className="h-3.5 w-3.5" />} label="যোগাযোগ" onClick={() => navigateTo("contact")} />
            {settings.usefulLinks?.length > 0 && (
              <CapsuleButton icon={<ExternalLink className="h-3.5 w-3.5" />} label="দরকারি লিংক" onClick={() => navigateTo("useful-links")} />
            )}
          </div>
        );

      case "courses":
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">📚 সকল কোর্স:</div>
            {allCourses.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">কোনো কোর্স পাওয়া যায়নি</div>
            ) : (
              allCourses.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCourse(c); navigateTo("course-detail"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/60 hover:bg-accent transition-colors text-left"
                >
                  {c.thumbnail && (
                    <img src={c.thumbnail} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.courseName}</div>
                    <div className="text-xs text-muted-foreground">৳{c.price}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        );

      case "course-detail":
        if (!selectedCourse) return null;
        const sc = selectedCourse;
        return (
          <div className="space-y-3 text-sm">
            {sc.thumbnail && (
              <img src={sc.thumbnail} alt="" className="w-full rounded-lg object-cover aspect-video" />
            )}
            <div className="font-semibold text-base">{sc.courseName}</div>
            <div className="text-primary font-bold text-lg">৳{sc.price}</div>

            {sc.overview?.length > 0 && (
              <div>
                <div className="font-medium mb-1">📖 ওভারভিউ:</div>
                <ul className="space-y-1 text-muted-foreground">
                  {sc.overview.map((o, i) => <li key={i}>• {o}</li>)}
                </ul>
              </div>
            )}

            {sc.subjects?.length > 0 && (
              <div>
                <div className="font-medium mb-1">📚 সাবজেক্টসমূহ:</div>
                <ul className="space-y-1 text-muted-foreground">
                  {sc.subjects.map(s => (
                    <li key={s.subjectId}>
                      • {s.subjectName}
                      {s.chapters?.length ? ` (${s.chapters.length}টি চ্যাপ্টার)` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sc.instructors?.length > 0 && (
              <div>
                <div className="font-medium mb-1">👨‍🏫 ইন্সট্রাক্টর:</div>
                <div className="space-y-2">
                  {sc.instructors.map((inst, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {inst.image && <img src={inst.image} alt="" className="w-8 h-8 rounded-full object-cover" />}
                      <div>
                        <div className="font-medium">{inst.name}</div>
                        <div className="text-xs text-muted-foreground">{inst.subject}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sc.routinePDF && (
              <a href={sc.routinePDF} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 hover:bg-accent transition-colors">
                <FileText className="h-4 w-4" />
                <span>📅 রুটিন PDF দেখুন</span>
              </a>
            )}

            <div className="pt-1">
              <CapsuleButton
                icon={<CreditCard className="h-3.5 w-3.5" />}
                label="এই কোর্সে এনরোল করুন"
                onClick={() => navigateTo("enrollment-guide")}
                accent
              />
            </div>
          </div>
        );

      case "enrollment-guide":
        return (
          <div className="space-y-3 text-sm">
            <div className="font-semibold text-base">📝 এনরোলমেন্ট প্রক্রিয়া</div>
            <div className="space-y-2 text-muted-foreground">
              <div className="flex gap-2"><span className="font-bold text-foreground">1️⃣</span> হোমপেজ থেকে আপনার পছন্দের কোর্স সিলেক্ট করুন</div>
              <div className="flex gap-2"><span className="font-bold text-foreground">2️⃣</span> 'Enroll Now' বাটনে ক্লিক করুন</div>
              <div className="flex gap-2"><span className="font-bold text-foreground">3️⃣</span> রেজিস্ট্রেশন ফর্মে নাম, ইমেইল ও পাসওয়ার্ড দিন</div>
              <div className="flex gap-2"><span className="font-bold text-foreground">4️⃣</span> নিচের পেমেন্ট মেথড থেকে যেকোনো একটিতে টাকা পাঠান</div>
              <div className="flex gap-2"><span className="font-bold text-foreground">5️⃣</span> ট্রানজ্যাকশন আইডি ও পেমেন্ট স্ক্রিনশট আপলোড করুন</div>
              <div className="flex gap-2"><span className="font-bold text-foreground">6️⃣</span> অ্যাডমিন ভেরিফাই করলেই কোর্স অ্যাক্সেস পাবেন!</div>
            </div>

            {settings.paymentMethods?.length > 0 && (
              <div className="pt-2">
                <div className="font-medium mb-2">💳 পেমেন্ট নাম্বারসমূহ:</div>
                <div className="space-y-2">
                  {settings.paymentMethods.map((pm, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/60">
                      <div>
                        <div className="font-medium">{pm.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{pm.number}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-warning/10 text-warning border border-warning/20 rounded-lg px-3 py-2">
              ⏳ পেমেন্ট ভেরিফিকেশনে কিছু সময় লাগতে পারে। সমস্যা হলে WhatsApp এ যোগাযোগ করুন।
            </div>
          </div>
        );

      case "payment-info":
        return (
          <div className="space-y-3 text-sm">
            <div className="font-semibold text-base">💳 পেমেন্ট তথ্য</div>
            {settings.paymentMethods?.length > 0 ? (
              <div className="space-y-2">
                <div className="text-muted-foreground mb-1">নিচের যেকোনো একটি নাম্বারে Send Money করুন:</div>
                {settings.paymentMethods.map((pm, i) => (
                  <div key={i} className="px-3 py-3 rounded-lg bg-muted/60 border border-border">
                    <div className="font-semibold">{pm.name}</div>
                    <div className="text-lg font-mono tracking-wider mt-1">{pm.number}</div>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground mt-2">
                  📝 Send Money করার পর Transaction ID ও Screenshot সংরক্ষণ করুন। এনরোলমেন্ট ফর্মে এগুলো দিতে হবে।
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-4">পেমেন্ট তথ্য এখনও আপডেট করা হয়নি</div>
            )}
          </div>
        );

      case "contact":
        return (
          <div className="space-y-3 text-sm">
            <div className="font-semibold text-base">📞 যোগাযোগ ও সোশ্যাল মিডিয়া</div>
            {settings.socialLinks?.length > 0 ? (
              <div className="space-y-2">
                {settings.socialLinks.map((sl, i) => {
                  const isWa = sl.name.toLowerCase().includes("whatsapp");
                  const isFb = sl.name.toLowerCase().includes("facebook");
                  const isYt = sl.name.toLowerCase().includes("youtube");
                  const isTg = sl.name.toLowerCase().includes("telegram");
                  const emoji = isWa ? "💬" : isFb ? "📘" : isYt ? "🎬" : isTg ? "✈️" : "🔗";
                  return (
                    <a
                      key={i}
                      href={sl.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/60 hover:bg-accent transition-colors"
                    >
                      <span>{emoji}</span>
                      <span className="flex-1">{sl.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-4">যোগাযোগের তথ্য এখনও আপডেট করা হয়নি</div>
            )}

            {settings.youtubeChannel && (
              <a href={settings.youtubeChannel} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/60 hover:bg-accent transition-colors">
                <span>🎬</span><span className="flex-1">YouTube Channel</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            )}
          </div>
        );

      case "useful-links":
        return (
          <div className="space-y-3 text-sm">
            <div className="font-semibold text-base">🔗 দরকারি লিংকসমূহ</div>
            {settings.usefulLinks?.length > 0 ? (
              <div className="space-y-2">
                {settings.usefulLinks.map((ul, i) => (
                  <a
                    key={i}
                    href={ul.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/60 hover:bg-accent transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{ul.name}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-4">কোনো লিংক পাওয়া যায়নি</div>
            )}
          </div>
        );

      case "my-courses":
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">🎓 আপনার এনরোল করা কোর্সসমূহ:</div>
            {enrolledCoursesList.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">কোর্স লোড হচ্ছে...</div>
            ) : (
              enrolledCoursesList.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedEnrolledCourse(c); navigateTo("my-course-detail"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/60 hover:bg-accent transition-colors text-left"
                >
                  {c.thumbnail && (
                    <img src={c.thumbnail} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.courseName}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        );

      case "my-course-detail":
        if (!selectedEnrolledCourse) return null;
        const ec = selectedEnrolledCourse;
        return (
          <div className="space-y-3 text-sm">
            <div className="font-semibold text-base">🎓 {ec.courseName}</div>

            {ec.discussionGroups?.length > 0 && (
              <div>
                <div className="font-medium mb-2">💬 ডিসকাশন গ্রুপ:</div>
                <div className="space-y-2">
                  {ec.discussionGroups.map((g, i) => (
                    <a
                      key={i}
                      href={g.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/60 hover:bg-accent transition-colors"
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{g.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {ec.allMaterialsLink && (
              <a href={ec.allMaterialsLink} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/60 hover:bg-accent transition-colors">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="flex-1">📁 সকল ম্যাটেরিয়াল</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            )}

            {ec.routinePDF && (
              <a href={ec.routinePDF} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/60 hover:bg-accent transition-colors">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="flex-1">📅 রুটিন PDF</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            )}

            {ec.subjects?.length > 0 && (
              <div>
                <div className="font-medium mb-1">📚 সাবজেক্ট:</div>
                <ul className="space-y-1 text-muted-foreground">
                  {ec.subjects.map(s => (
                    <li key={s.subjectId}>• {s.subjectName}</li>
                  ))}
                </ul>
              </div>
            )}

            {ec.instructors?.length > 0 && (
              <div>
                <div className="font-medium mb-1">👨‍🏫 ইন্সট্রাক্টর:</div>
                <div className="space-y-1.5">
                  {ec.instructors.map((inst, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {inst.image && <img src={inst.image} alt="" className="w-7 h-7 rounded-full object-cover" />}
                      <span>{inst.name} — {inst.subject}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <a href={`/my-courses/${ec.id}`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
              <BookOpen className="h-4 w-4" /> কোর্সে যান
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  const screenTitle: Record<MenuScreen, string> = {
    main: `${settings.appName || "Darpan Academy"} সহায়ক`,
    courses: "সকল কোর্স",
    "course-detail": selectedCourse?.courseName || "কোর্স বিবরণ",
    "enrollment-guide": "এনরোলমেন্ট গাইড",
    "payment-info": "পেমেন্ট তথ্য",
    contact: "যোগাযোগ",
    "my-courses": "আমার কোর্সসমূহ",
    "my-course-detail": selectedEnrolledCourse?.courseName || "কোর্স",
    "useful-links": "দরকারি লিংক",
  };

  const sendWhatsApp = () => {
    if (!whatsappInput.trim()) return;
    const whatsappNumber = settings.socialLinks?.find(s => s.name.toLowerCase().includes("whatsapp"))?.link || "";
    const number = whatsappNumber.replace(/\D/g, "");
    setWaHistory(prev => [...prev, { role: "user", content: whatsappInput }]);
    if (number) {
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(whatsappInput)}`, "_blank");
    }
    setWhatsappInput("");
  };

  const closeAll = () => {
    setChatOpen(false);
    setWhatsappOpen(false);
    setMenuOpen(false);
    resetChat();
  };

  return (
    <div className="fixed bottom-20 right-3 sm:right-4 z-40 flex flex-col gap-3 items-end">
      {/* Menu-based Chatbot */}
      {chatOpen && (
        <div className="w-[calc(100vw-1.5rem)] max-w-96 h-[30rem] bg-card border border-border rounded-xl shadow-lg flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-3 bg-primary text-primary-foreground flex items-center gap-2 rounded-t-xl shrink-0">
            {screen !== "main" && (
              <button onClick={goBack} className="p-0.5 hover:bg-primary-foreground/10 rounded">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="text-sm font-medium flex-1 truncate">
              {screenTitle[screen]}
            </span>
            <button onClick={closeAll}><X className="h-4 w-4" /></button>
          </div>

          {/* Content */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Chat messages */}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Current screen options */}
            {renderScreen()}
          </div>

          {/* Footer with input + back to main */}
          <div className="border-t border-border shrink-0">
            {screen !== "main" && (
              <button
                onClick={resetChat}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 transition-colors border-b border-border"
              >
                🏠 মূল মেনুতে ফিরুন
              </button>
            )}
            <div className="p-2 flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                placeholder="আপনার প্রশ্ন লিখুন..."
                className="flex-1 min-w-0 px-3 py-2 rounded-full bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleChatSend}
                className="shrink-0 p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp chat popup */}
      {whatsappOpen && (
        <div className="w-[calc(100vw-1.5rem)] max-w-96 h-[28rem] bg-card border border-border rounded-xl shadow-lg flex flex-col overflow-hidden animate-fade-in">
          <div className="p-3 bg-[#25D366] text-white flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-2">
              {WHATSAPP_ICON}
              <span className="text-sm font-medium">WhatsApp</span>
            </div>
            <button onClick={() => setWhatsappOpen(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted text-foreground">
                আসসালামু আলাইকুম! 👋 আপনার মেসেজ লিখুন, Send বাটনে ক্লিক করলে সরাসরি WhatsApp এ পাঠানো হবে।
              </div>
            </div>
            {waHistory.map((msg, i) => (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-[#25D366] text-white">
                  {msg.content}
                  <div className="text-[10px] text-white/70 mt-1 text-right">✓ WhatsApp এ পাঠানো হয়েছে</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-border flex items-center gap-2">
            <input
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendWhatsApp()}
              placeholder="WhatsApp মেসেজ লিখুন..."
              className="flex-1 min-w-0 px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm"
            />
            <button onClick={sendWhatsApp} className="shrink-0 p-2.5 rounded-md bg-[#25D366] text-white">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded buttons */}
      {menuOpen && !chatOpen && !whatsappOpen && (
        <div className="flex flex-col gap-3 items-end animate-fade-in">
          <button
            onClick={() => { setWhatsappOpen(true); setMenuOpen(false); }}
            className="p-3.5 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition-transform"
          >
            {WHATSAPP_ICON}
          </button>
          <button
            onClick={() => { setChatOpen(true); setMenuOpen(false); }}
            className="p-3.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => {
          if (chatOpen || whatsappOpen) closeAll();
          else setMenuOpen(!menuOpen);
        }}
        className="p-3.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
      >
        {chatOpen || whatsappOpen || menuOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
