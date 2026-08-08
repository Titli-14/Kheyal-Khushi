/* ==========================================================
   KHEYAL KHUSHI ADMIN PANEL
   ADD-PRODUCT.JS
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
    doc,
    getDoc,
    collection,
    addDoc,
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

// Form

const productForm =
    document.getElementById("productForm");

// Basic Information

const productName =
    document.getElementById("productName");

const category =
    document.getElementById("category");

const shortDescription =
    document.getElementById("shortDescription");

const description =
    document.getElementById("description");

// Pricing

const price =
    document.getElementById("price");

const originalPrice =
    document.getElementById("originalPrice");

const discount =
    document.getElementById("discount");

// Inventory

const stock =
    document.getElementById("stock");

const sku =
    document.getElementById("sku");

const availability =
    document.getElementById("availability");

// Product Details

const material =
    document.getElementById("material");

const color =
    document.getElementById("color");

const weight =
    document.getElementById("weight");

const dimensions =
    document.getElementById("dimensions");

const processingTime =
    document.getElementById("processingTime");

// Product Visibility

const featured =
    document.getElementById("featured");

const bestSeller =
    document.getElementById("bestSeller");

const newArrival =
    document.getElementById("newArrival");

const active =
    document.getElementById("active");

// Product Images

const uploadArea =
    document.getElementById("uploadArea");

const productImages =
    document.getElementById("productImages");

const imagePreview =
    document.getElementById("imagePreview");

// SEO Settings

const slug =
    document.getElementById("slug");

const metaTitle =
    document.getElementById("metaTitle");

const metaDescription =
    document.getElementById("metaDescription");

// Publishing

const status =
    document.getElementById("status");

// Action Buttons

const saveDraftBtn =
    document.getElementById("saveDraft");

const publishBtn =
    productForm?.querySelector(".ap-primary-btn");

// Sidebar / Topbar

const sidebar =
    document.getElementById("sidebar");

const sidebarToggle =
    document.getElementById("sidebarToggle");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const logoutBtn =
    document.getElementById("logoutBtn");

const dropdownLogout =
    document.getElementById("dropdownLogout");

/* ==========================================================
   3. GLOBAL VARIABLES
========================================================== */

let currentAdmin = null;

// { id, file, previewURL } for every image currently staged
// for upload. Accumulates across multiple browse/drop actions
// instead of replacing the previous selection.

let selectedImages = [];

let fileIdCounter = 0;

// Tracks whether the admin has hand-edited the Slug or Discount
// fields — once true, auto-generation stops touching that field.

let slugEditedManually = false;

let discountEditedManually = false;

let isSaving = false;

/* ==========================================================
   4. INITIALIZATION
========================================================== */

document.addEventListener("DOMContentLoaded", initializePage);

function initializePage(){

    initializeAuthentication();

    initializeEvents();

    generateSKU();

}

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

    dropdownLogout?.addEventListener("click", logout);

    sidebarToggle?.addEventListener("click", ()=>{

        sidebar.classList.toggle("open");

        sidebarOverlay.classList.toggle("show");

    });

    sidebarOverlay?.addEventListener("click", ()=>{

        sidebar.classList.remove("open");

        sidebarOverlay.classList.remove("show");

    });

    productName?.addEventListener("input", handleProductNameInput);

    slug?.addEventListener("input", ()=>{

        slugEditedManually = true;

    });

    discount?.addEventListener("input", ()=>{

        discountEditedManually = true;

    });

    price?.addEventListener("input", autoCalculateDiscount);

    originalPrice?.addEventListener("input", autoCalculateDiscount);

    category?.addEventListener("change", generateSKU);

    uploadArea?.addEventListener("click", ()=>{

        productImages.click();

    });

    uploadArea?.addEventListener("dragover", (event)=>{

        event.preventDefault();

        uploadArea.classList.add("is-dragover");

    });

    uploadArea?.addEventListener("dragleave", ()=>{

        uploadArea.classList.remove("is-dragover");

    });

    uploadArea?.addEventListener("drop", (event)=>{

        event.preventDefault();

        uploadArea.classList.remove("is-dragover");

        addImageFiles(event.dataTransfer.files);

    });

    productImages?.addEventListener("change", ()=>{

        addImageFiles(productImages.files);

        productImages.value = ""; // allow re-selecting the same file later

    });

    saveDraftBtn?.addEventListener("click", ()=>{

        handleSaveProduct("draft");

    });

    productForm?.addEventListener("submit", (event)=>{

        event.preventDefault();

        handleSaveProduct("publish");

    });

}

/* ==========================================================
   7. SKU / SLUG / DISCOUNT AUTO-GENERATION
========================================================== */

function generateSKU(){

    if(!sku) return;

    const categoryCode =
        (category.value || "GEN")
            .replace(/[^a-zA-Z]/g, "")
            .slice(0, 3)
            .toUpperCase() || "GEN";

    const timeCode =
        Date.now().toString(36).toUpperCase().slice(-5);

    const randomCode =
        Math.random().toString(36).toUpperCase().slice(2, 6);

    sku.value = `KK-${categoryCode}-${timeCode}${randomCode}`;

}

function handleProductNameInput(){

    if(slugEditedManually) return;

    slug.value = slugify(productName.value);

}

function slugify(text){

    return text
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

}

function autoCalculateDiscount(){

    if(discountEditedManually) return;

    const priceValue = Number(price.value);

    const originalValue = Number(originalPrice.value);

    if(!priceValue || !originalValue || originalValue <= priceValue){

        discount.value = "";

        return;

    }

    discount.value =
        Math.round(((originalValue - priceValue) / originalValue) * 100);

}

