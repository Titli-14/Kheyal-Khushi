/* ============================================================
   PRODUCTS.JS
   The shared, live product catalog PLUS every helper the Shop,
   Category, Product Details, Wishlist, Cart, and Search pages
   use to filter, sort, paginate, and render products.

   Products now come from the same Firestore "products" collection
   the admin panel writes to — there is no more static demo data.
   Every helper below keeps its original name and signature, so
   shop.js / cart.js / wishlist.js / product-detail markup did not
   need to change.

   NOTE ON THE FIRESTORE IMPORT BELOW: this file was converted to
   an ES module (needed for the Firestore modular SDK), and it
   pulls `db` from ./firebase.js. Since firebase.js wasn't part of
   the files reviewed for this refactor, double check two things:
     1) firebase.js actually exports `db` (the initialized
        Firestore instance) — e.g. `export const db = getFirestore(app);`
     2) the firebase-firestore.js CDN version below matches whatever
        version firebase.js initializes the app with.
   ============================================================ */

import { db } from './firebase.js';
import {
  collection,
  query,
  orderBy,
  getDocs,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

/* ---------- Live product store ----------
   KK_PRODUCTS starts empty and is populated (and kept in sync)
   by the onSnapshot listener set up in initializeProducts(). */
let KK_PRODUCTS = [];
let productsReady = false;   // true once the first snapshot (or an error) has arrived
let productsError = null;    // holds the Firestore error, if any
let unsubscribeProducts = null;

function notify(eventName, detail) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * Subscribes to the "products" collection in Firestore, ordered by
 * createdAt descending — the same collection the admin panel writes
 * to. Uses onSnapshot() (not a one-time getDocs()) so every customer
 * page reflects admin edits/adds/removals live, without a refresh.
 */
async function initializeProducts() {
  try {
    const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));

    unsubscribeProducts = onSnapshot(
      productsQuery,
      (snapshot) => {
        // If Firestore has no products, this resolves to an empty
        // array — existing empty-state UI on every page already
        // knows how to handle a zero-length result.
        KK_PRODUCTS = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        productsReady = true;
        productsError = null;
        notify('kk:products-updated', { products: KK_PRODUCTS });
      },
      (error) => {
        console.error('[products.js] Firestore onSnapshot error:', error);
        productsReady = true; // stop showing "loading" — surface the error state instead
        productsError = error;
        notify('kk:products-error', { error });
      }
    );
  } catch (error) {
    console.error('[products.js] Failed to initialize products:', error);
    productsReady = true;
    productsError = error;
    notify('kk:products-error', { error });
  }
}

/**
 * Optional one-off fetch (not used by the live pages below, but
 * available for anything — e.g. a build script — that just wants a
 * single snapshot instead of a live subscription).
 */
async function fetchProductsOnce() {
  const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(productsQuery);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

initializeProducts();

/** Returns the full live catalog. */
function getAllProducts() {
  return KK_PRODUCTS;
}

/** Looks up a single product by id. */
function getProductById(id) {
  return KK_PRODUCTS.find((product) => product.id === id) || null;
}

/** Matches name or category, case-insensitive. */
function searchProducts(searchQuery) {
  const q = (searchQuery || '').trim().toLowerCase();
  if (!q) return [];
  return KK_PRODUCTS.filter((product) =>
    (product.name || '').toLowerCase().includes(q) ||
    (product.category || '').toLowerCase().includes(q)
  );
}

/**
 * Filters + sorts the catalog for the Shop and Category pages.
 * options: { categorySlugs: string[], priceRanges: string[], onSaleOnly: bool, sort: string }
 */
function filterAndSortProducts(options = {}) {
  let list = [...KK_PRODUCTS];
  const { categorySlugs, priceRanges, onSaleOnly, sort } = options;

  if (categorySlugs && categorySlugs.length) {
    list = list.filter((p) => categorySlugs.includes(p.categorySlug));
  }

  if (priceRanges && priceRanges.length) {
    list = list.filter((p) => priceRanges.some((range) => {
      if (range === 'under-500') return p.price < 500;
      if (range === '500-1500') return p.price >= 500 && p.price <= 1500;
      if (range === '1500-3000') return p.price > 1500 && p.price <= 3000;
      if (range === 'above-3000') return p.price > 3000;
      return true;
    }));
  }

  if (onSaleOnly) {
    list = list.filter((p) => p.originalPrice);
  }

  switch (sort) {
    case 'price-low':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      list.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    default:
      // "Featured" — keep Firestore order (createdAt desc)
      break;
  }

  return list;
}

/** Slices a list into one page. page is 1-indexed. */
function paginate(list, page, perPage) {
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: list.slice(start, start + perPage),
    page: safePage,
    totalPages,
    totalItems: list.length,
  };
}

