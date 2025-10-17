// Load utility functions
const script = document.createElement('script');
script.src = '/js/utils.js';
document.head.appendChild(script);

script.onload = () => {
  const firstName = document.getElementById('firstName');
  const lastName = document.getElementById('lastName');
  const email = document.getElementById('email');
  const errorEl = document.getElementById('error');
  const btn = document.getElementById('continueBtn');

  function validate() {
    const isFirstNameValid = UIUtils.validateRequired(firstName.value, 2);
    const isLastNameValid = UIUtils.validateRequired(lastName.value, 2);
    const isEmailValid = UIUtils.validateEmail(email.value);
    
    const isValid = isFirstNameValid && isLastNameValid && isEmailValid;
    btn.disabled = !isValid;
    btn.classList.toggle('enabled', isValid);
  }

  [firstName, lastName, email].forEach(input => input.addEventListener('input', validate));
  validate();

  btn.addEventListener('click', async () => {
    UIUtils.hideError(errorEl);
    UIUtils.showLoading(btn, 'Kaydediliyor...');
    
    try {
      const data = await apiClient.post('/user/register', {
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        email: email.value.trim()
      });
      
      sessionStorage.setItem('userId', String(data.userId));
      window.location.href = '/wheel.html';
    } catch (error) {
      UIUtils.showError(errorEl, error.message || 'Kayıt işlemi başarısız');
    } finally {
      UIUtils.hideLoading(btn);
    }
  });
};

// Background wheel is handled by iframe in HTML


