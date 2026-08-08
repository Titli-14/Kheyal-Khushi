/* ============================================================
   WISHLIST.JS
   Handles the heart / wishlist icon on product cards everywhere,
   AND renders the full wishlist.html page (grid + empty state).

   FIRESTORE: wishlist ids live in a "wishlists/{uid}" document
   ({ ids: [...] }) once someone is signed in, so it follows them
   across devices. Signed-out visitors get a localStorage-backed
   wishlist, which is merged into their Firestore wishlist the
   moment they log in (see initWishlistAuthSync()).
   ============================================================ */

const WISHLIST_STORAGE_KEY = 'kheyalkhusi_wishlist';

let wishlistCache = [];
let wishlistCurrentUid = null;

function readLocalWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocalWishlist(ids) {
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
}

function persistWishlist() {
  if (wishlistCurrentUid) {
    const { db, doc, setDoc } = window.kkFirebase;
    console.log('[Firestore] Saving wishlist');
    setDoc(doc(db, 'wishlists', wishlistCurrentUid), { ids: wishlistCache }).catch((err) => {
      console.error('[Firestore] Operation failed', { code: err.code, message: err.message, error: err });
      if (window.showToast) window.showToast('Could not save your wishlist — please check your connection.');
    });
  } else {
    writeLocalWishlist(wishlistCache);
  }
}

/** Reads the wishlist as an array of product ids. Synchronous — backed by wishlistCache. */
function getWishlist() {
  return wishlistCache;
}

function saveWishlist(ids) {
  wishlistCache = ids;
  persistWishlist();
  updateWishlistBadge();
}

async function loadWishlistForUser(uid) {
  const { db, doc, getDoc, setDoc, withOfflineRetry } = window.kkFirebase;
  wishlistCurrentUid = uid;

  const snap = await withOfflineRetry(() => getDoc(doc(db, 'wishlists', uid)));
  let remoteIds = snap.exists() ? (snap.data().ids || []) : [];

  const guestIds = readLocalWishlist();
  if (guestIds.length > 0) {
    guestIds.forEach((id) => {
      if (!remoteIds.includes(id)) remoteIds.push(id);
    });
    localStorage.removeItem(WISHLIST_STORAGE_KEY);
    await setDoc(doc(db, 'wishlists', uid), { ids: remoteIds });
  }

  wishlistCache = remoteIds;
  updateWishlistBadge();
  restoreWishlistButtonStates();
  renderWishlistPage();
}

function loadWishlistForGuest() {
  wishlistCurrentUid = null;
  wishlistCache = readLocalWishlist();
  updateWishlistBadge();
  restoreWishlistButtonStates();
  renderWishlistPage();
}

function initWishlistAuthSync() {
  const { auth, onAuthStateChanged, isFirebaseConfigured } = window.kkFirebase;
  if (!isFirebaseConfigured) {
    loadWishlistForGuest();
    return;
  }
  onAuthStateChanged(auth, (user) => {
    if (user) loadWishlistForUser(user.uid);
    else loadWishlistForGuest();
  });
}

function isInWishlist(productId) {
  return getWishlist().includes(productId);
}

function toggleWishlist(productId) {
  let ids = getWishlist();
  const isNowActive = !ids.includes(productId);

  if (isNowActive) {
    ids.push(productId);
  } else {
    ids = ids.filter((id) => id !== productId);
  }

  saveWishlist(ids);
  return isNowActive;
}

function updateWishlistBadge() {
  const badge = document.querySelector('[data-wishlist-badge]');
  if (!badge) return;
  const count = getWishlist().length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  wishlistCache = readLocalWishlist();
  updateWishlistBadge();
  restoreWishlistButtonStates();
  renderWishlistPage();
  initWishlistAuthSync();

  // Delegated click handler catches heart buttons on any page,
  // including ones rendered dynamically (search results, wishlist grid).
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.wishlist-btn');
    if (!btn) return;
    const id = btn.dataset.productId;
    if (!id) return;

    if (window.kkRequireAuth && !window.kkRequireAuth('Please sign up to save items to your wishlist')) return;

    const isNowActive = toggleWishlist(id);
    btn.classList.toggle('is-active', isNowActive);

    if (window.showToast) {
      window.showToast(isNowActive ? 'Added to your wishlist' : 'Removed from your wishlist');
    }

    // If we're on the wishlist page itself, re-render so removed
    // items disappear immediately.
    if (document.querySelector('[data-wishlist-page]')) {
      renderWishlistPage();
    }
  });
});

/** Marks hearts as active on load, matching whatever is already saved. */
function restoreWishlistButtonStates() {
  const savedIds = getWishlist();
  document.querySelectorAll('.wishlist-btn').forEach((btn) => {
    const id = btn.dataset.productId;
    if (id && savedIds.includes(id)) {
      btn.classList.add('is-active');
    }
  });
}

/** Renders the grid (or empty state) on wishlist.html. No-op on every other page. */
function renderWishlistPage() {
  const wrap = document.querySelector('[data-wishlist-page]');
  if (!wrap) return;

  const emptyState = wrap.querySelector('[data-wishlist-empty]');
  const filledState = wrap.querySelector('[data-wishlist-filled]');
  if (!emptyState || !filledState) return;

  const ids = getWishlist();

  if (ids.length === 0) {
    emptyState.style.display = 'flex';
    filledState.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  filledState.style.display = 'grid';

  filledState.innerHTML = ids
    .map((id) => getProductById(id))
    .filter(Boolean)
    .map(renderProductCard)
    .join('');
}
