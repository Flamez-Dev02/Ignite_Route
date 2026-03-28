// ============================================================
//  IGNITE — Main App Entry Point (Master Router)
//  Initialises all modules and wires up global event listeners.
// ============================================================

import products from "./products.js";
import Cart from "./cart.js";
import { renderCartSidebar, showToast, initTypewriter, initScrollReveal, animateCounters } from "./ui.js";
import { initFilter, setCategory, setSort, setSearch, resetFilters } from "./filter.js";
import { renderSellerDashboard, getListings, hasStore, getStore } from "./seller.js";

// Page modules
import { initShopPage } from "./pages/shop.js";
import { initDealsPage } from "./pages/deals.js";
import { initContactPage } from "./pages/contact.js";
import { initSigninPage } from "./auth.js";

// ── Merge base + seller products ─────────────────────────────
function getAllProducts() {
  return [...products, ...getListings()];
}

// ── Shared Navigation & Global Logic ─────────────────────────
function initSharedNav() {
  renderCartSidebar();
  updateSellerNavState();

  // Seller Events
  document.getElementById("sellOnIgniteBtn")?.addEventListener("click", renderSellerDashboard);
  document.getElementById("sellBannerBtn")?.addEventListener("click", renderSellerDashboard);

  document.addEventListener("seller:listing-added", () => {
    if (window.location.pathname.includes("shop.html") || window.location.pathname.endsWith("/") || window.location.pathname.includes("index.html")) {
      initFilter(getAllProducts());
    }
    showToast("Product listed! 🎉 It's live in the marketplace.", "success");
    updateSellerNavState();
  });

  document.addEventListener("seller:listing-removed", () => {
    if (window.location.pathname.includes("shop.html") || window.location.pathname.endsWith("/") || window.location.pathname.includes("index.html")) {
      initFilter(getAllProducts());
    }
    updateSellerNavState();
  });

  document.addEventListener("seller:store-saved", (e) => {
    showToast(`Store "${e.detail?.store?.name}" is live on Ignite! 🚀`, "success");
    updateSellerNavState();
  });

  // Cart Events
  document.getElementById("cartToggleBtn")?.addEventListener("click", openCart);
  document.getElementById("cartCloseBtn")?.addEventListener("click", closeCart);
  document.getElementById("cartOverlay")?.addEventListener("click", closeCart);
  document.addEventListener("cart:updated", () => renderCartSidebar());
  document.addEventListener("cart:item-added", (e) => {
    showToast(`${e.detail.product.name} added to cart 🛒`, "success");
    openCart();
  });

  document.getElementById("clearCartBtn")?.addEventListener("click", () => {
    Cart.clearCart();
    showToast("Cart cleared", "secondary");
  });

  document.getElementById("checkoutBtn")?.addEventListener("click", () => {
    const cart = Cart.getCart();
    if (cart.length === 0) {
      showToast("Your cart is empty!", "danger");
      return;
    }
    showPaymentPicker();
  });

  // ── Payment Method Picker ─────────────────────────────────
  function showPaymentPicker() {
    document.getElementById("paymentPickerOverlay")?.remove();

    const totalAmount = Cart.getSummary().total;
    const overlay = document.createElement("div");
    overlay.id = "paymentPickerOverlay";
    overlay.innerHTML = `
      <div class="payment-picker-backdrop"></div>
      <div class="payment-picker-card">
        <button class="payment-picker-close" id="payPickerClose" aria-label="Close">
          <i class="bi bi-x-lg"></i>
        </button>
        <div class="payment-picker-header">
          <i class="bi bi-shield-lock-fill"></i>
          <h3>Secure Checkout</h3>
          <p>Total: <strong>$${totalAmount.toFixed(2)}</strong></p>
        </div>
        <p class="payment-picker-label">Choose a payment method</p>
        <div class="payment-picker-options">
          <button class="payment-option-btn" data-provider="paystack">
            <div class="payment-option-icon" style="background:#00C3F7">
              <i class="bi bi-credit-card-2-front-fill"></i>
            </div>
            <div class="payment-option-info">
              <strong>Paystack</strong>
              <span>Card, Apple Pay, Bank Transfer, USSD</span>
            </div>
            <i class="bi bi-chevron-right"></i>
          </button>
          <button class="payment-option-btn" data-provider="flutterwave">
            <div class="payment-option-icon" style="background:#F5A623">
              <i class="bi bi-wallet2"></i>
            </div>
            <div class="payment-option-info">
              <strong>Flutterwave</strong>
              <span>Card, Apple Pay, Mobile Money, Transfer</span>
            </div>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
        <div class="payment-picker-footer">
          <i class="bi bi-lock-fill"></i> Secured by 256-bit SSL encryption
        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));

    // Close
    overlay.querySelector("#payPickerClose").addEventListener("click", () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 300);
    });
    overlay.querySelector(".payment-picker-backdrop").addEventListener("click", () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 300);
    });

    // Provider buttons
    overlay.querySelectorAll(".payment-option-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const provider = btn.dataset.provider;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Connecting...';
        btn.disabled = true;

        try {
          await processPayment(provider);
        } catch (err) {
          console.warn("Payment fallback:", err);
          showToast("Test mode: Using mock checkout. Add real API keys to .env", "warning");
          overlay.classList.remove("show");
          setTimeout(() => overlay.remove(), 300);
          closeCart();
          setTimeout(() => {
            Cart.clearCart();
            showSuccessScreen();
          }, 800);
        }
      });
    });
  }

  async function processPayment(provider) {
    const cart = Cart.getCart();
    const sellerItem = cart.find(i => i.isSellerListing && i.sellerStore);
    let subaccount_code = null;

    if (sellerItem) {
      if (hasStore() && getStore().name === sellerItem.sellerStore) {
        subaccount_code = getStore().subaccount_code;
      }
    }

    const totalAmount = Cart.getSummary().total;
    // Demo fallback: if on GitHub Pages, use a relative or mock path. If local, use localhost.
    const baseApi = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
      ? "http://localhost:3000/api" 
      : "https://ignite-backend-mock.vercel.app/api";

    const apiUrl = provider === "flutterwave"
      ? `${baseApi}/flutterwave/checkout`
      : `${baseApi}/paystack/checkout`;

    const body = provider === "flutterwave"
      ? { email: "customer@business.com", amount: totalAmount, name: "Ignite Customer", subaccount_id: subaccount_code }
      : { email: "customer@business.com", amount: totalAmount, subaccount_code };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      window.location.href = data.authorization_url;
    } else {
      throw new Error(`${provider} failed to initialize`);
    }
  }

  // UI Improvements
  window.addEventListener("scroll", () => {
    document.getElementById("mainNav")?.classList.toggle("scrolled", window.scrollY > 60);
    const backTop = document.getElementById("backToTop");
    backTop?.classList.toggle("show", window.scrollY > 400);
  });

  document.getElementById("backToTop")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.getElementById("closeBanner")?.addEventListener("click", () => document.getElementById("promoBanner")?.remove());

  document.getElementById("newsletterForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (e.target.querySelector("input").value) {
      showToast("You're on the list! 🎉", "success");
      e.target.reset();
    }
  });

  // Wishlist Logic
  document.addEventListener("wishlist:updated", ({ detail }) => {
    const badge = document.getElementById("wishlistBadge");
    if (badge) {
      badge.textContent = detail.wishlist.length;
      badge.classList.toggle("d-none", detail.wishlist.length === 0);
    }
  });
}

function updateSellerNavState() {
  const btn = document.getElementById("sellOnIgniteBtn");
  if (!btn) return;
  if (hasStore()) {
    btn.innerHTML = `<i class="bi bi-shop me-1"></i> ${getStore().name}`;
    btn.classList.add("seller-active");
  } else {
    btn.innerHTML = `<i class="bi bi-shop me-1"></i> Sell on Ignite`;
    btn.classList.remove("seller-active");
  }
}

function openCart() {
  document.getElementById("cartDrawer")?.classList.add("open");
  document.getElementById("cartOverlay")?.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  document.getElementById("cartDrawer")?.classList.remove("open");
  document.getElementById("cartOverlay")?.classList.remove("show");
  document.body.style.overflow = "";
}

function showSuccessScreen() {
  const overlay = document.createElement("div");
  overlay.className = "order-success-overlay";
  overlay.innerHTML = `
    <div class="order-success-card">
      <div class="success-icon"><i class="bi bi-check-lg"></i></div>
      <h2>Order Placed!</h2>
      <p>Your Ignite order is confirmed.<br>You'll receive a confirmation email shortly.</p>
      <button class="btn-ignite mt-3" id="successClose">Keep Shopping</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
  overlay.querySelector("#successClose").addEventListener("click", () => {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 400);
  });
}

