const rowsTbody = document.getElementById('rows');
const errEl = document.getElementById('err');
const reloadBtn = document.getElementById('reloadBtn');
const saveBtn = document.getElementById('saveBtn');
const backBtn = document.getElementById('backBtn');
const sectionToggle = document.getElementById('sectionToggle');
const wheelSection = document.getElementById('wheelSection');
const campaignSection = document.getElementById('campaignSection');
const campaignRows = document.getElementById('campaignRows');
const addNewCampaign = document.getElementById('addNewCampaign');
const imageBtn = document.getElementById('imageBtn');
const imagePopup = document.getElementById('imagePopup');
const closeImagePopup = document.getElementById('closeImagePopup');
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const imagesList = document.getElementById('imagesList');
const imageViewerPopup = document.getElementById('imageViewerPopup');
const closeImageViewer = document.getElementById('closeImageViewer');
const viewerImage = document.getElementById('viewerImage');
const imageViewerTitle = document.getElementById('imageViewerTitle');
const imageViewerUrl = document.getElementById('imageViewerUrl');
const copyImageUrl = document.getElementById('copyImageUrl');
let dirty = false;
let currentSection = 'wheel';

let token = localStorage.getItem('adminToken') || '';

function requireAuth() {
  if (!token) {
    window.location.href = '/admin';
  }
}

