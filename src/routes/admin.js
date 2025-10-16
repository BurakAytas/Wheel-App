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
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Update wheel sections (bulk)
adminRouter.post('/wheel-sections', requireAdmin, async (req, res) => {
  try {
    const { sections } = req.body; // [{id, label, message, weight}]
    if (!Array.isArray(sections)) return res.status(400).json({ error: 'Geçersiz veri' });
    for (const s of sections) {
      if (typeof s.id !== 'number') continue;
      const weight = Math.max(0, Number(s.weight) || 0);
      await run(`UPDATE wheel_sections SET label = $1, message = $2, weight = $3 WHERE id = $4`, [String(s.label || ''), String(s.message || ''), weight, s.id]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
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



