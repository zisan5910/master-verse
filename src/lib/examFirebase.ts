import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const examFirebaseConfig = {
  apiKey: "AIzaSyCKJrWNuLTXsY9Iece7A_JTdjM6mx2fVhs",
  authDomain: "exam-85146.firebaseapp.com",
  projectId: "exam-85146",
  storageBucket: "exam-85146.firebasestorage.app",
  messagingSenderId: "956838410594",
  appId: "1:956838410594:web:00ef055478c14b0968143b",
};

const examApp = initializeApp(examFirebaseConfig, "exam");
export const examDb = getFirestore(examApp);
