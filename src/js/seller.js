// ============================================================
//  IGNITE — Seller / Marketplace Module
//  Lets businesses register a store and list their own products.
//  All data is persisted to localStorage.
// ============================================================

const STORE_KEY = "ignite_seller_store";
const LISTINGS_KEY = "ignite_seller_listings";

// ── Internal state ─────────────────────────────────────────
let store = loadFromStorage(STORE_KEY) || null;
let listings = loadFromStorage(LISTINGS_KEY) || [];

function loadFromStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
  document.dispatchEvent(new CustomEvent("seller:updated", { detail: { store, listings } }));
}

// ── Store operations ────────────────────────────────────────
export function createOrUpdateStore(data) {
  store = { ...store, ...data, createdAt: store?.createdAt || new Date().toISOString() };
  save();
}

export function getStore() {
  return store ? { ...store } : null;
}

export function hasStore() {
  return !!store?.name;
}

// ── Listing operations ──────────────────────────────────────
let nextId = listings.length > 0 ? Math.max(...listings.map((l) => l.id)) + 1 : 9000;

export function addListing(data) {
  const listing = {
    id: nextId++,
    sellerId: store?.name,
    sellerStore: store?.name,
    sellerAvatar: store?.avatar || null,
    name: data.name,
    category: data.category,
    price: parseFloat(data.price),
    originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
    description: data.description,
    image: data.image || `https://placehold.co/400x320/1a1f2e/ff6b35?text=${encodeURIComponent(data.name)}`,
    features: data.features
      ? data.features
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean)
      : [],
    stock: parseInt(data.stock) || 10,
    rating: 0,
    reviews: 0,
    badge: "New Listing",
    badgeType: "info",
    tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [data.category],
    isSellerListing: true,
    createdAt: new Date().toISOString(),
  };
  listings.push(listing);
  save();
  return listing;
}

export function removeListing(id) {
  listings = listings.filter((l) => l.id !== id);
  save();
}

export function updateListing(id, data) {
  const idx = listings.findIndex((l) => l.id === id);
  if (idx < 0) return;
  listings[idx] = { ...listings[idx], ...data };
  save();
}

export function getListings() {
  return [...listings];
}

export function getListingById(id) {
  return listings.find((l) => l.id === id) || null;
}

