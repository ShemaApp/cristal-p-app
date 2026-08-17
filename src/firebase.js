import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyKEEz2MkzalMcxJlvHGq9dknJ6XWfR-o",
  authDomain: "flutt-water.firebaseapp.com",
  projectId: "flutt-water",
  storageBucket: "flutt-water.firebasestorage.app",
  messagingSenderId: "700966779244",
  appId: "1:700966779244:web:533e5740b515a5bd0edb49",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
