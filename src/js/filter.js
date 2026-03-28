// ============================================================
//  IGNITE — Search & Filter Module
//  Handles real-time search, category filtering, and sorting.
// ============================================================

import { buildProductCard } from "./ui.js";

let allProducts = [];
let currentCategory = "all";
let currentSort = "default";
let currentSearch = "";

const grid = () => document.getElementById("productsGrid");
const countEl = () => document.getElementById("productCount");

export function initFilter(products) {
  allProducts = products;
  render();
}

export function setCategory(cat) {
  currentCategory = cat;
  render();
}

export function setSort(sort) {
  currentSort = sort;
  render();
}

export function setSearch(query) {
  currentSearch = query.toLowerCase().trim();
  render();
}

function getFiltered() {
  let list = [...allProducts];

  // Category filter
  if (currentCategory !== "all") {
    list = list.filter((p) => p.category === currentCategory);
  }

  // Search filter
  if (currentSearch) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(currentSearch) ||
        p.category.toLowerCase().includes(currentSearch) ||
        p.tags.some((t) => t.toLowerCase().includes(currentSearch)) ||
        p.description.toLowerCase().includes(currentSearch)
    );
  }

  // Sort
  switch (currentSort) {
    case "price-asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      list.sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
      list.sort((a, b) => b.id - a.id);
      break;
    default:
      break;
  }

  return list;
}

function render() {
  const g = grid();
  const filtered = getFiltered();

  // Animate out
  g.style.opacity = "0";
  g.style.transform = "translateY(10px)";

  setTimeout(() => {
    g.innerHTML = "";

    if (filtered.length === 0) {
      g.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="empty-state">
            <i class="bi bi-search" style="font-size:3rem;color:var(--clr-orange);opacity:0.5"></i>
            <h4 class="mt-3" style="color:var(--clr-text-muted)">No products found</h4>
            <p style="color:var(--clr-text-muted)">Try adjusting your search or filter.</p>
            <button class="btn-ignite mt-2" onclick="window.igniteResetFilters()">Clear Filters</button>
          </div>
        </div>`;
    } else {
      filtered.forEach((p) => g.appendChild(buildProductCard(p)));
    }

    // Count
    if (countEl()) {
      countEl().textContent = `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`;
    }

    // Animate in
    g.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    g.style.opacity = "1";
    g.style.transform = "translateY(0)";
  }, 200);
}

export function resetFilters() {
  currentCategory = "all";
  currentSort = "default";
  currentSearch = "";
  document.getElementById("searchInput").value = "";
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById("filterAll")?.classList.add("active");
  document.getElementById("sortSelect").value = "default";
  render();
}
