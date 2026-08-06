/* =====================================================================
   KHEYAL KHUSI ADMIN — FIREBASE SERVICE (Modular SDK v10+)

   This is the ONLY file in the admin panel that talks to Firestore,
   Firebase Auth, or Firebase Storage directly. Every admin page
   (dashboard.js, products.js, add-product.js, orders.js, ...) imports
   the functions it needs from here instead of duplicating Firebase
   logic or importing the SDK itself.

   Collections
     users         { name, email, phone, role, createdAt }
     products      { name, category, categorySlug, price, originalPrice,
                      stock, tag, shortDescription, description, image,
                      images, rating, reviews, createdAt }
     orders        { customerName, email, phone, items, total,
                      paymentStatus, status, createdAt }
     notifications { type, message, createdAt }

   Storage
     products/{productId}/{fileName}   — product images
                                          (only downloadURLs are saved
                                          to Firestore, never raw files)
   ===================================================================== */

import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

import { auth, db, storage } from "../../js/firebase.js";

/* =====================================================================
   AUTH GUARD
   Call this at the top of every admin page. Resolves with the admin's
   user record if the visitor is logged in AND has role "admin".
   Otherwise redirects to admin/login.html and the returned promise
   never resolves (the redirect takes over navigation).
   ===================================================================== */
export function verifyAdminAccess() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          redirectToLogin();
          return;
        }

        const userSnap = await getDoc(doc(db, "users", user.uid));

        console.log("User UID:", user.uid);
        console.log("Document exists:", userSnap.exists());

        if (userSnap.exists()) {
          console.log("User data:", userSnap.data());
        }

        if (!userSnap.exists() || userSnap.data().role !== "admin") {
          redirectToLogin();
          return;
        }

        resolve({ uid: user.uid, ...userSnap.data() });
      } catch (err) {
        console.error("verifyAdminAccess failed:", err);
      }
    });
  });
}

function redirectToLogin() {
  window.location.href = "../login.html";
}

/* =====================================================================
   LOGOUT
   ===================================================================== */
export async function logoutAdmin() {
  try {
    await signOut(auth);
    window.location.href = "../login.html";
  } catch (err) {
    console.error("Logout failed:", err);
    throw new Error("Could not log out. Please try again.");
  }
}

/* =====================================================================
   DASHBOARD
   ===================================================================== */

/**
 * Returns { totalProducts, totalOrders, pendingOrders, revenue }
 */
export async function getDashboardStats() {
  try {
    const [productsSnap, ordersSnap] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(collection(db, "orders"))
    ]);

    let pendingOrders = 0;
    let revenue = 0;

    ordersSnap.forEach((docSnap) => {
      const order = docSnap.data();
      if (order.status === "Pending") pendingOrders += 1;
      if (typeof order.total === "number") revenue += order.total;
    });

    return {
      totalProducts: productsSnap.size,
      totalOrders: ordersSnap.size,
      pendingOrders,
      revenue
    };
  } catch (err) {
    console.error("getDashboardStats failed:", err);
    throw new Error("Could not load dashboard statistics.");
  }
}

/**
 * Returns the most recent orders, newest first.
 */
export async function getRecentOrders(count = 5) {
  try {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.error("getRecentOrders failed:", err);
    throw new Error("Could not load recent orders.");
  }
}

/**
 * Returns the newest products, newest first.
 */
