
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDfx_7F5lF_0b1R3f2y9xWc8V4zN7sK5dI",
  authDomain: "polisafe-429913.firebaseapp.com",
  projectId: "polisafe-429913",
  storageBucket: "polisafe-429913.appspot.com",
  messagingSenderId: "367202359858",
  appId: "1:367202359858:web:715f5d377b55345d3c81e2"
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
