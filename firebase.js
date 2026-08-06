// ======================================
// FIREBASE CONFIG
// ======================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ======================================
// KONFIGURASI FIREBASE
// ======================================

const firebaseConfig = {

    apiKey: "AIzaSyD49ltzVbP7-pNGU2q_6Qh4hCv6ZUYniSA",

    authDomain: "adsense-adinoki.firebaseapp.com",

    projectId: "adsense-adinoki",

    storageBucket: "adsense-adinoki.firebasestorage.app",

    messagingSenderId: "375046718840",

    appId: "1:375046718840:web:c7005f35be2dd2e94b748d"

};


// ======================================
// INISIALISASI FIREBASE
// ======================================

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);


// ======================================
// DOKUMEN DATABASE
// adsense
//   └── data
// ======================================

const adsenseDoc = doc(db, "adsense", "data");


// ======================================
// EXPORT
// ======================================

export {

    db,

    adsenseDoc,

    getDoc,

    setDoc,

    onSnapshot

};