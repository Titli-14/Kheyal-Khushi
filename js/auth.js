/* ============================================================
   AUTH.JS
   Handles Signup, Login, Forgot Password, Logout, and keeps the
   header's account icon in sync with whether someone is signed in.

   Loaded as an ES module (needs firebase.js, also a module):
     <script type="module" src="js/firebase.js"></script>
     <script type="module" src="js/auth.js"></script>

   DEMO MODE: if Firebase config hasn't been filled in yet
   (see js/firebase.js), this file falls back to a simple
   localStorage-based demo so the flows are still fully clickable
   and reviewable. Everything switches to real Firebase Auth the
   moment real config is pasted in — no other code changes needed.
   ============================================================ */

import { auth, db, isFirebaseConfigured } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const DEMO_USER_KEY = 'kheyalkhusi_demo_user';

/* ---------- Friendly error messages ----------
   Firebase's raw error codes (auth/wrong-password, etc.) aren't
   something a shopper should ever see — map the common ones to
   plain language here. */
const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
  'auth/invalid-email': 'That doesn\'t look like a valid email address.',
  'auth/weak-password': 'Please choose a password with at least 6 characters.',
  'auth/user-not-found': 'We couldn\'t find an account with that email.',
  'auth/wrong-password': 'That password doesn\'t match this account.',
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error — please check your connection and try again.',
  default: 'Something went wrong. Please try again.',
};

function friendlyError(error) {
  return ERROR_MESSAGES[error?.code] || ERROR_MESSAGES.default;
}

/* ---------- Client-side validation helpers ---------- */
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setFieldError(fieldEl, message) {
  fieldEl.classList.toggle('has-error', !!message);
  const errorEl = fieldEl.querySelector('.form-field-error span');
  if (errorEl && message) errorEl.textContent = message;
}

function clearFieldErrors(form) {
  form.querySelectorAll('.form-field').forEach((field) => field.classList.remove('has-error'));
}

function showFormBanner(container, type, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="form-banner ${type}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01" stroke-linecap="round"/></svg>
      <span>${message}</span>
    </div>
  `;
}

function setButtonLoading(btn, isLoading, loadingText, defaultText) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? loadingText : defaultText;
}

/* ---------- Password show/hide toggle (shared by every auth form) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.password-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const input = toggle.parentElement.querySelector('input');
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggle.innerHTML = isPassword
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 20c-6 0-10-6-10-8a15.6 15.6 0 0 1 4-5M9.9 4.2A9.6 9.6 0 0 1 12 4c6 0 10 6 10 8a15.7 15.7 0 0 1-2.2 3.3M14.1 14.1a3 3 0 1 1-4.2-4.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 2l20 20" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8Z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });

  initSignupForm();
  initLoginForm();
  initForgotPasswordForm();
  initLogoutButtons();
  initHeaderAuthState();
});

/* ---------- Demo-mode helpers (used only when Firebase isn't configured yet) ---------- */
function demoSignUp(name, email) {
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify({ name, email }));
}
function demoSignIn(email) {
  const existing = JSON.parse(localStorage.getItem(DEMO_USER_KEY) || 'null');
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify({ name: existing?.name || email.split('@')[0], email }));
}
function demoSignOut() {
  localStorage.removeItem(DEMO_USER_KEY);
}
function demoCurrentUser() {
  return JSON.parse(localStorage.getItem(DEMO_USER_KEY) || 'null');
}

/* ---------- Signup ---------- */
function initSignupForm() {
  const form = document.querySelector('[data-signup-form]');
  if (!form) return;

  const banner = form.querySelector('[data-form-banner]');
  const submitBtn = form.querySelector('[data-submit-btn]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    if (banner) banner.innerHTML = '';

    const nameField = form.querySelector('[data-field="name"]');
    const emailField = form.querySelector('[data-field="email"]');
    const passwordField = form.querySelector('[data-field="password"]');
    const confirmField = form.querySelector('[data-field="confirm"]');

    const name = nameField.querySelector('input').value.trim();
    const email = emailField.querySelector('input').value.trim();
    const password = passwordField.querySelector('input').value;
    const confirm = confirmField.querySelector('input').value;

    let hasError = false;
    if (name.length < 2) { setFieldError(nameField, 'Please enter your full name.'); hasError = true; }
    if (!isValidEmail(email)) { setFieldError(emailField, 'Please enter a valid email address.'); hasError = true; }
    if (password.length < 6) { setFieldError(passwordField, 'Password must be at least 6 characters.'); hasError = true; }
    if (confirm !== password) { setFieldError(confirmField, 'Passwords do not match.'); hasError = true; }
    if (hasError) return;

    setButtonLoading(submitBtn, true, 'Creating your account...', 'Create Account');

    try {
      if (isFirebaseConfigured) {
        let credential;
        try {
          credential = await createUserWithEmailAndPassword(auth, email, password);
        } catch (authError) {
          // If they're retrying after a previous attempt whose Auth step
          // succeeded but whose Firestore step failed, don't create a
          // second (impossible) account — sign them into the one that
          // already exists and continue on to the profile-doc write below.
          if (authError.code === 'auth/email-already-in-use') {
            try {
              credential = await signInWithEmailAndPassword(auth, email, password);
            } catch {
              throw authError; // Different password, or a genuine pre-existing account — surface the original error.
            }
          } else {
            throw authError;
          }
        }

        await updateProfile(credential.user, {
          displayName: name
        });

        console.log('[Firestore] Creating users/' + credential.user.uid);
        try {
          // merge: true so a retry after a previous partial failure
          // doesn't clobber any fields that did make it through.
          await setDoc(doc(db, "users", credential.user.uid), {
            name: name,
            email: email,
            phone: "",
            city: "",
            role: "customer",
            addresses: [],
            createdAt: serverTimestamp()
          }, { merge: true });
          console.log('[Firestore] User document created');
        } catch (firestoreError) {
          console.error('[Firestore] Operation failed', {
            code: firestoreError.code,
            message: firestoreError.message,
            error: firestoreError
          });
          showFormBanner(
            banner,
            'error',
            `Your account was created, but we couldn't save your profile (${firestoreError.code || firestoreError.message || 'unknown error'}). Please try again.`
          );
          setButtonLoading(submitBtn, false, '', 'Create Account');
          return; // Do not redirect — the signup flow did not complete safely.
        }
      } else {
        demoSignUp(name, email);
      }
      window.location.href = 'profile.html';
    } catch (error) {
      showFormBanner(banner, 'error', friendlyError(error));
      setButtonLoading(submitBtn, false, '', 'Create Account');
    }
  });
}

