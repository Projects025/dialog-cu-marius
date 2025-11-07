import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Adaugă aici configurația ta Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDr-L6H2TCScpkSxkV9mY5fIac4yF_uY9s",
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
