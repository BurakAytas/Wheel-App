import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
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
// CORS: only the origin(s) listed in CORS_ORIGIN (comma separated); same-origin only when unset
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : false,
  credentials: corsOrigins.length > 0,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Initialize database
initDb()
  .then(() => {
    console.log('✅ Database initialized successfully');
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
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

// Generic error handler: never leak internals to the client
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (res.headersSent) return next(err);
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  res.status(status).json({ error: status === 500 ? 'Sunucu hatası' : err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


