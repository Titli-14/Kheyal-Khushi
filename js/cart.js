/* ============================================================
   CART.JS
   Handles adding/removing/updating items and rendering
   cart.html (including the empty-cart state). Also keeps the
   little cart count badge in the header up to date on every page.

   FIRESTORE: cart items live in a "carts/{uid}" document
   ({ items: [{id, qty}] }) once someone is signed in. Signed-out
   visitors still get a fully working cart via localStorage, and
   the moment they log in, that guest cart is merged into their
   Firestore cart (see initCartAuthSync()).

   getCart()/addToCart()/etc. all read and write an in-memory
   cache (cartCache) synchronously, so every existing call site
   in this file keeps working unchanged. Firestore writes happen
   in the background right after each change.
   ============================================================ */

const CART_STORAGE_KEY = 'kheyalkhusi_cart';
const COUPON_STORAGE_KEY = 'kheyalkhusi_coupon';
const SHIPPING_ESTIMATE_KEY = 'kheyalkhusi_shipping_estimate';
const SHIPPING_FLAT_RATE = 80;
const FREE_SHIPPING_THRESHOLD = 1500;

/* ---------- Coupon system ----------
   PHASE NOTE: These are demo codes. Once Firestore is connected
   (Phase 6), swap COUPONS for a "coupons" collection lookup and
   keep applyCoupon()'s return shape the same. */
const COUPONS = {
  WELCOME10: { type: 'percent', value: 10, minOrder: 0, label: '10% off your order' },
  FLAT100: { type: 'flat', value: 100, minOrder: 1000, label: '₹100 off orders over ₹1,000' },
  FREESHIP: { type: 'freeship', value: 0, minOrder: 0, label: 'Free shipping' },
};

