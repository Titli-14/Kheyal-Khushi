/* ============================================================
   FIREBASE.JS
   Initializes Firebase (Authentication, Firestore, Storage) and
   exports them for every other module to use — auth.js, and
   later, products/orders/admin once Phase 6 hardwires Firestore.

   ------------------------------------------------------------
   HOW TO CONNECT YOUR OWN FIREBASE PROJECT:

   1. Go to https://console.firebase.google.com and create a
      project (or open an existing one).
   2. Add a Web App inside your Firebase project settings.
   3. Copy the config object Firebase gives you and paste it
      below, replacing the placeholder values.
   4. In the Firebase console, enable:
        - Authentication → Email/Password sign-in method
        - Firestore Database
        - Storage
   5. Any page that needs Firebase loads this file as an ES
      module, e.g.:
        <script type="module" src="js/firebase.js"></script>
        <script type="module" src="js/auth.js"></script>
   ------------------------------------------------------------

   DEMO MODE: until you paste in real config, isFirebaseConfigured
   is false and auth.js falls back to a clearly-labeled local demo
   mode (localStorage-based) so signup/login can still be clicked
   through and reviewed before your Firebase project is ready.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  initializeFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCQLIDZefOpDdfxrVvp5nYa0qU2sidEFp8",
  authDomain: "kheyalkhushi-128da.firebaseapp.com",
  projectId: "kheyalkhushi-128da",
  storageBucket: "kheyalkhushi-128da.firebasestorage.app",
  messagingSenderId: "373486233106",
  appId: "1:373486233106:web:979769598644d3d7d39acb"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

/* ------------------------------------------------------------
   WHY initializeFirestore() INSTEAD OF getFirestore():
   Firestore's default transport tries to auto-detect whether it
   can use a streaming connection. On some Windows setups —
   usually antivirus software or a proxy doing SSL inspection —
   that streaming connection gets silently broken, and the SDK
   ends up stuck in an endless "channel?gsessionid=..." reconnect
   loop. Any await on a Firestore call (like the setDoc() in
   auth.js's signup flow) then hangs forever, even though Auth
   itself succeeded.

   Forcing plain long-polling sidesteps that broken streaming
   path entirely. It's marginally chattier on the wire but far
   more reliable across corporate networks, VPNs, and antivirus
   setups. If you never saw the reconnect-loop issue, this is
   still safe to leave in.
   ------------------------------------------------------------ */
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  useFetchStreams: false
});

const storage = getStorage(app);

// Since you have configured Firebase, this should always be true.
const isFirebaseConfigured = true;

console.log('[Firebase] Initialized project:', firebaseConfig.projectId);
onAuthStateChanged(auth, (user) => {
  console.log('[Firestore] Auth state ready:', user ? user.uid : '(signed out)');
});

/* ------------------------------------------------------------
   RETRY HELPER FOR FIRESTORE READS
   getDoc()/getDocs() can fail with "Failed to get document
   because the client is offline" if called before Firestore's
   connection has finished its initial handshake — even though
   the connection comes up fine a moment later. Rather than
   surface that as a real error, retry a couple of times with a
   short delay. Wrap any getDoc/getDocs call with this.
   ------------------------------------------------------------ */
async function withOfflineRetry(fn, { retries = 3, delayMs = 1000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isOfflineError = err?.code === 'unavailable' || /client is offline/i.test(err?.message || '');
      if (!isOfflineError || attempt >= retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/* ------------------------------------------------------------
   BRIDGE FOR CLASSIC (non-module) SCRIPTS
   cart.js, wishlist.js, checkout.js, and profile.js are loaded
   as plain <script> tags (not type="module"), so they can't use
   `import`. Module scripts always finish running before
   DOMContentLoaded fires, so by the time those files' own
   DOMContentLoaded handlers run, everything below is guaranteed
   to already be on window.
   ------------------------------------------------------------ */
window.kkFirebase = {
  auth,
  db,
  isFirebaseConfigured,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  withOfflineRetry
};

export {
  app,
  auth,
  db,
  storage,
  isFirebaseConfigured
};