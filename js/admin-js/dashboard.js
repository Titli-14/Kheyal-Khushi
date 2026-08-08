import {
    verifyAdminAccess,
    logoutAdmin,

    getDashboardStats,
    getRecentOrders,
    getLowStockProducts,
    getLatestProducts,
    getNotifications

} from "./firebase-admin.js";

/* ==========================================================
    DOM ELEMENTS
========================================================== */

const elements = {

    sidebar:
        document.getElementById("sidebar"),

    sidebarToggle:
        document.getElementById("sidebarToggle"),

    sidebarOverlay:
        document.getElementById("sidebarOverlay"),



    profileTrigger:
        document.getElementById("profileTrigger"),

    profileDropdown:
        document.getElementById("profileDropdown"),



    logoutButton:
        document.getElementById("logoutBtn"),

    dropdownLogout:
        document.getElementById("dropdownLogout"),



    search:
        document.getElementById("dashboardSearch"),



    notificationButton:
        document.getElementById("notificationBtn"),



    profileName:
        document.getElementById("profileName"),

    adminName:
        document.getElementById("adminName"),

    profileRole:
        document.getElementById("profileRole"),

    adminAvatar:
        document.getElementById("adminAvatar"),



    totalProducts:
        document.getElementById("totalProducts"),

    totalOrders:
        document.getElementById("totalOrders"),

    pendingOrders:
        document.getElementById("pendingOrders"),

    totalRevenue:
        document.getElementById("totalRevenue"),



    recentOrders:
        document.querySelector("#recentOrdersTable tbody"),

    lowStock:
        document.querySelector("#lowStockTable tbody"),

    latestProducts:
        document.getElementById("latestProductsList"),

    activity:
        document.getElementById("notificationsList")

};



/* ==========================================================
    INITIALIZE
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    initializeDashboard

);



async function initializeDashboard() {

    try {

        const admin = await verifyAdminAccess();

        console.log("Admin Data:", admin);

        renderAdmin(admin);

        initializeUI();

        await loadDashboard();

    }

    catch (error) {

        console.error(error);

    }

}
/* ==========================================================
    ADMIN PROFILE
========================================================== */

function renderAdmin(admin) {

    console.log("Render Admin:", admin);

    console.log("Profile Name Element:", elements.profileName);

    if (!admin) return;

    elements.profileName.textContent =
        admin.name || "Administrator";

    elements.adminName.textContent =
        admin.name || "Administrator";

    if (elements.profileRole) {

        elements.profileRole.textContent =
            capitalize(admin.role || "Admin");

    }

    if (admin.photoURL) {

        elements.adminAvatar.src = admin.photoURL;

    }

}


/* ==========================================================
    INITIALIZE UI
========================================================== */

function initializeUI(){

    setupSidebar();

    setupProfileDropdown();

    setupLogout();

}



/* ==========================================================
    SIDEBAR
========================================================== */

function setupSidebar(){

    if(!elements.sidebarToggle) return;

    elements.sidebarToggle.addEventListener("click",()=>{

        elements.sidebar.classList.toggle("is-open");

        elements.sidebarOverlay.classList.toggle("is-visible");

    });



    elements.sidebarOverlay.addEventListener("click",()=>{

        elements.sidebar.classList.remove("is-open");

        elements.sidebarOverlay.classList.remove("is-visible");

    });



    window.addEventListener("resize",()=>{

        if(window.innerWidth>992){

            elements.sidebar.classList.remove("is-open");

            elements.sidebarOverlay.classList.remove("show");

        }

    });

}



/* ==========================================================
    PROFILE DROPDOWN
========================================================== */

function setupProfileDropdown(){

    if(!elements.profileTrigger) return;



    elements.profileTrigger.addEventListener(

        "click",

        (event)=>{

            event.stopPropagation();

            elements.profileDropdown.classList.toggle("open");

        }

    );



    document.addEventListener(

        "click",

        ()=>{

            elements.profileDropdown.classList.remove("open");

        }

    );



    elements.profileDropdown.addEventListener(

        "click",

        (event)=>{

            event.stopPropagation();

        }

    );

}



/* ==========================================================
    LOGOUT
========================================================== */

