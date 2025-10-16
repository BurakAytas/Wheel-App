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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Initialize database
initDb().catch(console.error);

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


