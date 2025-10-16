import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

// Create database connection
const db = new sqlite3.Database('./database.sqlite');

// Helper functions
export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export { db };

export async function initDb() {
  try {
    // Create tables
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS spins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        section_index INTEGER NOT NULL,
        section_label TEXT NOT NULL,
        section_message TEXT NOT NULL,
        approved INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS wheel_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_index INTEGER NOT NULL,
        label TEXT NOT NULL,
        message TEXT NOT NULL,
        weight REAL NOT NULL DEFAULT 0.1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        link TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if wheel_sections table has data
    const existingSections = await all('SELECT COUNT(*) as count FROM wheel_sections');
    if (existingSections[0].count === 0) {
      // Insert default wheel sections (10 sections, weights 0-1)
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
          'INSERT INTO wheel_sections (section_index, label, message, weight) VALUES (?, ?, ?, ?)',
          [i, section.label, section.message, section.weight]
        );
      }
    }

    // Check if campaigns table has data
    const existingCampaigns = await all('SELECT COUNT(*) as count FROM campaigns');
    if (existingCampaigns[0].count === 0) {
      // Insert default campaigns
      const defaultCampaigns = [
        { title: 'Kampanya 1', link: 'https://example.com/1', is_active: 1 },
        { title: 'Kampanya 2', link: 'https://example.com/2', is_active: 1 },
        { title: 'Kampanya 3', link: 'https://example.com/3', is_active: 0 }
      ];

      for (const campaign of defaultCampaigns) {
        await run(
          'INSERT INTO campaigns (title, link, is_active) VALUES (?, ?, ?)',
          [campaign.title, campaign.link, campaign.is_active]
        );
      }
    }

    // Check if admin exists
    const existingAdmin = await get('SELECT id FROM admins WHERE username = ?', ['admin']);
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await run(
        'INSERT INTO admins (username, password) VALUES (?, ?)',
        ['admin', hashedPassword]
      );
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}