const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const modal = document.getElementById('modal');
const resultTitle = document.getElementById('resultTitle');
const resultMsg = document.getElementById('resultMsg');
const alreadySpunMsg = document.getElementById('alreadySpunMsg');
const closeModal = document.getElementById('closeModal');
const confettiCanvas = document.getElementById('confetti');
const confettiCtx = confettiCanvas.getContext('2d');
const copyBtn = document.getElementById('copyBtn');
const shareBtn = document.getElementById('shareBtn');

let sections = Array.from({ length: 10 }).map((_, i) => `Bölüm ${i + 1}`);
const colors = ['#f94144','#f3722c','#f8961e','#f9c74f','#90be6d','#43aa8b','#577590','#277da1','#4d908e','#f9844a'];

let angle = 0;
let slice = (Math.PI * 2) / sections.length;

function setSections(newLabels) {
  if (Array.isArray(newLabels) && newLabels.length > 0) {
    sections = newLabels;
    slice = (Math.PI * 2) / sections.length;
    draw();
  }
}

// Make canvas responsive and high-DPI crisp
function resizeCanvas() {
  const displaySize = Math.min(window.innerWidth * 0.94, 640);
  const dpr = Math.min(1.5, Math.max(1, (window.devicePixelRatio || 1))); // cap DPR for performance
  canvas.style.width = displaySize + 'px';
  canvas.style.height = displaySize + 'px';
  canvas.width = Math.floor(displaySize * dpr);
  canvas.height = Math.floor(displaySize * dpr);

  // confetti canvas follows viewport size
  confettiCanvas.width = Math.floor(window.innerWidth * dpr);
  confettiCanvas.height = Math.floor(window.innerHeight * dpr);
  confettiCanvas.style.width = window.innerWidth + 'px';
  confettiCanvas.style.height = window.innerHeight + 'px';
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', () => { const prev = angle; resizeCanvas(); angle = prev; draw(); });

function draw() {
  const r = canvas.width / 2;
  const wheelRadius = r * 0.9; // leave space for outer pointer
  ctx.clearRect(0,0,canvas.width, canvas.height);

  // draw wheel sectors
  ctx.save();
  ctx.translate(r, r);
  ctx.rotate(angle);
  for (let i = 0; i < sections.length; i++) {
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.fillStyle = colors[i % colors.length];
    ctx.arc(0,0, wheelRadius, i*slice, (i+1)*slice);
    ctx.fill();
    // labels
    ctx.save();
    ctx.rotate(i*slice + slice/2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    const baseSize = Math.max(12, Math.floor(wheelRadius * 0.065));
    ctx.font = `bold ${baseSize}px sans-serif`;
    const label = sections[i] ?? `Bölüm ${i + 1}`;
    const maxTextWidth = wheelRadius - 20;
    let text = label;
    while (ctx.measureText(text).width > maxTextWidth && text.length > 3) {
      text = text.slice(0, -1);
    }
    if (text !== label) {
      text = text.slice(0, Math.max(0, text.length - 1)) + '…';
    }
    ctx.fillText(text, wheelRadius - 12, 6);
    ctx.restore();
  }

  // bold black outer ring
  ctx.beginPath();
  ctx.lineWidth = Math.max(8, Math.floor(wheelRadius*0.04));
  ctx.strokeStyle = '#000';
  ctx.arc(0,0, wheelRadius, 0, Math.PI*2);
  ctx.stroke();
  ctx.restore();

  // external pointer outside the wheel (styled)
  const pointerYTop = r - wheelRadius - 28; // outside gap
  const pointerWidth = Math.max(20, Math.floor(wheelRadius*0.095));
  const pointerHeight = Math.max(30, Math.floor(wheelRadius*0.15));

  // shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(r - pointerWidth/2 + 2, pointerYTop + 2);
  ctx.lineTo(r + pointerWidth/2 + 2, pointerYTop + 2);
  ctx.lineTo(r + 2, pointerYTop + pointerHeight + 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // body with border
  const grad = ctx.createLinearGradient(r, pointerYTop, r, pointerYTop + pointerHeight);
  grad.addColorStop(0, '#ff3b47');
  grad.addColorStop(1, '#c9152a');
  ctx.beginPath();
  ctx.moveTo(r - pointerWidth/2, pointerYTop);
  ctx.lineTo(r + pointerWidth/2, pointerYTop);
  ctx.lineTo(r, pointerYTop + pointerHeight);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.stroke();

  // base cap circle
  ctx.beginPath();
  ctx.arc(r, pointerYTop + 6, Math.max(5, Math.floor(pointerWidth*0.18)), 0, Math.PI*2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e11d48';
  ctx.stroke();
}

// Load dynamic labels from backend first, then draw
(async function loadLabels() {
  try {
    const res = await fetch('/api/user/wheel-sections?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) {
      // If API fails, use defaults and draw
      draw();
      return;
    }
    const data = await res.json();
    if (data && Array.isArray(data.labels)) {
      setSections(data.labels);
    } else {
      // If no data, use defaults and draw
      draw();
    }
  } catch (_) {
    // If error, use defaults and draw
    draw();
  }
})();

let spinning = false;
let confettiPieces = [];

function launchConfetti() {
  const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'];
  const pieces = [];
  const count = 100; // fewer for performance
  for (let i = 0; i < count; i++) {
    pieces.push({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 80,
      r: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random()*colors.length)],
      vy: 2 + Math.random() * 3,
      vx: -1 + Math.random() * 2,
      vr: -0.1 + Math.random() * 0.2,
      angle: Math.random() * Math.PI * 2,
      gy: 0.04 + Math.random() * 0.06,
    });
  }
  confettiPieces = pieces;
  requestAnimationFrame(drawConfetti);
}

function drawConfetti() {
  confettiCtx.clearRect(0,0, confettiCanvas.width, confettiCanvas.height);
  for (const p of confettiPieces) {
    p.vy += p.gy; // gravity
    p.vx *= 0.995; // slight air drag
    p.x += p.vx;
    p.y += p.vy;
    p.angle += p.vr;
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.angle);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.r/2, -p.r/2, p.r, p.r);
    confettiCtx.restore();
  }
  confettiPieces = confettiPieces.filter(p => p.y < window.innerHeight + 40);
  if (confettiPieces.length) {
    requestAnimationFrame(drawConfetti);
  } else {
    confettiCtx.clearRect(0,0, confettiCanvas.width, confettiCanvas.height);
  }
}