// ── UI ──────────────────────────────────────────────────────
export function renderSellerDashboard() {
  // Remove any existing dashboard
  document.getElementById("sellerDashboardOverlay")?.remove();

  const hasExistingStore = hasStore();

  const overlay = document.createElement("div");
  overlay.id = "sellerDashboardOverlay";
  overlay.className = "seller-overlay";
  overlay.innerHTML = `
    <div class="seller-dashboard">
      <!-- Sidebar Nav -->
      <aside class="seller-sidebar">
        <div class="seller-sidebar-brand">
          <i class="bi bi-fire" style="color:var(--clr-orange)"></i> Ignite Sellers
        </div>
        <nav class="seller-nav">
          <button class="seller-nav-btn active" data-tab="store">
            <i class="bi bi-shop"></i> My Store
          </button>
          <button class="seller-nav-btn" data-tab="add">
            <i class="bi bi-plus-circle"></i> Add Product
          </button>
          <button class="seller-nav-btn" data-tab="listings">
            <i class="bi bi-grid-3x3-gap"></i> My Listings
            <span class="seller-badge">${listings.length}</span>
          </button>
          <button class="seller-nav-btn" data-tab="analytics">
            <i class="bi bi-bar-chart-line"></i> Analytics
          </button>
        </nav>
        <button class="seller-close-btn" id="sellerDashClose" aria-label="Close dashboard">
          <i class="bi bi-x-lg"></i> Close
        </button>
      </aside>

      <!-- Main Content -->
      <main class="seller-main">

        <!-- ── Store Tab ── -->
        <div class="seller-tab active" id="tab-store">
          <div class="seller-tab-header">
            <h2><i class="bi bi-shop me-2"></i>${hasExistingStore ? "Your Store" : "Create Your Store (Demo)"}</h2>
            <div class="alert alert-info py-2 small mb-3 border-0" style="background:rgba(13,110,253,0.1); color:#0dcaf0">
              <i class="bi bi-info-circle me-2"></i> <strong>Trial Mode:</strong> This is a demonstration interface. Please use mock data for account details.
            </div>
            <p>${hasExistingStore ? "Manage your business profile on Ignite." : "Set up your business presence. It only takes a minute."}</p>
          </div>

          ${
            hasExistingStore
              ? `<div class="store-profile-card">
              <div class="store-avatar-wrap">
                ${store.avatar ? `<img src="${store.avatar}" class="store-avatar-img" alt="${store.name}" onerror="this.style.display='none'">` : `<div class="store-avatar-placeholder"><i class="bi bi-building"></i></div>`}
              </div>
              <div>
                <h3 class="store-name">${store.name}</h3>
                <p class="store-handle">@${store.handle || store.name.toLowerCase().replace(/\s+/g, "")}</p>
                <p class="store-desc-preview">${store.description || "No description yet."}</p>
                <div class="d-flex gap-3 mt-2">
                  <span class="store-stat"><i class="bi bi-box-seam"></i> ${listings.length} listing${listings.length !== 1 ? "s" : ""}</span>
                  <span class="store-stat"><i class="bi bi-calendar3"></i> Since ${new Date(store.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </div>`
              : ""
          }

          <form id="storeForm" class="seller-form" autocomplete="off">
            <div class="form-grid">
              <div class="form-group">
                <label>Business / Store Name <span class="req">*</span></label>
                <input type="text" name="name" id="storeName" placeholder="e.g. Apex Business Co." 
                  value="${store?.name || ""}" required />
              </div>
              <div class="form-group">
                <label>Store Handle</label>
                <div class="input-prefix">
                  <span>@</span>
                  <input type="text" name="handle" id="storeHandle" placeholder="apexbiz" 
                    value="${store?.handle || ""}" />
                </div>
              </div>
              <div class="form-group full">
                <label>Business Description</label>
                <textarea name="description" id="storeDesc" rows="3" 
                  placeholder="What does your business offer? Tell buyers about your brand...">${store?.description || ""}</textarea>
              </div>
              <div class="form-group">
                <label>Store Logo URL</label>
                <input type="url" name="avatar" id="storeAvatar" 
                  placeholder="https://..." value="${store?.avatar || ""}" />
              </div>
              <div class="form-group">
                <label>Location / Country</label>
                <input type="text" name="location" id="storeLocation" 
                  placeholder="e.g. Lagos, Nigeria" value="${store?.location || ""}" />
              </div>
              <div class="form-group">
                <label>Contact Email <span class="req">*</span></label>
                <input type="email" name="email" id="storeEmail" 
                  placeholder="contact@yourbiz.com" value="${store?.email || ""}" required />
              </div>
              <div class="form-group">
                <label>Website (optional)</label>
                <input type="url" name="website" id="storeWebsite" 
                  placeholder="https://yourbusiness.com" value="${store?.website || ""}" />
              </div>
              <div class="form-group">
                <label>Payout Bank Name <span class="muted">(Mock / Test Only)</span> <span class="req">*</span></label>
                <input type="text" name="bank_code" id="storeBankCode" 
                  title="For demonstration: e.g. Test Bank"
                  placeholder="e.g. Test Bank" value="${store?.bank_code || ""}" required />
              </div>
              <div class="form-group">
                <label>Payout Account Number <span class="muted">(Mock / Test Only)</span> <span class="req">*</span></label>
                <input type="text" name="account_number" id="storeAcc" 
                  title="For demonstration only. Do not enter real bank details."
                  placeholder="e.g. 0000000000" value="${store?.account_number || ""}" required />
              </div>
            </div>
            <button type="submit" class="btn-ignite mt-4">
              <i class="bi bi-check-circle me-2"></i>${hasExistingStore ? "Save Changes" : "Launch My Store 🚀"}
            </button>
          </form>
        </div>

        <!-- ── Add Product Tab ── -->
        <div class="seller-tab" id="tab-add">
          <div class="seller-tab-header">
            <h2><i class="bi bi-plus-circle me-2"></i>List a New Product</h2>
            <p>Add products to your Ignite storefront. They'll appear live in the marketplace immediately.</p>
          </div>

          ${
            !hasExistingStore
              ? `<div class="seller-notice">
              <i class="bi bi-info-circle-fill"></i>
              You need to <strong>set up your store first</strong> before listing products.
              <button class="btn-ignite-sm ms-2" onclick="document.querySelector('[data-tab=store]').click()">Set Up Store</button>
            </div>`
              : `<form id="addProductForm" class="seller-form" autocomplete="off">
              <div class="form-grid">
                <div class="form-group full">
                  <label>Product Name <span class="req">*</span></label>
                  <input type="text" name="name" id="pName" placeholder="e.g. Executive Leather Portfolio" required />
                </div>
                <div class="form-group">
                  <label>Category <span class="req">*</span></label>
                  <select name="category" id="pCategory" required>
                    <option value="">Select category...</option>
                    <option value="electronics">Electronics</option>
                    <option value="accessories">Accessories</option>
                    <option value="office">Office</option>
                    <option value="stationery">Stationery</option>
                    <option value="apparel">Apparel</option>
                    <option value="software">Software</option>
                    <option value="services">Services</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Price (USD) <span class="req">*</span></label>
                  <div class="input-prefix"><span>$</span>
                    <input type="number" name="price" id="pPrice" min="0" step="0.01" placeholder="0.00" required />
                  </div>
                </div>
                <div class="form-group">
                  <label>Original Price (for discount badge)</label>
                  <div class="input-prefix"><span>$</span>
                    <input type="number" name="originalPrice" id="pOriginalPrice" min="0" step="0.01" placeholder="0.00 (optional)" />
                  </div>
                </div>
                <div class="form-group">
                  <label>Stock Quantity <span class="req">*</span></label>
                  <input type="number" name="stock" id="pStock" min="1" placeholder="e.g. 25" required />
                </div>
                <div class="form-group">
                  <label>Tags <span class="muted">(comma-separated)</span></label>
                  <input type="text" name="tags" id="pTags" placeholder="leather, executive, portfolio" />
                </div>
                <div class="form-group full">
                  <label>Product Image URL <span class="req">*</span></label>
                  <input type="url" name="image" id="pImage" placeholder="https://... (direct image link)" required />
                  <div id="imagePreviewWrap" class="image-preview-wrap d-none">
                    <img id="imagePreview" src="" alt="Preview" />
                  </div>
                </div>
                <div class="form-group full">
                  <label>Description <span class="req">*</span></label>
                  <textarea name="description" id="pDesc" rows="3" 
                    placeholder="Describe your product — materials, use case, why it's premium..." required></textarea>
                </div>
                <div class="form-group full">
                  <label>Key Features <span class="muted">(one per line)</span></label>
                  <textarea name="features" id="pFeatures" rows="4" 
                    placeholder="Full-grain leather&#10;Fits 15&quot; laptop&#10;Gold-plated zipper&#10;Includes dust bag"></textarea>
                </div>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn-ignite">
                  <i class="bi bi-cloud-upload me-2"></i> Publish Product
                </button>
                <button type="reset" class="btn-outline-ignite">Reset</button>
              </div>
            </form>`
          }
        </div>

        <!-- ── My Listings Tab ── -->
        <div class="seller-tab" id="tab-listings">
          <div class="seller-tab-header">
            <h2><i class="bi bi-grid-3x3-gap me-2"></i>My Listings</h2>
            <p>All your active products on Ignite. Manage, edit, or remove them anytime.</p>
          </div>
          <div id="sellerListingsContainer"></div>
        </div>

        <!-- ── Analytics Tab ── -->
        <div class="seller-tab" id="tab-analytics">
          <div class="seller-tab-header">
            <h2><i class="bi bi-bar-chart-line me-2"></i>Store Analytics</h2>
            <p>Performance overview of your Ignite storefront.</p>
          </div>
          <div class="analytics-grid">
            <div class="analytics-card">
              <i class="bi bi-box-seam"></i>
              <span class="analytics-num">${listings.length}</span>
              <span class="analytics-label">Active Listings</span>
            </div>
            <div class="analytics-card">
              <i class="bi bi-eye"></i>
              <span class="analytics-num">${Math.floor(Math.random() * 900) + 100}</span>
              <span class="analytics-label">Profile Views</span>
            </div>
            <div class="analytics-card">
              <i class="bi bi-cart-check"></i>
              <span class="analytics-num">${Math.floor(Math.random() * 50)}</span>
              <span class="analytics-label">Items Sold</span>
            </div>
            <div class="analytics-card">
              <i class="bi bi-star-fill"></i>
              <span class="analytics-num">${listings.length > 0 ? "—" : "0"}</span>
              <span class="analytics-label">Avg. Rating</span>
            </div>
          </div>
          <div class="analytics-tip">
            <i class="bi bi-lightbulb-fill"></i>
            <strong>Tip:</strong> Listings with images and detailed descriptions get up to 3× more views. Make sure your products shine!
          </div>
        </div>

      </main>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));

  // ── Wire tabs ─────────────────────────────────────────────
  overlay.querySelectorAll(".seller-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      overlay.querySelectorAll(".seller-nav-btn").forEach((b) => b.classList.remove("active"));
      overlay.querySelectorAll(".seller-tab").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      const tab = overlay.querySelector(`#tab-${btn.dataset.tab}`);
      tab?.classList.add("active");
      if (btn.dataset.tab === "listings") renderListingsTable(overlay);
    });
  });

  // ── Close ─────────────────────────────────────────────────
  document.getElementById("sellerDashClose")?.addEventListener("click", closeSellerDashboard);

  // ── Store form ────────────────────────────────────────────
  document.getElementById("storeForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (!data.name || !data.email) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const oldHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = "Setting up secure payouts...";
    submitBtn.disabled = true;

    try {
      // 1. Ask our backend to secretly create a Paystack Subaccount for this Seller
      if (!store?.subaccount_code) {
        // Safe backend check for trial mode
        const baseApi = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
          ? "http://localhost:3000/api" 
          : "https://ignite-backend-mock.vercel.app/api";

        const res = await fetch(`${baseApi}/paystack/subaccount`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_name: data.name,
            settlement_bank: data.bank_code,
            account_number: data.account_number,
          }),
        });

        if (res.ok) {
          const authData = await res.json();
          if (authData.data && authData.data.subaccount_code) {
            // Paystack created the secure Split Payment Subaccount for the Seller!
            data.subaccount_code = authData.data.subaccount_code;
          }
        } else {
          console.warn("Could not create real Paystack subaccount. Using dummy key.");
          data.subaccount_code = "SUB_mock_paystack_code_for_" + data.name;
        }
      }

      createOrUpdateStore(data);
      closeSellerDashboard();
      setTimeout(() => {
        renderSellerDashboard();
        if (!hasExistingStore) {
          setTimeout(() => overlay.querySelector("[data-tab=add]")?.click(), 400);
        }
      }, 50);
      document.dispatchEvent(new CustomEvent("seller:store-saved", { detail: { store: getStore() } }));
    } catch (err) {
      console.error(err);
      alert("Failed to securely setup bank account payments.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = oldHtml;
    }
  });

  // ── Auto-fill store handle from name ─────────────────────
  document.getElementById("storeName")?.addEventListener("input", (e) => {
    const handleEl = document.getElementById("storeHandle");
    if (!handleEl.value) {
      handleEl.value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "");
    }
  });

  // ── Image URL preview ─────────────────────────────────────
  document.getElementById("pImage")?.addEventListener("input", (e) => {
    const wrap = document.getElementById("imagePreviewWrap");
    const img = document.getElementById("imagePreview");
    const url = e.target.value.trim();
    if (url) {
      img.src = url;
      wrap.classList.remove("d-none");
      img.onerror = () => wrap.classList.add("d-none");
    } else {
      wrap.classList.add("d-none");
    }
  });

  // ── Add product form ──────────────────────────────────────
  document.getElementById("addProductForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    const listing = addListing(data);
    e.target.reset();
    document.getElementById("imagePreviewWrap")?.classList.add("d-none");
    document.dispatchEvent(new CustomEvent("seller:listing-added", { detail: { listing } }));
    // Switch to listings tab
    overlay.querySelector("[data-tab=listings]")?.click();
  });

  // Init listings on open
  if (listings.length > 0) renderListingsTable(overlay);
}