/* ---------- Login ---------- */
function initLoginForm() {
  const form = document.querySelector('[data-login-form]');
  if (!form) return;

  const banner = form.querySelector('[data-form-banner]');
  const submitBtn = form.querySelector('[data-submit-btn]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    if (banner) banner.innerHTML = '';

    const emailField = form.querySelector('[data-field="email"]');
    const passwordField = form.querySelector('[data-field="password"]');

    const email = emailField.querySelector('input').value.trim();
    const password = passwordField.querySelector('input').value;

    let hasError = false;
    if (!isValidEmail(email)) { setFieldError(emailField, 'Please enter a valid email address.'); hasError = true; }
    if (password.length < 1) { setFieldError(passwordField, 'Please enter your password.'); hasError = true; }
    if (hasError) return;

    setButtonLoading(submitBtn, true, 'Signing in...', 'Log In');

    try {
      if (isFirebaseConfigured) {

    const credential = await signInWithEmailAndPassword(auth, email, password);

    const userRef = doc(db, "users", credential.user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        showFormBanner(banner, "error", "User profile not found.");
        await signOut(auth);
        setButtonLoading(submitBtn, false, "", "Log In");
        return;
    }

    const userData = userSnap.data();

    if (userData.role === "admin") {
        window.location.href = "admin/dashboard.html";
    } else {
        window.location.href = "profile.html";
    }

} else {

    demoSignIn(email);
    window.location.href = "profile.html";

   }
  } catch (error) {
      showFormBanner(banner, 'error', friendlyError(error));
      setButtonLoading(submitBtn, false, '', 'Log In');
    }
  });
}

/* ---------- Forgot Password ---------- */
function initForgotPasswordForm() {
  const form = document.querySelector('[data-forgot-form]');
  if (!form) return;

  const banner = form.querySelector('[data-form-banner]');
  const submitBtn = form.querySelector('[data-submit-btn]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    if (banner) banner.innerHTML = '';

    const emailField = form.querySelector('[data-field="email"]');
    const email = emailField.querySelector('input').value.trim();

    if (!isValidEmail(email)) {
      setFieldError(emailField, 'Please enter a valid email address.');
      return;
    }

    setButtonLoading(submitBtn, true, 'Sending...', 'Send Reset Link');

    try {
      if (isFirebaseConfigured) {
        await sendPasswordResetEmail(auth, email);
      }
      // In demo mode there's no real email to send — we still show
      // the same success state so the flow is reviewable end-to-end.
      form.style.display = 'none';
      showFormBanner(banner, 'info', `If an account exists for ${email}, a password reset link is on its way.`);
    } catch (error) {
      showFormBanner(banner, 'error', friendlyError(error));
      setButtonLoading(submitBtn, false, '', 'Send Reset Link');
    }
  });
}

/* ---------- Logout ---------- */
function initLogoutButtons() {
  document.querySelectorAll('[data-logout-btn]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (isFirebaseConfigured) {
          await signOut(auth);
        } else {
          demoSignOut();
        }
      } finally {
        window.location.href = 'index.html';
      }
    });
  });
}

/* ---------- Header account icon: reflects signed-in state ----------
   Swaps the header's account link between "Log In" and the
   customer's initial once we know whether someone is signed in. */
function initHeaderAuthState() {
  const accountLink = document.querySelector('[data-account-link]');

  function applyState(user) {
    if (!accountLink) return;
    if (user) {
      const label = (user.displayName || user.name || user.email || '?').charAt(0).toUpperCase();
      accountLink.href = 'profile.html';
      accountLink.setAttribute('aria-label', 'Your account');
      accountLink.innerHTML = `<span class="account-icon-initial">${label}</span>`;
    } else {
      accountLink.href = 'login.html';
      accountLink.setAttribute('aria-label', 'Log in');
      accountLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke-linecap="round"/></svg>`;
    }
  }

  if (isFirebaseConfigured) {
    onAuthStateChanged(auth, applyState);
  } else {
    applyState(demoCurrentUser());
  }
}

/* ---------- Account page guard ----------
   Pages like profile.html and orders.html should redirect signed-out
   visitors to the login page. Call this from those pages if you want
   that behavior enforced (kept optional so the demo/dev flow isn't
   forced to sign in every time while building). */
export function requireAuth(redirectTo = 'login.html') {
  if (isFirebaseConfigured) {
    onAuthStateChanged(auth, (user) => {
      if (!user) window.location.href = redirectTo;
    });
  } else if (!demoCurrentUser()) {
    window.location.href = redirectTo;
  }
}

export { friendlyError, demoCurrentUser, isValidEmail };
