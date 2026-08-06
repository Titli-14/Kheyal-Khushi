/* ==========================================================
   KHEYAL KHUSHI ADMIN PANEL
   CUSTOMERS.JS
   PART 1 — SETUP & AUTHENTICATION
========================================================== */

/* ==========================================================
   FIREBASE
========================================================== */

import { auth, db } from "../../js/firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/* ==========================================================
   DOM ELEMENTS
========================================================== */

// Customer Table

const customersTableBody =
    document.getElementById("customersTableBody");

// Search

const searchCustomer =
    document.getElementById("searchCustomer");

// Filter

const customerFilter =
    document.getElementById("customerFilter");

// Sort

const sortCustomers =
    document.getElementById("sortCustomers");

// Empty State

const emptyCustomers =
    document.getElementById("emptyCustomers");

// Statistics

const totalCustomers =
    document.getElementById("totalCustomers");

const newCustomers =
    document.getElementById("newCustomers");

const returningCustomers =
    document.getElementById("returningCustomers");

const customerRevenue =
    document.getElementById("customerRevenue");

// Pagination

const prevPage =
    document.getElementById("prevPage");

const nextPage =
    document.getElementById("nextPage");

const pageNumbers =
    document.getElementById("pageNumbers");

// Drawer

const customerDrawer =
    document.getElementById("customerDrawer");

const drawerContent =
    document.getElementById("drawerContent");

const closeDrawer =
    document.getElementById("closeDrawer");

// Profile

const profileName =
    document.getElementById("profileName");

const adminAvatar =
    document.getElementById("adminAvatar");

const profileTrigger =
    document.getElementById("profileTrigger");

const profileDropdown =
    document.getElementById("profileDropdown");

// Logout

const logoutBtn =
    document.getElementById("logoutBtn");

const dropdownLogout =
    document.getElementById("dropdownLogout");

/* ==========================================================
   GLOBAL VARIABLES
========================================================== */

let currentAdmin = null;

let customers = [];

let filteredCustomers = [];

let currentPage = 1;

const rowsPerPage = 10;

/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener("DOMContentLoaded", initializePage);

function initializePage(){

    initializeAuthentication();

    initializeEvents();

}

/* ==========================================================
   AUTHENTICATION
========================================================== */

function initializeAuthentication(){

    onAuthStateChanged(auth, async(user)=>{

        if(!user){

            window.location.href = "../login.html";

            return;

        }

        currentAdmin = user;

        profileName.textContent =
            user.displayName || "Administrator";

        if(user.photoURL){

            adminAvatar.src = user.photoURL;

        }

        console.log("Admin Logged In:", user.email);

        
         await loadCustomers();

    });

}

/* ==========================================================
   EVENTS
========================================================== */

function initializeEvents(){

    logoutBtn?.addEventListener(
        "click",
        logout
    );

    dropdownLogout?.addEventListener(
        "click",
        logout
    );

    closeDrawer?.addEventListener(
        "click",
        closeCustomerDrawer
    );

    customersTableBody?.addEventListener(
    "click",
    handleCustomerActions
);

}

/* ==========================================================
   DRAWER
========================================================== */

function closeCustomerDrawer(){

    customerDrawer.classList.remove("open");

}

/* ==========================================================
   LOGOUT
========================================================== */

async function logout(){

    try{

        await signOut(auth);

        window.location.href = "login.html";

    }

    catch(error){

        console.error(error);

    }

}

/* ==========================================================
   LOAD CUSTOMERS
========================================================== */

async function loadCustomers() {

    try {

        showLoading();

        hideEmptyState();

        const customersQuery = query(
            collection(db, "users"),
            where("role", "==", "customer"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(customersQuery);

        customers = [];

        snapshot.forEach((doc) => {

            customers.push({

                id: doc.id,

                ...doc.data()

            });

        });

        filteredCustomers = [...customers];

        hideLoading();

        if (customers.length === 0) {

            showEmptyState();

            console.log("No customers found.");

            return;

        }

        console.log(`${customers.length} customers loaded.`);
        
        console.log(customers);

        
         renderCustomers();

    }

    catch (error) {

        hideLoading();

        showEmptyState();

        console.error(
            "Failed to load customers:",
            error
        );

    }

}
/* ==========================================================
   RENDER CUSTOMERS
========================================================== */

function renderCustomers() {

    hideEmptyState();

    customersTableBody.innerHTML = "";

    filteredCustomers.forEach((customer) => {

        customersTableBody.innerHTML += `

        <tr>

            <td>${customer.name || "-"}</td>

            <td>${customer.email || "-"}</td>

            <td>${customer.phone || "-"}</td>

            <td>0</td>

            <td>₹0</td>

            <td>${
                customer.createdAt
                    ? new Date(customer.createdAt.seconds * 1000).toLocaleDateString()
                    : "-"
            }</td>

            <td>

                <div class="table-actions">

                    <button
                        class="table-action-btn view-btn"
                        data-id="${customer.id}">

                        View

                    </button>

                </div>

            </td>

        </tr>

        `;

    });

}

/* ==========================================================
   LOADING STATE
========================================================== */

function showLoading() {

    customersTableBody.innerHTML = `
        <tr>
            <td colspan="8" class="loading">
                Loading customers...
            </td>
        </tr>
    `;

}

function hideLoading() {

    customersTableBody.innerHTML = "";

}
/* ==========================================================
   EMPTY STATE
========================================================== */

function showEmptyState() {

    emptyCustomers.hidden = false;

}

function hideEmptyState() {

    emptyCustomers.hidden = true;

}
// customer actions


function handleCustomerActions(event){

    const button = event.target.closest(".view-btn");

    if(!button) return;

    const customerId = button.dataset.id;

    openCustomerDrawer(customerId);

}
function openCustomerDrawer(customerId){

    const customer = customers.find(c => c.id === customerId);

    if(!customer) return;

    drawerContent.innerHTML = `

        <h3>${customer.name}</h3>

        <p>${customer.email}</p>

        <p>${customer.phone}</p>

    `;

    customerDrawer.classList.add("open");

}