export async function getLatestProducts(count = 5) {
  try {
    const q = query(
      collection(db, "products"),
      orderBy("createdAt", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.error("getLatestProducts failed:", err);
    throw new Error("Could not load latest products.");
  }
}

/**
 * Returns products with stock below the given threshold (default 5).
 */
export async function getLowStockProducts(count = 4, threshold = 5) {
  try {
    const q = query(
      collection(db, "products"),
      where("stock", "<", threshold),
      orderBy("stock", "asc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.error("getLowStockProducts failed:", err);
    throw new Error("Could not load low stock products.");
  }
}

/**
 * Returns the most recent activity notifications, newest first.
 */
export async function getNotifications(count = 4) {
  try {
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.error("getNotifications failed:", err);
    throw new Error("Could not load notifications.");
  }
}

/* =====================================================================
   PRODUCTS
   ===================================================================== */

/**
 * Returns all products, optionally filtered.
 * filters: { categorySlug, lowStockOnly, sortBy, sortDir }
 */
export async function getProducts(filters = {}) {
  try {
    const constraints = [];

    if (filters.categorySlug) {
      constraints.push(where("categorySlug", "==", filters.categorySlug));
    }
    if (filters.lowStockOnly) {
      constraints.push(where("stock", "<", 5));
    }
    constraints.push(orderBy(filters.sortBy || "createdAt", filters.sortDir || "desc"));

    const q = query(collection(db, "products"), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.error("getProducts failed:", err);
    throw new Error("Could not load products.");
  }
}

/**
 * Returns a single product by ID, or null if it doesn't exist.
 */
export async function getProduct(productId) {
  try {
    const snap = await getDoc(doc(db, "products", productId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error("getProduct failed:", err);
    throw new Error("Could not load this product.");
  }
}

/**
 * Creates a new product document.
 * productData should already contain `image` / `images` download URLs
 * (upload via uploadProductImages() first).
 * Returns the new product's ID.
 */
export async function addProduct(productData) {
  try {
    const docRef = await addDoc(collection(db, "products"), {
      ...productData,
      rating: productData.rating ?? 0,
      reviews: productData.reviews ?? 0,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.error("addProduct failed:", err);
    throw new Error("Could not save the new product.");
  }
}

/**
 * Updates an existing product document with the given fields.
 */
export async function updateProduct(productId, productData) {
  try {
    await updateDoc(doc(db, "products", productId), { ...productData });
  } catch (err) {
    console.error("updateProduct failed:", err);
    throw new Error("Could not update this product.");
  }
}

/**
 * Deletes a product document.
 * (Storage images are left in place intentionally — delete them
 * separately via Storage if you also want them removed.)
 */
export async function deleteProduct(productId) {
  try {
    await deleteDoc(doc(db, "products", productId));
  } catch (err) {
    console.error("deleteProduct failed:", err);
    throw new Error("Could not delete this product.");
  }
}

/**
 * Uploads one or more image files to Storage under products/{productId}/
 * and returns an array of their public download URLs.
 * `files` is a FileList or an array of File objects.
 */
export async function uploadProductImages(files, productId) {
  try {
    const fileArray = Array.from(files);

    const uploadPromises = fileArray.map(async (file) => {
      const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const storageRef = ref(storage, `products/${productId}/${safeName}`);
      const snapshot = await uploadBytes(storageRef, file);
      return getDownloadURL(snapshot.ref);
    });

    return await Promise.all(uploadPromises);
  } catch (err) {
    console.error("uploadProductImages failed:", err);
    throw new Error("Could not upload product images.");
  }
}

/* =====================================================================
   ORDERS
   ===================================================================== */

/**
 * Updates the status of an order (e.g. "Pending" → "Processing").
 */
export async function updateOrderStatus(orderId, status) {
  try {
    await updateDoc(doc(db, "orders", orderId), { status });
  } catch (err) {
    console.error("updateOrderStatus failed:", err);
    throw new Error("Could not update order status.");
  }
}

/* =====================================================================
   DELETE ORDER
===================================================================== */

export async function deleteOrder(orderId) {

    try {

        await deleteDoc(doc(db, "orders", orderId));

    }

    catch (err) {

        console.error("deleteOrder failed:", err);

        throw new Error("Could not delete this order.");

    }

}
/* =====================================================================
   REAL-TIME SUBSCRIPTIONS (optional)
   Live-updating dashboards can subscribe instead of polling. Each
   function returns the onSnapshot unsubscribe function — call it
   when the page unloads or the view is no longer needed.
   ===================================================================== */

/**
 * Subscribes to live updates on the most recent orders.
 * callback receives an array of order objects on every change.
 */
export function subscribeToRecentOrders(callback, count = 5) {
  const q = query(
    collection(db, "orders"),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
  });
}

/**
 * Subscribes to live updates on low stock products.
 */
export function subscribeToLowStockProducts(callback, count = 4, threshold = 5) {
  const q = query(
    collection(db, "products"),
    where("stock", "<", threshold),
    orderBy("stock", "asc"),
    limit(count)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
  });
}
/* =====================================================================
   SUBSCRIBE TO ALL ORDERS
===================================================================== */

export function subscribeToAllOrders(callback) {

    const q = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {

        const orders = snapshot.docs.map(doc => ({

            id: doc.id,

            ...doc.data()

        }));

        callback(orders);

    });

}