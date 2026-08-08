/* ==========================================================
   KHEYAL KHUSHI ADMIN PANEL
   SETTINGS.JS
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
    setDoc,
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

const settingsForm =
    document.getElementById("settingsForm");

// Store Information

const storeName =
    document.getElementById("storeName");

const businessEmail =
    document.getElementById("businessEmail");

const businessPhone =
    document.getElementById("businessPhone");

const storeAddress =
    document.getElementById("storeAddress");

// Contact & Social

const whatsapp =
    document.getElementById("whatsapp");

const instagram =
    document.getElementById("instagram");

const facebook =
    document.getElementById("facebook");

const youtube =
    document.getElementById("youtube");

// Branding

const storeLogo =
    document.getElementById("storeLogo");

const favicon =
    document.getElementById("favicon");

const storeDescription =
    document.getElementById("storeDescription");

// Shipping

const shippingCharge =
    document.getElementById("shippingCharge");

const freeShipping =
    document.getElementById("freeShipping");

const deliveryTime =
    document.getElementById("deliveryTime");

const codStatus =
    document.getElementById("codStatus");

// Preferences

const maintenanceMode =
    document.getElementById("maintenanceMode");

const acceptOrders =
    document.getElementById("acceptOrders");

const showOutOfStock =
    document.getElementById("showOutOfStock");

const enableReviews =
    document.getElementById("enableReviews");

// Action Buttons

const saveButton =
    settingsForm?.querySelector(".primary-btn");

const resetButton =
    settingsForm?.querySelector(".secondary-btn");

// Profile

const profileName =
    document.getElementById("profileName");

const adminAvatar =
    document.getElementById("adminAvatar");

const profileTrigger =
    document.getElementById("profileTrigger");

const profileDropdown =
    document.getElementById("profileDropdown");

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

const dropdownLogout =
    document.getElementById("dropdownLogout");

/* ==========================================================
   3. GLOBAL VARIABLES
========================================================== */

let currentAdmin = null;

// Cached so "Save Changes" doesn't re-upload the same file twice
// and so existing image URLs survive a save where no new file
// was chosen.

let currentSettings = {};

const SETTINGS_DOC_PATH = ["settings", "store"];

/* ==========================================================
   4. INITIALIZATION
========================================================== */

document.addEventListener("DOMContentLoaded", initializePage);

function initializePage(){

    initializeAuthentication();

    initializeEvents();

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

            if(profileName){

                profileName.textContent =
                    currentAdmin.name || "Administrator";

            }

            if(adminAvatar && currentAdmin.photoURL){

                adminAvatar.src = currentAdmin.photoURL;

            }

            console.log("Admin Logged In:", user.email);

            await loadSettings();

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

    profileTrigger?.addEventListener("click", (event)=>{

        event.stopPropagation();

        profileDropdown.classList.toggle("open");

    });

    document.addEventListener("click", ()=>{

        profileDropdown?.classList.remove("open");

    });

    profileDropdown?.addEventListener("click", (event)=>{

        event.stopPropagation();

    });

    settingsForm?.addEventListener("submit", handleSaveSettings);

    settingsForm?.addEventListener("reset", handleFormReset);

}

/* ==========================================================
   7. LOAD SETTINGS
========================================================== */

async function loadSettings(){

    setFormDisabled(true);

    try{

        const settingsSnap =
            await getDoc(doc(db, ...SETTINGS_DOC_PATH));

        if(settingsSnap.exists()){

            currentSettings = settingsSnap.data();

            console.log("Store settings loaded.");

        }

        else{

            currentSettings = {};

            console.log("No settings saved yet — using defaults.");

        }

        populateForm(currentSettings);

    }

    catch(error){

        console.error("Failed to load settings", error);

        alert("Could not load store settings. Please refresh and try again.");

    }

    finally{

        setFormDisabled(false);

    }

}

/* ==========================================================
   8. POPULATE FORM
========================================================== */

function populateForm(settings){

    storeName.value = settings.storeName || "";

    businessEmail.value = settings.businessEmail || "";

    businessPhone.value = settings.businessPhone || "";

    storeAddress.value = settings.storeAddress || "";

    whatsapp.value = settings.whatsapp || "";

    instagram.value = settings.instagram || "";

    facebook.value = settings.facebook || "";

    youtube.value = settings.youtube || "";

    storeDescription.value = settings.storeDescription || "";

    shippingCharge.value =
        settings.shippingCharge ?? "";

    freeShipping.value =
        settings.freeShipping ?? "";

    deliveryTime.value = settings.deliveryTime || "";

    codStatus.value = settings.codStatus || "enabled";

    maintenanceMode.checked = !!settings.maintenanceMode;

    acceptOrders.checked =
        settings.acceptOrders !== undefined ? !!settings.acceptOrders : true;

    showOutOfStock.checked =
        settings.showOutOfStock !== undefined ? !!settings.showOutOfStock : true;

    enableReviews.checked =
        settings.enableReviews !== undefined ? !!settings.enableReviews : true;

    renderBrandingPreview(settings);

}

