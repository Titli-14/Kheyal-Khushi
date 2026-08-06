/* ============================================================
   PRODUCTS.JS
   The shared demo product catalog PLUS every helper the Shop,
   Category, Product Details, Wishlist, Cart, and Search pages
   use to filter, sort, paginate, and render products.

   PHASE NOTE: This is static demo data (16 products). Once
   Firestore is connected (Phase 6), replace getAllProducts()
   with a real query — e.g.
   getDocs(collection(db, "products"))
   — and keep every field name below exactly as-is, so none of
   the rendering code in shop.js / cart.js / wishlist.js /
   product-detail.js needs to change.
   ============================================================ */

const KK_PRODUCTS = [
  {
  id: 'p1',
  name: 'Moon Night Lamp',
  category: 'Handmade Lights',
  categorySlug: 'handmade-lights',
  price: 1499,
  originalPrice: 1799,
  rating: 5,
  reviews: 18,
  tag: 'Best Seller',
  createdAt: '2026-07-30',
  shortDescription: 'A handcrafted moon-themed lamp that creates a warm and cozy ambience.',
  description: 'Made using premium resin, wooden base, and LED lighting. Perfect for bedrooms, study tables, and gifting.',
  image: 'assets/images/products/moon-lamp.jpg',
  images: [
    'assets/images/products/moon-lamp.jpg']
}
,
{ id: 'p2', name: 'Hand-embroidered Kantha Stole', category: 'Textile', categorySlug: 'textile', price: 980, originalPrice: 1300, rating: 4, reviews: 31, tag: 'Sale', createdAt: '2026-05-14',
    shortDescription: 'A lightweight cotton stole hand-stitched with traditional running-stitch kantha embroidery.',
    description: 'Kantha embroidery has been passed down through generations of Bengal\'s needleworkers. This stole takes an embroiderer nearly two weeks of careful, hand-guided stitching to complete. Soft, breathable cotton makes it wearable through most of the year.',
    image: 'https://picsum.photos/seed/kk-stole/700/730',
    images: ['https://picsum.photos/seed/kk-stole/700/730', 'https://picsum.photos/seed/kk-stole-2/700/730', 'https://picsum.photos/seed/kk-stole-3/700/730'] },

  { id: 'p3', name: 'Dokra Metal Craft Earrings', category: 'Jewellery', categorySlug: 'jewellery', price: 650, originalPrice: null, rating: 5, reviews: 76, tag: null, createdAt: '2026-04-02',
    shortDescription: 'Lightweight earrings cast using the 4,000-year-old lost-wax dokra technique.',
    description: 'Dokra metal casting is one of the oldest known methods of non-ferrous metal casting, still practiced by artisan families in West Bengal. Each pair starts life as a wax model, wrapped in clay, and cast in molten brass — meaning every piece is genuinely one-of-a-kind.',
    image: 'https://picsum.photos/seed/kk-earrings/700/730',
    images: ['https://picsum.photos/seed/kk-earrings/700/730', 'https://picsum.photos/seed/kk-earrings-2/700/730', 'https://picsum.photos/seed/kk-earrings-3/700/730'] },

  { id: 'p4', name: 'Hand-painted Madhubani Canvas', category: 'Wall Art', categorySlug: 'wall-art', price: 2200, originalPrice: null, rating: 5, reviews: 19, tag: 'New', createdAt: '2026-06-25',
    shortDescription: 'A canvas hand-painted in the vivid, folk-style lines of Madhubani art.',
    description: 'Madhubani painting originates from the Mithila region and is traditionally passed from mother to daughter. This piece is painted entirely by hand with natural pigments, using the bold outlines and nature motifs the style is known for. Arrives ready to frame.',
    image: 'https://picsum.photos/seed/kk-madhubani/700/730',
    images: ['https://picsum.photos/seed/kk-madhubani/700/730', 'https://picsum.photos/seed/kk-madhubani-2/700/730', 'https://picsum.photos/seed/kk-madhubani-3/700/730'] },

  { id: 'p5', name: 'Hand-woven Bamboo Basket', category: 'Home Decor', categorySlug: 'home-decor', price: 890, originalPrice: null, rating: 4, reviews: 24, tag: null, createdAt: '2026-03-11',
    shortDescription: 'A sturdy storage basket, hand-woven from sustainably sourced bamboo.',
    description: 'Woven strip by strip by basket-makers in rural Bengal, this piece is as functional as it is beautiful. Use it for storage, laundry, or simply as a decorative accent — the natural bamboo tone works with almost any interior.',
    image: 'https://picsum.photos/seed/kk-basket/700/730',
    images: ['https://picsum.photos/seed/kk-basket/700/730', 'https://picsum.photos/seed/kk-basket-2/700/730', 'https://picsum.photos/seed/kk-basket-3/700/730'] },

  { id: 'p6', name: 'Hand-painted Clay Diya Set', category: 'Gift Hampers', categorySlug: 'gifts', price: 420, originalPrice: 550, rating: 5, reviews: 102, tag: 'Sale', createdAt: '2026-02-18',
    shortDescription: 'A set of six clay diyas, hand-painted in warm festival colors.',
    description: 'Shaped from local clay and fired in small batches, then hand-painted one at a time — no two diyas in the set are identical. A lovely gift set for festivals, housewarmings, or anyone who loves a bit of warm, flickering light.',
    image: 'https://picsum.photos/seed/kk-diyas/700/730',
    images: ['https://picsum.photos/seed/kk-diyas/700/730', 'https://picsum.photos/seed/kk-diyas-2/700/730', 'https://picsum.photos/seed/kk-diyas-3/700/730'] },

  { id: 'p7', name: 'Hand-stitched Jute Tote Bag', category: 'Textile', categorySlug: 'textile', price: 550, originalPrice: null, rating: 4, reviews: 58, tag: null, createdAt: '2026-01-29',
    shortDescription: 'A durable, everyday tote hand-stitched from natural jute fiber.',
    description: 'Woven from jute — one of the most sustainable natural fibers there is — and finished with hand-stitched leather-look handles. Roomy enough for groceries, a beach day, or just carrying your everyday essentials.',
    image: 'https://picsum.photos/seed/kk-jutebag/700/730',
    images: ['https://picsum.photos/seed/kk-jutebag/700/730', 'https://picsum.photos/seed/kk-jutebag-2/700/730', 'https://picsum.photos/seed/kk-jutebag-3/700/730'] },

  { id: 'p8', name: 'Hand-carved Wooden Mirror', category: 'Home Decor', categorySlug: 'home-decor', price: 1850, originalPrice: null, rating: 5, reviews: 37, tag: null, createdAt: '2026-05-30',
    shortDescription: 'A round mirror framed in hand-carved sheesham wood.',
    description: 'Local woodcarvers hand-chisel each frame from solid sheesham wood, a dense, richly grained hardwood native to the Indian subcontinent. The carving pattern is inspired by traditional Bengali temple motifs.',
    image: 'https://picsum.photos/seed/kk-mirror/700/730',
    images: ['https://picsum.photos/seed/kk-mirror/700/730', 'https://picsum.photos/seed/kk-mirror-2/700/730', 'https://picsum.photos/seed/kk-mirror-3/700/730'] },

  { id: 'p9', name: 'Hand-thrown Terracotta Planter', category: 'Pottery', categorySlug: 'pottery', price: 780, originalPrice: null, rating: 4, reviews: 22, tag: null, createdAt: '2026-06-02',
    shortDescription: 'A breathable terracotta planter, wheel-thrown and left unglazed.',
    description: 'Terracotta\'s natural porosity helps roots breathe and prevents overwatering, making this planter as practical as it is handsome. Comes with a built-in drainage hole and a matching saucer.',
    image: 'https://picsum.photos/seed/kk-planter/700/730',
    images: ['https://picsum.photos/seed/kk-planter/700/730', 'https://picsum.photos/seed/kk-planter-2/700/730', 'https://picsum.photos/seed/kk-planter-3/700/730'] },

  { id: 'p10', name: 'Block-printed Cotton Cushion Cover', category: 'Textile', categorySlug: 'textile', price: 620, originalPrice: 780, rating: 4, reviews: 41, tag: 'Sale', createdAt: '2026-04-19',
    shortDescription: 'A cushion cover hand block-printed with a traditional Bengal motif.',
    description: 'Hand-carved wooden blocks are dipped in natural dye and pressed one at a time to build this pattern — a slow process that gives each cover slight, lovely variations. Cotton canvas backing with a hidden zip closure.',
    image: 'https://picsum.photos/seed/kk-cushion/700/730',
    images: ['https://picsum.photos/seed/kk-cushion/700/730', 'https://picsum.photos/seed/kk-cushion-2/700/730', 'https://picsum.photos/seed/kk-cushion-3/700/730'] },

  { id: 'p11', name: 'Silver Filigree Pendant', category: 'Jewellery', categorySlug: 'jewellery', price: 1250, originalPrice: null, rating: 5, reviews: 29, tag: 'New', createdAt: '2026-06-28',
    shortDescription: 'A delicate pendant hand-formed from fine silver wire filigree.',
    description: 'Filigree work involves twisting and soldering hair-thin silver wire into lace-like patterns entirely by hand. This pendant takes a skilled artisan several hours to complete and arrives on a fine silver chain.',
    image: 'https://picsum.photos/seed/kk-pendant/700/730',
    images: ['https://picsum.photos/seed/kk-pendant/700/730', 'https://picsum.photos/seed/kk-pendant-2/700/730', 'https://picsum.photos/seed/kk-pendant-3/700/730'] },

  { id: 'p12', name: 'Hand-painted Terracotta Wall Plates', category: 'Wall Art', categorySlug: 'wall-art', price: 1600, originalPrice: null, rating: 4, reviews: 15, tag: null, createdAt: '2026-03-25',
    shortDescription: 'A set of three decorative terracotta plates, hand-painted for wall display.',
    description: 'Wheel-thrown, bisque-fired, then hand-painted with folk motifs before a final glaze firing. Comes as a set of three in graduated sizes with wall-mounting hardware included.',
    image: 'https://picsum.photos/seed/kk-plates/700/730',
    images: ['https://picsum.photos/seed/kk-plates/700/730', 'https://picsum.photos/seed/kk-plates-2/700/730', 'https://picsum.photos/seed/kk-plates-3/700/730'] },

  { id: 'p13', name: 'Macramé Wall Hanging', category: 'Home Decor', categorySlug: 'home-decor', price: 1100, originalPrice: 1400, rating: 5, reviews: 33, tag: 'Sale', createdAt: '2026-05-08',
    shortDescription: 'A hand-knotted macramé wall hanging in natural cotton cord.',
    description: 'Every knot in this piece is tied by hand using undyed cotton cord, finished with a driftwood dowel. A soft, textural accent for any bare wall.',
    image: 'https://picsum.photos/seed/kk-macrame/700/730',
    images: ['https://picsum.photos/seed/kk-macrame/700/730', 'https://picsum.photos/seed/kk-macrame-2/700/730', 'https://picsum.photos/seed/kk-macrame-3/700/730'] },

  { id: 'p14', name: 'Artisan Tea & Snack Gift Hamper', category: 'Gift Hampers', categorySlug: 'gifts', price: 1350, originalPrice: null, rating: 5, reviews: 47, tag: null, createdAt: '2026-06-10',
    shortDescription: 'A curated hamper of Bengal tea, hand-rolled sweets, and a small craft item.',
    description: 'A thoughtfully packed gift box featuring single-origin Bengal tea, traditional hand-rolled sweets, and a small handmade keepsake — wrapped in reusable cotton fabric instead of plastic.',
    image: 'https://picsum.photos/seed/kk-hamper/700/730',
    images: ['https://picsum.photos/seed/kk-hamper/700/730', 'https://picsum.photos/seed/kk-hamper-2/700/730', 'https://picsum.photos/seed/kk-hamper-3/700/730'] },

  { id: 'p15', name: 'Hand-poured Botanical Candle', category: 'Gift Hampers', categorySlug: 'gifts', price: 480, originalPrice: null, rating: 4, reviews: 64, tag: 'New', createdAt: '2026-06-30',
    shortDescription: 'A soy wax candle hand-poured with real dried botanicals.',
    description: 'Poured in small batches using soy wax and cotton wicks, then finished with a scatter of dried flowers across the top. Clean-burning, and the jar is reusable once the candle is done.',
    image: 'https://picsum.photos/seed/kk-candle/700/730',
    images: ['https://picsum.photos/seed/kk-candle/700/730', 'https://picsum.photos/seed/kk-candle-2/700/730', 'https://picsum.photos/seed/kk-candle-3/700/730'] },

  { id: 'p16', name: 'Resin Coaster Set with Dried Flowers', category: 'Home Decor', categorySlug: 'home-decor', price: 690, originalPrice: null, rating: 4, reviews: 18, tag: null, createdAt: '2026-04-27',
    shortDescription: 'A set of four resin coasters, each with real pressed flowers sealed inside.',
    description: 'Real dried flowers are hand-arranged and sealed in food-safe resin, then polished to a glass-like finish. Each coaster in the set is a little different, since the flowers never fall exactly the same way twice.',
    image: 'https://picsum.photos/seed/kk-coasters/700/730',
    images: ['https://picsum.photos/seed/kk-coasters/700/730', 'https://picsum.photos/seed/kk-coasters-2/700/730', 'https://picsum.photos/seed/kk-coasters-3/700/730'] },
];

