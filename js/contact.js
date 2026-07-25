/* ============================================================
   CONTACT.JS
   Handles validation + submission for the contact form on
   contact.html. Messages are written to a public-write,
   owner-less Firestore collection ("contactMessages") — anyone
   can send one (no login required), nobody can read them back
   from the client (see firestore.rules), so only you can see
   submissions via the Firebase console.
   ============================================================ */

function showFormBanner(container, type, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="form-banner ${type}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01" stroke-linecap="round"/></svg>
      <span>${message}</span>
    </div>
  `;
}

function clearFieldErrors(form) {
  form.querySelectorAll('.form-field').forEach((field) => field.classList.remove('has-error'));
}

function setFieldError(field, message) {
  field.classList.toggle('has-error', !!message);
  const errorSpan = field.querySelector('.form-field-error span');
  if (errorSpan) errorSpan.textContent = message;
}

function validateContactForm(form) {
  clearFieldErrors(form);
  let isValid = true;

  const rules = [
    { id: 'contact-name', test: (v) => v.trim().length > 0, message: 'Please tell us your name.' },
    { id: 'contact-email', test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), message: 'Please enter a valid email address.' },
    { id: 'contact-subject', test: (v) => !!v, message: 'Please pick a topic.' },
    { id: 'contact-message', test: (v) => v.trim().length >= 10, message: 'Add a little more detail (at least 10 characters).' },
  ];

  rules.forEach(({ id, test, message }) => {
    const input = form.querySelector(`#${id}`);
    const field = input.closest('.form-field');
    const errorMessage = test(input.value) ? '' : message;
    setFieldError(field, errorMessage);
    if (errorMessage) isValid = false;
  });

  if (!isValid) {
    form.querySelector('.form-field.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return isValid;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const banner = form.querySelector('[data-form-banner]');
  const submitBtn = form.querySelector('[data-contact-submit]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (banner) banner.innerHTML = '';
    if (!validateContactForm(form)) return;

    const payload = {
      name: form.querySelector('#contact-name').value.trim(),
      email: form.querySelector('#contact-email').value.trim(),
      phone: form.querySelector('#contact-phone').value.trim(),
      subject: form.querySelector('#contact-subject').value,
      message: form.querySelector('#contact-message').value.trim(),
    };

    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const { db, isFirebaseConfigured, addDoc, collection, serverTimestamp, withOfflineRetry } = window.kkFirebase;
      if (isFirebaseConfigured) {
        await withOfflineRetry(() => addDoc(collection(db, 'contactMessages'), {
          ...payload,
          createdAt: serverTimestamp(),
          status: 'new',
        }));
      }
      form.reset();
      showFormBanner(banner, 'info', "Thanks — we've got your message and will reply within 1-2 business days.");
    } catch (err) {
      console.error('Contact form submission failed:', err);
      showFormBanner(banner, 'error', 'Something went wrong sending your message. Please try again, or email us directly at hello@kheyalkhusi.com.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
});
