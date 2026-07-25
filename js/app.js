/* ============================================================
   APP.JS
   Site-wide interactivity shared by every page: mobile nav,
   sticky header shadow, search overlay, back-to-top button,
   scroll-reveal animations, and toast notifications.

   Page-specific behavior (product filtering, cart logic, etc.)
   will live in its own file (products.js, cart.js...) and is
   loaded ONLY on the pages that need it.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initStickyHeader();
  initSearchOverlay();
  initBackToTop();
  initScrollReveal();
  initFooterYear();
  initTestimonialSlider();
  initNewsletterForm();
});

/* ---------- Mobile navigation ---------- */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close the mobile menu when a link is tapped
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---------- Sticky header shadow on scroll ---------- */
function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const updateHeaderState = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  };

  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
}

/* ---------- Search overlay ---------- */
function initSearchOverlay() {
  const openBtn = document.querySelector('[data-search-open]');
  const overlay = document.querySelector('.search-overlay');
  const closeBtn = document.querySelector('[data-search-close]');
  const input = document.querySelector('.search-box input');
  if (!openBtn || !overlay) return;

  const open = () => {
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input && input.focus(), 250);
  };

  const close = () => {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  openBtn.addEventListener('click', open);
  closeBtn && closeBtn.addEventListener('click', close);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  const form = document.querySelector('.search-box');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (query) {
        window.location.href = `search-results.html?search=${encodeURIComponent(query)}`;
      }
    });
  }
}

/* ---------- Back to top button ---------- */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('is-visible', window.scrollY > 500);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- Scroll reveal ----------
   Any element with a [data-reveal] attribute fades and rises
   into place the first time it enters the viewport. */
function initScrollReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Stagger children slightly using the optional delay attribute
        const delay = entry.target.dataset.revealDelay || 0;
        setTimeout(() => entry.target.classList.add('is-visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach((item) => observer.observe(item));
}

/* ---------- Footer year ---------- */
function initFooterYear() {
  const yearEl = document.querySelector('[data-current-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ---------- Toast notification ----------
   Shared helper other scripts (wishlist, newsletter) call to
   show a small confirmation message at the bottom of the screen. */
function showToast(message) {
  let toast = document.querySelector('.toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span></span>
    `;
    document.body.appendChild(toast);
  }

  toast.querySelector('span').textContent = message;
  toast.classList.add('is-visible');

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2600);
}

// Make showToast available to other page scripts (home.js, wishlist.js...)
window.showToast = showToast;

/* ---------- Testimonial slider (homepage) ----------
   A tiny, dependency-free slider. Does nothing if the markup
   for it isn't on the page, so it's safe to load everywhere. */
function initTestimonialSlider() {
  const track = document.querySelector('.testimonial-track');
  const dotsWrap = document.querySelector('.testimonial-dots');
  if (!track || !dotsWrap) return;

  const slides = track.querySelectorAll('.testimonial-slide');
  const dots = dotsWrap.querySelectorAll('button');
  let current = 0;
  let autoTimer;

  const goTo = (index) => {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
  };

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goTo(i);
      resetAutoplay();
    });
  });

  function resetAutoplay() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), 6000);
  }

  goTo(0);
  resetAutoplay();
}

/* ---------- Newsletter form (homepage + footer) ----------
   PHASE NOTE: This currently just confirms the sign-up visually.
   Once the backend/Firestore is connected, swap the fake delay
   below for a real Firestore write (e.g. to a "subscribers"
   collection) or your email marketing provider's API. */
function initNewsletterForm() {
  const form = document.querySelector('.newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const email = input ? input.value.trim() : '';

    if (!email) return;

    if (window.showToast) window.showToast("You're on the list! Welcome to Kheyal Khusi.");
    form.reset();
  });
}

