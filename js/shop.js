/* ============================================================
   SHOP.JS
   Powers both shop.html and category.html — they share the exact
   same filter/sort/pagination markup, so one script renders both.
   On category.html, the URL's ?c=<slug> pre-applies a category
   filter and updates the page title automatically.

   Product data now comes from Firestore via products.js
   (getAllProducts / filterAndSortProducts / etc. are exposed on
   window there). Since that data loads — and updates — live,
   render() below re-runs whenever products.js dispatches
   'kk:products-updated' or 'kk:products-error', not just once.
   ============================================================ */

const PRODUCTS_PER_PAGE = 8;

const CATEGORY_LABELS = {
  'wall-art': 'Wall Art & Prints',
  'pottery': 'Pottery & Ceramics',
  'textile': 'Textile & Embroidery',
  'jewellery': 'Jewellery & Accessories',
  'home-decor': 'Home Decor',
  'gifts': 'Gift Hampers',
};

document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('[data-shop-page]');
  if (!page) return;

  const state = {
    categorySlugs: [],
    priceRanges: [],
    onSaleOnly: false,
    sort: 'featured',
    page: 1,
  };

  // On category.html, pre-apply the category from ?c=<slug> and
  // rewrite the page banner to match.
  const params = new URLSearchParams(window.location.search);
  const categoryFromUrl = params.get('c');
  if (categoryFromUrl && CATEGORY_LABELS[categoryFromUrl]) {
    state.categorySlugs = [categoryFromUrl];
    const titleEl = page.querySelector('[data-shop-title]');
    const descEl = page.querySelector('[data-shop-desc]');
    if (titleEl) titleEl.textContent = CATEGORY_LABELS[categoryFromUrl];
    if (descEl) descEl.textContent = `Handmade ${CATEGORY_LABELS[categoryFromUrl].toLowerCase()}, one piece at a time.`;
    const checkbox = page.querySelector(`[data-filter-category="${categoryFromUrl}"]`);
    if (checkbox) checkbox.checked = true;
  }

  // ---- Wire up filter checkboxes ----
  page.querySelectorAll('[data-filter-category]').forEach((cb) => {
    cb.addEventListener('change', () => {
      state.categorySlugs = getCheckedValues(page, '[data-filter-category]');
      state.page = 1;
      render();
    });
  });

  page.querySelectorAll('[data-filter-price]').forEach((cb) => {
    cb.addEventListener('change', () => {
      state.priceRanges = getCheckedValues(page, '[data-filter-price]');
      state.page = 1;
      render();
    });
  });

  const saleToggle = page.querySelector('[data-filter-sale]');
  if (saleToggle) {
    saleToggle.addEventListener('change', () => {
      state.onSaleOnly = saleToggle.checked;
      state.page = 1;
      render();
    });
  }

  const sortSelect = page.querySelector('[data-shop-sort]');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value;
      state.page = 1;
      render();
    });
  }

  const clearBtns = page.querySelectorAll('[data-filter-clear]');
  clearBtns.forEach((clearBtn) => {
    clearBtn.addEventListener('click', () => {
      page.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
      state.categorySlugs = [];
      state.priceRanges = [];
      state.onSaleOnly = false;
      state.page = 1;
      render();
    });
  });

  // ---- Mobile filter drawer ----
  const filterCard = page.querySelector('.filter-card');
  const filterBackdrop = page.querySelector('.filter-backdrop');
  const filterOpenBtn = page.querySelector('[data-filter-open]');
  const filterCloseBtn = page.querySelector('[data-filter-close]');

  function openFilterDrawer() {
    filterCard?.classList.add('is-open');
    filterBackdrop?.classList.add('is-open');
  }
  function closeFilterDrawer() {
    filterCard?.classList.remove('is-open');
    filterBackdrop?.classList.remove('is-open');
  }

  filterOpenBtn?.addEventListener('click', openFilterDrawer);
  filterCloseBtn?.addEventListener('click', closeFilterDrawer);
  filterBackdrop?.addEventListener('click', closeFilterDrawer);

  function getCheckedValues(root, selector) {
    return Array.from(root.querySelectorAll(selector))
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);
  }

  function render() {
    const grid = page.querySelector('[data-shop-results]');
    const emptyState = page.querySelector('[data-shop-empty]');
    const countEl = page.querySelector('[data-shop-count]');

    // Products load live from Firestore (see products.js). Until the
    // first snapshot arrives — or if it errors out — show a status
    // message in the grid instead of an incorrect "no products" empty state.
    const isReady = typeof window.isProductsReady === 'function' && window.isProductsReady();
    const loadError = typeof window.getProductsError === 'function' && window.getProductsError();

    if (!isReady || loadError) {
      if (countEl) countEl.textContent = '0';
      if (emptyState) emptyState.style.display = 'none';
      if (grid) {
        grid.style.display = 'grid';
        grid.innerHTML = typeof window.renderProductsStatusMessage === 'function'
          ? window.renderProductsStatusMessage(loadError ? 'error' : 'loading')
          : '';
      }
      renderPagination(0, 0);
      return;
    }

    const filtered = filterAndSortProducts(state);
    const { items, page: currentPage, totalPages, totalItems } = paginate(filtered, state.page, PRODUCTS_PER_PAGE);

    if (countEl) countEl.textContent = totalItems;

    if (totalItems === 0) {
      if (grid) grid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      renderPagination(0, 0);
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (grid) {
      grid.style.display = 'grid';
      grid.innerHTML = items.map(renderProductCard).join('');
    }

    renderPagination(currentPage, totalPages);
  }

  function renderPagination(currentPage, totalPages) {
    const nav = page.querySelector('[data-shop-pagination]');
    if (!nav) return;

    if (totalPages <= 1) {
      nav.innerHTML = '';
      return;
    }

    let html = `
      <button class="page-btn" data-page-nav="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn${i === currentPage ? ' is-active' : ''}" data-page-nav="${i}">${i}</button>`;
    }

    html += `
      <button class="page-btn" data-page-nav="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next page">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    `;

    nav.innerHTML = html;

    nav.querySelectorAll('[data-page-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = parseInt(btn.dataset.pageNav, 10);
        if (Number.isNaN(target) || target < 1 || target > totalPages) return;
        state.page = target;
        render();
        page.querySelector('[data-shop-results]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  render();

  // Re-render whenever products.js pushes a fresh Firestore snapshot
  // (first load, or any later admin-panel add/edit/delete) or hits an error.
  window.addEventListener('kk:products-updated', render);
  window.addEventListener('kk:products-error', render);
});