import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAezxySTUQLY2hCKJvqn8q_kz2anI50D-U",
  authDomain: "primavera-schedule.firebaseapp.com",
  projectId: "primavera-schedule",
  storageBucket: "primavera-schedule.firebasestorage.app",
  messagingSenderId: "1081905859375",
  appId: "1:1081905859375:web:e68600892e39174ba9efda"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
