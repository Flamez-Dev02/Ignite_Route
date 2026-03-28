// ============================================================
//  IGNITE — Cart Manager Module
//  Handles all cart operations with localStorage persistence.
//  Uses a simple custom event system to notify the UI.
// ============================================================

const CART_KEY = "ignite_cart";
const WISHLIST_KEY = "ignite_wishlist";

// ── Internal state ──────────────────────────────────────────
let cart = loadFromStorage(CART_KEY) || [];
let wishlist = loadFromStorage(WISHLIST_KEY) || [];

// ── Storage helpers ─────────────────────────────────────────
function loadFromStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  dispatch("cart:updated", { cart, summary: getSummary() });
}

function saveWishlist() {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  dispatch("wishlist:updated", { wishlist });
}

function dispatch(eventName, detail) {
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// ── Cart operations ─────────────────────────────────────────
function addToCart(product, qty = 1) {
  const existing = cart.find((i) => i.id === product.id);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, product.stock);
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      stock: product.stock,
      qty,
    });
  }
  saveCart();
  dispatch("cart:item-added", { product });
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.id !== productId);
  saveCart();
}

function updateQty(productId, qty) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;
  if (qty <= 0) {
    removeFromCart(productId);
    return;
  }
  item.qty = Math.min(qty, item.stock);
  saveCart();
}

function clearCart() {
  cart = [];
  saveCart();
}

function getCart() {
  return [...cart];
}

function getSummary() {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  const shipping = subtotal > 500 ? 0 : subtotal > 0 ? 19.99 : 0;
  const tax = subtotal * 0.085;
  const total = subtotal + shipping + tax;
  return { subtotal, shipping, tax, total, totalItems };
}

// ── Wishlist operations ─────────────────────────────────────
function toggleWishlist(product) {
  const idx = wishlist.findIndex((i) => i.id === product.id);
  if (idx >= 0) {
    wishlist.splice(idx, 1);
    saveWishlist();
    return false; // removed
  } else {
    wishlist.push({ id: product.id, name: product.name, price: product.price, image: product.image });
    saveWishlist();
    return true; // added
  }
}

function isWishlisted(productId) {
  return wishlist.some((i) => i.id === productId);
}

function getWishlist() {
  return [...wishlist];
}

// ── Public API ──────────────────────────────────────────────
export default {
  addToCart,
  removeFromCart,
  updateQty,
  clearCart,
  getCart,
  getSummary,
  toggleWishlist,
  isWishlisted,
  getWishlist,
};