function renderRows(list) {
  rowsTbody.innerHTML = '';
  for (const s of list) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.section_index + 1}</td>
      <td><input type="text" value="${s.label}" data-id="${s.id}" data-key="label" /></td>
      <td><input type="text" value="${s.message}" data-id="${s.id}" data-key="message" /></td>
      <td><input type="number" min="0" max="100" step="0.1" value="${(Number(s.weight) * 100).toFixed(1)}" data-id="${s.id}" data-key="weightPercent" /></td>
    `;
    rowsTbody.appendChild(tr);
  }
  rowsTbody.querySelectorAll('input').forEach(i => {
    i.addEventListener('input', () => {
      dirty = true;
      saveBtn.disabled = false;
    });
  });
}

async function loadSections() {
  errEl.textContent = '';
  console.log('Loading sections with token:', token ? 'Present' : 'Missing');
  
  try {
    const res = await fetch(`/api/admin/wheel-sections?t=${Date.now()}`, { 
      headers: { 
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      } 
    });
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      if (res.status === 401) return (window.location.href = '/admin');
      const errorText = await res.text();
      console.error('Error response:', errorText);
      errEl.textContent = `Yüklenemedi: ${res.status} - ${errorText}`;
      return;
    }
    const data = await res.json();
    console.log('Loaded sections:', data);
    renderRows(data);
  } catch (error) {
    console.error('Fetch error:', error);
    errEl.textContent = `Bağlantı hatası: ${error.message}`;
  }
}

async function saveSections() {
  errEl.textContent = '';
  const inputs = rowsTbody.querySelectorAll('input');
  const map = new Map();
  inputs.forEach(i => {
    const id = Number(i.getAttribute('data-id'));
    const key = i.getAttribute('data-key');
    if (!map.has(id)) map.set(id, { id });
    if (key === 'weightPercent') {
      map.get(id)['weight'] = Math.max(0, Math.min(100, Number(i.value) || 0)) / 100;
    } else {
      map.get(id)[key] = i.type === 'number' ? Number(i.value) : i.value;
    }
  });
  const sections = Array.from(map.values());
  const totalPercent = sections.reduce((a,b) => a + ((Number(b.weight) || 0) * 100), 0);
  if (Math.abs(totalPercent - 100) > 0.1) {
    errEl.textContent = `Ağırlıkların toplamı 100 olmalı. Şu an: ${totalPercent.toFixed(1)}`;
    return;
  }
  const res = await fetch('/api/admin/wheel-sections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sections })
  });
  if (!res.ok) { errEl.textContent = 'Kaydedilemedi'; return; }
  await loadSections();
  dirty = false;
  saveBtn.disabled = true;
}

// Kampanya ekleme fonksiyonu
async function addCampaign() {
  const title = document.getElementById('campaignTitle').value;
  const link = document.getElementById('campaignLink').value;
  
  try {
    const response = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, link })
    });
    
    if (!response.ok) throw new Error('Kampanya eklenemedi');
    
    const campaign = await response.json();
    addCampaignToTable(campaign);
    document.getElementById('campaignTitle').value = '';
    document.getElementById('campaignLink').value = '';
  } catch (error) {
    console.error('Hata:', error);
    alert('Kampanya eklenirken bir hata oluştu');
  }
}

// Kampanyaları yükle
async function loadCampaigns() {
  try {
    const response = await fetch('/api/admin/campaigns');
    if (!response.ok) throw new Error('Kampanyalar yüklenemedi');
    
    const campaigns = await response.json();
    const tbody = document.getElementById('campaignRows');
    tbody.innerHTML = '';
    
    campaigns.forEach((campaign, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${campaign.title}</td>
        <td>${campaign.link || '-'}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Kampanyalar yüklenirken hata:', error);
  }
}

// Yeni kampanya ekle
async function saveCampaign(title, link) {
  try {
    const response = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, link })
    });

    if (!response.ok) throw new Error('Kampanya eklenemedi');
    
    // Kampanyaları yeniden yükle
    await loadCampaigns();
  } catch (error) {
    console.error('Kampanya eklenirken hata:', error);
  }
}

reloadBtn.addEventListener('click', () => {
  // Force reload with cache busting
  loadSections();
});
saveBtn.addEventListener('click', saveSections);
saveBtn.disabled = true;

// Ensure save button is visible by default (wheel sections tab)
if (saveBtn) {
  saveBtn.style.display = 'inline-block';
}

// Slide animation function
function slideToSection(targetSection) {
  const wheelSection = document.getElementById('wheelSection');
  const campaignSection = document.getElementById('campaignSection');
  const sectionName = document.getElementById('sectionName');
  
  if (targetSection === 'campaign') {
    // Slide out wheel section to left
    wheelSection.classList.remove('active');
    wheelSection.classList.add('slide-out-left');
    
    // Slide in campaign section from right
    campaignSection.classList.remove('slide-out-left');
    campaignSection.classList.add('active');
    
    // Update section name
    sectionName.textContent = 'Kampanyalar';
  } else {
    // Slide out campaign section to right
    campaignSection.classList.remove('active');
    campaignSection.classList.add('slide-out-left');
    
    // Slide in wheel section from left
    wheelSection.classList.remove('slide-out-left');
    wheelSection.classList.add('active');
    
    // Update section name
    sectionName.textContent = 'Çark Bölümleri';
  }
}

// Section toggle functionality
if (sectionToggle) {
  sectionToggle.addEventListener('click', () => {
    if (currentSection === 'wheel') {
      // Slide to campaigns
      slideToSection('campaign');
      currentSection = 'campaign';
      loadCampaigns();
      // Hide save button for campaigns
      saveBtn.style.display = 'none';
    } else {
      // Slide to wheel sections
      slideToSection('wheel');
      currentSection = 'wheel';
      // Show save button for wheel sections
      saveBtn.style.display = 'inline-block';
    }
  });
}

// Campaign management
async function loadCampaigns() {
  try {
    const res = await fetch('/api/admin/campaigns', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const campaigns = await res.json();
    renderCampaigns(campaigns);
  } catch (e) {
    console.error('Kampanyalar yüklenemedi:', e);
  }
}

function renderCampaigns(campaigns) {
  campaignRows.innerHTML = '';
  campaigns.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" value="${c.title}" data-id="${c.id}" data-field="title" onchange="markCampaignChanged(this)" /></td>
      <td><input type="text" value="${c.link || ''}" data-id="${c.id}" data-field="link" onchange="markCampaignChanged(this)" /></td>
      <td><input type="checkbox" ${c.is_active ? 'checked' : ''} data-id="${c.id}" data-field="is_active" onchange="markCampaignChanged(this)" /></td>
      <td>
        <button onclick="saveCampaign(${c.id})" class="btn save" id="saveBtn_${c.id}" disabled>Kaydet</button>
        <button onclick="deleteCampaign(${c.id})" class="btn" style="background:#ef4444;">Sil</button>
      </td>
    `;
    campaignRows.appendChild(tr);
  });
}

// Mark campaign as changed and enable save button
function markCampaignChanged(input) {
  const id = input.getAttribute('data-id');
  const saveBtn = document.getElementById(`saveBtn_${id}`);
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
  }
}

