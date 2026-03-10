import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserDoc } from "@/types";
import { registerSession, isSessionValid, removeSession, clearLocalSessionId } from "@/lib/sessionManager";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<string>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

const SESSION_CHECK_INTERVAL = 60_000; // check every 60 seconds

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUserDoc = async (uid: string) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      setUserDoc(snap.data() as UserDoc);
    } else {
      setUserDoc(null);
    }
  };

  const forceLogout = async () => {
    clearLocalSessionId();
    await signOut(auth);
    setUser(null);
    setUserDoc(null);
    toast.error("অন্য ডিভাইস থেকে লগইন করায় এই সেশন বন্ধ হয়ে গেছে।");
  };

  // Periodically check if session is still valid
  const startSessionCheck = (uid: string) => {
    stopSessionCheck();
    sessionCheckRef.current = setInterval(async () => {
      try {
        const valid = await isSessionValid(uid);
        if (!valid) {
          await forceLogout();
        }
      } catch (_) {
        // ignore network errors during check
      }
    }, SESSION_CHECK_INTERVAL);
  };

  const stopSessionCheck = () => {
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
      sessionCheckRef.current = null;
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchUserDoc(u.uid);
      } else {
        setUserDoc(null);
        stopSessionCheck();
      }
      setLoading(false);
    });
    return () => {
      unsub();
      stopSessionCheck();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserDoc(cred.user.uid);
    // Register session (will invalidate old sessions if 3rd device)
    await registerSession(cred.user.uid);
    startSessionCheck(cred.user.uid);
  };

  const register = async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const newUser: UserDoc = {
      name,
      email,
      role: "student",
      status: "pending",
      enrolledCourses: [],
      activeCourseId: "",
      paymentInfo: { method: "", paymentNumber: "", transactionId: "", screenshot: "" },
      createdAt: Timestamp.now(),
    };
    await setDoc(doc(db, "users", cred.user.uid), newUser);
    setUserDoc(newUser);
    // Register session for new user too
    await registerSession(cred.user.uid);
    startSessionCheck(cred.user.uid);
    return cred.user.uid;
  };

  const logout = async () => {
    if (user) {
      await removeSession(user.uid);
    }
    stopSessionCheck();
    await signOut(auth);
    setUserDoc(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshUserDoc = async () => {
    if (user) await fetchUserDoc(user.uid);
  };

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, login, register, logout, resetPassword, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
}