function setupLogout(){

    const buttons=[

        elements.logoutButton,

        elements.dropdownLogout

    ].filter(Boolean);



    buttons.forEach(button=>{

        button.addEventListener(

            "click",

            async()=>{

                const confirmLogout=confirm(

                    "Logout from Admin Panel?"

                );



                if(!confirmLogout) return;



                try{

                    await logoutAdmin();

                }

                catch(error){

                    console.error(error);

                    alert("Unable to logout.");

                }

            }

        );

    });

}
/* ==========================================================
    LOAD DASHBOARD
========================================================== */

async function loadDashboard(){

    try{

        await Promise.all([

            loadStats(),

            loadRecentOrders(),

            loadLowStockProducts(),

            loadLatestProducts(),

            loadActivity()

        ]);

    }

    catch(error){

        console.error(

            "Dashboard Loading Error",

            error

        );

    }

}



/* ==========================================================
    DASHBOARD STATS
========================================================== */

async function loadStats(){

    try{

        const stats = await getDashboardStats();



        elements.totalProducts.textContent =
            stats.totalProducts || 0;



        elements.totalOrders.textContent =
            stats.totalOrders || 0;



        elements.pendingOrders.textContent =
            stats.pendingOrders || 0;



        elements.totalRevenue.textContent =
            formatCurrency(stats.revenue || 0);

    }

    catch(error){

        console.error(

            "Stats Error",

            error

        );



        elements.totalProducts.textContent = "--";

        elements.totalOrders.textContent = "--";

        elements.pendingOrders.textContent = "--";

        elements.totalRevenue.textContent = "--";

    }

}



/* ==========================================================
    RECENT ORDERS
========================================================== */

async function loadRecentOrders(){

    if(!elements.recentOrders) return;



    elements.recentOrders.innerHTML = `

        <tr>

            <td colspan="6" class="loading">

                Loading Orders...

            </td>

        </tr>

    `;



    try{

        const orders = await getRecentOrders(5);



        if(orders.length===0){

            elements.recentOrders.innerHTML = `

                <tr>

                    <td colspan="6" class="loading">

                        No Orders Found

                    </td>

                </tr>

            `;

            return;

        }



        elements.recentOrders.innerHTML =

            orders.map(order=>{

                return `

                <tr>

                    <td>

                        #${order.id.slice(0,8).toUpperCase()}

                    </td>

                    <td>

                        ${escapeHTML(order.customerName||"Unknown")}

                    </td>

                    <td>

                        ${formatCurrency(order.total)}

                    </td>

                    <td>

                        <span class="status ${order.status.toLowerCase()}">

                            ${order.status}

                        </span>

                    </td>

                    <td>

                        ${formatDate(order.createdAt)}

                    </td>

                    <td>

                        <a href="order-details.html?id=${order.id}">

                            View

                        </a>

                    </td>

                </tr>

                `;

            }).join("");

    }

    catch(error){

        console.error(

            "Orders Error",

            error

        );



        elements.recentOrders.innerHTML = `

            <tr>

                <td colspan="6" class="loading">

                    Unable to load orders.

                </td>

            </tr>

        `;

    }

}
/* ==========================================================
    LOW STOCK PRODUCTS
========================================================== */

async function loadLowStockProducts(){

    if(!elements.lowStock) return;

    elements.lowStock.innerHTML=`

        <tr>

            <td colspan="4" class="loading">

                Loading Products...

            </td>

        </tr>

    `;

    try{

        const products=await getLowStockProducts(5,5);

        if(products.length===0){

            elements.lowStock.innerHTML=`

                <tr>

                    <td colspan="4" class="loading">

                        No Low Stock Products

                    </td>

                </tr>

            `;

            return;

        }

        elements.lowStock.innerHTML=

            products.map(product=>{

                const stock=product.stock ?? 0;

                const status=stock<=0

                    ? "Out of Stock"

                    : "Low Stock";

                return`

                <tr>

                    <td class="product-cell">

                        <img

                            src="${product.image || '../assets/images/product-placeholder.png'}"

                            alt="${escapeHTML(product.name)}"

                            class="table-image">

                        ${escapeHTML(product.name)}

                    </td>

                    <td>

                        ${stock}

                    </td>

                    <td>

                        <span class="status ${stock<=0 ? "danger" : "warning"}">

                            ${status}

                        </span>

                    </td>

                    <td>

                        <a href="products.html?id=${product.id}">

                            View

                        </a>

                    </td>

                </tr>

                `;

            }).join("");

    }

    catch(error){

        console.error(error);

        elements.lowStock.innerHTML=`

            <tr>

                <td colspan="4" class="loading">

                    Unable to load products.

                </td>

            </tr>

        `;

    }

}



