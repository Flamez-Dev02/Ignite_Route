// ============================================================
//  IGNITE — UI Renderer Module
//  All DOM-building logic. Keeps index.html thin and clean.
// ============================================================

import Cart from "./cart.js";

// ── Helpers ─────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const fmt = (n) => `$${Number(n).toFixed(2)}`;

function highlightText(text) {
  const query = document.getElementById("searchInput")?.value?.toLowerCase().trim();
  if (!query) return text;
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, '<mark class="ignite-mark">$1</mark>');
}

function stars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = "";
  for (let i = 0; i < 5; i++) {
    if (i < full) html += `<i class="bi bi-star-fill"></i>`;
    else if (i === full && half) html += `<i class="bi bi-star-half"></i>`;
    else html += `<i class="bi bi-star"></i>`;
  }
  return html;
}

function badgeHtml(badge, type) {
  if (!badge) return "";
  return `<span class="product-badge badge bg-${type}">${badge}</span>`;
}

// ── Product Card ─────────────────────────────────────────────
export function buildProductCard(product) {
  const wishlisted = Cart.isWishlisted(product.id);
  const discount =
    product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const div = document.createElement("div");
  div.className = "col-xl-3 col-lg-4 col-md-6 col-12";
  div.setAttribute("data-product-id", product.id);
  div.setAttribute("data-category", product.category);
  div.setAttribute("data-tags", product.tags.join(","));

  div.innerHTML = `
    <div class="product-card" tabindex="0" role="button" aria-label="View ${product.name}">
      ${badgeHtml(product.badge, product.badgeType)}
      ${discount ? `<span class="discount-chip">-${discount}%</span>` : ""}
      <button class="wishlist-btn ${wishlisted ? "active" : ""}" data-id="${product.id}" aria-label="Toggle wishlist">
        <i class="bi bi-heart${wishlisted ? "-fill" : ""}"></i>
      </button>
      <div class="product-img-wrap">
        <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy"
          onerror="this.src='https://placehold.co/400x320/1a1f2e/5d5dff?text=Ignite+Product'">
      </div>
      <div class="product-body">
        <p class="product-category">${product.category}</p>
        <h3 class="product-name">${highlightText(product.name)}</h3>
        <div class="product-rating">
          <span class="stars">${stars(product.rating)}</span>
          <span class="rating-count">(${product.reviews.toLocaleString()})</span>
        </div>
        <div class="product-footer">
          <div class="price-block">
            <span class="price-current">${fmt(product.price)}</span>
            ${product.originalPrice ? `<span class="price-original">${fmt(product.originalPrice)}</span>` : ""}
          </div>
          <button class="btn-add-cart" data-id="${product.id}" aria-label="Add to cart">
            <i class="bi bi-bag-plus"></i>
          </button>
        </div>
        <div class="stock-bar">
          <div class="stock-fill" style="width:${Math.min((product.stock / 50) * 100, 100)}%"></div>
        </div>
        <p class="stock-text">${product.stock <= 10 ? `<span class="text-warning">Only ${product.stock} left!</span>` : `${product.stock} in stock`}</p>
      </div>
    </div>`;

  // Quick view on card click (except buttons)
  div.querySelector(".product-card").addEventListener("click", (e) => {
    if (!e.target.closest("button")) openProductModal(product);
  });

  div.querySelector(".product-card").addEventListener("keydown", (e) => {
    if (e.key === "Enter") openProductModal(product);
  });

  div.querySelector(".btn-add-cart").addEventListener("click", (e) => {
    e.stopPropagation();
    Cart.addToCart(product);
    animateCartBtn(e.currentTarget);
  });

  div.querySelector(".wishlist-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    const added = Cart.toggleWishlist(product);
    const btn = e.currentTarget;
    btn.classList.toggle("active", added);
    btn.querySelector("i").className = `bi bi-heart${added ? "-fill" : ""}`;
    showToast(added ? `Added to wishlist ❤️` : `Removed from wishlist`, added ? "success" : "secondary");
  });

  return div;
}