// Save individual campaign
async function saveCampaign(id) {
  const row = document.querySelector(`input[data-id="${id}"][data-field="title"]`).closest('tr');
  const inputs = row.querySelectorAll('input');
  const data = { id: Number(id) };
  
  inputs.forEach(input => {
    const field = input.getAttribute('data-field');
    data[field] = input.type === 'checkbox' ? input.checked : input.value.trim();
  });
  
  if (!data.title) {
    alert('Kampanya başlığı gerekli!');
    return;
  }
  
  try {
    const res = await fetch(`/api/admin/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      const saveBtn = document.getElementById(`saveBtn_${id}`);
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.6';
        saveBtn.textContent = 'Kaydedildi';
        setTimeout(() => {
          saveBtn.textContent = 'Kaydet';
        }, 2000);
      }
    } else {
      const errorText = await res.text();
      alert(`Kampanya kaydedilemedi! Hata: ${res.status} - ${errorText}`);
    }
  } catch (e) {
    alert('Hata oluştu: ' + e.message);
  }
}

async function saveCampaigns() {
  const inputs = campaignRows.querySelectorAll('input');
  const campaigns = [];
  const map = new Map();
  
  inputs.forEach(i => {
    const id = Number(i.getAttribute('data-id'));
    const field = i.getAttribute('data-field');
    if (!map.has(id)) map.set(id, { id });
    map.get(id)[field] = i.type === 'checkbox' ? i.checked : i.value;
  });
  
  for (const [id, data] of map) {
    const res = await fetch(`/api/admin/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    if (!res.ok) return;
  }
}

async function addCampaign() {
  // Create a new row in the table
  const tbody = document.getElementById('campaignRows');
  const newRow = document.createElement('tr');
  newRow.innerHTML = `
    <td><input type="text" placeholder="Kampanya başlığı" data-field="title" onchange="markNewCampaignChanged(this)" /></td>
    <td><input type="text" placeholder="URL" data-field="link" onchange="markNewCampaignChanged(this)" /></td>
    <td><input type="checkbox" checked data-field="is_active" onchange="markNewCampaignChanged(this)" /></td>
    <td>
      <button onclick="saveNewCampaign(this)" class="btn save" id="newSaveBtn" disabled>Kaydet</button>
      <button onclick="cancelNewCampaign(this)" class="btn" style="background:#6b7280;">İptal</button>
    </td>
  `;
  tbody.appendChild(newRow);
  
  // Focus on the title input
  const titleInput = newRow.querySelector('input[data-field="title"]');
  titleInput.focus();
}

// Mark new campaign as changed and enable save button
function markNewCampaignChanged(input) {
  const saveBtn = document.getElementById('newSaveBtn');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
  }
}

async function saveNewCampaign(button) {
  const row = button.closest('tr');
  const inputs = row.querySelectorAll('input');
  const data = {};
  
  inputs.forEach(input => {
    const field = input.getAttribute('data-field');
    data[field] = input.type === 'checkbox' ? input.checked : input.value.trim();
  });
  
  if (!data.title) {
    alert('Kampanya başlığı gerekli!');
    return;
  }
  
  try {
    const res = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      button.disabled = true;
      button.textContent = 'Kaydedildi';
      setTimeout(() => {
        loadCampaigns(); // Reload to show the saved campaign
      }, 1000);
    } else {
      const errorText = await res.text();
      alert(`Kampanya kaydedilemedi! Hata: ${res.status} - ${errorText}`);
    }
  } catch (e) {
    alert('Hata oluştu: ' + e.message);
  }
}

function cancelNewCampaign(button) {
  const row = button.closest('tr');
  row.remove();
}

