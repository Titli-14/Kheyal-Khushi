/* ==========================================================
   KHEYAL KHUSHI ADMIN PANEL
   PRODUCTS.JS
========================================================== */

/* ==========================================================
   1. FIREBASE IMPORTS
========================================================== */

import { auth, db } from "../../js/firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    query,
    orderBy,
    onSnapshot,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/* ==========================================================
   2. DOM ELEMENTS
========================================================== */

// Products Table

const productsTableBody =
    document.getElementById("productsTableBody");

const productsTableWrapper =
    document.getElementById("productsTable")?.closest(".table-wrapper");

// Filter Bar

const searchProduct =
    document.getElementById("searchProduct");

const categoryFilter =
    document.getElementById("categoryFilter");

const statusFilter =
    document.getElementById("statusFilter");

const sortProducts =
    document.getElementById("sortProducts");

// Empty State

const emptyState =
    document.getElementById("emptyState");

// Pagination

const prevPage =
    document.getElementById("prevPage");

const nextPage =
    document.getElementById("nextPage");

const pageNumbers =
    document.getElementById("pageNumbers");

// Archive (Delete) Modal

const deleteModal =
    document.getElementById("deleteModal");

const cancelDelete =
    document.getElementById("cancelDelete");

const confirmDelete =
    document.getElementById("confirmDelete");

// Image Preview Modal

const imageModal =
    document.getElementById("imageModal");

const previewImage =
    document.getElementById("previewImage");

const closeImageModal =
    document.getElementById("closeImageModal");

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
   3. GLOBAL VARIABLES
========================================================== */

let currentAdmin = null;

let products = [];

let filteredProducts = [];

let currentPage = 1;

const rowsPerPage = 10;

let archiveTargetId = null;

let unsubscribeProducts = null;

let searchDebounceTimer = null;

/* ==========================================================
   4. INITIALIZATION
========================================================== */

document.addEventListener("DOMContentLoaded", initializePage);

function initializePage(){

    initializeAuthentication();

    initializeEvents();

}

window.addEventListener("beforeunload", ()=>{

    if(unsubscribeProducts) unsubscribeProducts();

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

            loadProducts();

        }

        catch(error){

            console.error("Authentication check failed:", error);

        }

    });

}

/* ==========================================================
   LOGOUT
========================================================== */

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

    searchProduct?.addEventListener("input", ()=>{

        clearTimeout(searchDebounceTimer);

        searchDebounceTimer = setTimeout(()=>{

            currentPage = 1;

            applyFilters();

        }, 250);

    });

    categoryFilter?.addEventListener("change", ()=>{

        currentPage = 1;

        applyFilters();

    });

    statusFilter?.addEventListener("change", ()=>{

        currentPage = 1;

        applyFilters();

    });

    sortProducts?.addEventListener("change", applyFilters);

    prevPage?.addEventListener("click", ()=>{

        if(currentPage > 1){

            currentPage -= 1;

            renderPage();

        }

    });

    nextPage?.addEventListener("click", ()=>{

        const totalPages =
            Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage));

        if(currentPage < totalPages){

            currentPage += 1;

            renderPage();

        }

    });

    productsTableBody?.addEventListener("click", (event)=>{

        const button = event.target.closest("[data-action]");

        if(!button) return;

        const productId = button.dataset.id;

        const action = button.dataset.action;

        if(action === "archive") openArchiveModal(productId);

        if(action === "preview") openImagePreview(button.dataset.image, button.dataset.name);

    });

    cancelDelete?.addEventListener("click", closeArchiveModal);

    deleteModal?.addEventListener("click", (event)=>{

        if(event.target === deleteModal) closeArchiveModal();

    });

    confirmDelete?.addEventListener("click", handleArchiveConfirmed);

    closeImageModal?.addEventListener("click", closeImagePreview);

    imageModal?.addEventListener("click", (event)=>{

        if(event.target === imageModal) closeImagePreview();

    });

    document.addEventListener("keydown", (event)=>{

        if(event.key !== "Escape") return;

        closeArchiveModal();

        closeImagePreview();

    });

}

/* ==========================================================
   7. LOAD PRODUCTS
========================================================== */

