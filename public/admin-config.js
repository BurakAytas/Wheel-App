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
const saveCampaignsBtn = document.getElementById('saveCampaignsBtn');
const campaignErr = document.getElementById('campaignErr');
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
let campaignDirty = false;
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
      <td><textarea data-index="${s.section_index}" data-key="label">${s.label}</textarea></td>
      <td><textarea data-index="${s.section_index}" data-key="message">${s.message}</textarea></td>
      <td><input type="number" min="0" max="100" step="0.1" value="${(Number(s.weight) * 100).toFixed(1)}" data-index="${s.section_index}" data-key="weightPercent" /></td>
    `;
    rowsTbody.appendChild(tr);
  }
  rowsTbody.querySelectorAll('input, textarea').forEach(i => {
    i.addEventListener('input', () => {
      dirty = true;
      saveBtn.disabled = false;
    });
  });
}

async function loadSections() {
  errEl.textContent = '';
  
  try {
    const res = await fetch(`/api/admin/wheel-sections?t=${Date.now()}`, { 
      headers: { 
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      } 
    });
    
    if (!res.ok) {
      if (res.status === 401) return (window.location.href = '/admin');
      const errorText = await res.text();
      errEl.textContent = `Yüklenemedi: ${res.status} - ${errorText}`;
      return;
    }
    const data = await res.json();
    renderRows(data);
    updateCreateButton(data.length === 0);
  } catch (error) {
    console.error('Fetch error:', error);
    errEl.textContent = `Bağlantı hatası: ${error.message}`;
  }
}

async function saveSections() {
  errEl.textContent = '';
  const inputs = rowsTbody.querySelectorAll('input, textarea');
  const map = new Map();
  
  inputs.forEach(i => {
    const index = i.getAttribute('data-index');
    const key = i.getAttribute('data-key');
    
    // Skip if no data-index (shouldn't happen but safety check)
    if (!index || !key) return;
    
    const numericIndex = Number(index);
    if (!map.has(numericIndex)) map.set(numericIndex, { section_index: numericIndex });
    
    if (key === 'weightPercent') {
      map.get(numericIndex)['weight'] = Math.max(0, Math.min(100, Number(i.value) || 0)) / 100;
    } else {
      map.get(numericIndex)[key] = i.type === 'number' ? Number(i.value) : i.value;
    }
  });
  
  const sections = Array.from(map.values());
  
  // Validating sections data
  
  if (sections.length === 0) {
    errEl.textContent = 'Kaydedilecek veri bulunamadı!';
    return;
  }
  
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
  
  if (!res.ok) { 
    const errorText = await res.text();
    errEl.textContent = `Kaydedilemedi: ${res.status} - ${errorText}`; 
    return; 
  }
  
  await loadSections();
  dirty = false;
  saveBtn.disabled = true;
}


reloadBtn.addEventListener('click', () => {
  // Force reload with cache busting
  loadSections();
});
saveBtn.addEventListener('click', saveSections);
saveBtn.disabled = true;

// Campaign save button event listener
if (saveCampaignsBtn) {
  saveCampaignsBtn.addEventListener('click', saveAllCampaigns);
  saveCampaignsBtn.disabled = true;
}

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
        // Hide wheel save button, show campaign save button if needed
        saveBtn.style.display = 'none';
        if (campaignDirty && saveCampaignsBtn) {
          saveCampaignsBtn.style.display = 'inline-block';
        }
      } else {
        // Slide to wheel sections
        slideToSection('wheel');
        currentSection = 'wheel';
        // Show wheel save button, hide campaign save button
        saveBtn.style.display = 'inline-block';
        if (saveCampaignsBtn) {
          saveCampaignsBtn.style.display = 'none';
        }
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
      <td><input type="text" value="${c.title}" data-id="${c.id}" data-field="title" onchange="markCampaignChanged()" /></td>
      <td><input type="text" value="${c.link || ''}" data-id="${c.id}" data-field="link" onchange="markCampaignChanged()" /></td>
      <td><input type="checkbox" ${c.is_active ? 'checked' : ''} data-id="${c.id}" data-field="is_active" onchange="markCampaignChanged()" /></td>
      <td>
        <button onclick="deleteCampaign(${c.id})" class="btn" style="background:#ef4444;">Sil</button>
      </td>
    `;
    campaignRows.appendChild(tr);
  });
}

// Mark campaign as changed and enable save button
function markCampaignChanged() {
  campaignDirty = true;
  if (saveCampaignsBtn) {
    saveCampaignsBtn.disabled = false;
    saveCampaignsBtn.style.display = 'inline-block';
  }
}