/* ==========================================================
   8. IMAGE UPLOAD
========================================================== */

function addImageFiles(fileList){

    const incomingFiles =
        Array.from(fileList || []).filter(file => file.type.startsWith("image/"));

    incomingFiles.forEach(file=>{

        const isDuplicate = selectedImages.some(
            entry =>
                entry.file.name === file.name &&
                entry.file.size === file.size &&
                entry.file.lastModified === file.lastModified
        );

        if(isDuplicate) return;

        selectedImages.push({

            id: `img-${fileIdCounter++}`,

            file,

            previewURL: URL.createObjectURL(file)

        });

    });

    renderImagePreviews();

}

function removeImageFile(id){

    const entry = selectedImages.find(item => item.id === id);

    if(entry) URL.revokeObjectURL(entry.previewURL);

    selectedImages = selectedImages.filter(item => item.id !== id);

    renderImagePreviews();

}

function renderImagePreviews(){

    if(!imagePreview) return;

    imagePreview.innerHTML = selectedImages.map(entry => `

        <div class="ap-image-preview-item">

            <img src="${entry.previewURL}" alt="Product image preview">

            <button
                type="button"
                class="ap-remove-image"
                data-id="${entry.id}"
                title="Remove image">

                <i data-lucide="x"></i>

            </button>

        </div>

    `).join("");

    imagePreview.querySelectorAll(".ap-remove-image").forEach(button=>{

        button.addEventListener("click", ()=>{

            removeImageFile(button.dataset.id);

        });

    });

    if(window.lucide) window.lucide.createIcons();

}

/* ==========================================================
   9. FORM VALIDATION
========================================================== */

function validateForm(mode){

    if(mode === "draft"){

        if(!productName.value.trim()){

            alert("Please enter a product name before saving a draft.");

            productName.focus();

            return false;

        }

        return true;

    }

    if(!productForm.checkValidity()){

        productForm.reportValidity();

        return false;

    }

    return true;

}

/* ==========================================================
   10. SAVE PRODUCT (Publish / Draft)
========================================================== */

async function handleSaveProduct(mode){

    if(isSaving) return;

    if(!validateForm(mode)) return;

    isSaving = true;

    setButtonsLoading(true, mode);

    try{

        const productData = buildProductData(mode);

        const docRef = await addDoc(collection(db, "products"), productData);

        if(selectedImages.length > 0){

            const imageURLs = await uploadProductImages(docRef.id);

            await updateDoc(doc(db, "products", docRef.id), {

                image: imageURLs[0] || "",

                images: imageURLs

            });

        }

        alert(
            mode === "draft"
                ? "Product saved as draft."
                : "Product published successfully."
        );

        window.location.href = "products.html";

    }

    catch(error){

        console.error("Failed to save product", error);

        alert("Could not save this product. Please try again.");

    }

    finally{

        isSaving = false;

        setButtonsLoading(false, mode);

    }

}

function buildProductData(mode){

    return {

        // Basic Information

        name: productName.value.trim(),

        category: category.value,

        categorySlug: slugify(category.value),

        shortDescription: shortDescription.value.trim(),

        description: description.value.trim(),

        // Pricing

        price: Number(price.value) || 0,

        originalPrice: originalPrice.value ? Number(originalPrice.value) : null,

        discount: discount.value ? Number(discount.value) : 0,

        // Inventory

        stock: Number(stock.value) || 0,

        sku: sku.value,

        availability: availability.value,

        // Product Details

        material: material.value.trim(),

        color: color.value.trim(),

        weight: weight.value.trim(),

        dimensions: dimensions.value.trim(),

        processingTime: processingTime.value.trim(),

        // Visibility

        featured: featured.checked,

        bestSeller: bestSeller.checked,

        newArrival: newArrival.checked,

        active: active.checked,

        // SEO

        slug: slug.value.trim() || slugify(productName.value),

        metaTitle: metaTitle.value.trim(),

        metaDescription: metaDescription.value.trim(),

        // Publishing — a Save Draft click always forces "draft"
        // regardless of what the Product Status dropdown shows.

        status: mode === "draft" ? "draft" : status.value,

        // Images are filled in after upload; kept here so the
        // fields exist on the document from the very first write.

        image: "",

        images: [],

        rating: 0,

        reviews: 0,

        createdAt: serverTimestamp()

    };

}

/* ==========================================================
   11. UPLOAD PRODUCT IMAGES
========================================================== */

async function uploadProductImages(productId){

    const uploadPromises = selectedImages.map(async(entry)=>{

        const safeName =
            `${Date.now()}-${entry.file.name.replace(/\s+/g, "-")}`;

        const storageRef = ref(storage, `products/${productId}/${safeName}`);

        const snapshot = await uploadBytes(storageRef, entry.file);

        return getDownloadURL(snapshot.ref);

    });

    return Promise.all(uploadPromises);

}

/* ==========================================================
   12. HELPER FUNCTIONS
========================================================== */

function setButtonsLoading(isLoading, mode){

    if(publishBtn){

        publishBtn.disabled = isLoading;

        publishBtn.classList.toggle("is-loading", isLoading && mode === "publish");

    }

    if(saveDraftBtn){

        saveDraftBtn.disabled = isLoading;

        saveDraftBtn.textContent =
            isLoading && mode === "draft" ? "Saving..." : "Save Draft";

    }

}