/* ============================================================
   ORDERS.JS
   Powers admin/orders.html — order listing, search, filters,
   pagination, statistics, the order-details drawer, and status
   updates. All Firestore access goes through firebase-admin.js.
   ============================================================ */

/* ============================================================
   1. FIREBASE IMPORTS
   ============================================================ */

import {
  verifyAdminAccess,
  logoutAdmin,
  subscribeToAllOrders,
  updateOrderStatus,
  deleteOrder
} from "./firebase-admin.js";

/* ============================================================
   2. DOM ELEMENTS
   ============================================================ */

const elements = {
  // Sidebar / topbar chrome
  sidebar: document.getElementById("sidebar"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  sidebarOverlay: document.getElementById("sidebarOverlay"),

  profileTrigger: document.getElementById("profileTrigger"),
  profileDropdown: document.getElementById("profileDropdown"),
  profileName: document.getElementById("profileName"),
  adminAvatar: document.getElementById("adminAvatar"),

  logoutButton: document.getElementById("logoutBtn"),
  dropdownLogout: document.getElementById("dropdownLogout"),

  // Filter bar
  searchInput: document.getElementById("searchOrder"),
  statusFilter: document.getElementById("statusFilter"),
  paymentFilter: document.getElementById("paymentFilter"),

  // Orders table
  ordersTableWrapper: document.querySelector("#ordersTable")?.closest(".table-wrapper"),
  ordersTableBody: document.getElementById("ordersTableBody"),
  emptyOrders: document.getElementById("emptyOrders"),

  // Pagination
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageNumbers: document.getElementById("pageNumbers"),

  // Statistics
  totalOrders: document.getElementById("totalOrders"),
  pendingOrders: document.getElementById("pendingOrders"),
  deliveredOrders: document.getElementById("deliveredOrders"),
  totalRevenue: document.getElementById("totalRevenue"),

  // Order details drawer
  orderDrawer: document.getElementById("orderDrawer"),
  closeDrawer: document.getElementById("closeDrawer"),
  drawerContent: document.getElementById("drawerContent")
};

/* ============================================================
   3. GLOBAL VARIABLES
   ============================================================ */

const ORDERS_PER_PAGE = 10;

let allOrders = [];        // Full order list, kept in sync via onSnapshot
let filteredOrders = [];   // allOrders after search + filters are applied
let currentPage = 1;
let activeOrderId = null;  // Order currently open in the drawer

let unsubscribeOrders = null;
let searchDebounceTimer = null;

/* ============================================================
   4. INITIALIZATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", initializeOrdersPage);

async function initializeOrdersPage() {
  try {
    const admin = await verifyAdminAccess();
    renderAdmin(admin);
    setupEventListeners();
    startOrdersListener();
  } catch (error) {
    console.error("Failed to initialize Orders page:", error);
  }
}

window.addEventListener("beforeunload", () => {
  if (unsubscribeOrders) unsubscribeOrders();
});

/* ============================================================
   5. AUTHENTICATION
   ============================================================ */

function renderAdmin(admin) {
  if (!admin) return;

  if (elements.profileName) {
    elements.profileName.textContent = admin.name || "Administrator";
  }
  if (elements.adminAvatar && admin.photoURL) {
    elements.adminAvatar.src = admin.photoURL;
  }
}

function setupLogout() {
  const buttons = [elements.logoutButton, elements.dropdownLogout].filter(Boolean);

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmLogout = confirm("Logout from Admin Panel?");
      if (!confirmLogout) return;

      try {
        await logoutAdmin();
      } catch (error) {
        console.error("Logout failed:", error);
        alert("Unable to logout. Please try again.");
      }
    });
  });
}

/* ============================================================
   6. EVENT LISTENERS
   ============================================================ */

function setupEventListeners() {
  setupSidebar();
  setupProfileDropdown();
  setupLogout();
  setupSearch();
  setupStatusFilter();
  setupPaymentFilter();
  setupPagination();
  setupDrawer();
  setupTableActions();
}

function setupSidebar() {
  if (!elements.sidebarToggle) return;

  elements.sidebarToggle.addEventListener("click", () => {
    elements.sidebar.classList.toggle("open");
    elements.sidebarOverlay.classList.toggle("show");
  });

  elements.sidebarOverlay.addEventListener("click", () => {
    elements.sidebar.classList.remove("open");
    elements.sidebarOverlay.classList.remove("show");
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 992) {
      elements.sidebar.classList.remove("open");
      elements.sidebarOverlay.classList.remove("show");
    }
  });
}