function renderListingsTable(container) {
  const wrap = container.querySelector("#sellerListingsContainer");
  if (!wrap) return;

  if (listings.length === 0) {
    wrap.innerHTML = `
      <div class="seller-empty">
        <i class="bi bi-inbox"></i>
        <p>No listings yet. Add your first product!</p>
        <button class="btn-ignite" onclick="document.querySelector('[data-tab=add]').click()">
          <i class="bi bi-plus"></i> Add Product
        </button>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="listings-grid">
      ${listings
        .map(
          (l) => `
        <div class="listing-row" data-id="${l.id}">
          <img src="${l.image}" alt="${l.name}" class="listing-thumb"
            onerror="this.src='https://placehold.co/80x80/1a1f2e/ff6b35?text=IMG'">
          <div class="listing-info">
            <p class="listing-name">${l.name}</p>
            <p class="listing-meta">
              <span class="listing-cat">${l.category}</span>
              <span class="listing-price">$${Number(l.price).toFixed(2)}</span>
              <span class="listing-stock">${l.stock} in stock</span>
            </p>
            <p class="listing-date">Listed ${new Date(l.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
          <div class="listing-actions">
            <button class="listing-btn listing-delete" data-id="${l.id}" aria-label="Remove listing" title="Remove listing">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>`
        )
        .join("")}
    </div>`;

  wrap.querySelectorAll(".listing-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("Remove this listing from Ignite?")) {
        removeListing(+btn.dataset.id);
        document.dispatchEvent(new CustomEvent("seller:listing-removed", { detail: { id: +btn.dataset.id } }));
        closeSellerDashboard();
        setTimeout(renderSellerDashboard, 50);
        setTimeout(() => document.querySelector("[data-tab=listings]")?.click(), 100);
      }
    });
  });
}

export function closeSellerDashboard() {
  const overlay = document.getElementById("sellerDashboardOverlay");
  if (!overlay) return;
  overlay.classList.remove("show");
  setTimeout(() => overlay.remove(), 400);
}