/* ==========================================================
    LATEST PRODUCTS
========================================================== */

async function loadLatestProducts(){

    if(!elements.latestProducts) return;

    elements.latestProducts.innerHTML=

        `<div class="loading-state">

            Loading Products...

        </div>`;

    try{

        const products=await getLatestProducts(4);

        if(products.length===0){

            elements.latestProducts.innerHTML=

                `<div class="loading-state">

                    No Products Available

                </div>`;

            return;

        }

        elements.latestProducts.innerHTML=

            products.map(product=>{

                return`

                <article class="product-card">

                    <img

                        src="${product.image || '../assets/images/product-placeholder.png'}"

                        alt="${escapeHTML(product.name)}"

                        class="product-card-img">

                    <div class="product-card-body">

                        <h4>

                            ${escapeHTML(product.name)}

                        </h4>

                        <p>

                            ${escapeHTML(product.category)}

                        </p>

                        <span class="price">

                            ${formatCurrency(product.price)}

                        </span>

                    </div>

                </article>

                `;

            }).join("");

    }

    catch(error){

        console.error(error);

        elements.latestProducts.innerHTML=

            `<div class="loading-state">

                Unable to load products.

            </div>`;

    }

}



/* ==========================================================
    RECENT ACTIVITY
========================================================== */

async function loadActivity(){

    if(!elements.activity) return;

    elements.activity.innerHTML=

        `<li class="loading-state">

            Loading Activity...

        </li>`;

    try{

        const activity=await getNotifications(5);

        if(activity.length===0){

            elements.activity.innerHTML=

                `<li class="loading-state">

                    No Recent Activity

                </li>`;

            return;

        }

        elements.activity.innerHTML=

            activity.map(item=>`

                <li class="activity-item">

                    <div class="activity-content">

                        <p>

                            ${escapeHTML(item.message)}

                        </p>

                        <small>

                            ${timeAgo(item.createdAt)}

                        </small>

                    </div>

                </li>

            `).join("");

    }

    catch(error){

        console.error(error);

        elements.activity.innerHTML=

            `<li class="loading-state">

                Unable to load activity.

            </li>`;

    }

}
/* ==========================================================
    HELPERS
========================================================== */

/**
 * Format number as Indian Rupees
 */
function formatCurrency(amount){

    return new Intl.NumberFormat(

        "en-IN",

        {

            style:"currency",

            currency:"INR",

            maximumFractionDigits:0

        }

    ).format(Number(amount || 0));

}



/**
 * Format Firestore Timestamp
 */
function formatDate(timestamp){

    if(!timestamp) return "--";

    const date =

        timestamp.toDate
            ? timestamp.toDate()
            : new Date(timestamp);

    return date.toLocaleDateString(

        "en-IN",

        {

            day:"2-digit",

            month:"short",

            year:"numeric"

        }

    );

}



/**
 * Time Ago
 */
function timeAgo(timestamp){

    if(!timestamp) return "";

    const date =

        timestamp.toDate
            ? timestamp.toDate()
            : new Date(timestamp);

    const seconds =

        Math.floor(

            (Date.now()-date.getTime())/1000

        );



    if(seconds < 60)

        return "Just now";



    const minutes =

        Math.floor(seconds/60);

    if(minutes < 60)

        return `${minutes} min ago`;



    const hours =

        Math.floor(minutes/60);

    if(hours < 24)

        return `${hours} hour${hours>1?"s":""} ago`;



    const days =

        Math.floor(hours/24);

    if(days < 30)

        return `${days} day${days>1?"s":""} ago`;



    return formatDate(date);

}



/**
 * Prevent HTML Injection
 */
function escapeHTML(text){

    const div = document.createElement("div");

    div.textContent = text || "";

    return div.innerHTML;

}



/**
 * Capitalize First Letter
 */
function capitalize(text){

    if(!text) return "";

    return text.charAt(0).toUpperCase()

        + text.slice(1);

}