function getAppliedCoupon() {
  try {
    return JSON.parse(localStorage.getItem(COUPON_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveAppliedCoupon(code) {
  localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(code));
}

function clearAppliedCoupon() {
  localStorage.removeItem(COUPON_STORAGE_KEY);
}

/** Validates a coupon code against the current subtotal. Returns { ok, message }. */
function applyCoupon(rawCode, subtotal) {
  const code = (rawCode || '').trim().toUpperCase();
  const coupon = COUPONS[code];

  if (!code) return { ok: false, message: 'Please enter a code.' };
  if (!coupon) return { ok: false, message: 'That code isn\'t valid.' };
  if (subtotal < coupon.minOrder) {
    return { ok: false, message: `This code needs a minimum order of ₹${coupon.minOrder.toLocaleString('en-IN')}.` };
  }

  saveAppliedCoupon(code);
  return { ok: true, message: coupon.label };
}

/** Computes { discount, freeShipping } for the current subtotal, given whatever coupon is saved. */
function getCouponEffect(subtotal) {
  const code = getAppliedCoupon();
  const coupon = code ? COUPONS[code] : null;
  if (!coupon || subtotal < coupon.minOrder) return { code: null, discount: 0, freeShipping: false };

  let discount = 0;
  if (coupon.type === 'percent') discount = Math.round(subtotal * (coupon.value / 100));
  if (coupon.type === 'flat') discount = coupon.value;

  return { code, discount: Math.min(discount, subtotal), freeShipping: coupon.type === 'freeship' };
}

/* ---------- Shipping calculator ----------
   A simple demo "zone" model based on the first digit of an
   Indian PIN code. Swap for a real courier-rate API later if
   you want live rates instead of an estimate. */
const SHIPPING_ZONES = {
  metro: { digits: ['1', '2', '3'], days: '2–3', cost: SHIPPING_FLAT_RATE },
  standard: { digits: ['4', '5', '6'], days: '4–6', cost: SHIPPING_FLAT_RATE },
  remote: { digits: ['7', '8', '9', '0'], days: '6–8', cost: 120 },
};

function estimateShipping(pincode) {
  const firstDigit = String(pincode).trim().charAt(0);
  const zone = Object.values(SHIPPING_ZONES).find((z) => z.digits.includes(firstDigit)) || SHIPPING_ZONES.standard;
  return { days: zone.days, cost: zone.cost };
}

function saveShippingEstimate(pincode, estimate) {
  localStorage.setItem(SHIPPING_ESTIMATE_KEY, JSON.stringify({ pincode, ...estimate }));
}

function getShippingEstimate() {
  try {
    return JSON.parse(localStorage.getItem(SHIPPING_ESTIMATE_KEY) || 'null');
  } catch {
    return null;
  }
}


/* ---------- Firestore-backed cart cache ----------
   cartCache mirrors whatever is in Firestore (or localStorage,
   for guests) so every read below stays synchronous. */
let cartCache = [];
let cartCurrentUid = null; // null while signed out

function readLocalCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocalCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

/** Persists cartCache to Firestore (if signed in) or localStorage (guest). */
function persistCart() {
  if (cartCurrentUid) {
    const { db, doc, setDoc } = window.kkFirebase;
    console.log('[Firestore] Saving cart');
    setDoc(doc(db, 'carts', cartCurrentUid), { items: cartCache }).catch((err) => {
      console.error('[Firestore] Operation failed', { code: err.code, message: err.message, error: err });
      if (window.showToast) window.showToast('Could not save your cart — please check your connection.');
    });
  } else {
    writeLocalCart(cartCache);
  }
}

/** Reads the cart as an array of { id, qty }. Synchronous — backed by cartCache. */
function getCart() {
  return cartCache;
}

function saveCart(cart) {
  cartCache = cart;
  persistCart();
  updateCartBadge();
}

/** Loads the signed-in user's cart from Firestore into cartCache.
 *  If they had a guest cart in localStorage, merges it in (qty summed
 *  for items in both) and clears localStorage, then re-renders. */
async function loadCartForUser(uid) {
  const { db, doc, getDoc, setDoc, withOfflineRetry } = window.kkFirebase;
  cartCurrentUid = uid;

  const snap = await withOfflineRetry(() => getDoc(doc(db, 'carts', uid)));
  let remoteCart = snap.exists() ? (snap.data().items || []) : [];

  const guestCart = readLocalCart();
  if (guestCart.length > 0) {
    guestCart.forEach((guestItem) => {
      const existing = remoteCart.find((item) => item.id === guestItem.id);
      if (existing) {
        existing.qty += guestItem.qty;
      } else {
        remoteCart.push(guestItem);
      }
    });
    localStorage.removeItem(CART_STORAGE_KEY);
    await setDoc(doc(db, 'carts', uid), { items: remoteCart });
  }

  cartCache = remoteCart;
updateCartBadge();
renderCartPage();

window.dispatchEvent(new CustomEvent('kkCartReady'));
}

/** Called when someone signs out — cart cache goes back to (empty) localStorage-backed. */
function loadCartForGuest() {
  cartCurrentUid = null;
  cartCache = readLocalCart();
  updateCartBadge();
  renderCartPage();

  window.dispatchEvent(new CustomEvent('kkCartReady'));
}


function initCartAuthSync() {
  const { auth, onAuthStateChanged, isFirebaseConfigured } = window.kkFirebase;
  if (!isFirebaseConfigured) {
    loadCartForGuest();
    return;
  }
  onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      await loadCartForUser(user.uid);
    } catch (err) {
      console.error('[Cart] Could not load Firestore cart:', err);

      cartCurrentUid = null;
      cartCache = readLocalCart();
      updateCartBadge();
      renderCartPage();
    }
  } else {
    loadCartForGuest();
  }
});
}


/** Adds a product to the cart, or increases its quantity if already present. */
function addToCart(productId, qty = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: productId, qty });
  }
  saveCart(cart);
}

function removeFromCart(productId) {
  saveCart(getCart().filter((item) => item.id !== productId));
}

/** Empties the cart entirely — called after a successful checkout. */
function clearCart() {
  saveCart([]);
  clearAppliedCoupon();
}