// ── Page Specific Initializers ──────────────────────────────
function initHomePage() {
  initFilter(getAllProducts());
  const typeEl = document.getElementById("heroTypewriter");
  if (typeEl) {
    initTypewriter(typeEl, ["Business Essentials", "Executive Gear", "Premium Tech", "Office Upgrades", "Top Performers"]);
  }

  // Staggered Entrance for Feature Cards
  document.querySelectorAll("#features .feature-card").forEach((card, idx) => {
    card.classList.add("reveal", `reveal-delay-${(idx % 4) + 1}`);
  });

  // Home Search
  const si = document.getElementById("searchInput");
  let dt;
  si?.addEventListener("input", () => {
    clearTimeout(dt);
    dt = setTimeout(() => setSearch(si.value), 280);
  });
  document.getElementById("searchBtn")?.addEventListener("click", () => setSearch(si.value));

  // Home Filters
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      setCategory(btn.dataset.category);
    });
  });
  document.getElementById("sortSelect")?.addEventListener("change", (e) => setSort(e.target.value));
}
//  You 
// ── Premium UX Enhancements ───────────────────────────────
function initPremiumUX() {
  // 1. Tab Title Magic
  const originalTitle = document.title;
  window.addEventListener("blur", () => document.title = "Don't forget Ignite! 🔥");
  window.addEventListener("focus", () => document.title = originalTitle);

  // 2. Magnetic Buttons
  document.querySelectorAll(".btn-ignite, .btn-auth-submit").forEach(btn => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate(0, 0)";
    });
  });
}

// ── Router ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initSharedNav();
  animateCounters();
  initPremiumUX();

  const path = window.location.pathname;
  const page = path.split("/").pop().replace(".html", "") || "index";

  if (page === "index" || page === "") {
    initHomePage();
  } else if (page === "shop") {
    initShopPage();
  } else if (page === "deals") {
    initDealsPage();
  } else if (page === "signin") {
    initSigninPage();
  } else if (page === "contact" || page === "inbox") {
    initContactPage();
  }

  // Global Stagger for Reveal elements
  document.querySelectorAll(".reveal-stagger").forEach((container) => {
    container.querySelectorAll(".reveal-item").forEach((item, idx) => {
      item.classList.add("reveal", `reveal-delay-${(idx % 4) + 1}`);
    });
  });

  initScrollReveal();
});

window.igniteResetFilters = resetFilters;
