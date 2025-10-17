import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { get } from '../db.js';

export const authRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('⚠️  JWT_SECRET not set, using default. Please set JWT_SECRET in production!');
  return 'dev-secret-change-in-production';
})();

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    }
    
    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: 'Geçersiz bilgi formatı' });
    }
    
    const admin = await get(`SELECT * FROM admins WHERE username = $1`, [username]);
    if (!admin) {
      return res.status(401).json({ error: 'Geçersiz bilgiler' });
    }
    
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res.status(401).json({ error: 'Geçersiz bilgiler' });
    }
    
    const token = jwt.sign({ sub: admin.id, username }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(401).json({ error: 'Geçersiz token' });
  }
}