/** Up to `limit` other products from the same category. */
function getRelatedProducts(product, limit = 4) {
  return KK_PRODUCTS
    .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id)
    .slice(0, limit);
}

/* ---------- Recently viewed (localStorage) ----------
   Stays in localStorage even with Firestore connected — this is a
   per-browser convenience feature, not account data that needs to
   follow the user across devices. */
const RECENTLY_VIEWED_KEY = 'kheyalkhusi_recently_viewed';
const RECENTLY_VIEWED_MAX = 8;

function trackRecentlyViewed(productId) {
  let ids = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
  ids = ids.filter((id) => id !== productId);
  ids.unshift(productId);
  ids = ids.slice(0, RECENTLY_VIEWED_MAX);
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids));
}

function getRecentlyViewed(excludeId = null, limit = 4) {
  const ids = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
  return ids
    .filter((id) => id !== excludeId)
    .map(getProductById)
    .filter(Boolean)
    .slice(0, limit);
}

/** Builds the star-rating SVG markup used across every product card. */
function renderStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    const dim = i <= rating ? '' : ' opacity="0.3"';
    stars += `<svg viewBox="0 0 24 24" fill="currentColor"${dim}><path d="M12 2l3.1 6.3 7 1-5 4.9 1.2 6.9L12 17.8 5.7 21l1.2-6.9-5-4.9 7-1L12 2Z"/></svg>`;
  }
  return stars;
}

/** Builds one product-card's full HTML, identical in structure to the homepage cards. */
function renderProductCard(product) {
  const tagHtml = product.tag
    ? `<span class="product-tag${product.tag === 'Sale' ? ' sale' : ''}">${product.tag}</span>`
    : '';
  const originalHtml = product.originalPrice
    ? `<span class="original">₹${product.originalPrice.toLocaleString('en-IN')}</span>`
    : '';
  // isInWishlist comes from wishlist.js, loaded alongside this file
  const saved = typeof isInWishlist === 'function' && isInWishlist(product.id);

  return `
    <div class="product-card">
      <div class="product-media">
        ${tagHtml}
        <button class="wishlist-btn${saved ? ' is-active' : ''}" data-product-id="${product.id}" aria-label="${saved ? 'Remove from' : 'Add to'} wishlist">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" stroke-linejoin="round"/></svg>
        </button>
        <a href="product.html?id=${product.id}">
          <img class="ph-warm" src="${product.image}" alt="${product.name}" loading="lazy">
        </a>
        <button class="product-quickadd" data-product-id="${product.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Quick Add
        </button>
      </div>
      <div class="product-info">
        <p class="product-category">${product.category}</p>
        <a href="product.html?id=${product.id}"><h3 class="product-name">${product.name}</h3></a>
        <div class="product-rating">
          ${renderStars(product.rating)}
          <span>(${product.reviews})</span>
        </div>
        <div class="product-price">
          <span class="current">₹${product.price.toLocaleString('en-IN')}</span>
          ${originalHtml}
        </div>
      </div>
    </div>
  `;
}

/** Small loading/error placeholder used by the search + shop grids
 *  while the first Firestore snapshot is still in flight, or if it
 *  failed. Kept as plain markup so no CSS file needs to change. */
