// ============================================================
//  IGNITE — Shop Page Logic
// ============================================================

import products from "../products.js";
import { getListings } from "../seller.js";
import { buildProductCard } from "../ui.js";

export function initShopPage() {
  const allProds = [...products, ...getListings()];
  let minPrice = 0, maxPrice = 1500, minRating = 0, inStockOnly = false;
  let currentCat = "all", currentSort = "default", currentSearch = "";

  const grid = document.getElementById("productsGrid");
  const cnt1 = document.getElementById("productCount");
  const cnt2 = document.getElementById("productCount2");

  function getFiltered() {
    return allProds.filter((p) => {
      if (currentCat !== "all" && p.category !== currentCat) return false;
      if (p.price < minPrice || p.price > maxPrice) return false;
      if (p.rating < minRating) return false;
      if (inStockOnly && p.stock === 0) return false;
      if (currentSearch && 
          !p.name.toLowerCase().includes(currentSearch) && 
          !p.category.toLowerCase().includes(currentSearch) && 
          !(p.tags || []).some(t => t.toLowerCase().includes(currentSearch))) {
        return false;
      }
      return true;
    });
  }

  function sortProds(list) {
    switch (currentSort) {
      case "price-asc": list.sort((a, b) => a.price - b.price); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
      case "newest": list.sort((a, b) => b.id - a.id); break;
    }
    return list;
  }

  function renderGrid() {
    if (!grid) return;
    grid.style.opacity = "0.5";
    grid.style.pointerEvents = "none";
    
    setTimeout(() => {
      const filtered = sortProds(getFiltered());
      const label = `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`;
      if (cnt1) cnt1.textContent = label;
      if (cnt2) cnt2.textContent = label;

      grid.innerHTML = "";
      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="col-12 text-center py-5">
            <i class="bi bi-search" style="font-size:2.5rem;opacity:0.3;display:block;margin-bottom:12px"></i>
            <p class="text-muted">No products match your filters.</p>
            <button class="btn-ignite" id="clearFiltersInline">Clear Filters</button>
          </div>`;
        document.getElementById("clearFiltersInline")?.addEventListener("click", () => document.getElementById("clearFiltersBtn").click());
      } else {
        filtered.forEach((p) => grid.appendChild(buildProductCard(p)));
      }
      grid.style.opacity = "1";
      grid.style.pointerEvents = "all";
    }, 200);
  }

  // Event Listeners
  document.querySelectorAll('input[name="category"]').forEach((r) => 
    r.addEventListener("change", () => { currentCat = r.value; renderGrid(); })
  );
  document.querySelectorAll('input[name="rating"]').forEach((r) => 
    r.addEventListener("change", () => { minRating = parseFloat(r.value); renderGrid(); })
  );
  document.getElementById("inStockOnly")?.addEventListener("change", (e) => { inStockOnly = e.target.checked; renderGrid(); });

  const pMin = document.getElementById("priceMin"), pMax = document.getElementById("priceMax");
  const pMinL = document.getElementById("priceMinLabel"), pMaxL = document.getElementById("priceMaxLabel");

  if (pMin && pMax) {
    pMin.addEventListener("input", () => {
      minPrice = +pMin.value;
      if (minPrice > maxPrice) { maxPrice = minPrice + 50; pMax.value = maxPrice; }
      pMinL.textContent = `$${minPrice}`;
      renderGrid();
    });
    pMax.addEventListener("input", () => {
      maxPrice = +pMax.value;
      if (maxPrice < minPrice) { minPrice = maxPrice - 50; pMin.value = minPrice; }
      pMaxL.textContent = `$${maxPrice.toLocaleString()}`;
      renderGrid();
    });
  }

  document.getElementById("clearFiltersBtn")?.addEventListener("click", () => {
    currentCat = "all"; currentSort = "default"; currentSearch = ""; minPrice = 0; maxPrice = 1500; minRating = 0; inStockOnly = false;
    const catFirst = document.querySelector('input[name="category"][value="all"]');
    if (catFirst) catFirst.checked = true;
    const ratFirst = document.querySelector('input[name="rating"][value="0"]');
    if (ratFirst) ratFirst.checked = true;
    if (document.getElementById("inStockOnly")) document.getElementById("inStockOnly").checked = false;
    if (pMin) { pMin.value = 0; pMinL.textContent = "$0"; }
    if (pMax) { pMax.value = 1500; pMaxL.textContent = "$1,500"; }
    const si = document.getElementById("searchInput"); if (si) si.value = "";
    const ss = document.getElementById("sortSelect"); if (ss) ss.value = "default";
    renderGrid();
  });

  document.getElementById("sortSelect")?.addEventListener("change", (e) => { currentSort = e.target.value; renderGrid(); });

  const si = document.getElementById("searchInput");
  let dt;
  si?.addEventListener("input", () => {
    clearTimeout(dt);
    dt = setTimeout(() => { currentSearch = si.value.toLowerCase().trim(); renderGrid(); }, 280);
  });

  document.getElementById("gridViewBtn")?.addEventListener("click", function () {
    grid?.classList.remove("list-view");
    this.classList.add("active");
    document.getElementById("listViewBtn")?.classList.remove("active");
  });
  document.getElementById("listViewBtn")?.addEventListener("click", function () {
    grid?.classList.add("list-view");
    this.classList.add("active");
    document.getElementById("gridViewBtn")?.classList.remove("active");
  });

  renderGrid();
}