function loadProducts(){

    showLoading();

    const productsQuery = query(

        collection(db, "products"),

        orderBy("createdAt", "desc")

    );

    // Realtime listener — table, filters, and pagination all stay
    // in sync automatically whenever a product changes.

    unsubscribeProducts = onSnapshot(

        productsQuery,

        (snapshot)=>{

            products = [];

            snapshot.forEach(docSnap=>{

                products.push({

                    id: docSnap.id,

                    ...docSnap.data()

                });

            });

            console.log(`${products.length} products loaded.`);

            applyFilters();

        },

        (error)=>{

            console.error("Failed to load products", error);

            showEmptyState();

        }

    );

}

/* ==========================================================
   LOADING / EMPTY STATE
========================================================== */

function showLoading(){

    productsTableBody.innerHTML = `

        <tr>

            <td colspan="7" class="loading">

                Loading Products...

            </td>

        </tr>

    `;

    hideEmptyState();

}

function showEmptyState(){

    productsTableBody.innerHTML = "";

    if(emptyState) emptyState.hidden = false;

    if(productsTableWrapper) productsTableWrapper.closest(".dashboard-card").style.display = "none";

}

function hideEmptyState(){

    if(emptyState) emptyState.hidden = true;

    if(productsTableWrapper) productsTableWrapper.closest(".dashboard-card").style.display = "";

}

/* ==========================================================
   8. RENDER PRODUCTS TABLE
========================================================== */

function renderPage(){

    const totalPages =
        Math.max(1, Math.ceil(filteredProducts.length / rowsPerPage));

    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * rowsPerPage;

    const pageProducts = filteredProducts.slice(start, start + rowsPerPage);

    renderProductsTable(pageProducts);

    renderPagination(totalPages);

}

function renderProductsTable(pageProducts){

    if(pageProducts.length === 0){

        showEmptyState();

        return;

    }

    hideEmptyState();

    productsTableBody.innerHTML =
        pageProducts.map(renderProductRow).join("");

    if(window.lucide) window.lucide.createIcons();

}

function renderProductRow(product){

    const thumbURL = product.image || "";

    const stockBadge = renderStockBadge(product.stock);

    const statusBadge = renderStatusBadge(product.status);

    return `

        <tr>

            <td data-label="Image">
                ${
                    thumbURL
                        ? `<img
                            src="${escapeHTML(thumbURL)}"
                            alt="${escapeHTML(product.name || "Product")}"
                            class="table-thumb"
                            data-action="preview"
                            data-image="${escapeHTML(thumbURL)}"
                            data-name="${escapeHTML(product.name || "Product")}"
                            style="cursor:pointer;">`
                        : `<div class="table-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--color-muted);">
                            <i data-lucide="image-off"></i>
                        </div>`
                }
            </td>

            <td data-label="Product">
                <div>${escapeHTML(product.name || "Unnamed Product")}</div>
                <small style="color:var(--color-muted);">SKU: ${escapeHTML(product.sku || "--")}</small>
            </td>

            <td data-label="Category">${escapeHTML(product.category || "--")}</td>

            <td data-label="Price">${renderPrice(product)}</td>

            <td data-label="Stock">${stockBadge}</td>

            <td data-label="Status">${statusBadge}</td>

            <td data-label="">
                <div class="table-actions">
                    <a
                        href="add-product.html?id=${encodeURIComponent(product.id)}"
                        class="table-action-btn"
                        title="Edit product">
                        <i data-lucide="pencil"></i>
                    </a>
                    <button
                        type="button"
                        class="table-action-btn danger"
                        data-action="archive"
                        data-id="${product.id}"
                        title="Archive product">
                        <i data-lucide="archive"></i>
                    </button>
                </div>
            </td>

        </tr>

    `;

}

function renderPrice(product){

    const price = formatCurrency(product.price);

    if(!product.originalPrice || product.originalPrice <= product.price){

        return price;

    }

    return `
        ${price}
        <br>
        <small style="color:var(--color-muted);text-decoration:line-through;">
            ${formatCurrency(product.originalPrice)}
        </small>
    `;

}

function renderStockBadge(stockValue){

    const stockNumber = Number(stockValue) || 0;

    if(stockNumber === 0){

        return `${stockNumber} <span class="status-badge danger">Out of Stock</span>`;

    }

    if(stockNumber < 5){

        return `${stockNumber} <span class="status-badge warning">Low Stock</span>`;

    }

    return `${stockNumber}`;

}

