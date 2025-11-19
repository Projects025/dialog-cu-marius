
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Adaugă aici configurația ta Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "chatasigurare.firebaseapp.com",
  projectId: "chatasigurare",
  storageBucket: "chatasigurare.appspot.com",
  messagingSenderId: "427525310173",
  appId: "1:427525310173:web:490358bade52e7cc61bd34"
};

// Inițializează Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
