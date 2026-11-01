import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, db } from './src/db.js';
import { authRouter } from './src/routes/auth.js';
import { userRouter } from './src/routes/user.js';
import { adminRouter } from './src/routes/admin.js';
import { rateLimit } from './src/middleware/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Behind a reverse proxy (e.g. Render) so req.ip is the real client IP
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Initialize database
initDb()
  .then(() => {
    console.log('✅ Database initialized successfully');
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
  });

// Brute-force / abuse protection (10 requests per minute per IP)
const limiter = rateLimit({ windowMs: 60_000, max: 10 });
app.use('/api/auth/login', limiter);
app.use('/api/user/register', limiter);

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);

app.use(express.static(path.join(__dirname, 'public')));

// Friendly routes for direct paths
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/wheel', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'wheel.html'));
});
app.get('/admin-config', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-config.html'));
});

// Serve images directly from root path (e.g., localhost:3000/filename)
app.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'public', 'images', filename);
  
  // Check if file exists in images directory
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    // If not found, return 404
    res.status(404).send('File not found');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


