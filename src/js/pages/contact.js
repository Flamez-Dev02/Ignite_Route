// ============================================================
//  IGNITE — Contact Page Logic
//  Handles validation and Formspree submission.
// ============================================================

import { showToast } from "../ui.js";

export function initContactPage() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const fields = {
    name: form.querySelector('input[name="name"]'),
    email: form.querySelector('input[name="email"]'),
    message: form.querySelector('textarea[name="message"]')
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = "Launch Message";

  // --- Helpers ---
  function validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
  }

  function showError(field, message) {
    clearError(field);
    field.classList.add('is-invalid');
    const errorSpan = document.createElement('span');
    errorSpan.className = 'error-message text-danger small d-block mt-1';
    errorSpan.textContent = message;
    field.parentElement.appendChild(errorSpan);
  }

  function clearError(field) {
    field.classList.remove('is-invalid');
    const existing = field.parentElement.querySelector('.error-message');
    if (existing) existing.remove();
  }

  function validateForm() {
    let isValid = true;
    if (fields.name.value.trim() === '') {
      showError(fields.name, 'Please enter your name.');
      isValid = false;
    }
    if (fields.email.value.trim() === '') {
      showError(fields.email, 'Please enter your email.');
      isValid = false;
    } else if (!validateEmail(fields.email.value)) {
      showError(fields.email, 'Please enter a valid email address.');
      isValid = false;
    }
    if (fields.message.value.trim() === '') {
      showError(fields.message, 'Please enter your message.');
      isValid = false;
    }
    return isValid;
  }

  // Clear errors on typing
  Object.keys(fields).forEach(key => {
    fields[key]?.addEventListener('input', () => clearError(fields[key]));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    
    // Disable button & show loading state
    submitBtn.disabled = true;
    const btnContent = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Sending...';

    try {
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        showToast("✓ Message sent successfully! We'll be in touch. ✉️", "success");
        form.reset();
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast("Failed to send message. Please try again.", "danger");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = btnContent;
    }
  });
}
