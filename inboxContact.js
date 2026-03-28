// ===== Contact Form Validation & Submission =====
// Vanilla JS version of inboxContact.jsx

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const fields = {
    name: form.querySelector('input[name="name"]'),
    email: form.querySelector('input[name="email"]'),
    message: form.querySelector('textarea[name="message"]')
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.textContent : 'Launch Message';

  // --- Helpers ---

  // Validate email format
  function validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim());
  }

  // Show error under a field
  function showError(field, message) {
    clearError(field);
    field.classList.add('input-error');
    const errorSpan = document.createElement('span');
    errorSpan.className = 'error-message text-danger small d-block mt-1';
    errorSpan.textContent = message;
    field.parentElement.appendChild(errorSpan);
  }

  // Clear error from a field
  function clearError(field) {
    field.classList.remove('input-error');
    const existing = field.parentElement.querySelector('.error-message');
    if (existing) existing.remove();
  }

  // Show success banner
  function showSuccess() {
    // Remove any existing success message
    const existingMsg = document.querySelector('.success-message');
    if (existingMsg) existingMsg.remove();

    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.setAttribute('role', 'alert');
    successDiv.style.cssText = `
      background: rgba(0, 200, 100, 0.15);
      border: 1px solid rgba(0, 200, 100, 0.4);
      color: #00c864;
      padding: 15px 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      text-align: center;
      font-weight: 600;
      animation: fadeIn 0.4s ease;
    `;
    successDiv.textContent = '✓ Message sent successfully!';

    form.parentElement.insertBefore(successDiv, form);

    // Remove after 4 seconds
    setTimeout(() => {
      successDiv.style.opacity = '0';
      successDiv.style.transition = 'opacity 0.4s ease';
      setTimeout(() => successDiv.remove(), 400);
    }, 4000);
  }

  // --- Validate all fields ---
  function validateForm() {
    const errors = {};

    if (fields.name.value.trim() === '') {
      errors.name = 'Please enter your name.';
    }

    if (fields.email.value.trim() === '') {
      errors.email = 'Please enter your email.';
    } else if (!validateEmail(fields.email.value)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (fields.message.value.trim() === '') {
      errors.message = 'Please enter your message.';
    }

    return errors;
  }

  // --- Clear errors on typing ---
  Object.keys(fields).forEach(key => {
    fields[key].addEventListener('input', () => {
      clearError(fields[key]);
    });
  });

  // --- Handle form submission ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate
    const errors = validateForm();
    // Clear all previous errors first
    Object.values(fields).forEach(field => clearError(field));

    if (Object.keys(errors).length > 0) {
      // Show errors
      Object.keys(errors).forEach(key => {
        showError(fields[key], errors[key]);
      });
      return;
    }

    // Disable button & show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      // Submit to Formspree
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        showSuccess();
        form.reset();
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      // Restore button
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});