function renderProductsStatusMessage(kind) {
  if (kind === 'error') {
    return '<p class="products-status products-status-error" style="grid-column:1/-1;text-align:center;padding:2rem 0;">We couldn\'t load products right now. Please refresh the page.</p>';
  }
  return '<p class="products-status products-status-loading" style="grid-column:1/-1;text-align:center;padding:2rem 0;">Loading products…</p>';
}

/* ---------- Expose everything the classic (non-module) page
   scripts — shop.js, cart.js, wishlist.js — call as globals.
   Module scripts don't leak declarations onto window automatically,
   so this is the bridge that keeps every other page unchanged. ---------- */
window.getAllProducts = getAllProducts;
window.getProductById = getProductById;
window.searchProducts = searchProducts;
window.filterAndSortProducts = filterAndSortProducts;
window.paginate = paginate;
window.getRelatedProducts = getRelatedProducts;
window.renderProductCard = renderProductCard;
window.renderStars = renderStars;
window.trackRecentlyViewed = trackRecentlyViewed;
window.getRecentlyViewed = getRecentlyViewed;
window.renderProductsStatusMessage = renderProductsStatusMessage;
window.isProductsReady = () => productsReady;
window.getProductsError = () => productsError;
window.fetchProductsOnce = fetchProductsOnce;

/* ============================================================
   HOMEPAGE — FEATURED PRODUCTS (index.html)
   Renders up to 8 products from the live Firestore catalog into
   the [data-home-featured-products] grid. Re-renders whenever
   products.js pushes a fresh snapshot or an error. No-op on any
   page that doesn't have that container.
   ============================================================ */
const HOME_FEATURED_LIMIT = 8;

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('[data-home-featured-products]');
  if (!grid) return;

  function renderFeatured() {
    if (!productsReady) {
      grid.innerHTML = renderProductsStatusMessage('loading');
      return;
    }

    if (productsError) {
      grid.innerHTML = renderProductsStatusMessage('error');
      return;
    }

    const featured = getAllProducts().slice(0, HOME_FEATURED_LIMIT);

    if (!featured.length) {
      // No products yet in Firestore — hide the section's grid area
      // rather than show a broken empty box.
      grid.innerHTML = '';
      return;
    }

    grid.innerHTML = featured.map(renderProductCard).join('');
  }

  renderFeatured();
  window.addEventListener('kk:products-updated', renderFeatured);
  window.addEventListener('kk:products-error', renderFeatured);
});

/* ---------- Search results page ----------
   Reads ?search=<query> from the URL, filters the live catalog,
   and renders results.html — including the "no results" and
   loading/error states. Re-renders automatically whenever Firestore
   pushes an update. Runs itself on DOMContentLoaded so no
   page-specific script tag is needed beyond this file. */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('[data-search-page]');
  if (!page) return;

  const params = new URLSearchParams(window.location.search);
  const searchQuery = params.get('search') || '';

  const queryLabel = page.querySelector('[data-search-query]');
  if (queryLabel) queryLabel.textContent = searchQuery;

  const grid = page.querySelector('[data-search-results]');
  const countEl = page.querySelector('[data-search-count]');
  const emptyState = page.querySelector('[data-search-empty]');

  function renderSearchResults() {
    if (!productsReady) {
      if (countEl) countEl.textContent = '0';
      if (emptyState) emptyState.style.display = 'none';
      if (grid) {
        grid.style.display = 'grid';
        grid.innerHTML = renderProductsStatusMessage('loading');
      }
      return;
    }

    if (productsError) {
      if (countEl) countEl.textContent = '0';
      if (emptyState) emptyState.style.display = 'none';
      if (grid) {
        grid.style.display = 'grid';
        grid.innerHTML = renderProductsStatusMessage('error');
      }
      return;
    }

    const results = searchProducts(searchQuery);
    if (countEl) countEl.textContent = results.length;

    if (results.length === 0) {
      if (grid) grid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (grid) {
      grid.style.display = 'grid';
      grid.innerHTML = results.map(renderProductCard).join('');
    }
  }

  renderSearchResults();
  window.addEventListener('kk:products-updated', renderSearchResults);
  window.addEventListener('kk:products-error', renderSearchResults);
});