function setupProfileDropdown() {
  if (!elements.profileTrigger) return;

  elements.profileTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    elements.profileDropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    elements.profileDropdown.classList.remove("open");
  });

  elements.profileDropdown.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}

/* ============================================================
   7. LOAD ORDERS
   ============================================================ */

function startOrdersListener() {
  setTableLoading();

  unsubscribeOrders = subscribeToAllOrders((orders) => {
    allOrders = orders;
    applyFilters();       // Recompute filteredOrders + re-render table
    renderStatistics();   // Stats are always based on the full order list

    // Keep the drawer in sync if the order currently open just changed
    if (activeOrderId) {
      const updatedOrder = allOrders.find((order) => order.id === activeOrderId);
      if (updatedOrder) {
        renderDrawerContent(updatedOrder);
      } else {
        closeDrawerPanel(); // Order was deleted elsewhere
      }
    }
  });
}

/* ============================================================
   8. RENDER ORDERS
   ============================================================ */

function renderPage() {
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * ORDERS_PER_PAGE;
  const pageOrders = filteredOrders.slice(start, start + ORDERS_PER_PAGE);

  renderOrdersTable(pageOrders);
  renderPagination(totalPages);
}

function renderOrdersTable(orders) {
  if (!elements.ordersTableBody) return;

  if (orders.length === 0) {
    elements.ordersTableBody.innerHTML = "";
    toggleEmptyState(true);
    return;
  }

  toggleEmptyState(false);

  elements.ordersTableBody.innerHTML = orders.map(renderOrderRow).join("");
  // Render Lucide icons after creating the table rows
if (window.lucide) {
    lucide.createIcons();
}
}

