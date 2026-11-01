import pkg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Create database connection with optimized pool settings
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/cark_uygulamasi',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
});

// Helper functions with better error handling
export async function run(sql, params = []) {
  const client = await db.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } catch (err) {
    console.error('Database query error:', err.message);
    const wrapped = new Error(`Database error: ${err.message}`);
    wrapped.code = err.code;
    throw wrapped;
  } finally {
    client.release();
  }
}

export async function get(sql, params = []) {
  const client = await db.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Database query error:', err.message);
    const wrapped = new Error(`Database error: ${err.message}`);
    wrapped.code = err.code;
    throw wrapped;
  } finally {
    client.release();
  }
}

export async function all(sql, params = []) {
  const client = await db.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (err) {
    console.error('Database query error:', err.message);
    const wrapped = new Error(`Database error: ${err.message}`);
    wrapped.code = err.code;
    throw wrapped;
  } finally {
    client.release();
  }
}

export { db };

export async function initDb() {
  try {
    console.log('Starting database initialization...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Test connection first
    const testResult = await db.query('SELECT NOW()');
    console.log('Database connection test successful:', testResult.rows[0]);
    
    // Create tables
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS spins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        section_index INTEGER NOT NULL,
        section_label VARCHAR(255) NOT NULL,
        section_message TEXT NOT NULL,
        approved INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // One spin per user, enforced by the database
    await run('CREATE UNIQUE INDEX IF NOT EXISTS spins_user_id_unique ON spins (user_id)');

    await run(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS wheel_sections (
        id SERIAL PRIMARY KEY,
        section_index INTEGER NOT NULL,
        label VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        weight REAL NOT NULL DEFAULT 0.1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        link TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if wheel_sections table has data
    const existingSections = await all('SELECT COUNT(*) as count FROM wheel_sections');
    if (Number(existingSections[0].count) === 0) {
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
          'INSERT INTO wheel_sections (section_index, label, message, weight) VALUES ($1, $2, $3, $4)',
          [i, section.label, section.message, section.weight]
        );
      }
    }

    // Check if campaigns table has data
    const existingCampaigns = await all('SELECT COUNT(*) as count FROM campaigns');
    if (Number(existingCampaigns[0].count) === 0) {
      // Insert default campaigns
      const defaultCampaigns = [
        { title: 'Kampanya 1', link: 'https://example.com/1', is_active: 1 },
        { title: 'Kampanya 2', link: 'https://example.com/2', is_active: 1 },
        { title: 'Kampanya 3', link: 'https://example.com/3', is_active: 0 }
      ];

      for (const campaign of defaultCampaigns) {
        await run(
          'INSERT INTO campaigns (title, link, is_active) VALUES ($1, $2, $3)',
          [campaign.title, campaign.link, campaign.is_active]
        );
      }
    }

    // Seed the admin account from environment variables (no default credentials)
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminUsername || !adminPassword) {
      console.warn('WARNING: ADMIN_USERNAME / ADMIN_PASSWORD not set, admin account was not seeded.');
    } else {
      const existingAdmin = await get('SELECT id FROM admins WHERE username = $1', [adminUsername]);
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await run(
          'INSERT INTO admins (username, password) VALUES ($1, $2)',
          [adminUsername, hashedPassword]
        );
      }
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}