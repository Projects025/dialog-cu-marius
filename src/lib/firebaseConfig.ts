
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Adaugă aici configurația ta Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "chatasigurare.firebaseapp.com",
  projectId: "chatasigurare",
  storageBucket: "chatasigurare.firebasestorage.app",
  messagingSenderId: "427525310173",
  appId: "1:427525310173:web:aa593b5dfe7fc80a61bd34"
};

// Inițializează Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