function renderOrderRow(order) {
  const orderCode = `#${order.id.slice(0, 8).toUpperCase()}`;
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const status = (order.status || "pending").toLowerCase();
  const payment = (order.paymentStatus || "pending").toLowerCase();

  return `
    <tr>
      <td data-label="Order ID">${orderCode}</td>
      <td data-label="Customer">
        <div>${escapeHTML(order.customerName || "Unknown")}</div>
        <small style="color:var(--color-muted);">
          ${escapeHTML(order.email || "No email")} &middot; ${itemCount} item${itemCount === 1 ? "" : "s"}
        </small>
      </td>
      <td data-label="Phone">${escapeHTML(order.phone || "--")}</td>
      <td data-label="Amount">${formatCurrency(order.total)}</td>
      <td data-label="Payment">
        <span class="status-badge ${getPaymentClass(payment)}">${capitalize(payment)}</span>
      </td>
      <td data-label="Status">
        <span class="status-badge ${status}">${capitalize(status)}</span>
      </td>
      <td data-label="Date">${formatDate(order.createdAt)}</td>
      <td data-label="">
        <div class="table-actions">
          <button
            type="button"
            class="table-action-btn"
            data-action="view"
            data-id="${order.id}"
            title="View order">
            <i data-lucide="eye"></i>
          </button>
          <button
            type="button"
            class="table-action-btn danger"
            data-action="delete"
            data-id="${order.id}"
            title="Delete order">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function setTableLoading() {
  if (!elements.ordersTableBody) return;
  toggleEmptyState(false);
  elements.ordersTableBody.innerHTML = `
    <tr>
      <td colspan="8" class="loading">Loading Orders...</td>
    </tr>
  `;

}

function toggleEmptyState(isEmpty) {
  if (elements.emptyOrders) elements.emptyOrders.hidden = !isEmpty;
  if (elements.ordersTableWrapper) elements.ordersTableWrapper.style.display = isEmpty ? "none" : "";
}

/* ============================================================
   9. SEARCH
   ============================================================ */

function setupSearch() {
  if (!elements.searchInput) return;

  elements.searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentPage = 1;
      applyFilters();
    }, 250);
  });
}

function matchesSearch(order, term) {
  if (!term) return true;

  const haystack = [
    order.id,
    order.customerName,
    order.phone
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(term.toLowerCase());
}

/* ============================================================
   10. STATUS FILTER
   ============================================================ */

function setupStatusFilter() {
  if (!elements.statusFilter) return;

  elements.statusFilter.addEventListener("change", () => {
    currentPage = 1;
    applyFilters();
  });
}

/* ============================================================
   11. PAYMENT FILTER
   ============================================================ */

function setupPaymentFilter() {
  if (!elements.paymentFilter) return;

  elements.paymentFilter.addEventListener("change", () => {
    currentPage = 1;
    applyFilters();
  });
}

/* ============================================================
   COMBINED FILTERING
   Search + status + payment are all applied locally against the
   in-memory allOrders array — no repeat Firestore queries.
   ============================================================ */

function applyFilters() {
  const term = elements.searchInput?.value.trim() || "";
  const statusValue = elements.statusFilter?.value || "";
  const paymentValue = elements.paymentFilter?.value || "";

  filteredOrders = allOrders.filter((order) => {
    const orderStatus = (order.status || "").toLowerCase();
    const orderPayment = (order.paymentStatus || "").toLowerCase();

    const matchesStatus = !statusValue || orderStatus === statusValue;
    const matchesPayment = !paymentValue || orderPayment === paymentValue;

    return matchesSearch(order, term) && matchesStatus && matchesPayment;
  });

  renderPage();
}

/* ============================================================
   12. PAGINATION
   ============================================================ */

function setupPagination() {
  elements.prevPage?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderPage();
    }
  });

  elements.nextPage?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
    if (currentPage < totalPages) {
      currentPage += 1;
      renderPage();
    }
  });
}

function renderPagination(totalPages) {
  if (elements.prevPage) elements.prevPage.disabled = currentPage <= 1;
  if (elements.nextPage) elements.nextPage.disabled = currentPage >= totalPages;

  if (!elements.pageNumbers) return;

  elements.pageNumbers.innerHTML = "";

  for (let page = 1; page <= totalPages; page += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pagination-btn page-number" + (page === currentPage ? " active" : "");
    button.textContent = page;
    button.addEventListener("click", () => {
      currentPage = page;
      renderPage();
    });
    elements.pageNumbers.appendChild(button);
  }
}

/* ============================================================
   13. STATISTICS
   ============================================================ */

function renderStatistics() {
  const total = allOrders.length;

  const pending = allOrders.filter(
    (order) => (order.status || "").toLowerCase() === "pending"
  ).length;

  const delivered = allOrders.filter(
    (order) => (order.status || "").toLowerCase() === "delivered"
  ).length;

  // Revenue counts only successfully paid orders.
  const revenue = allOrders
    .filter((order) => (order.paymentStatus || "").toLowerCase() === "paid")
    .reduce((sum, order) => sum + (Number(order.total) || 0), 0);

  if (elements.totalOrders) elements.totalOrders.textContent = total;
  if (elements.pendingOrders) elements.pendingOrders.textContent = pending;
  if (elements.deliveredOrders) elements.deliveredOrders.textContent = delivered;
  if (elements.totalRevenue) elements.totalRevenue.textContent = formatCurrency(revenue);
}

/* ============================================================
   14. ORDER DETAILS DRAWER
   ============================================================ */

function setupDrawer() {
  elements.closeDrawer?.addEventListener("click", closeDrawerPanel);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawerPanel();
  });
}

function openDrawer(orderId) {
  const order = allOrders.find((item) => item.id === orderId);
  if (!order) return;

  activeOrderId = orderId;
  renderDrawerContent(order);
  elements.orderDrawer?.classList.add("open");
}

function closeDrawerPanel() {
  activeOrderId = null;
  elements.orderDrawer?.classList.remove("open");
}

function renderDrawerContent(order) {
  if (!elements.drawerContent) return;

  const status = (order.status || "pending").toLowerCase();
  const payment = (order.paymentStatus || "pending").toLowerCase();
  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.shippingAddress || null;

  elements.drawerContent.innerHTML = `

    <div class="drawer-section">
      <h4>Customer Information</h4>
      <p><strong>${escapeHTML(order.customerName || "Unknown")}</strong></p>
      <p>${escapeHTML(order.email || "No email provided")}</p>
      <p>${escapeHTML(order.phone || "No phone provided")}</p>
    </div>

    <div class="drawer-section">
      <h4>Shipping Address</h4>
      ${renderAddress(address)}
    </div>

    <div class="drawer-section">
      <h4>Ordered Products</h4>
      ${renderDrawerItems(items)}
    </div>

    <div class="drawer-section">
      <h4>Payment</h4>
      <p>Method: ${escapeHTML(order.paymentMethod || "Not specified")}</p>
      <p>Status: <span class="status-badge ${getPaymentClass(payment)}">${capitalize(payment)}</span></p>
    </div>

    <div class="drawer-section">
      <h4>Order Status</h4>
      <span class="status-badge ${status}" id="drawerCurrentStatus">${capitalize(status)}</span>

      <div class="drawer-status-update">
        <select id="drawerStatusSelect">
          ${["pending", "processing", "shipped", "delivered", "cancelled"]
            .map(
              (value) =>
                `<option value="${value}" ${value === status ? "selected" : ""}>${capitalize(value)}</option>`
            )
            .join("")}
        </select>
        <button type="button" id="drawerStatusUpdateBtn" class="pagination-btn">
          Update Status
        </button>
      </div>
    </div>

    <div class="drawer-section">
      <h4>Timeline</h4>
      ${renderTimeline(order)}
    </div>

  `;

  document.getElementById("drawerStatusUpdateBtn")?.addEventListener("click", () => {
    const select = document.getElementById("drawerStatusSelect");
    if (select) handleStatusUpdate(order.id, select.value);
  });
}

function renderAddress(address) {
  if (!address) {
    return `<p>No shipping address on file.</p>`;
  }

  const lines = [address.line1, address.line2, address.city, address.state, address.pincode]
    .filter(Boolean)
    .map(escapeHTML);

  return lines.length ? `<p>${lines.join(", ")}</p>` : `<p>No shipping address on file.</p>`;
}

function renderDrawerItems(items) {
  if (items.length === 0) {
    return `<p>No product details available for this order.</p>`;
  }

  return `
    <ul class="drawer-item-list">
      ${items
        .map(
          (item) => `
        <li>
          <span>${escapeHTML(item.name || "Product")} &times; ${item.quantity || 1}</span>
          <span>${formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
        </li>
      `
        )
        .join("")}
    </ul>
  `;
}

function renderTimeline(order) {
  const events = [{ label: "Order Placed", date: order.createdAt }];

  if (order.updatedAt) {
    events.push({ label: `Status updated to ${capitalize(order.status || "")}`, date: order.updatedAt });
  }

  return `
    <ul class="drawer-timeline">
      ${events
        .map(
          (event) => `
        <li>
          <span>${escapeHTML(event.label)}</span>
          <small>${formatDate(event.date, true)}</small>
        </li>
      `
        )
        .join("")}
    </ul>
  `;
}

/* ============================================================
   15. UPDATE ORDER STATUS
   ============================================================ */

async function handleStatusUpdate(orderId, newStatus) {
  const button = document.getElementById("drawerStatusUpdateBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "Updating...";
  }

  try {
    await updateOrderStatus(orderId, newStatus);
    // The realtime listener (subscribeToAllOrders) will push the
    // updated order back down and re-render the table + drawer.
  } catch (error) {
    console.error("Failed to update order status:", error);
    alert("Could not update the order status. Please try again.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Update Status";
    }
  }
}

/* ============================================================
   16. DELETE ORDER (optional)
   ============================================================ */

async function handleDeleteOrder(orderId) {
  const confirmDelete = confirm("Delete this order permanently? This cannot be undone.");
  if (!confirmDelete) return;

  try {
    await deleteOrder(orderId);
    if (activeOrderId === orderId) closeDrawerPanel();
  } catch (error) {
    console.error("Failed to delete order:", error);
    alert("Could not delete this order. Please try again.");
  }
}

/* ============================================================
   TABLE ACTION DELEGATION (View / Delete buttons)
   ============================================================ */

function setupTableActions() {
  if (!elements.ordersTableBody) return;

  elements.ordersTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const orderId = button.dataset.id;
    const action = button.dataset.action;

    if (action === "view") openDrawer(orderId);
    if (action === "delete") handleDeleteOrder(orderId);
  });
}

/* ============================================================
   17. HELPER FUNCTIONS
   ============================================================ */

/**
 * Format a number as Indian Rupees.
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount || 0));
}

/**
 * Format a Firestore Timestamp (or Date/ISO string) for India.
 * Pass includeTime = true to also show the time of day.
 */
function formatDate(timestamp, includeTime = false) {
  if (!timestamp) return "--";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--";

  const options = {
    day: "2-digit",
    month: "short",
    year: "numeric"
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return date.toLocaleString("en-IN", options);
}

/**
 * Map an order status to the matching CSS badge modifier.
 * (pending / processing / shipped / delivered / cancelled are all
 * defined directly in dashboard.css's .status-badge rules.)
 */
function getPaymentClass(payment) {
  if (payment === "paid") return "success";
  if (payment === "failed") return "danger";
  return "warning"; // pending
}

/**
 * Escape text before inserting into innerHTML to prevent HTML injection.
 */
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

/**
 * Capitalize the first letter of a string.
 */
function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}