/* ============================================================
   PRODUCT DETAILS PAGE (product.html)
   Reads ?id=<productId> from the URL and renders everything:
   gallery + zoom + lightbox, info panel, tabs, related products,
   and the recently-viewed strip. Waits for the first Firestore
   snapshot before deciding whether the product exists, so shoppers
   aren't bounced to the 404 page while data is still loading.
   No-op on every other page.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('[data-product-detail-page]');
  if (!page) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  function initDetailPage() {
    if (!productsReady) return; // still loading — wait for the next event

    window.removeEventListener('kk:products-updated', initDetailPage);
    window.removeEventListener('kk:products-error', initDetailPage);

    if (productsError) {
      console.error('[product.html] Failed to load products:', productsError);
      window.location.href = '404.html';
      return;
    }

    const product = getProductById(productId);

    // If the id is missing or doesn't match a real product, send
    // shoppers to the friendly 404 page instead of a broken layout.
    if (!product) {
      window.location.href = '404.html';
      return;
    }

    document.title = `${product.name} — Kheyal Khusi`;
    trackRecentlyViewed(product.id);

    renderGallery(page, product);
    renderInfoPanel(page, product);
    renderTabs(page, product);
    renderRelated(page, product);
    renderRecentlyViewedStrip(page, product);
  }

  initDetailPage();
  window.addEventListener('kk:products-updated', initDetailPage);
  window.addEventListener('kk:products-error', initDetailPage);
});

function renderGallery(page, product) {
  const mainWrap = page.querySelector('[data-gallery-main]');
  const mainImg = page.querySelector('[data-gallery-main-img]');
  const thumbsWrap = page.querySelector('[data-gallery-thumbs]');
  if (!mainWrap || !mainImg || !thumbsWrap) return;

  const images = product.images && product.images.length ? product.images : [product.image];

  mainImg.src = images[0];
  mainImg.alt = product.name;

  thumbsWrap.innerHTML = images.map((src, i) => `
    <button class="gallery-thumb${i === 0 ? ' is-active' : ''}" data-thumb-src="${src}" aria-label="View image ${i + 1}">
      <img class="ph-warm" src="${src}" alt="${product.name} — view ${i + 1}">
    </button>
  `).join('');

  thumbsWrap.querySelectorAll('[data-thumb-src]').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      mainImg.src = thumb.dataset.thumbSrc;
      thumbsWrap.querySelectorAll('.gallery-thumb').forEach((t) => t.classList.remove('is-active'));
      thumb.classList.add('is-active');
    });
  });

  // ---- Hover-zoom (desktop) ----
  mainWrap.addEventListener('mousemove', (e) => {
    if (window.matchMedia('(pointer: coarse)').matches) return; // skip on touch
    const rect = mainWrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    mainImg.style.transformOrigin = `${x}% ${y}%`;
    mainWrap.classList.add('is-zooming');
  });

  mainWrap.addEventListener('mouseleave', () => {
    mainWrap.classList.remove('is-zooming');
  });

  // ---- Click-to-open lightbox (works on desktop and touch) ----
  const lightbox = page.querySelector('[data-lightbox]');
  const lightboxImg = page.querySelector('[data-lightbox-img]');
  const lightboxClose = page.querySelector('[data-lightbox-close]');

  mainWrap.addEventListener('click', () => {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = mainImg.src;
    lightboxImg.alt = product.name;
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  });

  function closeLightbox() {
    lightbox?.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

function renderInfoPanel(page, product) {
  const setText = (selector, value) => {
    const el = page.querySelector(selector);
    if (el) el.textContent = value;
  };

  setText('[data-detail-category]', product.category);
  setText('[data-detail-breadcrumb]', product.name);
  setText('[data-detail-name]', product.name);
  setText('[data-detail-desc]', product.shortDescription || product.description);

  const ratingWrap = page.querySelector('[data-detail-rating]');
  if (ratingWrap) {
    ratingWrap.innerHTML = `${renderStars(product.rating)}<span>(${product.reviews} reviews)</span>`;
  }

  const priceWrap = page.querySelector('[data-detail-price]');
  if (priceWrap) {
    const originalHtml = product.originalPrice
      ? `<span class="original">₹${product.originalPrice.toLocaleString('en-IN')}</span>
         <span class="save-badge">Save ₹${(product.originalPrice - product.price).toLocaleString('en-IN')}</span>`
      : '';
    priceWrap.innerHTML = `<span class="current">₹${product.price.toLocaleString('en-IN')}</span>${originalHtml}`;
  }

  // Quantity stepper
  const qtyValue = page.querySelector('[data-detail-qty-value]');
  const qtyDecrease = page.querySelector('[data-detail-qty-decrease]');
  const qtyIncrease = page.querySelector('[data-detail-qty-increase]');
  let qty = 1;

  qtyDecrease?.addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    if (qtyValue) qtyValue.textContent = qty;
  });
  qtyIncrease?.addEventListener('click', () => {
    qty = qty + 1;
    if (qtyValue) qtyValue.textContent = qty;
  });

  // Add to cart (uses addToCart from cart.js)
  const addBtn = page.querySelector('[data-detail-add-to-cart]');
  addBtn?.addEventListener('click', () => {
    if (window.kkRequireAuth && !window.kkRequireAuth('Please sign up to add items to your cart')) return;
    if (typeof addToCart === 'function') addToCart(product.id, qty);
    if (window.showToast) window.showToast(`Added ${qty} to cart`);
  });

  // Wishlist heart — reuses the site-wide delegated handler in wishlist.js,
  // we just need to make sure data-product-id is set on the button.
  const wishlistBtn = page.querySelector('[data-detail-wishlist]');
  if (wishlistBtn) {
    wishlistBtn.dataset.productId = product.id;
  }
}

function renderTabs(page, product) {
  const descPanel = page.querySelector('[data-tab-panel="description"]');
  if (descPanel) descPanel.innerHTML = `<p>${product.description}</p>`;

  const specsPanel = page.querySelector('[data-tab-panel="specifications"]');
  if (specsPanel) {
    specsPanel.innerHTML = `
      <table class="spec-table">
        <tr><td>Category</td><td>${product.category}</td></tr>
        <tr><td>Made In</td><td>West Bengal, India</td></tr>
        <tr><td>Craft Process</td><td>100% handmade</td></tr>
        <tr><td>Care</td><td>Wipe clean with a soft, dry cloth</td></tr>
        <tr><td>Variation</td><td>Natural — no two pieces are identical</td></tr>
      </table>
    `;
  }

  const shippingPanel = page.querySelector('[data-tab-panel="shipping"]');
  if (shippingPanel) {
    shippingPanel.innerHTML = `
      <p>Orders are handmade to order or shipped from our Kolkata studio within 2–3 business days, then delivered in 5–7 business days across India.</p>
      <ul>
        <li>Free shipping on orders over ₹1,500</li>
        <li>7-day return window from the day your order arrives</li>
        <li>Custom or made-to-order pieces are final sale</li>
      </ul>
      <p>Read the full <a href="returns.html" class="btn-text" style="display:inline-flex;">Returns &amp; Refund Policy</a></p>
    `;
  }

  const tabButtons = page.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('is-active'));
      page.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      page.querySelector(`[data-tab-panel="${btn.dataset.tab}"]`)?.classList.add('is-active');
    });
  });
}

function renderRelated(page, product) {
  const wrap = page.querySelector('[data-related-products]');
  const section = page.querySelector('[data-related-section]');
  if (!wrap) return;

  const related = getRelatedProducts(product, 4);
  if (!related.length) {
    if (section) section.style.display = 'none';
    return;
  }
  wrap.innerHTML = related.map(renderProductCard).join('');
}

function renderRecentlyViewedStrip(page, product) {
  const wrap = page.querySelector('[data-recently-viewed]');
  const section = page.querySelector('[data-recently-viewed-section]');
  if (!wrap) return;

  const recent = getRecentlyViewed(product.id, 4);
  if (!recent.length) {
    if (section) section.style.display = 'none';
    return;
  }
  wrap.innerHTML = recent.map(renderProductCard).join('');
}