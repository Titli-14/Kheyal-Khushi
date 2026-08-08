/* ==========================================================
   KHEYAL KHUSHI ADMIN PANEL
   CATEGORIES.JS

   Same shape as the admin's products.js: inline auth guard,
   a live onSnapshot table, search, an add/edit modal, and an
   archive (soft-delete) confirm modal. Categories are never
   hard-deleted — archiving keeps products already assigned to
   a category intact, exactly like archiving a product does.

   Firestore collection "categories":
     { name, slug, description, image, status, archived,
       archivedAt, createdAt }

   NOTE ON THE IMPORT PATH BELOW:
   This mirrors the relative path used in the admin's existing
   products.js. If this file lives at a different folder depth
   than products.js in your project, adjust "../../js/firebase.js"
   to match (e.g. "../js/firebase.js" if categories.js sits one
   level closer to the project root).
========================================================== */

/* ==========================================================
   1. FIREBASE IMPORTS
========================================================== */

import { auth, db, storage } from "../../js/firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    orderBy,
    onSnapshot,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

/* ==========================================================
   2. DOM ELEMENTS
========================================================== */

// Table

const categoriesTableBody =
    document.getElementById("categoriesTableBody");

const categoriesTableWrapper =
    document.getElementById("categoriesTable")?.closest(".table-wrapper");

// Search

const searchCategory =
    document.getElementById("searchCategory");

// Empty state

const emptyCategories =
    document.getElementById("emptyCategories");

const emptyAddCategory =
    document.getElementById("emptyAddCategory");

// Stats

const totalCategoriesEl =
    document.getElementById("totalCategories");

const categoryProductsEl =
    document.getElementById("categoryProducts");

const activeCategoriesEl =
    document.getElementById("activeCategories");

const archivedCategoriesEl =
    document.getElementById("archivedCategories");

// Add / Edit modal

const openCategoryModalBtn =
    document.getElementById("openCategoryModal");

const categoryModal =
    document.getElementById("categoryModal");

const modalTitle =
    document.getElementById("modalTitle");

const categoryForm =
    document.getElementById("categoryForm");

const categoryNameInput =
    document.getElementById("categoryName");

const categoryDescriptionInput =
    document.getElementById("categoryDescription");

const categoryImageInput =
    document.getElementById("categoryImage");

const categoryStatusInput =
    document.getElementById("categoryStatus");

const closeCategoryModalBtn =
    document.getElementById("closeCategoryModal");

const cancelCategoryBtn =
    document.getElementById("cancelCategory");

// Archive modal

const deleteModal =
    document.getElementById("deleteModal");

const cancelDelete =
    document.getElementById("cancelDelete");

const confirmDelete =
    document.getElementById("confirmDelete");

// Sidebar

const sidebar =
    document.getElementById("sidebar");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

// Logout

const logoutBtn =
    document.getElementById("logoutBtn");

/* ==========================================================
   3. GLOBAL STATE
========================================================== */

let currentAdmin = null;

let categories = [];

let filteredCategories = [];

// Slug -> count of non-archived products in that category.
let productCountBySlug = {};

let totalProductCount = 0;

let unsubscribeCategories = null;

let searchDebounceTimer = null;

// Set while the modal is open in edit mode; null means "adding new".
let editingCategoryId = null;

// Set while the archive modal is open.
let archiveTargetId = null;

/* ==========================================================
   4. INITIALIZATION
========================================================== */

document.addEventListener("DOMContentLoaded", initializePage);

function initializePage(){

    initializeAuthentication();

    initializeEvents();

}

window.addEventListener("beforeunload", ()=>{

    if(unsubscribeCategories) unsubscribeCategories();

});

/* ==========================================================
   5. AUTHENTICATION
========================================================== */

function initializeAuthentication(){

    onAuthStateChanged(auth, async(user)=>{

        if(!user){

            window.location.href = "../login.html";

            return;

        }

        try{

            const userSnap = await getDoc(doc(db,"users",user.uid));

            if(!userSnap.exists() || userSnap.data().role !== "admin"){

                window.location.href = "../login.html";

                return;

            }

            currentAdmin = { uid:user.uid, ...userSnap.data() };

            console.log("Admin Logged In:", user.email);

            loadProductCounts();

            loadCategories();

        }

        catch(error){

            console.error("Authentication check failed:", error);

        }

    });

}

