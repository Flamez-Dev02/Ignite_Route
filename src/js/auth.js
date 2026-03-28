// ============================================================
//  IGNITE — Auth Module
//  Handles login/registration tab switching and form logic.
// ============================================================

import { showToast } from "./ui.js";

export function initSigninPage() {
  const signinPane = document.getElementById("paneSignin");
  const registerPane = document.getElementById("paneRegister");
  const tabSignIn = document.getElementById("tabSignIn");
  const tabRegister = document.getElementById("tabRegister");

  function switchTab(tab) {
    if (tab === "register") {
      signinPane?.classList.remove("active");
      registerPane?.classList.add("active");
      tabSignIn?.classList.remove("active");
      tabRegister?.classList.add("active");
    } else {
      registerPane?.classList.remove("active");
      signinPane?.classList.add("active");
      tabRegister?.classList.remove("active");
      tabSignIn?.classList.add("active");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Handle deep link #register
  if (window.location.hash === "#register") switchTab("register");

  tabSignIn?.addEventListener("click", () => switchTab("signin"));
  tabRegister?.addEventListener("click", () => switchTab("register"));
  document.getElementById("navSwitchToRegister")?.addEventListener("click", () => switchTab("register"));
  document.querySelectorAll(".auth-link-btn").forEach((btn) => 
    btn.addEventListener("click", () => switchTab(btn.dataset.switch))
  );

  // Password toggle
  document.querySelectorAll(".pw-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const shown = input.type === "text";
      input.type = shown ? "password" : "text";
      btn.querySelector("i").className = `bi bi-eye${shown ? "" : "-slash"}`;
    });
  });

  // Password strength
  document.getElementById("regPassword")?.addEventListener("input", function () {
    const fill = document.getElementById("pwStrengthFill");
    const label = document.getElementById("pwStrengthLabel");
    const v = this.value;
    let score = 0;
    if (v.length >= 8) score++;
    if (v.length >= 12) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;

    const configs = [
      { w: "0%", c: "transparent", t: "Enter a password" },
      { w: "25%", c: "#dc3545", t: "Weak" },
      { w: "50%", c: "#fd7e14", t: "Fair" },
      { w: "75%", c: "#ffc107", t: "Good" },
      { w: "90%", c: "#22c55e", t: "Strong" },
      { w: "100%", c: "#16a34a", t: "Very Strong" },
    ];
    const cfg = configs[Math.min(score, 5)];
    if (fill) {
      fill.style.width = cfg.w;
      fill.style.background = cfg.c;
    }
    if (label) {
      label.textContent = cfg.t;
      label.style.color = cfg.c;
    }
  });

  // Social login buttons
  document.getElementById("googleLoginBtn")?.addEventListener("click", () => 
    showToast("Google sign-in coming soon!", "info")
  );
  document.getElementById("linkedinLoginBtn")?.addEventListener("click", () => 
    showToast("LinkedIn sign-in coming soon!", "info")
  );

  // Sign In form
  document.getElementById("signinForm")?.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = document.getElementById("siEmail").value;
    const pw = document.getElementById("siPassword").value;
    const btn = document.getElementById("signinSubmit");
    
    btn.disabled = true;
    btn.querySelector(".btn-text").classList.add("d-none");
    btn.querySelector(".btn-loader").classList.remove("d-none");

    setTimeout(() => {
      btn.disabled = false;
      btn.querySelector(".btn-text").classList.remove("d-none");
      btn.querySelector(".btn-loader").classList.add("d-none");
      if (email && pw.length >= 4) {
        localStorage.setItem("ignite_user", JSON.stringify({ email, loggedIn: true }));
        showToast("Welcome back! Redirecting...", "success");
        setTimeout(() => (window.location.href = "index.html"), 1500);
      } else {
        showToast("Invalid credentials. Please try again.", "danger");
      }
    }, 1800);
  });

  // Register form — Collect info, then redirect to payment
  document.getElementById("registerForm")?.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = document.getElementById("regEmail").value;
    const firstName = document.getElementById("regFirst").value;
    const lastName = document.getElementById("regLast").value;
    
    if (!document.getElementById("regTerms").checked) {
      showToast("Please accept the terms to continue.", "warning");
      return;
    }

    // Save user data temporarily so we can complete registration after payment
    sessionStorage.setItem("ignite_pending_user", JSON.stringify({
      email, name: `${firstName} ${lastName}`, firstName, lastName
    }));

    // Show plan picker
    showPlanPicker(email, firstName);
  });

  // Check if user just came back from a successful subscription payment
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("subscribed") === "true") {
    const pending = JSON.parse(sessionStorage.getItem("ignite_pending_user") || "null");
    if (pending) {
      localStorage.setItem("ignite_user", JSON.stringify({ ...pending, loggedIn: true, subscribed: true }));
      sessionStorage.removeItem("ignite_pending_user");
      showToast(`Welcome to Ignite, ${pending.firstName || pending.name}! 🎉 Payment confirmed.`, "success");
      setTimeout(() => (window.location.href = "index.html"), 2000);
    }
  }

  // ── Plan Picker for Subscription ──────────────────────────
  function showPlanPicker(email, name) {
    document.getElementById("planPickerOverlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "planPickerOverlay";
    overlay.innerHTML = `
      <div class="payment-picker-backdrop"></div>
      <div class="payment-picker-card plan-picker-card">
        <button class="payment-picker-close" id="planPickerClose" aria-label="Close">
          <i class="bi bi-x-lg"></i>
        </button>
        <div class="payment-picker-header">
          <i class="bi bi-fire" style="color:var(--clr-primary)"></i>
          <h3>Choose Your Plan</h3>
          <p>Select a plan to activate your Ignite account</p>
        </div>
        <div class="plan-picker-options">
          <div class="plan-card" data-plan="starter">
            <div class="plan-badge">Popular</div>
            <h4>Starter</h4>
            <div class="plan-price">₦5,000<span>/one-time</span></div>
            <ul>
              <li><i class="bi bi-check-circle-fill"></i> Full marketplace access</li>
              <li><i class="bi bi-check-circle-fill"></i> Up to 10 product listings</li>
              <li><i class="bi bi-check-circle-fill"></i> Standard support</li>
            </ul>
            <button class="btn-plan-select" data-plan="starter">Select Starter</button>
          </div>
          <div class="plan-card featured" data-plan="pro">
            <div class="plan-badge">Best Value</div>
            <h4>Pro</h4>
            <div class="plan-price">₦15,000<span>/one-time</span></div>
            <ul>
              <li><i class="bi bi-check-circle-fill"></i> Unlimited product listings</li>
              <li><i class="bi bi-check-circle-fill"></i> Priority support</li>
              <li><i class="bi bi-check-circle-fill"></i> Store analytics</li>
              <li><i class="bi bi-check-circle-fill"></i> Featured placement</li>
            </ul>
            <button class="btn-plan-select" data-plan="pro">Select Pro</button>
          </div>
          <div class="plan-card" data-plan="elite">
            <div class="plan-badge">Premium</div>
            <h4>Elite</h4>
            <div class="plan-price">₦50,000<span>/one-time</span></div>
            <ul>
              <li><i class="bi bi-check-circle-fill"></i> Everything in Pro</li>
              <li><i class="bi bi-check-circle-fill"></i> Dedicated account manager</li>
              <li><i class="bi bi-check-circle-fill"></i> Custom store branding</li>
              <li><i class="bi bi-check-circle-fill"></i> Priority shipping badge</li>
            </ul>
            <button class="btn-plan-select" data-plan="elite">Select Elite</button>
          </div>
        </div>
        <div class="payment-picker-footer">
          <i class="bi bi-lock-fill"></i> All payments are secure. 100% money-back guarantee within 7 days.
        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));

    overlay.querySelector("#planPickerClose").addEventListener("click", () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 300);
    });
    overlay.querySelector(".payment-picker-backdrop").addEventListener("click", () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 300);
    });

    overlay.querySelectorAll(".btn-plan-select").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const plan = btn.dataset.plan;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Connecting...';
        btn.disabled = true;

        // Try Paystack first, fall back to Flutterwave, then mock
        try {
          const res = await fetch("http://localhost:3000/api/paystack/subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, plan_name: plan }),
          });
          if (res.ok) {
            const data = await res.json();
            window.location.href = data.authorization_url;
            return;
          }
          throw new Error("Paystack subscription failed");
        } catch (e1) {
          try {
            const res2 = await fetch("http://localhost:3000/api/flutterwave/subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, plan_name: plan, name }),
            });
            if (res2.ok) {
              const data2 = await res2.json();
              window.location.href = data2.authorization_url;
              return;
            }
            throw new Error("Flutterwave subscription failed");
          } catch (e2) {
            // Mock fallback for testing without real API keys
            console.warn("No payment backend available. Mocking subscription.");
            showToast("Test mode: Mocking subscription payment. Add real API keys to .env", "warning");
            overlay.classList.remove("show");
            setTimeout(() => overlay.remove(), 300);
            localStorage.setItem("ignite_user", JSON.stringify({ email, name, loggedIn: true, subscribed: true, plan }));
            showToast(`Welcome to Ignite, ${name}! 🎉 ${plan} plan activated.`, "success");
            setTimeout(() => (window.location.href = "index.html"), 2000);
          }
        }
      });
    });
  }
}
