// firebase.js
// Import Firebase (ES module style)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDrcJ7b_Y6mrThjJWNqtBdWxX1vfQAdP4Q",
  authDomain: "jee-tracker-a46d6.firebaseapp.com",
  projectId: "jee-tracker-a46d6",
  storageBucket: "jee-tracker-a46d6.firebasestorage.app",
  messagingSenderId: "34473493013",
  appId: "1:34473493013:web:edd9b3e45fb82a0d5c841c"
};

// Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fetch chapters
export async function getChapters(subject) {
  const q = query(collection(db, subject), orderBy("idx")); // sorts by idx at the query level
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Update chapter
export async function updateChapter(subject, id, data) {
    console.log(id, data);
  const ref = doc(db, subject, id);
  await updateDoc(ref, data);
}