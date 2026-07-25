/* ============================================================
   CHECKOUT.JS
   Powers checkout.html: renders the order summary from the same
   cart data cart.js uses, validates the shipping address form,
   and hands off to either Razorpay or Cash on Delivery.

   ------------------------------------------------------------
   RAZORPAY SETUP — READ BEFORE GOING LIVE:

   1. Paste your real Key ID below (RAZORPAY_KEY_ID). This is the
      *public* key — safe to expose in client-side code. Never put
      your Key Secret anywhere in this file or any other file the
      browser can read.

   2. Client-side JS alone CANNOT safely complete a payment. Two
      things must happen on a server you control (a small Node/
      Cloud Function endpoint, not part of this static site):
        a) BEFORE checkout: your server calls Razorpay's Orders
           API with your Key Secret to create an order, and
           returns the order_id to this page.
        b) AFTER payment: your server re-verifies the payment
           signature Razorpay sends back, using your Key Secret,
           before you mark the order as paid in your database.
      Skipping (a) and (b) means anyone could fake a "successful"
      payment in the browser console. The two placeholder
      functions below — createRazorpayOrderOnServer() and
      verifyPaymentOnServer() — mark exactly where those calls go.

   3. Add the Razorpay checkout script to checkout.html (already
      included): <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ------------------------------------------------------------ */

const RAZORPAY_KEY_ID = 'YOUR_RAZORPAY_KEY_ID';
const ORDERS_STORAGE_KEY = 'kheyalkhusi_orders';
const ADDRESS_STORAGE_KEY = 'kheyalkhusi_checkout_address';

document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('[data-checkout-page]');
  if (!page) return;

  const totals = computeCartTotals();

  // An empty cart has nothing to check out — send them back.
  if (totals.items.length === 0) {
    window.location.href = 'cart.html';
    return;
  }

  renderOrderSummary(page, totals);
  prefillSavedAddress(page);
  initPaymentMethodToggle(page);
  initPlaceOrder(page, totals);
});

/* ---------- Order summary sidebar ---------- */
function renderOrderSummary(page, totals) {
  const list = page.querySelector('[data-checkout-items]');
  if (list) {
    list.innerHTML = totals.items.map(({ product, qty, lineTotal }) => `
      <div class="order-summary-mini-item">
        <img class="ph-warm" src="${product.image}" alt="${product.name}">
        <div class="info">
          <h5>${product.name}</h5>
          <span>Qty ${qty}</span>
        </div>
        <div class="price">₹${lineTotal.toLocaleString('en-IN')}</div>
      </div>
    `).join('');
  }

  const couponNote = page.querySelector('[data-checkout-coupon-note]');
  if (couponNote) {
    couponNote.style.display = totals.couponCode ? 'flex' : 'none';
    const codeEl = couponNote.querySelector('[data-checkout-coupon-code]');
    if (codeEl) codeEl.textContent = totals.couponCode;
  }

  const setText = (selector, value) => {
    const el = page.querySelector(selector);
    if (el) el.textContent = value;
  };

  setText('[data-checkout-subtotal]', `₹${totals.subtotal.toLocaleString('en-IN')}`);
  setText('[data-checkout-shipping]', totals.shipping === 0 ? 'Free' : `₹${totals.shipping}`);
  setText('[data-checkout-total]', `₹${totals.total.toLocaleString('en-IN')}`);

  const discountRow = page.querySelector('[data-checkout-discount-row]');
  if (discountRow) {
    discountRow.style.display = totals.discount > 0 ? 'flex' : 'none';
    setText('[data-checkout-discount]', `−₹${totals.discount.toLocaleString('en-IN')}`);
  }
}

/* ---------- Address form ---------- */
function prefillSavedAddress(page) {
  const saved = JSON.parse(localStorage.getItem(ADDRESS_STORAGE_KEY) || 'null');
  if (!saved) return;
  Object.entries(saved).forEach(([key, value]) => {
    const input = page.querySelector(`[name="${key}"]`);
    if (input) input.value = value;
  });
}