/** Returns the full demo catalog. Swap for a Firestore query later. */
function getAllProducts() {
  return KK_PRODUCTS;
}

/** Looks up a single product by id. */
function getProductById(id) {
  return KK_PRODUCTS.find((product) => product.id === id) || null;
}

/** Very small demo search: matches name or category, case-insensitive. */
function searchProducts(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return KK_PRODUCTS.filter((product) =>
    product.name.toLowerCase().includes(q) || product.category.toLowerCase().includes(q)
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
      // "Featured" — keep catalog order
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
   PHASE NOTE: fine to keep in localStorage even after Firestore
   is connected — this is a per-browser convenience feature, not
   account data that needs to follow the user across devices. */
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

/* ---------- Search results page ----------
   Reads ?search=<query> from the URL, filters the demo catalog,
   and renders results.html — including the "no results" state.
   Runs itself on DOMContentLoaded so no page-specific script tag
   is needed beyond this file. */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('[data-search-page]');
  if (!page) return;

  const params = new URLSearchParams(window.location.search);
  const query = params.get('search') || '';

  const queryLabel = page.querySelector('[data-search-query]');
  if (queryLabel) queryLabel.textContent = query;

  const results = searchProducts(query);

  const grid = page.querySelector('[data-search-results]');
  const countEl = page.querySelector('[data-search-count]');
  const emptyState = page.querySelector('[data-search-empty]');

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
});

/* ============================================================
   PRODUCT DETAILS PAGE (product.html)
   Reads ?id=<productId> from the URL and renders everything:
   gallery + zoom + lightbox, info panel, tabs, related products,
   and the recently-viewed strip. No-op on every other page.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('[data-product-detail-page]');
  if (!page) return;

  const params = new URLSearchParams(window.location.search);
  const product = getProductById(params.get('id'));

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
