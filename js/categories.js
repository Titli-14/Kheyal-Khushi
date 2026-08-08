/* ============================================================
   CATEGORIES.JS
   Customer-facing category loader. Powers both index.html (the
   homepage's "Browse by craft" grid) and category.html (the
   full "Shop by Category" collection grid).

   Mirrors the same live-Firestore contract products.js already
   uses: an onSnapshot subscription, ready/error getters exposed
   on window, and 'kk:*-updated' / 'kk:*-error' events so any
   other script can react without importing this module.

   Firestore shape — collection "categories":
     {
       name:        string   e.g. "Resin Clocks"
       slug:        string   e.g. "resin-clocks" (used in ?c=slug links)
       description: string
       image:       string (Storage download URL)
       status:      "active" | "hidden"
       archived:    boolean
       createdAt:   Firestore Timestamp
     }

   Only categories with status "active" and archived !== true are
   shown to shoppers. Hidden/archived categories still exist in
   Firestore (managed from the admin panel) but never render here.
   ============================================================ */

import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let allCategories = [];
let visibleCategories = [];
let isReady = false;
let loadError = null;

/* ------------------------------------------------------------
   LIVE SUBSCRIPTION
   ------------------------------------------------------------ */
function subscribeToCategories() {
  const categoriesQuery = query(
    collection(db, "categories"),
    orderBy("name", "asc")
  );

  onSnapshot(
    categoriesQuery,
    (snapshot) => {
      allCategories = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      visibleCategories = allCategories.filter(
        (cat) => !cat.archived && (cat.status || "active") === "active"
      );

      isReady = true;
      loadError = null;

      window.dispatchEvent(new CustomEvent("kk:categories-updated"));
      renderAll();
    },
    (error) => {
      console.error("[categories.js] Failed to load categories:", error);
      isReady = true;
      loadError = error;

      window.dispatchEvent(new CustomEvent("kk:categories-error"));
      renderAll();
    }
  );
}

/* ------------------------------------------------------------
   PUBLIC API (for other scripts, same pattern as products.js)
   ------------------------------------------------------------ */
window.getAllCategories = () => visibleCategories;
window.isCategoriesReady = () => isReady;
window.getCategoriesError = () => loadError;

/* ------------------------------------------------------------
   RENDERING
   Both containers are optional — a page only renders the one
   it actually has in its markup.
   ------------------------------------------------------------ */
function renderAll() {
  renderHomeGrid();
  renderCollectionGrid();
}

function statusMessageHTML(kind, label) {
  if (kind === "error") {
    return `<p class="categories-status categories-status--error">Couldn't load ${label} right now. Please refresh the page.</p>`;
  }
  return `<p class="categories-status categories-status--loading">Loading ${label}...</p>`;
}

/* ---- Homepage grid: [data-home-categories] ---- */
function renderHomeGrid() {
  const grid = document.querySelector("[data-home-categories]");
  if (!grid) return;

  if (!isReady) {
    grid.innerHTML = statusMessageHTML("loading", "categories");
    return;
  }

  if (loadError) {
    grid.innerHTML = statusMessageHTML("error", "categories");
    return;
  }

  if (visibleCategories.length === 0) {
    grid.innerHTML = `<p class="categories-status">No categories yet — check back soon.</p>`;
    return;
  }

  // Homepage only teases a handful; "View all categories" links to category.html for the rest.
  const homeLimit = Number(grid.dataset.homeCategories) || 6;

  grid.innerHTML = visibleCategories
    .slice(0, homeLimit)
    .map(renderHomeCard)
    .join("");
}

function renderHomeCard(category) {
  const image = category.image || "https://picsum.photos/seed/kk-cat-placeholder/450/600";
  return `
    <a href="category.html?c=${encodeURIComponent(category.slug || category.id)}" class="category-card">
      <img class="ph-warm" src="${escapeHTML(image)}" alt="${escapeHTML(category.name || "Category")}" loading="lazy">
      <span>${escapeHTML(category.name || "Untitled")}</span>
    </a>
  `;
}

/* ---- Category page grid: [data-category-collections] ---- */
function renderCollectionGrid() {
  const grid = document.querySelector("[data-category-collections]");
  if (!grid) return;

  if (!isReady) {
    grid.innerHTML = statusMessageHTML("loading", "collections");
    return;
  }

  if (loadError) {
    grid.innerHTML = statusMessageHTML("error", "collections");
    return;
  }

  if (visibleCategories.length === 0) {
    grid.innerHTML = `<p class="categories-status">No collections yet — check back soon.</p>`;
    return;
  }

  grid.innerHTML = visibleCategories.map(renderCollectionCard).join("");
}

function renderCollectionCard(category, index) {
  const image = category.image || "https://picsum.photos/seed/kk-cat-placeholder/900/700";
  const number = String(index + 1).padStart(2, "0");
  const description = category.description || "Handmade with care, one piece at a time.";

  return `
    <a class="collection-card" href="shop.html?c=${encodeURIComponent(category.slug || category.id)}">
      <div class="collection-card-media">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(category.name || "Category")}" loading="lazy">
      </div>
      <div class="collection-card-overlay"></div>
      <div class="collection-card-content">
        <span class="collection-number">${number}</span>
        <h3>${escapeHTML(category.name || "Untitled")}</h3>
        <p>${escapeHTML(description)}</p>
        <span class="collection-link">Explore collection <span aria-hidden="true">&rarr;</span></span>
      </div>
    </a>
  `;
}

/* ------------------------------------------------------------
   HELPERS
   ------------------------------------------------------------ */
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

/* ------------------------------------------------------------
   INIT
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  renderAll(); // show loading state immediately
  subscribeToCategories();
});