async function logout(){

    const confirmLogout = confirm("Logout from Admin Panel?");

    if(!confirmLogout) return;

    try{

        await signOut(auth);

        window.location.href = "../login.html";

    }

    catch(error){

        console.error(error);

        alert("Unable to logout. Please try again.");

    }

}

/* ==========================================================
   6. EVENT LISTENERS
========================================================== */

function initializeEvents(){

    logoutBtn?.addEventListener("click", logout);

    sidebarToggle?.addEventListener("click", ()=>{

        sidebar.classList.toggle("open");

        sidebarOverlay.classList.toggle("show");

    });

    sidebarOverlay?.addEventListener("click", ()=>{

        sidebar.classList.remove("open");

        sidebarOverlay.classList.remove("show");

    });

    searchCategory?.addEventListener("input", ()=>{

        clearTimeout(searchDebounceTimer);

        searchDebounceTimer = setTimeout(applyFilters, 250);

    });

    // Add Category (topbar button + empty-state button both open the same modal)

    openCategoryModalBtn?.addEventListener("click", ()=> openCategoryModal());

    emptyAddCategory?.addEventListener("click", ()=> openCategoryModal());

    closeCategoryModalBtn?.addEventListener("click", closeCategoryModal);

    cancelCategoryBtn?.addEventListener("click", closeCategoryModal);

    categoryModal?.addEventListener("click", (event)=>{

        if(event.target === categoryModal) closeCategoryModal();

    });

    categoryForm?.addEventListener("submit", handleCategoryFormSubmit);

    // Table row actions (edit / archive) — delegated, same as products.js

    categoriesTableBody?.addEventListener("click", (event)=>{

        const button = event.target.closest("[data-action]");

        if(!button) return;

        const categoryId = button.dataset.id;

        const action = button.dataset.action;

        if(action === "edit") openCategoryModal(categoryId);

        if(action === "archive") openArchiveModal(categoryId);

    });

    cancelDelete?.addEventListener("click", closeArchiveModal);

    deleteModal?.addEventListener("click", (event)=>{

        if(event.target === deleteModal) closeArchiveModal();

    });

    confirmDelete?.addEventListener("click", handleArchiveConfirmed);

    document.addEventListener("keydown", (event)=>{

        if(event.key !== "Escape") return;

        closeCategoryModal();

        closeArchiveModal();

    });

}

/* ==========================================================
   7. LOAD CATEGORIES (live)
========================================================== */

function loadCategories(){

    showLoading();

    const categoriesQuery = query(

        collection(db, "categories"),

        orderBy("createdAt", "desc")

    );

    unsubscribeCategories = onSnapshot(

        categoriesQuery,

        (snapshot)=>{

            categories = [];

            snapshot.forEach(docSnap=>{

                categories.push({

                    id: docSnap.id,

                    ...docSnap.data()

                });

            });

            console.log(`${categories.length} categories loaded.`);

            applyFilters();

            renderStats();

        },

        (error)=>{

            console.error("Failed to load categories", error);

            showEmptyState();

        }

    );

}

/* ==========================================================
   PRODUCT COUNTS (one-time load; refresh on demand)
   Used for the per-row "Products" column and the "Total
   Products" stat card. Not real-time — a page refresh (or
   re-opening this page) picks up newly added products.
========================================================== */

async function loadProductCounts(){

    try{

        const snap = await getDocs(collection(db, "products"));

        productCountBySlug = {};

        totalProductCount = 0;

        snap.forEach(docSnap=>{

            const product = docSnap.data();

            if(product.archived) return;

            totalProductCount += 1;

            const slug = product.categorySlug;

            if(!slug) return;

            productCountBySlug[slug] = (productCountBySlug[slug] || 0) + 1;

        });

        renderStats();

        // Product counts affect each row's "Products" column too.
        renderTable();

    }

    catch(error){

        console.error("Failed to load product counts", error);

    }

}

