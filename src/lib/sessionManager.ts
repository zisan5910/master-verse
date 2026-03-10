import { collection, query, where, getDocs, setDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SESSIONS_COLLECTION = "userSessions";
const MAX_SESSIONS = 2;

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const SESSION_KEY = "lms_session_id";

export function getLocalSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setLocalSessionId(id: string) {
  localStorage.setItem(SESSION_KEY, id);
}

export function clearLocalSessionId() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Register a new session for a user.
 * If 3rd device login, removes all old sessions (forcing logout on other devices).
 */
export async function registerSession(uid: string): Promise<string> {
  const sessionId = generateSessionId();

  // Get existing sessions for this user
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  const q = query(sessionsRef, where("userId", "==", uid));
  const snap = await getDocs(q);
  // Sort client-side by createdAt ascending to avoid composite index
  const sortedDocs = [...snap.docs].sort((a, b) => {
    const aTime = a.data().createdAt?.toMillis?.() || 0;
    const bTime = b.data().createdAt?.toMillis?.() || 0;
    return aTime - bTime;
  });

  // If already at or above limit, delete ALL old sessions
  if (sortedDocs.length >= MAX_SESSIONS) {
    const deletePromises = sortedDocs.map((d) => deleteDoc(doc(db, SESSIONS_COLLECTION, d.id)));
    await Promise.all(deletePromises);
  }

  // Create new session
  await setDoc(doc(db, SESSIONS_COLLECTION, sessionId), {
    userId: uid,
    sessionId,
    createdAt: Timestamp.now(),
  });

  setLocalSessionId(sessionId);
  return sessionId;
}

/**
 * Check if the current session is still valid (exists in Firestore).
 * Returns false if the session was invalidated by a newer login.
 */
export async function isSessionValid(uid: string): Promise<boolean> {
  const sessionId = getLocalSessionId();
  if (!sessionId) return false;

  // Use single-field query + client-side filter to avoid composite index
  const sessionsRef = collection(db, SESSIONS_COLLECTION);
  const q = query(sessionsRef, where("userId", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.some((d) => d.data().sessionId === sessionId);
}

/**
 * Remove current session on logout.
 */
export async function removeSession(uid: string) {
  const sessionId = getLocalSessionId();
  if (sessionId) {
    try {
      await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionId));
    } catch (_) {
      // ignore if already deleted
    }
    clearLocalSessionId();
  }
}