function getAddressFormData(page) {
  const form = page.querySelector('[data-address-form]');
  const data = {};
  form.querySelectorAll('input, select').forEach((field) => {
    if (field.name) data[field.name] = field.value.trim();
  });
  return data;
}

/** Validates the address form. Returns true if valid; shows inline errors if not. */
function validateAddressForm(page) {
  const form = page.querySelector('[data-address-form]');
  let isValid = true;

  const rules = {
    fullName: (v) => v.length >= 2 || 'Please enter your full name.',
    phone: (v) => /^[6-9]\d{9}$/.test(v) || 'Please enter a valid 10-digit phone number.',
    addressLine1: (v) => v.length >= 5 || 'Please enter your address.',
    city: (v) => v.length >= 2 || 'Please enter your city.',
    state: (v) => v.length >= 2 || 'Please select your state.',
    pincode: (v) => /^\d{6}$/.test(v) || 'Please enter a valid 6-digit pincode.',
  };

  Object.entries(rules).forEach(([name, validate]) => {
    const field = form.querySelector(`[data-field="${name}"]`);
    const input = field?.querySelector('input, select');
    if (!field || !input) return;

    const result = validate(input.value.trim());
    const message = result === true ? '' : result;
    field.classList.toggle('has-error', !!message);
    const errorSpan = field.querySelector('.form-field-error span');
    if (errorSpan) errorSpan.textContent = message;
    if (message) isValid = false;
  });

  if (!isValid) {
    form.querySelector('.form-field.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return isValid;
}

/* ---------- Payment method selection ---------- */
function initPaymentMethodToggle(page) {
  const options = page.querySelectorAll('.payment-method-option');
  options.forEach((option) => {
    option.addEventListener('click', () => {
      options.forEach((o) => o.classList.remove('is-selected'));
      option.classList.add('is-selected');
      option.querySelector('input[type="radio"]').checked = true;
    });
  });
}

function getSelectedPaymentMethod(page) {
  return page.querySelector('input[name="payment-method"]:checked')?.value || 'razorpay';
}

/* ---------- Order creation ----------
   Orders are written to Firestore's "orders" collection, keyed by
   order id, with a userId field so profile.js can query them back
   ( where("userId", "==", uid) ). If someone somehow reaches
   checkout signed out, the order still saves to localStorage as a
   fallback so nothing breaks — but checkout.html should really be
   gated behind requireAuth() from auth.js. */
async function saveOrder(address, totals, paymentMethod, paymentId) {
  const orderId = `KK${Math.floor(10000 + Math.random() * 89999)}`;
  const { auth, db, doc, setDoc, serverTimestamp, isFirebaseConfigured } = window.kkFirebase;
  const uid = auth?.currentUser?.uid || null;

  const order = {
    id: orderId,
    userId: uid,
    date: new Date().toISOString(),
    status: paymentMethod === 'cod' ? 'processing' : 'processing',
    paymentMethod,
    paymentId: paymentId || null,
    address,
    items: totals.items.map(({ product, qty }) => ({
      id: product.id,
      qty,
      // Snapshot at purchase time — keeps order history renderable even
      // if this product is later changed or removed from the catalog.
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
    })),
    subtotal: totals.subtotal,
    discount: totals.discount,
    shipping: totals.shipping,
    total: totals.total,
  };

  if (isFirebaseConfigured && uid) {
    console.log('[Firestore] Creating order:', orderId);
    await setDoc(doc(db, 'orders', orderId), { ...order, createdAt: serverTimestamp() });
    console.log('[Firestore] Order created:', orderId);
  } else {
    // Guest fallback — keeps the demo flow working even without a signed-in user.
    const orders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
    orders.unshift(order);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }

  localStorage.setItem('kheyalkhusi_last_order_id', orderId);
  return order;
}

async function completeOrder(page, address, totals, paymentMethod, paymentId) {
  localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(address));
  await saveOrder(address, totals, paymentMethod, paymentId);
  clearCart();
  window.location.href = 'thank-you.html';
}

/* ---------- Place Order button ---------- */
function initPlaceOrder(page, totals) {
  const placeOrderBtn = page.querySelector('[data-place-order]');
  if (!placeOrderBtn) return;

  placeOrderBtn.addEventListener('click', async () => {
    if (!validateAddressForm(page)) return;

    const address = getAddressFormData(page);
    const method = getSelectedPaymentMethod(page);

    placeOrderBtn.disabled = true;
    const originalText = placeOrderBtn.textContent;

    if (method === 'cod') {
      placeOrderBtn.textContent = 'Placing your order...';
      try {
        await completeOrder(page, address, totals, 'cod', null);
      } catch (err) {
        console.error('[Firestore] Operation failed', { code: err.code, message: err.message, error: err });
        if (window.showToast) window.showToast(`Could not place your order (${err.code || err.message || 'unknown error'}). Please try again.`);
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = originalText;
      }
      return;
    }

    // ---- Razorpay flow ----
    placeOrderBtn.textContent = 'Opening secure payment...';

    try {
      const order = await createRazorpayOrderOnServer(totals.total);

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(totals.total * 100), // paise
        currency: 'INR',
        name: 'Kheyal Khusi',
        description: 'Handmade order payment',
        order_id: order?.id || undefined, // undefined only in local dev without a backend
        prefill: {
          name: address.fullName,
          contact: address.phone,
        },
        theme: { color: '#C86B4A' },
        handler: async function (response) {
          const verified = await verifyPaymentOnServer(response);
          if (!verified) {
            if (window.showToast) window.showToast('Payment could not be verified. Please contact support.');
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = originalText;
            return;
          }
          try {
            await completeOrder(page, address, totals, 'razorpay', response.razorpay_payment_id);
          } catch (err) {
            console.error('[Firestore] Operation failed', { code: err.code, message: err.message, error: err });
            // Payment already succeeded here — don't lose that context.
            // Keep the payment id visible so support can reconcile it manually.
            if (window.showToast) window.showToast(`Payment succeeded but we couldn't save your order (${err.code || err.message || 'unknown error'}). Please contact support with payment ID ${response.razorpay_payment_id}.`);
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = originalText;
          }
        },
        modal: {
          ondismiss: function () {
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = originalText;
          },
        },
      };

      if (typeof Razorpay === 'undefined') {
        throw new Error('Razorpay checkout script not loaded');
      }

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Payment could not be started. Please try again.');
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = originalText;
    }
  });
}

/* ---------- Server integration points (placeholders) ----------
   Replace the bodies of these two functions with real fetch()
   calls to your backend once it exists. Until then, checkout
   still works end-to-end in a dev/demo sense — but see the note
   at the top of this file about why that's not secure for real
   payments. */
async function createRazorpayOrderOnServer(amount) {
  // Example of what this should become:
  //
  // const res = await fetch('https://your-backend.example.com/create-order', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ amount }),
  // });
  // return res.json(); // { id: 'order_xxx', ... }

  console.warn(
    '[Kheyal Khusi] No backend configured to create a real Razorpay order — ' +
    'proceeding without order_id. This is fine for exploring the UI, but ' +
    'set up createRazorpayOrderOnServer() before accepting real payments.'
  );
  return null;
}

async function verifyPaymentOnServer(razorpayResponse) {
  // Example of what this should become:
  //
  // const res = await fetch('https://your-backend.example.com/verify-payment', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(razorpayResponse),
  // });
  // const { verified } = await res.json();
  // return verified;

  console.warn(
    '[Kheyal Khusi] No backend configured to verify this payment — ' +
    'treating it as verified for demo purposes only.'
  );
  return true;
}