function updateCartQty(productId, qty) {
  const cart = getCart();
  const item = cart.find((entry) => entry.id === productId);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart);
}

/** Updates the little number badge on the cart icon in the header, on every page. */
function updateCartBadge() {
  const badge = document.querySelector('[data-cart-badge]');
  if (!badge) return;
  const count = getCart().reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

/** Computes { items, subtotal, discount, shipping, total, couponCode } for the current cart.
 *  Shared by cart.html (cart.js) and checkout.html (checkout.js) so the numbers never drift apart. */
function computeCartTotals() {
  const cart = getCart();
  const items = cart.map((entry) => {
    const product = getProductById(entry.id);
    return product ? { product, qty: entry.qty, lineTotal: product.price * entry.qty } : null;
  }).filter(Boolean);

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const coupon = getCouponEffect(subtotal);
  const shippingEstimate = getShippingEstimate();

  let shipping;
  if (coupon.freeShipping || subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0) {
    shipping = 0;
  } else if (shippingEstimate) {
    shipping = shippingEstimate.cost;
  } else {
    shipping = SHIPPING_FLAT_RATE;
  }

  const total = Math.max(0, subtotal - coupon.discount + shipping);

  return { items, subtotal, discount: coupon.discount, couponCode: coupon.code, shipping, total, shippingEstimate };
}

/* ---------- Rendering cart.html ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Start with whatever's in localStorage so the badge/page aren't
  // empty for a beat — initCartAuthSync() then swaps in the real
  // (Firestore or guest) cart as soon as auth state is known.
  cartCache = readLocalCart();
  updateCartBadge();
  renderCartPage();
  initCartAuthSync();

  // Quick-add buttons anywhere on the site (homepage, search results...)
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.product-quickadd');
    if (!btn) return;
    const id = btn.dataset.productId;
    if (!id) return;
    if (window.kkRequireAuth && !window.kkRequireAuth('Please sign up to add items to your cart')) return;
    addToCart(id, 1);
    if (window.showToast) window.showToast('Added to cart');
    renderCartPage();
  });
});

function renderCartPage() {
  const wrap = document.querySelector('[data-cart-page]');
  if (!wrap) return; // Not on the cart page — nothing to do

  const cart = getCart();
  const emptyState = wrap.querySelector('[data-cart-empty]');
  const filledState = wrap.querySelector('[data-cart-filled]');
  if (!emptyState || !filledState) return;

  if (cart.length === 0) {
    emptyState.style.display = 'flex';
    filledState.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  filledState.style.display = 'grid';

  const itemsList = filledState.querySelector('[data-cart-items]');
  let subtotal = 0;

  itemsList.innerHTML = cart.map((entry) => {
    const product = getProductById(entry.id);
    if (!product) return '';
    const lineTotal = product.price * entry.qty;
    subtotal += lineTotal;

    return `
      <div class="cart-row" data-cart-row="${product.id}">
        <img class="ph-warm cart-row-img" src="${product.image}" alt="${product.name}">
        <div class="cart-row-info">
          <p class="product-category">${product.category}</p>
          <h4>${product.name}</h4>
          <button class="cart-remove" data-remove="${product.id}">Remove</button>
        </div>
        <div class="cart-qty-stepper">
          <button data-qty-decrease="${product.id}" aria-label="Decrease quantity">−</button>
          <span>${entry.qty}</span>
          <button data-qty-increase="${product.id}" aria-label="Increase quantity">+</button>
        </div>
        <div class="cart-row-price">₹${lineTotal.toLocaleString('en-IN')}</div>
      </div>
    `;
  }).join('');

  const shippingEstimate = getShippingEstimate();
  const coupon = getCouponEffect(subtotal);

  let shipping;
  if (coupon.freeShipping || subtotal >= FREE_SHIPPING_THRESHOLD) {
    shipping = 0;
  } else if (shippingEstimate) {
    shipping = shippingEstimate.cost;
  } else {
    shipping = subtotal === 0 ? 0 : SHIPPING_FLAT_RATE;
  }

  const total = Math.max(0, subtotal - coupon.discount + shipping);

  filledState.querySelector('[data-cart-subtotal]').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  filledState.querySelector('[data-cart-shipping]').textContent = shipping === 0 ? 'Free' : `₹${shipping}`;
  filledState.querySelector('[data-cart-total]').textContent = `₹${total.toLocaleString('en-IN')}`;

  // ---- Coupon UI state ----
  const discountRow = filledState.querySelector('[data-discount-row]');
  const promoApplied = filledState.querySelector('[data-promo-applied]');
  const promoHideEls = filledState.querySelectorAll('[data-promo-applied-hide]');

  if (coupon.code) {
    if (discountRow) {
      discountRow.style.display = 'flex';
      filledState.querySelector('[data-cart-discount]').textContent = `−₹${coupon.discount.toLocaleString('en-IN')}`;
      filledState.querySelector('[data-discount-code]').textContent = `(${coupon.code})`;
    }
    if (promoApplied) {
      promoApplied.style.display = 'flex';
      promoApplied.querySelector('[data-promo-applied-code]').textContent = coupon.code;
    }
    promoHideEls.forEach((el) => (el.style.display = 'none'));
  } else {
    if (discountRow) discountRow.style.display = 'none';
    if (promoApplied) promoApplied.style.display = 'none';
    promoHideEls.forEach((el) => (el.style.display = ''));
  }

  // ---- Shipping estimate display ----
  const pincodeResult = filledState.querySelector('[data-pincode-result]');
  const pincodeInput = filledState.querySelector('[data-pincode-input]');
  if (shippingEstimate && pincodeResult) {
    pincodeResult.textContent = `Delivers in ${shippingEstimate.days} business days to ${shippingEstimate.pincode}`;
    pincodeResult.classList.add('is-visible');
    if (pincodeInput) pincodeInput.value = shippingEstimate.pincode;
  }

  // Wire up remove / quantity buttons for this render pass
  itemsList.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.remove);
      renderCartPage();
      if (window.showToast) window.showToast('Item removed from cart');
    });
  });

  itemsList.querySelectorAll('[data-qty-increase]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.qtyIncrease;
      const item = getCart().find((entry) => entry.id === id);
      if (item) updateCartQty(id, item.qty + 1);
      renderCartPage();
    });
  });

  itemsList.querySelectorAll('[data-qty-decrease]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.qtyDecrease;
      const item = getCart().find((entry) => entry.id === id);
      if (!item) return;
      if (item.qty <= 1) {
        removeFromCart(id);
      } else {
        updateCartQty(id, item.qty - 1);
      }
      renderCartPage();
    });
  });

  // ---- Coupon apply / remove ----
  const promoApplyBtn = filledState.querySelector('[data-promo-apply]');
  const promoInput = filledState.querySelector('[data-promo-input]');
  const promoError = filledState.querySelector('[data-promo-error]');

  promoApplyBtn?.addEventListener('click', () => {
    const result = applyCoupon(promoInput.value, subtotal);
    if (promoError) promoError.textContent = result.ok ? '' : result.message;
    if (result.ok) {
      if (window.showToast) window.showToast(result.message);
      renderCartPage();
    }
  });

  filledState.querySelector('[data-promo-remove]')?.addEventListener('click', () => {
    clearAppliedCoupon();
    renderCartPage();
  });

  // ---- Pincode / shipping estimate ----
  filledState.querySelector('[data-pincode-check]')?.addEventListener('click', () => {
    const value = filledState.querySelector('[data-pincode-input]')?.value.trim();
    const resultEl = filledState.querySelector('[data-pincode-result]');
    if (!/^\d{6}$/.test(value)) {
      if (resultEl) {
        resultEl.textContent = 'Please enter a valid 6-digit pincode.';
        resultEl.classList.add('is-visible', 'is-error');
      }
      return;
    }
    resultEl?.classList.remove('is-error');
    const estimate = estimateShipping(value);
    saveShippingEstimate(value, estimate);
    renderCartPage();
  });
}