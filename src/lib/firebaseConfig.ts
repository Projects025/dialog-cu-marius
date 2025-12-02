import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// ADAUGAȚI AICI NOUA CONFIGURAȚIE DE LA NOUL PROIECT FIREBASE
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_NEW_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_NEW_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_NEW_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_NEW_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_NEW_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_NEW_APP_ID"
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
const functions = getFunctions(app);

export { app, auth, db, functions };