/* ==========================================================
   LOADING / EMPTY STATE
========================================================== */

function showLoading(){

    if(!categoriesTableBody) return;

    categoriesTableBody.innerHTML = `

        <tr>

            <td colspan="6" class="loading">

                Loading Categories...

            </td>

        </tr>

    `;

    hideEmptyState();

}

function showEmptyState(){

    if(categoriesTableBody) categoriesTableBody.innerHTML = "";

    if(emptyCategories) emptyCategories.hidden = false;

    if(categoriesTableWrapper) categoriesTableWrapper.closest(".dashboard-card").style.display = "none";

}

function hideEmptyState(){

    if(emptyCategories) emptyCategories.hidden = true;

    if(categoriesTableWrapper) categoriesTableWrapper.closest(".dashboard-card").style.display = "";

}

/* ==========================================================
   8. SEARCH / FILTER
========================================================== */

function applyFilters(){

    const term = searchCategory?.value.trim().toLowerCase() || "";

    filteredCategories = categories.filter(category=>{

        if(!term) return true;

        const haystack = [category.name, category.slug]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return haystack.includes(term);

    });

    renderTable();

}

/* ==========================================================
   9. RENDER TABLE
========================================================== */

function renderTable(){

    if(!categoriesTableBody) return;

    if(filteredCategories.length === 0){

        showEmptyState();

        return;

    }

    hideEmptyState();

    categoriesTableBody.innerHTML =
        filteredCategories.map(renderCategoryRow).join("");

    if(window.lucide) window.lucide.createIcons();

}

function renderCategoryRow(category){

    const thumbURL = category.image || "";

    const productCount = productCountBySlug[category.slug] || 0;

    const statusBadge = renderStatusBadge(category);

    return `

        <tr>

            <td data-label="Image">
                ${
                    thumbURL
                        ? `<img
                            src="${escapeHTML(thumbURL)}"
                            alt="${escapeHTML(category.name || "Category")}"
                            class="table-thumb">`
                        : `<div class="table-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--color-muted);">
                            <i data-lucide="image-off"></i>
                        </div>`
                }
            </td>

            <td data-label="Category">${escapeHTML(category.name || "Untitled")}</td>

            <td data-label="Slug"><code>${escapeHTML(category.slug || "--")}</code></td>

            <td data-label="Products">${productCount}</td>

            <td data-label="Status">${statusBadge}</td>

            <td data-label="">
                <div class="table-actions">
                    <button
                        type="button"
                        class="table-action-btn"
                        data-action="edit"
                        data-id="${category.id}"
                        title="Edit category">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button
                        type="button"
                        class="table-action-btn danger"
                        data-action="archive"
                        data-id="${category.id}"
                        title="Archive category">
                        <i data-lucide="archive"></i>
                    </button>
                </div>
            </td>

        </tr>

    `;

}

function renderStatusBadge(category){

    if(category.archived){

        return `<span class="status-badge danger">Archived</span>`;

    }

    const value = (category.status || "active").toLowerCase();

    const classMap = {

        active: "success",

        hidden: "warning"

    };

    return `<span class="status-badge ${classMap[value] || "warning"}">${capitalize(value)}</span>`;

}

/* ==========================================================
   10. STATS
========================================================== */

function renderStats(){

    const nonArchived = categories.filter(category => !category.archived);

    const active = nonArchived.filter(category => (category.status || "active") === "active");

    const archived = categories.filter(category => category.archived);

    if(totalCategoriesEl) totalCategoriesEl.textContent = nonArchived.length;

    if(categoryProductsEl) categoryProductsEl.textContent = totalProductCount;

    if(activeCategoriesEl) activeCategoriesEl.textContent = active.length;

    if(archivedCategoriesEl) archivedCategoriesEl.textContent = archived.length;

}

/* ==========================================================
   11. ADD / EDIT MODAL
========================================================== */

