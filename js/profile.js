/* ============================================================
   PROFILE.JS
   Currently powers Order History rendering (orders.html).
   Will expand to handle the full account/profile page in a
   later phase (saved addresses, account details, etc.).

   FIRESTORE: orders are read from the "orders" collection,
   filtered to the signed-in user's uid via
   query(collection(db, "orders"), where("userId", "==", uid)).
   Signed-out visitors (or if Firebase isn't configured) fall back
   to whatever's in localStorage from a guest checkout.
   ============================================================ */

function normalizeOrder(order) {
  const dateValue = order.date?.toDate ? order.date.toDate() : new Date(order.date);
  return {
    id: order.id,
    // Keep the real timestamp around for sorting; only the formatted
    // string above is for display.
    sortDate: dateValue,
    date: dateValue.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: order.status,
    // Prefer a snapshot saved on the order item itself (name/price/image
    // at purchase time) so history keeps rendering even if the product
    // catalog changes or a product is removed later; fall back to the
    // current catalog lookup for older orders that don't have a snapshot.
    items: order.items.map((entry) => ({
      product: entry.name ? { id: entry.id, name: entry.name, price: entry.price, image: entry.image, category: entry.category } : getProductById(entry.id),
      qty: entry.qty,
    })),
    total: order.total,
  };
}

/** Queries Firestore for every order belonging to this uid. */
async function getOrdersForUser(uid) {
  const { db, collection, query, where, getDocs } = window.kkFirebase;
  const q = query(collection(db, 'orders'), where('userId', '==', uid));
  const snap = await getDocs(q);
  // The document ID (the order number) lives on d.id, not inside
  // d.data() — it has to be added back in explicitly or it's lost.
  const orders = snap.docs.map((d) => normalizeOrder({ id: d.id, ...d.data() }));
  // Firestore doesn't guarantee order without an explicit orderBy —
  // sort newest-first client-side using the real order timestamp.
  return orders.sort((a, b) => b.sortDate - a.sortDate);
}

/** Fallback for signed-out visitors / guest checkouts saved to localStorage. */
function getLocalOrders() {
  const raw = JSON.parse(localStorage.getItem('kheyalkhusi_orders') || '[]');
  return raw.map(normalizeOrder);
}

async function getAllOrders() {
  const { auth, isFirebaseConfigured } = window.kkFirebase;
  const uid = auth?.currentUser?.uid;
  if (isFirebaseConfigured && uid) {
    return getOrdersForUser(uid);
  }
  return getLocalOrders();
}

const STATUS_LABELS = {
  delivered: 'Delivered',
  shipped: 'Shipped',
  processing: 'Processing',
  cancelled: 'Cancelled',
};

document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.querySelector('[data-orders-page]');
  if (!wrap) return;

  const { auth, onAuthStateChanged, isFirebaseConfigured } = window.kkFirebase;
  if (!isFirebaseConfigured) {
    renderOrdersPage();
    return;
  }
  // Wait for auth state so getAllOrders() knows which uid to query.
  onAuthStateChanged(auth, () => renderOrdersPage());
});

async function renderOrdersPage() {
  const wrap = document.querySelector('[data-orders-page]');
  if (!wrap) return;

  const emptyState = wrap.querySelector('[data-orders-empty]');
  const list = wrap.querySelector('[data-orders-list]');
  if (!emptyState || !list) return;

  const orders = await getAllOrders();

  if (orders.length === 0) {
    emptyState.style.display = 'flex';
    list.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  list.style.display = 'block';

  list.innerHTML = orders.map((order) => {
    const validItems = order.items.filter((entry) => entry.product);

    const thumbs = validItems
      .map((entry) => `<img class="ph-warm order-item-thumb" src="${entry.product.image}" alt="${entry.product.name}">`)
      .join('');

    const itemNames = validItems
      .map((entry) => (entry.qty > 1 ? `${entry.product.name} (×${entry.qty})` : entry.product.name))
      .join(', ');

    return `
      <div class="order-card">
        <div class="order-card-head">
          <div class="order-meta">
            <div>
              <span>Order Number</span>
              <strong>#${order.id}</strong>
            </div>
            <div>
              <span>Placed On</span>
              <strong>${order.date}</strong>
            </div>
          </div>
          <span class="status-badge ${order.status}">${STATUS_LABELS[order.status]}</span>
        </div>

        <div class="order-items-row">
          ${thumbs}
        </div>

        <div class="order-card-foot">
          <p class="product-category" style="max-width: 480px;">${itemNames}</p>
          <div class="order-total">
            <span>Order Total</span>
            ₹${order.total.toLocaleString('en-IN')}
          </div>
          <a href="#" class="btn-text">
            View Details
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </div>
    `;
  }).join('');
}
