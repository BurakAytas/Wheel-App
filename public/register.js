const firstName = document.getElementById('firstName');
const lastName = document.getElementById('lastName');
const email = document.getElementById('email');
const errorEl = document.getElementById('error');
const btn = document.getElementById('continueBtn');

function validate() {
  const ok = firstName.value.trim() && lastName.value.trim() && email.validity.valid;
  btn.disabled = !ok;
  btn.classList.toggle('enabled', ok);
}

[firstName, lastName, email].forEach(i => i.addEventListener('input', validate));
validate();

btn.addEventListener('click', async () => {
  errorEl.textContent = '';
  btn.disabled = true;
  try {
    const res = await fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        email: email.value.trim()
      })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Bir hata oluştu';
      btn.disabled = false;
      return;
    }
    sessionStorage.setItem('userId', String(data.userId));
    sessionStorage.setItem('spinToken', data.spinToken);
    window.location.href = '/wheel.html';
  } catch (e) {
    errorEl.textContent = 'Sunucuya bağlanılamadı';
    btn.disabled = false;
  }
});

// Background wheel is handled by iframe in HTML