function openCategoryModal(categoryId = null){

    editingCategoryId = categoryId;

    categoryForm?.reset();

    if(categoryId){

        const category = categories.find(item => item.id === categoryId);

        if(!category){

            console.warn("Category not found for edit:", categoryId);

            return;

        }

        if(modalTitle) modalTitle.textContent = "Edit Category";

        if(categoryNameInput) categoryNameInput.value = category.name || "";

        if(categoryDescriptionInput) categoryDescriptionInput.value = category.description || "";

        if(categoryStatusInput) categoryStatusInput.value = category.status || "active";

        // categoryImage is a file input — it can't be pre-filled with the
        // existing URL. We keep the current image unless a new file is chosen.

    }

    else{

        if(modalTitle) modalTitle.textContent = "Add Category";

        if(categoryStatusInput) categoryStatusInput.value = "active";

    }

    if(categoryModal) categoryModal.hidden = false;

}

function closeCategoryModal(){

    editingCategoryId = null;

    categoryForm?.reset();

    if(categoryModal) categoryModal.hidden = true;

}

async function handleCategoryFormSubmit(event){

    event.preventDefault();

    const name = categoryNameInput?.value.trim();

    if(!name){

        alert("Category name is required.");

        return;

    }

    const submitBtn = categoryForm.querySelector('button[type="submit"]');

    const originalLabel = submitBtn ? submitBtn.textContent : "";

    if(submitBtn){

        submitBtn.disabled = true;

        submitBtn.textContent = "Saving...";

    }

    try{

        const slug = slugify(name);

        const description = categoryDescriptionInput?.value.trim() || "";

        const status = categoryStatusInput?.value || "active";

        const imageFile = categoryImageInput?.files?.[0] || null;

        if(editingCategoryId){

            const existing = categories.find(item => item.id === editingCategoryId);

            let imageURL = existing?.image || "";

            if(imageFile){

                imageURL = await uploadCategoryImage(imageFile, editingCategoryId);

            }

            await updateDoc(doc(db, "categories", editingCategoryId), {

                name,

                slug,

                description,

                status,

                image: imageURL

            });

        }

        else{

            // Pre-generate the doc ID so the image can be uploaded to a
            // matching Storage path before the Firestore document exists.

            const newDocRef = doc(collection(db, "categories"));

            let imageURL = "";

            if(imageFile){

                imageURL = await uploadCategoryImage(imageFile, newDocRef.id);

            }

            await setDoc(newDocRef, {

                name,

                slug,

                description,

                status,

                image: imageURL,

                archived: false,

                createdAt: serverTimestamp()

            });

        }

        closeCategoryModal();

    }

    catch(error){

        console.error("Failed to save category", error);

        alert("Could not save this category. Please try again.");

    }

    finally{

        if(submitBtn){

            submitBtn.disabled = false;

            submitBtn.textContent = originalLabel;

        }

    }

}

async function uploadCategoryImage(file, categoryId){

    const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    const storageRef = ref(storage, `categories/${categoryId}/${safeName}`);

    const snapshot = await uploadBytes(storageRef, file);

    return getDownloadURL(snapshot.ref);

}

/* ==========================================================
   12. ARCHIVE CATEGORY
========================================================== */

function openArchiveModal(categoryId){

    archiveTargetId = categoryId;

    if(deleteModal) deleteModal.hidden = false;

}

function closeArchiveModal(){

    archiveTargetId = null;

    if(deleteModal) deleteModal.hidden = true;

}

async function handleArchiveConfirmed(){

    if(!archiveTargetId) return;

    const categoryId = archiveTargetId;

    confirmDelete.disabled = true;

    confirmDelete.textContent = "Archiving...";

    try{

        await updateDoc(doc(db, "categories", categoryId), {

            archived: true,

            archivedAt: new Date()

        });

        closeArchiveModal();

    }

    catch(error){

        console.error("Failed to archive category", error);

        alert("Could not archive this category. Please try again.");

    }

    finally{

        confirmDelete.disabled = false;

        confirmDelete.textContent = "Archive";

    }

}

/* ==========================================================
   13. HELPERS
========================================================== */

function slugify(text){

    return (text || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

}

function escapeHTML(text){

    const div = document.createElement("div");

    div.textContent = text ?? "";

    return div.innerHTML;

}

function capitalize(text){

    if(!text) return "";

    return text.charAt(0).toUpperCase() + text.slice(1);

}