// Save all campaigns
async function saveAllCampaigns() {
  campaignErr.textContent = '';
  
  const inputs = campaignRows.querySelectorAll('input');
  const existingCampaigns = new Map();
  const newCampaigns = [];
  
  inputs.forEach(i => {
    const id = i.getAttribute('data-id');
    const field = i.getAttribute('data-field');
    const isNew = i.getAttribute('data-new') === 'true';
    
    if (isNew) {
      // New campaign - group by row
      const row = i.closest('tr');
      const rowIndex = Array.from(campaignRows.children).indexOf(row);
      if (!newCampaigns[rowIndex]) {
        newCampaigns[rowIndex] = {};
      }
      newCampaigns[rowIndex][field] = i.type === 'checkbox' ? i.checked : i.value.trim();
    } else {
      // Existing campaign
      const numericId = Number(id);
      if (!existingCampaigns.has(numericId)) {
        existingCampaigns.set(numericId, { id: numericId });
      }
      existingCampaigns.get(numericId)[field] = i.type === 'checkbox' ? i.checked : i.value.trim();
    }
  });
  
  // Validate existing campaigns
  for (const [id, data] of existingCampaigns) {
    if (!data.title || data.title.trim() === '') {
      campaignErr.textContent = `Kampanya ID ${id}: Başlık gerekli!`;
      return;
    }
  }
  
  // Validate new campaigns
  for (let i = 0; i < newCampaigns.length; i++) {
    const data = newCampaigns[i];
    if (data && (!data.title || data.title.trim() === '')) {
      campaignErr.textContent = `Yeni kampanya ${i + 1}: Başlık gerekli!`;
      return;
    }
  }
  
  try {
    // Update existing campaigns
    for (const [id, data] of existingCampaigns) {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        campaignErr.textContent = `Kampanya ${id} kaydedilemedi: ${res.status} - ${errorText}`;
        return;
      }
    }
    
    // Create new campaigns
    for (const data of newCampaigns) {
      if (data && data.title && data.title.trim() !== '') {
        const res = await fetch('/api/admin/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data)
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          campaignErr.textContent = `Yeni kampanya kaydedilemedi: ${res.status} - ${errorText}`;
          return;
        }
      }
    }
    
    // Success - reload campaigns and reset state
    await loadCampaigns();
    campaignDirty = false;
    if (saveCampaignsBtn) {
      saveCampaignsBtn.disabled = true;
      saveCampaignsBtn.style.display = 'none';
    }
  } catch (e) {
    campaignErr.textContent = 'Hata oluştu: ' + e.message;
  }
}


async function addCampaign() {
  // Create a new row in the table
  const tbody = document.getElementById('campaignRows');
  const newRow = document.createElement('tr');
  newRow.innerHTML = `
    <td><input type="text" placeholder="Kampanya başlığı" data-field="title" data-new="true" onchange="markCampaignChanged()" /></td>
    <td><input type="text" placeholder="URL" data-field="link" data-new="true" onchange="markCampaignChanged()" /></td>
    <td><input type="checkbox" checked data-field="is_active" data-new="true" onchange="markCampaignChanged()" /></td>
    <td>
      <button onclick="cancelNewCampaign(this)" class="btn" style="background:#6b7280;">İptal</button>
    </td>
  `;
  tbody.appendChild(newRow);
  
  // Focus on the title input
  const titleInput = newRow.querySelector('input[data-field="title"]');
  titleInput.focus();
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


  // Save button functionality is already handled above (line 210)

  // Sayfa yüklendiğinde kampanyaları yükle
  loadCampaigns();
});


// Update create button visibility
function updateCreateButton(show) {
  let createBtn = document.getElementById('createWheelSectionsBtn');
  
  if (show && !createBtn) {
    // Create button if it doesn't exist
    createBtn = document.createElement('button');
    createBtn.id = 'createWheelSectionsBtn';
    createBtn.textContent = 'Çark Bölümlerini Oluştur';
    createBtn.className = 'btn';
    createBtn.style.background = '#16a34a';
    createBtn.style.marginTop = '10px';
    createBtn.style.marginLeft = '10px';
    createBtn.onclick = createWheelSections;
    
    const actions = document.querySelector('.actions');
    if (actions) {
      actions.appendChild(createBtn);
    }
  } else if (!show && createBtn) {
    // Remove button if it exists
    createBtn.remove();
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
      alert(data.message + ' (' + data.count + ' bölüm)');
      
      // Reload the sections after creation
      await loadSections();
    } else {
      const error = await res.text();
      alert('Hata: ' + error);
    }
  } catch (error) {
    alert('Bağlantı hatası: ' + error.message);
  }
}

// Initialize after authentication check
async function init() {
  requireAuth();
  if (token) {
    await loadSections();
  }
}

init();


