import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { all, get, run } from '../db.js';
import { requireAdmin } from './auth.js';

export const adminRouter = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'public', 'images');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Keep original filename
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
  }
});

// List spins with user info
adminRouter.get('/spins', requireAdmin, async (req, res) => {
  try {
    const rows = await all(`
      SELECT s.id as spin_id, s.section_index, s.section_label, s.section_message, s.approved,
             u.first_name, u.last_name, u.email, s.created_at
      FROM spins s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Bulk delete spins
adminRouter.post('/spins/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body; // array of spin ids
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Silinecek kayıt yok' });
    const uniq = Array.from(new Set(ids.map(n => Number(n)).filter(n => Number.isFinite(n))));
    if (uniq.length === 0) return res.status(400).json({ error: 'Geçersiz id listesi' });
    const placeholders = uniq.map((_, i) => `$${i + 1}`).join(',');
    await run(`DELETE FROM spins WHERE id IN (${placeholders})`, uniq);
    res.json({ ok: true, deleted: uniq.length });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get wheel sections
adminRouter.get('/wheel-sections', requireAdmin, async (req, res) => {
  try {
    const rows = await all(`SELECT id, section_index, label, message, weight FROM wheel_sections ORDER BY section_index ASC`);
    
    // Disable caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    
    res.json(rows);
  } catch (e) {
    console.error('❌ Error fetching wheel sections:', e);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Update wheel sections (bulk)
adminRouter.post('/wheel-sections', requireAdmin, async (req, res) => {
  try {
    const { sections } = req.body; // [{id, label, message, weight}]
    if (!Array.isArray(sections)) return res.status(400).json({ error: 'Geçersiz veri' });
    
    console.log('📥 Received sections:', sections.length);
    console.log('📥 Section indexes:', sections.map(s => s.section_index));
    
    // First, delete all existing sections
    await run('DELETE FROM wheel_sections');
    
    // Then insert all sections with new IDs
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const weight = Math.max(0, Number(s.weight) || 0);
      console.log(`📝 Inserting section ${i}: index=${s.section_index}, label="${s.label}", message="${s.message}", weight=${weight}`);
      await run(
        'INSERT INTO wheel_sections (section_index, label, message, weight) VALUES ($1, $2, $3, $4)',
        [s.section_index, String(s.label || ''), String(s.message || ''), weight]
      );
    }
    
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ Error updating wheel sections:', e);
    res.status(500).json({ error: 'Sunucu hatası: ' + e.message });
  }
});

// Get campaigns
adminRouter.get('/campaigns', requireAdmin, async (req, res) => {
  try {
    const rows = await all(`SELECT id, title, link, is_active FROM campaigns ORDER BY id DESC`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Create campaign
adminRouter.post('/campaigns', requireAdmin, async (req, res) => {
  try {
    const { title, link, is_active } = req.body;
    if (!title) return res.status(400).json({ error: 'Başlık gerekli' });
    
    const result = await run(
      `INSERT INTO campaigns (title, link, is_active) VALUES ($1, $2, $3) RETURNING id`,
      [String(title), String(link || ''), is_active ? 1 : 0]
    );
    
    res.json({ id: result.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Update campaign
adminRouter.put('/campaigns/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, link, is_active } = req.body;
    if (!title) return res.status(400).json({ error: 'Başlık gerekli' });
    await run(
      `UPDATE campaigns SET title = $1, link = $2, is_active = $3 WHERE id = $4`,
      [String(title), String(link || ''), is_active ? 1 : 0, id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Delete campaign
adminRouter.delete('/campaigns/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await run(`DELETE FROM campaigns WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Upload image
adminRouter.post('/upload-image', requireAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Resim dosyası gerekli' });
    }
    
    res.json({ 
      message: 'Resim başarıyla yüklendi',
      filename: req.file.filename,
      url: `/${req.file.filename}`
    });
  } catch (e) {
    res.status(500).json({ error: 'Resim yüklenemedi: ' + e.message });
  }
});

// Get images list
adminRouter.get('/images', requireAdmin, (req, res) => {
  try {
    const imagesPath = path.join(process.cwd(), 'public', 'images');
    
    if (!fs.existsSync(imagesPath)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(imagesPath);
    const images = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map(file => ({
        filename: file,
        url: `/images/${file}`
      }));
    
    res.json(images);
  } catch (e) {
    res.status(500).json({ error: 'Resimler listelenemedi' });
  }
});

// Delete image
adminRouter.delete('/images/:filename', requireAdmin, (req, res) => {
  try {
    const { filename } = req.params;
    const imagePath = path.join(process.cwd(), 'public', 'images', filename);
    
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      res.json({ message: 'Resim silindi' });
    } else {
      res.status(404).json({ error: 'Resim bulunamadı' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Resim silinemedi' });
  }
});

// Toggle approve
adminRouter.post('/spins/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    const spin = await get(`SELECT * FROM spins WHERE id = $1`, [id]);
    if (!spin) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    await run(`UPDATE spins SET approved = $1 WHERE id = $2`, [approved ? 1 : 0, id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Create default wheel sections
adminRouter.post('/create-wheel-sections', requireAdmin, async (req, res) => {
  try {
    // Check if sections already exist
    const existingSections = await all('SELECT COUNT(*) as count FROM wheel_sections');
    
    if (existingSections[0].count > 0) {
      return res.json({ message: 'Çark bölümleri zaten mevcut', count: existingSections[0].count });
    }
    
    // Create default wheel sections
    const defaultSections = [
      { label: 'Bölüm 1', message: 'Tebrikler!', weight: 0.1 },
      { label: 'Bölüm 2', message: 'Harika!', weight: 0.1 },
      { label: 'Bölüm 3', message: 'Mükemmel!', weight: 0.1 },
      { label: 'Bölüm 4', message: 'Süper!', weight: 0.1 },
      { label: 'Bölüm 5', message: 'Bravo!', weight: 0.1 },
      { label: 'Bölüm 6', message: 'Harika!', weight: 0.1 },
      { label: 'Bölüm 7', message: 'Tebrikler!', weight: 0.1 },
      { label: 'Bölüm 8', message: 'Mükemmel!', weight: 0.1 },
      { label: 'Bölüm 9', message: 'Süper!', weight: 0.1 },
      { label: 'Bölüm 10', message: 'Tebrikler!', weight: 0.1 }
    ];

    for (let i = 0; i < defaultSections.length; i++) {
      const section = defaultSections[i];
      await run(
        'INSERT INTO wheel_sections (section_index, label, message, weight) VALUES ($1, $2, $3, $4)',
        [i, section.label, section.message, section.weight]
      );
    }
    
    res.json({ 
      message: 'Varsayılan çark bölümleri başarıyla oluşturuldu!', 
      count: defaultSections.length 
    });
  } catch (e) {
    console.error('❌ Error creating wheel sections:', e);
    res.status(500).json({ error: 'Sunucu hatası: ' + e.message });
  }
});