function renderBrandingPreview(settings){

    updateFilePreviewLabel(storeLogo, settings.logoURL, "Store Logo");

    updateFilePreviewLabel(favicon, settings.faviconURL, "Favicon");

}

function updateFilePreviewLabel(inputEl, existingURL, fieldLabel){

    if(!inputEl) return;

    const formGroup = inputEl.closest(".form-group");

    if(!formGroup) return;

    let hint = formGroup.querySelector(".current-file-hint");

    if(!existingURL){

        hint?.remove();

        return;

    }

    if(!hint){

        hint = document.createElement("a");

        hint.className = "current-file-hint";

        hint.target = "_blank";

        hint.rel = "noopener noreferrer";

        hint.style.display = "block";

        hint.style.marginTop = "6px";

        hint.style.fontSize = "12px";

        formGroup.appendChild(hint);

    }

    hint.href = existingURL;

    hint.textContent = `View current ${fieldLabel}`;

}

/* ==========================================================
   9. SAVE SETTINGS
========================================================== */

async function handleSaveSettings(event){

    event.preventDefault();

    setFormDisabled(true);

    setButtonLoading(true);

    try{

        const [logoURL, faviconURL] = await Promise.all([

            uploadBrandingFile(storeLogo, "logo"),

            uploadBrandingFile(favicon, "favicon")

        ]);

        const payload = {

            storeName: storeName.value.trim(),

            businessEmail: businessEmail.value.trim(),

            businessPhone: businessPhone.value.trim(),

            storeAddress: storeAddress.value.trim(),

            whatsapp: whatsapp.value.trim(),

            instagram: instagram.value.trim(),

            facebook: facebook.value.trim(),

            youtube: youtube.value.trim(),

            storeDescription: storeDescription.value.trim(),

            shippingCharge: toNumberOrNull(shippingCharge.value),

            freeShipping: toNumberOrNull(freeShipping.value),

            deliveryTime: deliveryTime.value.trim(),

            codStatus: codStatus.value,

            maintenanceMode: maintenanceMode.checked,

            acceptOrders: acceptOrders.checked,

            showOutOfStock: showOutOfStock.checked,

            enableReviews: enableReviews.checked,

            // Keep the previously saved URL unless a new file was
            // uploaded this time around.

            logoURL: logoURL || currentSettings.logoURL || "",

            faviconURL: faviconURL || currentSettings.faviconURL || "",

            updatedAt: serverTimestamp()

        };

        await setDoc(doc(db, ...SETTINGS_DOC_PATH), payload, { merge:true });

        currentSettings = { ...currentSettings, ...payload };

        renderBrandingPreview(currentSettings);

        showSaveFeedback("Settings saved successfully.");

    }

    catch(error){

        console.error("Failed to save settings", error);

        showSaveFeedback("Could not save settings. Please try again.", true);

    }

    finally{

        setFormDisabled(false);

        setButtonLoading(false);

    }

}

function handleFormReset(){

    // Let the native reset run first, then re-apply the last saved
    // values so "Reset" reverts to the stored settings rather than
    // to blank fields.

    setTimeout(()=>{

        populateForm(currentSettings);

    }, 0);

}

/* ==========================================================
   FILE UPLOADS (Store Logo / Favicon)
========================================================== */

async function uploadBrandingFile(inputEl, fileKey){

    const file = inputEl?.files?.[0];

    if(!file) return null;

    try{

        const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

        const storageRef = ref(storage, `settings/${fileKey}/${safeName}`);

        const snapshot = await uploadBytes(storageRef, file);

        return await getDownloadURL(snapshot.ref);

    }

    catch(error){

        console.error(`Failed to upload ${fileKey}`, error);

        throw new Error(`Could not upload the ${fileKey}.`);

    }

}

/* ==========================================================
   10. HELPER FUNCTIONS
========================================================== */

function setFormDisabled(isDisabled){

    if(!settingsForm) return;

    settingsForm
        .querySelectorAll("input, textarea, select, button")
        .forEach(field=>{

            field.disabled = isDisabled;

        });

}

function setButtonLoading(isLoading){

    if(!saveButton) return;

    saveButton.disabled = isLoading;

    saveButton.textContent = isLoading ? "Saving..." : "Save Changes";

}

function toNumberOrNull(value){

    if(value === "" || value === null || value === undefined) return null;

    const parsed = Number(value);

    return Number.isNaN(parsed) ? null : parsed;

}

function showSaveFeedback(message, isError = false){

    // Lightweight, dependency-free feedback — swap for a toast
    // component later if the admin panel adds one globally.

    alert(message);

    console[isError ? "error" : "log"](message);

}