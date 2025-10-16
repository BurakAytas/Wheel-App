import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { get } from '../db.js';

export const authRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    const admin = await get(`SELECT * FROM admins WHERE username = ?`, [username]);
    if (!admin) return res.status(401).json({ error: 'Geçersiz bilgiler' });
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: 'Geçersiz bilgiler' });
    const token = jwt.sign({ sub: admin.id, username }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Yetkisiz' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Yetkisiz' });
  }
}