function animateCartBtn(btn) {
  btn.classList.add("added");
  setTimeout(() => btn.classList.remove("added"), 800);
}

// ── Product Modal ────────────────────────────────────────────
export function openProductModal(product) {
  const modal = $("#productModal");
  const modalBody = $("#productModalBody");

  modalBody.innerHTML = `
    <div class="row g-0">
      <div class="col-md-5">
        <div class="modal-img-wrap">
          <img src="${product.image}" alt="${product.name}" class="modal-product-img"
            onerror="this.src='https://placehold.co/500x400/1a1f2e/5d5dff?text=Ignite+Product'">
        </div>
      </div>
      <div class="col-md-7 p-4">
        <p class="modal-category text-uppercase">${product.category}</p>
        <h2 class="modal-title-name">${product.name}</h2>
        <div class="d-flex align-items-center gap-2 mb-3">
          <div class="stars">${stars(product.rating)}</div>
          <span class="text-muted small">${product.rating} (${product.reviews.toLocaleString()} reviews)</span>
        </div>
        <div class="modal-price-block mb-3">
          <span class="modal-price">${fmt(product.price)}</span>
          ${product.originalPrice ? `<span class="modal-price-orig">${fmt(product.originalPrice)}</span>` : ""}
          ${product.originalPrice
            ? `<span class="badge bg-danger ms-2">Save ${fmt(product.originalPrice - product.price)}</span>`
            : ""}
        </div>
        <p class="modal-desc">${product.description}</p>
        <ul class="modal-features">
          ${product.features.map((f) => `<li><i class="bi bi-check-circle-fill"></i> ${f}</li>`).join("")}
        </ul>
        <div class="modal-tags mb-4">
          ${product.tags.map((t) => `<span class="tag-chip">#${t}</span>`).join("")}
        </div>
        <div class="d-flex align-items-center gap-3 mb-3">
          <div class="qty-control">
            <button class="qty-btn" id="qtyMinus" aria-label="Decrease quantity"><i class="bi bi-dash"></i></button>
            <span class="qty-val" id="qtyVal">1</span>
            <button class="qty-btn" id="qtyPlus" aria-label="Increase quantity"><i class="bi bi-plus"></i></button>
          </div>
          <button class="btn-modal-cart btn-ignite flex-grow-1" id="modalAddCart">
            <i class="bi bi-bag-plus-fill me-2"></i> Add to Cart
          </button>
        </div>
        <p class="stock-text">${product.stock <= 10 ? `<span class="text-warning fw-bold">⚡ Only ${product.stock} units left</span>` : `✅ ${product.stock} units in stock`}</p>
      </div>
    </div>`;

  let qty = 1;
  const qtyVal = modalBody.querySelector("#qtyVal");
  modalBody.querySelector("#qtyMinus").addEventListener("click", () => {
    if (qty > 1) qtyVal.textContent = --qty;
  });
  modalBody.querySelector("#qtyPlus").addEventListener("click", () => {
    if (qty < product.stock) qtyVal.textContent = ++qty;
  });
  modalBody.querySelector("#modalAddCart").addEventListener("click", () => {
    Cart.addToCart(product, qty);
    showToast(`${product.name} × ${qty} added to cart 🛒`, "success");
    bootstrap.Modal.getInstance(modal)?.hide();
  });

  bootstrap.Modal.getOrCreateInstance(modal).show();
}

// ── Cart Sidebar ─────────────────────────────────────────────
export function renderCartSidebar() {
  const cartItems = Cart.getCart();
  const summary = Cart.getSummary();
  const container = $("#cartItemsContainer");
  const emptyMsg = $("#cartEmpty");
  const cartFooter = $("#cartFooter");

  // badge
  $$("#cartBadge").forEach((el) => {
    el.textContent = summary.totalItems;
    el.classList.toggle("d-none", summary.totalItems === 0);
  });

  if (cartItems.length === 0) {
    container.innerHTML = "";
    emptyMsg.classList.remove("d-none");
    cartFooter.classList.add("d-none");
    return;
  }

  emptyMsg.classList.add("d-none");
  cartFooter.classList.remove("d-none");

  container.innerHTML = cartItems
    .map(
      (item) => `
      <div class="cart-item" data-id="${item.id}">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img"
          onerror="this.src='https://placehold.co/80x80/1a1f2e/5d5dff?text=IMG'">
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-price">${fmt(item.price)}</p>
          <div class="qty-control small-qty">
            <button class="qty-btn cart-qty-minus" data-id="${item.id}" aria-label="Decrease quantity"><i class="bi bi-dash"></i></button>
            <span>${item.qty}</span>
            <button class="qty-btn cart-qty-plus" data-id="${item.id}" aria-label="Increase quantity"><i class="bi bi-plus"></i></button>
          </div>
        </div>
        <button class="cart-item-remove" data-id="${item.id}" aria-label="Remove item">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>`
    )
    .join("");

  // subtotal etc
  $("#cartSubtotal").textContent = fmt(summary.subtotal);
  $("#cartShipping").textContent = summary.shipping === 0 ? "FREE" : fmt(summary.shipping);
  $("#cartTax").textContent = fmt(summary.tax);
  $("#cartTotal").textContent = fmt(summary.total);

  // bind events
  $$(".cart-qty-minus").forEach((btn) =>
    btn.addEventListener("click", () => Cart.updateQty(+btn.dataset.id, getCartItemQty(btn.dataset.id) - 1))
  );
  $$(".cart-qty-plus").forEach((btn) =>
    btn.addEventListener("click", () => Cart.updateQty(+btn.dataset.id, getCartItemQty(btn.dataset.id) + 1))
  );
  $$(".cart-item-remove").forEach((btn) =>
    btn.addEventListener("click", () => Cart.removeFromCart(+btn.dataset.id))
  );
}

function getCartItemQty(id) {
  return Cart.getCart().find((i) => i.id === +id)?.qty ?? 0;
}

// ── Toast Notifications ──────────────────────────────────────
export function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const id = `toast-${Date.now()}`;
  const icons = { success: "check-circle-fill", danger: "exclamation-triangle-fill", secondary: "heart-fill", warning: "lightning-fill", info: "info-circle-fill" };
  const icon = icons[type] || "info-circle-fill";

  const el = document.createElement("div");
  el.className = `toast toast-ignite align-items-center border-0 show`;
  el.id = id;
  el.setAttribute("role", "alert");
  el.innerHTML = `
    <div class="d-flex align-items-center gap-2 p-3">
      <i class="bi bi-${icon} toast-icon text-${type}"></i>
      <span>${message}</span>
      <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;

  container.appendChild(el);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 400);
  }, 3500);
}

// ── Typewriter Hero ──────────────────────────────────────────
export function initTypewriter(el, words, speed = 100) {
  let wi = 0, ci = 0, deleting = false;
  function tick() {
    const word = words[wi];
    el.textContent = deleting ? word.slice(0, --ci) : word.slice(0, ++ci);
    if (!deleting && ci === word.length) {
      setTimeout(() => { deleting = true; tick(); }, 2000);
      return;
    }
    if (deleting && ci === 0) {
      deleting = false;
      wi = (wi + 1) % words.length;
    }
    setTimeout(tick, deleting ? speed / 2 : speed);
  }
  tick();
}

// ── Scroll animations ────────────────────────────────────────
export function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
    { threshold: 0.1 }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

// ── Counter animation ────────────────────────────────────────
export function animateCounters() {
  const els = document.querySelectorAll("[data-count]");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || "";
      let start = 0;
      const step = () => {
        start += Math.ceil(target / 60);
        el.textContent = (start >= target ? target : start).toLocaleString() + suffix;
        if (start < target) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  els.forEach((el) => observer.observe(el));
}
