
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Punctul de Audit: Afișează cheia în consola browserului
console.log("Verificare Cheie API:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY.length > 10 ? "Cheie încarcată (Lungime OK)" : "EROARE: Cheie lipsă sau scurtă");

// Adaugă aici configurația ta Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "chatasigurare.firebaseapp.com",
  projectId: "chatasigurare",
  storageBucket: "chatasigurare.appspot.com",
  messagingSenderId: "427525310173",
  appId: "1:427525310173:web:aa593b5dfe7fc80a61bd34"
};

// Inițializează Firebase
let app;
try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (e) {
    console.error("Firebase initialization error", e);
    // In case of initialization error, we might want to avoid further firebase calls
    // For now, we'll let it crash to make the error obvious during development
    throw e;
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
