import express from 'express';
import { get, run, all } from '../db.js';

export const userRouter = express.Router();

// Registration: { firstName, lastName, email }
userRouter.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    
    // Input validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Tüm alanlar zorunlu' });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Geçerli bir e-posta adresi girin' });
    }
    
    // Name length validation
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return res.status(400).json({ error: 'Ad ve soyad en az 2 karakter olmalı' });
    }
    
    const existing = await get(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (existing) {
      return res.status(409).json({ error: 'E-posta zaten kayıtlı' });
    }
    
    const result = await run(
      `INSERT INTO users (first_name, last_name, email) VALUES ($1, $2, $3) RETURNING id`, 
      [firstName.trim(), lastName.trim(), email.trim().toLowerCase()]
    );
    
    res.json({ userId: result.rows[0].id });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Kayıt işlemi başarısız' });
  }
});

async function getSectionsFromDb() {
  const rows = await all(`SELECT section_index, label, message, weight FROM wheel_sections ORDER BY section_index ASC`);
  if (!rows || rows.length === 0) {
    return Array.from({ length: 10 }).map((_, i) => ({ index: i, label: `Bölüm ${i + 1}`, message: `Tebrikler! ${i + 1}. bölüme geldiniz.`, weight: 0.1 }));
  }
  return rows.map(r => ({ index: r.section_index, label: r.label, message: r.message, weight: r.weight }));
}

function weightedRandomIndex(w) {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < w.length; i++) {
    acc += w[i];
    if (r <= acc) return i;
  }
  return w.length - 1;
}

// POST /api/user/spin { userId }
userRouter.post('/spin', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId gerekli' });
    const user = await get(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const already = await get(`SELECT * FROM spins WHERE user_id = $1`, [userId]);
    if (already) {
      return res.status(403).json({ 
        error: 'Çark sadece 1 kez çevrilebilir',
        sectionLabel: already.section_label,
        sectionMessage: already.section_message
      });
    }

    const sections = await getSectionsFromDb();
    const weights = sections.map(s => s.weight);
    const idx = weightedRandomIndex(weights);
    const sec = sections[idx];

    const result = await run(
      `INSERT INTO spins (user_id, section_index, section_label, section_message) VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, sec.index, sec.label, sec.message]
    );

    res.json({
      spinId: result.rows[0].id,
      sectionIndex: sec.index,
      sectionLabel: sec.label,
      sectionMessage: sec.message,
    });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Public: wheel section labels for drawing (no weights)
userRouter.get('/wheel-sections', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const rows = await all(`SELECT section_index, label FROM wheel_sections ORDER BY section_index ASC`);
    const labels = (rows && rows.length ? rows : Array.from({length:10}).map((_,i) => ({section_index:i, label:`Bölüm ${i+1}`})))
      .sort((a,b) => a.section_index - b.section_index)
      .map(r => r.label);
    res.json({ labels });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Public: active campaigns
userRouter.get('/campaigns', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const rows = await all(`SELECT title, link FROM campaigns WHERE is_active = 1 ORDER BY id DESC`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});