function renderStatusBadge(statusValue){

    const value = (statusValue || "draft").toLowerCase();

    const classMap = {

        active: "success",

        draft: "warning",

        hidden: "danger"

    };

    return `<span class="status-badge ${classMap[value] || "warning"}">${capitalize(value)}</span>`;

}

/* ==========================================================
   9. SEARCH
========================================================== */

function matchesSearch(product, term){

    if(!term) return true;

    const haystack = [product.name, product.sku]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return haystack.includes(term.toLowerCase());

}

/* ==========================================================
   10. CATEGORY FILTER
   11. STATUS FILTER
   (applied together with search + sort in applyFilters)
========================================================== */

function applyFilters(){

    const term =
        searchProduct?.value.trim() || "";

    const categoryValue =
        categoryFilter?.value || "";

    const statusValue =
        statusFilter?.value || "";

    filteredProducts = products.filter(product=>{

        // Archived products are soft-deleted — never shown in the
        // main management view.

        if(product.archived) return false;

        const matchesCategory =
            !categoryValue || product.category === categoryValue;

        const matchesStatus =
            !statusValue || (product.status || "draft").toLowerCase() === statusValue;

        return matchesSearch(product, term) && matchesCategory && matchesStatus;

    });

    sortFilteredProducts();

    renderPage();

}

/* ==========================================================
   12. SORT
========================================================== */

function sortFilteredProducts(){

    const sortValue = sortProducts?.value || "newest";

    const sorters = {

        newest: (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt),

        oldest: (a, b) => toMillis(a.createdAt) - toMillis(b.createdAt),

        priceLow: (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0),

        priceHigh: (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0),

        stock: (a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0)

    };

    filteredProducts.sort(sorters[sortValue] || sorters.newest);

}

function toMillis(timestamp){

    if(!timestamp) return 0;

    return timestamp.toMillis ? timestamp.toMillis() : new Date(timestamp).getTime();

}

/* ==========================================================
   13. PAGINATION
========================================================== */

function renderPagination(totalPages){

    if(prevPage) prevPage.disabled = currentPage <= 1;

    if(nextPage) nextPage.disabled = currentPage >= totalPages;

    if(!pageNumbers) return;

    pageNumbers.innerHTML = "";

    for(let page = 1; page <= totalPages; page += 1){

        const button = document.createElement("button");

        button.type = "button";

        button.className =
            "pagination-btn page-number" + (page === currentPage ? " active" : "");

        button.textContent = page;

        button.addEventListener("click", ()=>{

            currentPage = page;

            renderPage();

        });

        pageNumbers.appendChild(button);

    }

}

/* ==========================================================
   14. ARCHIVE PRODUCT
========================================================== */

function openArchiveModal(productId){

    archiveTargetId = productId;

    if(deleteModal) deleteModal.hidden = false;

}

function closeArchiveModal(){

    archiveTargetId = null;

    if(deleteModal) deleteModal.hidden = true;

}

async function handleArchiveConfirmed(){

    if(!archiveTargetId) return;

    const productId = archiveTargetId;

    confirmDelete.disabled = true;

    confirmDelete.textContent = "Archiving...";

    try{

        await updateDoc(doc(db, "products", productId), {

            archived: true,

            archivedAt: new Date()

        });

        closeArchiveModal();

    }

    catch(error){

        console.error("Failed to archive product", error);

        alert("Could not archive this product. Please try again.");

    }

    finally{

        confirmDelete.disabled = false;

        confirmDelete.textContent = "Archive Product";

    }

}

/* ==========================================================
   15. IMAGE PREVIEW MODAL
========================================================== */

function openImagePreview(imageURL, productName){

    if(!imageURL || !imageModal || !previewImage) return;

    previewImage.src = imageURL;

    previewImage.alt = productName || "Product Image";

    imageModal.hidden = false;

}

function closeImagePreview(){

    if(!imageModal) return;

    imageModal.hidden = true;

    if(previewImage) previewImage.src = "";

}

/* ==========================================================
   16. HELPER FUNCTIONS
========================================================== */

function formatCurrency(amount){

    return new Intl.NumberFormat("en-IN", {

        style: "currency",

        currency: "INR",

        maximumFractionDigits: 0

    }).format(Number(amount || 0));

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