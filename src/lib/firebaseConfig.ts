
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Hardcoded config to ensure it's always available and correct.
const firebaseConfig = {
  apiKey: "AIzaSyDr-L6H2TCScpkSxkV9mY5fIac4yF_uY9s",
  authDomain: "chatasigurare.firebaseapp.com",
  projectId: "chatasigurare",
  storageBucket: "chatasigurare.appspot.com",
  messagingSenderId: "427525310173",
  appId: "1:427525310173:web:490358bade52e7cc61bd34"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

export { app, auth, db, functions };