async function deleteCampaign(id) {
  if (!confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) return;
  
  const res = await fetch(`/api/admin/campaigns/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (res.ok) loadCampaigns();
}

if (addNewCampaign) {
  addNewCampaign.addEventListener('click', addCampaign);
}

// Image Management Functions
if (imageBtn) {
  imageBtn.addEventListener('click', () => {
    imagePopup.style.display = 'flex';
    loadImages();
  });
}

if (closeImagePopup) {
  closeImagePopup.addEventListener('click', () => {
    imagePopup.style.display = 'none';
  });
}

// Close popup when clicking outside
if (imagePopup) {
  imagePopup.addEventListener('click', (e) => {
    if (e.target === imagePopup) {
      imagePopup.style.display = 'none';
    }
  });
}

// Image viewer popup controls
if (closeImageViewer) {
  closeImageViewer.addEventListener('click', () => {
    imageViewerPopup.style.display = 'none';
  });
}

// Close image viewer when clicking outside
if (imageViewerPopup) {
  imageViewerPopup.addEventListener('click', (e) => {
    if (e.target === imageViewerPopup) {
      imageViewerPopup.style.display = 'none';
    }
  });
}

// Copy image URL
if (copyImageUrl) {
  copyImageUrl.addEventListener('click', async () => {
    const url = imageViewerUrl.textContent;
    // Extract filename from URL (everything after the last slash)
    const filename = url.split('/').pop();
    try {
      await navigator.clipboard.writeText(filename);
      copyImageUrl.textContent = 'Kopyalandı!';
      setTimeout(() => {
        copyImageUrl.textContent = 'Adı Kopyala';
      }, 2000);
    } catch (e) {
      alert('Dosya adı kopyalanamadı: ' + e.message);
    }
  });
}

// Upload image
if (uploadBtn) {
  uploadBtn.addEventListener('click', async () => {
    const file = imageInput.files[0];
    if (!file) {
      alert('Lütfen bir resim seçin!');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        alert('Resim başarıyla yüklendi!');
        imageInput.value = '';
        loadImages();
      } else {
        const error = await res.text();
        alert('Resim yüklenemedi: ' + error);
      }
    } catch (e) {
      alert('Hata oluştu: ' + e.message);
    }
  });
}

// Load images
async function loadImages() {
  try {
    const res = await fetch('/api/admin/images', { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    if (!res.ok) return;
    
    const images = await res.json();
    renderImages(images);
  } catch (e) {
    console.error('Resimler yüklenemedi:', e);
  }
}

// Render images
function renderImages(images) {
  imagesList.innerHTML = '';
  
  if (images.length === 0) {
    imagesList.innerHTML = '<p style="text-align: center; color: #6b7280;">Henüz resim yüklenmemiş</p>';
    return;
  }

  images.forEach(image => {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.innerHTML = `
      <img src="/images/${image.filename}" alt="${image.filename}" />
      <div class="image-name">${image.filename}</div>
      <button class="view-btn" onclick="viewImage('${image.filename}')">Görüntüle</button>
      <button class="delete-btn" onclick="deleteImage('${image.filename}')">Sil</button>
    `;
    imagesList.appendChild(item);
  });
}

// View image in popup
function viewImage(filename) {
  const imageUrl = `/images/${filename}`;
  const directUrl = `${filename}`;
  
  viewerImage.src = imageUrl;
  viewerImage.alt = filename;
  imageViewerTitle.textContent = filename;
  imageViewerUrl.textContent = directUrl;
  
  imageViewerPopup.style.display = 'flex';
}

// Delete image
async function deleteImage(filename) {
  if (!confirm(`"${filename}" resmini silmek istediğinizden emin misiniz?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/images/${filename}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      alert('Resim silindi!');
      loadImages();
    } else {
      alert('Resim silinemedi!');
    }
  } catch (e) {
    alert('Hata oluştu: ' + e.message);
  }
}
backBtn.addEventListener('click', () => { window.location.href = '/admin'; });

document.addEventListener('DOMContentLoaded', () => {
  const sectionToggle = document.getElementById('sectionToggle');
  const wheelSection = document.getElementById('wheelSection');
  const campaignSection = document.getElementById('campaignSection');
  const saveBtn = document.getElementById('saveBtn');
  let currentSection = 'wheel';


  // Original save button functionality
  saveBtn.addEventListener('click', () => {
    saveSections(); // Only handles wheel data
  });

  // Sayfa yüklendiğinde kampanyaları yükle
  loadCampaigns();
});

// Debug function to check database
async function debugDatabase() {
  try {
    const res = await fetch(`/api/admin/debug/wheel-sections?t=${Date.now()}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('🔍 Debug Data:', data);
      alert(`Database Debug:\nTotal Count: ${data.totalCount}\nAdmin Sections: ${data.adminSections.length}\n\nCheck console for details.`);
    } else {
      const error = await res.text();
      alert('Debug Error: ' + error);
    }
  } catch (error) {
    console.error('Debug error:', error);
    alert('Debug Error: ' + error.message);
  }
}

// Create wheel sections function
async function createWheelSections() {
  try {
    const res = await fetch('/api/admin/create-wheel-sections', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('✅ Wheel sections created:', data);
      alert(data.message + ' (' + data.count + ' bölüm)');
      
      // Reload the sections after creation
      await loadSections();
    } else {
      const error = await res.text();
      console.error('❌ Failed to create wheel sections:', error);
      alert('Hata: ' + error);
    }
  } catch (error) {
    console.error('❌ Error creating wheel sections:', error);
    alert('Bağlantı hatası: ' + error.message);
  }
}

// Initialize after authentication check
async function init() {
  requireAuth();
  if (token) {
    await loadSections();
    
    // Add buttons after a short delay
    setTimeout(() => {
      const actions = document.querySelector('.actions');
      if (actions) {
        // Debug button
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Debug Database';
        debugBtn.className = 'btn';
        debugBtn.style.background = '#dc2626';
        debugBtn.style.marginTop = '10px';
        debugBtn.style.marginLeft = '10px';
        debugBtn.onclick = debugDatabase;
        actions.appendChild(debugBtn);
        
        // Create wheel sections button
        const createBtn = document.createElement('button');
        createBtn.textContent = 'Çark Bölümlerini Oluştur';
        createBtn.className = 'btn';
        createBtn.style.background = '#16a34a';
        createBtn.style.marginTop = '10px';
        createBtn.style.marginLeft = '10px';
        createBtn.onclick = createWheelSections;
        actions.appendChild(createBtn);
      }
    }, 1000);
  }
}

init();


