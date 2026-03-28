// ============================================================
//  IGNITE — Deals Page Logic
// ============================================================

import products from "../products.js";
import Cart from "../cart.js";
import { buildProductCard } from "../ui.js";

export function initDealsPage() {
  // Countdown timer
  let totalSecs = 3 * 3600 + 45 * 60 + 22;
  function tick() {
    if (totalSecs <= 0) return;
    totalSecs--;
    const h = Math.floor(totalSecs / 3600), m = Math.floor((totalSecs % 3600) / 60), s = totalSecs % 60;
    const pad = (n) => String(n).padStart(2, "0");
    const cdH = document.getElementById("cdHours"), cdM = document.getElementById("cdMins"), cdS = document.getElementById("cdSecs");
    const fc = document.getElementById("flashCountdown");
    if (cdH) cdH.textContent = pad(h);
    if (cdM) cdM.textContent = pad(m);
    if (cdS) cdS.textContent = pad(s);
    if (fc) fc.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    setTimeout(tick, 1000);
  }
  tick();

  // Deal of day button
  document.querySelector(".dotd-cta")?.addEventListener("click", function () {
    const id = +this.dataset.id;
    const product = products.find((p) => p.id === id);
    if (product) {
      Cart.addToCart(product);
    }
  });

  // Flash deals grid — only discounted products
  const dealProducts = products.filter((p) => p.originalPrice && p.originalPrice > p.price);
  const grid = document.getElementById("dealsGrid");
  if (grid) {
    grid.innerHTML = "";
    dealProducts.forEach((p) => grid.appendChild(buildProductCard(p)));
  }
}