spinBtn.addEventListener('click', async () => {
  if (spinning) return;
  const userId = sessionStorage.getItem('userId');
  if (!userId) { window.location.href = '/'; return; }
  spinning = true;
  spinBtn.disabled = true;
  try {
    const res = await fetch('/api/user/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: Number(userId) })
    });
    const data = await res.json();
    if (!res.ok) {
      // Check if user has already spun
      if (data.error && data.error.includes('Çark sadece 1 kez çevrilebilir')) {
        // Show previous result with "already spun" message
        alreadySpunMsg.style.display = 'block';
        resultTitle.textContent = data.sectionLabel || 'Sonuç Bulunamadı';
        resultMsg.textContent = data.sectionMessage || 'Önceki sonuç verisi bulunamadı.';
        modal.style.display = 'flex';
        spinning = false;
        spinBtn.disabled = false;
        return;
      }
      alert(data.error || 'Hata');
      spinning = false;
      spinBtn.disabled = false;
      return;
    }
    
    // Hide "already spun" message for new spins
    alreadySpunMsg.style.display = 'none';
    
    const targetIndex = data.sectionIndex;
    const fullRotations = 6;
    const targetAngle = (Math.PI * 1.5) - (targetIndex * slice + slice/2); // pointer at top (outside)
    const finalAngle = fullRotations * Math.PI * 2 + targetAngle;

    const start = performance.now();
    const duration = 4000;
    const startAngle = angle % (Math.PI*2);

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function animate(ts) {
      const t = Math.min(1, (ts - start) / duration);
      const eased = easeOutCubic(t);
      angle = startAngle + eased * (finalAngle - startAngle);
      draw();
      if (t < 1) requestAnimationFrame(animate); else {
        resultTitle.textContent = data.sectionLabel;
        resultMsg.textContent = data.sectionMessage;
        modal.style.display = 'flex';
        launchConfetti();
      }
    }
    requestAnimationFrame(animate);
  } catch (e) {
    alert('Sunucuya bağlanılamadı');
    spinning = false;
    spinBtn.disabled = false;
  }
});

closeModal.addEventListener('click', () => {
  modal.style.display = 'none';
});

copyBtn.addEventListener('click', async () => {
  try {
    const text = `${resultTitle.textContent} - ${resultMsg.textContent}`;
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = 'Kopyalandı';
    setTimeout(() => { copyBtn.textContent = 'Kopyala'; }, 1200);
  } catch (_) {}
});

shareBtn.addEventListener('click', async () => {
  const text = `${resultTitle.textContent} - ${resultMsg.textContent}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Çark Sonucum', text }); } catch (_) {}
  } else {
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, '_blank');
  }
});

// Kampanyaları getiren fonksiyon
async function fetchCampaigns() {
  try {
    const res = await fetch('/api/user/campaigns?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;
    const campaigns = await res.json();
    
    const dropdown = document.getElementById('campaignDropdown');
    dropdown.innerHTML = '';
    
    if (campaigns && campaigns.length > 0) {
      campaigns.forEach(campaign => {
        const item = document.createElement('a');
        item.className = 'campaign-item';
        item.textContent = campaign.title;
        
        if (campaign.link && /^https?:\/\//i.test(campaign.link)) {
          item.href = campaign.link;
          item.target = '_blank';
          item.rel = 'noopener noreferrer';
        } else {
          item.style.color = '#999';
          item.style.cursor = 'default';
          item.onclick = (e) => e.preventDefault();
        }
        
        dropdown.appendChild(item);
      });
    } else {
      const item = document.createElement('div');
      item.className = 'campaign-item';
      item.textContent = 'Henüz kampanya yok';
      item.style.color = '#999';
      item.style.cursor = 'default';
      item.onclick = (e) => e.preventDefault();
      dropdown.appendChild(item);
    }
  } catch (error) {
    console.error('Kampanyalar yüklenirken hata oluştu:', error);
  }
}

// Kampanya dropdown işlevselliği
document.addEventListener('DOMContentLoaded', () => {
  const campaignBtn = document.getElementById('campaignBtn');
  const dropdown = document.getElementById('campaignDropdown');

  if (campaignBtn && dropdown) {
    // Kampanya butonuna tıklama eventi
    campaignBtn.addEventListener('click', (e) => {
      e.preventDefault();
      dropdown.classList.toggle('active');
      
      // Dropdown açıldığında kampanyaları getir
      if (dropdown.classList.contains('active')) {
        fetchCampaigns();
      }
    });

    // Sayfa herhangi bir yerine tıklandığında dropdown'ı kapat
    document.addEventListener('click', (e) => {
      if (!campaignBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  }
});


