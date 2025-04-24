import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAVfkpcdHNkzIYpI5LAFr0cungHHk8t3vQ",
  authDomain: "montonisolucoestech-2e88f.firebaseapp.com",
  databaseURL: "https://montonisolucoestech-2e88f-default-rtdb.firebaseio.com",
  projectId: "montonisolucoestech-2e88f",
  storageBucket: "montonisolucoestech-2e88f.firebasestorage.app",
  messagingSenderId: "556184946334",
  appId: "1:556184946334:web:0883dfa8d81d1d858d5d8f",
  measurementId: "G-PMQQY7BCT4",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const analytics = getAnalytics(app);

export { analytics, database };
