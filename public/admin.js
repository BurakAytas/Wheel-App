const loginDiv = document.getElementById('login');
const panelDiv = document.getElementById('panel');
const username = document.getElementById('username');
const password = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginErr = document.getElementById('loginErr');
const rowsTbody = document.getElementById('rows');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const configBtn = document.getElementById('configBtn');
const deleteBtn = document.getElementById('deleteBtn');
const selectAllCb = document.getElementById('selectAll');

// Load utility functions
const script = document.createElement('script');
script.src = '/js/utils.js';
document.head.appendChild(script);

script.onload = () => {
  let token = localStorage.getItem('adminToken') || '';

  // Ensure initial visibility states
  if (loginDiv) loginDiv.style.display = '';
  if (panelDiv) panelDiv.style.display = 'none';

  function setAuth(t) {
    token = t;
    if (t) localStorage.setItem('adminToken', t); else localStorage.removeItem('adminToken');
  }

  async function fetchSpins() {
    return apiClient.get('/admin/spins', { Authorization: `Bearer ${token}` });
  }

  async function toggleApprove(id, approved) {
    await apiClient.post(`/admin/spins/${id}/approve`, { approved }, { Authorization: `Bearer ${token}` });
  }

function renderRows(list) {
  rowsTbody.innerHTML = '';
  if (!list || list.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="text-align:center; color:#6b7280; padding: 16px;">Kayıt bulunamadı</td>`;
    rowsTbody.appendChild(tr);
    return;
  }
  for (const r of list) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="row-select" data-id="${r.spin_id}" /></td>
      <td>${r.first_name}</td>
      <td>${r.last_name}</td>
      <td>${r.email}</td>
      <td>${r.section_label}</td>
      <td><input type="checkbox" ${r.approved ? 'checked' : ''} /></td>
    `;
    const cb = tr.querySelector('input[type=checkbox]:not(.row-select)');
    cb.addEventListener('change', async () => {
      await toggleApprove(r.spin_id, cb.checked);
    });
    rowsTbody.appendChild(tr);
  }
  if (selectAllCb) selectAllCb.checked = false;
}

async function showPanel() {
  try {
    const list = await fetchSpins();
    if (loginDiv) loginDiv.style.display = 'none';
    if (panelDiv) panelDiv.style.display = 'block';
    renderRows(list);
  } catch (e) {
    const alertEl = document.getElementById('panelErr');
    if (alertEl) {
      alertEl.textContent = 'Veriler yüklenemedi. Lütfen tekrar giriş yapın.';
      alertEl.style.display = '';
    }
    setAuth('');
    if (loginDiv) loginDiv.style.display = '';
    if (panelDiv) panelDiv.style.display = 'none';
  }
}

  if (loginBtn) loginBtn.addEventListener('click', async () => {
    UIUtils.hideError(loginErr);
    UIUtils.showLoading(loginBtn, 'Giriş yapılıyor...');
    
    try {
      const data = await apiClient.post('/auth/login', {
        username: username.value.trim(),
        password: password.value
      });
      
      setAuth(data.token);
      await showPanel();
    } catch (error) {
      UIUtils.showError(loginErr, error.message || 'Giriş başarısız');
    } finally {
      UIUtils.hideLoading(loginBtn);
    }
  });

if (token) {
  showPanel();
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    setAuth('');
    username.value = '';
    password.value = '';
    loginErr.textContent = '';
    if (loginDiv) loginDiv.style.display = '';
    if (panelDiv) panelDiv.style.display = 'none';
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    try {
      const list = await fetchSpins();
      renderRows(list);
    } catch (e) {
      // ignore
    }
  });
}

if (configBtn) {
  configBtn.addEventListener('click', () => {
    window.location.href = '/admin-config';
  });
}

if (selectAllCb) {
  selectAllCb.addEventListener('change', () => {
    const boxes = rowsTbody.querySelectorAll('.row-select');
    boxes.forEach(b => { b.checked = selectAllCb.checked; });
  });
}

async function bulkDeleteSelected() {
  const ids = Array.from(rowsTbody.querySelectorAll('.row-select:checked')).map(i => Number(i.getAttribute('data-id')));
  if (ids.length === 0) return;
  if (!confirm(`${ids.length} kayıt silinsin mi?`)) return;
  const res = await fetch('/api/admin/spins/bulk-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ids })
  });
  if (res.ok) {
    const list = await fetchSpins();
    renderRows(list);
  }
}

  if (deleteBtn) {
    deleteBtn.addEventListener('click', bulkDeleteSelected);
  }
};


