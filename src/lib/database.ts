import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';

// Database interfaces
export interface Link {
  id: string;
  name: string;
  original_url: string;
  short_code: string;
  created_at: string;
  click_count: number;
}

export interface Click {
  id: number;
  link_id: string;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  user_agent: string | null;
  referer: string | null;
  clicked_at: string;
}

export interface LocationData {
  country: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}

// Initialize database
let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'tracking.db');
    db = new Database(dbPath);
    
    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
    
    // Initialize schema
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const db = getDatabase();
  
  // Create links table
  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      original_url TEXT NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      click_count INTEGER DEFAULT 0
    )
  `);
  
  // Create clicks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id TEXT NOT NULL,
      ip_address TEXT,
      country TEXT,
      city TEXT,
      region TEXT,
      latitude REAL,
      longitude REAL,
      user_agent TEXT,
      referer TEXT,
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (link_id) REFERENCES links(id)
    )
  `);
  
  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
    CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
    CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON clicks(clicked_at);
  `);
}

// Link operations
export function createLink(name: string, originalUrl: string): Link {
  const db = getDatabase();
  const id = nanoid();
  const shortCode = nanoid(8);
  
  const stmt = db.prepare(`
    INSERT INTO links (id, name, original_url, short_code, created_at, click_count)
    VALUES (?, ?, ?, ?, datetime('now'), 0)
  `);
  
  stmt.run(id, name, originalUrl, shortCode);
  
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(id) as Link;
  return link;
}

export function getAllLinks(): Link[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM links ORDER BY created_at DESC');
  return stmt.all() as Link[];
}

export function getLinkById(id: string): Link | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM links WHERE id = ?');
  return stmt.get(id) as Link | null;
}

export function getLinkByShortCode(shortCode: string): Link | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM links WHERE short_code = ?');
  return stmt.get(shortCode) as Link | null;
}

export function updateLinkClickCount(linkId: string) {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE links SET click_count = click_count + 1 WHERE id = ?');
  stmt.run(linkId);
}

export function deleteLink(id: string): boolean {
  const db = getDatabase();
  
  // Delete all clicks for this link first
  const deleteClicks = db.prepare('DELETE FROM clicks WHERE link_id = ?');
  deleteClicks.run(id);
  
  // Delete the link
  const deleteLink = db.prepare('DELETE FROM links WHERE id = ?');
  const result = deleteLink.run(id);
  
  return result.changes > 0;
}

// Click operations
export function recordClick(
  linkId: string,
  ipAddress: string | null,
  locationData: LocationData,
  userAgent: string | null,
  referer: string | null
): void {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    INSERT INTO clicks (
      link_id, ip_address, country, city, region,
      latitude, longitude, user_agent, referer, clicked_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  
  stmt.run(
    linkId,
    ipAddress,
    locationData.country,
    locationData.city,
    locationData.region,
    locationData.latitude,
    locationData.longitude,
    userAgent,
    referer
  );
  
  // Update click count
  updateLinkClickCount(linkId);
}

export function getClicksByLinkId(linkId: string): Click[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM clicks WHERE link_id = ? ORDER BY clicked_at DESC');
  return stmt.all(linkId) as Click[];
}

export function getAllClicks(): Click[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM clicks ORDER BY clicked_at DESC');
  return stmt.all() as Click[];
}

// Analytics operations
export function getLinkAnalytics(linkId: string) {
  const db = getDatabase();
  
  const clicks = getClicksByLinkId(linkId);
  
  // Group by country
  const countryStats = db.prepare(`
    SELECT country, COUNT(*) as count
    FROM clicks
    WHERE link_id = ? AND country IS NOT NULL
    GROUP BY country
    ORDER BY count DESC
  `).all(linkId);
  
  // Group by city
  const cityStats = db.prepare(`
    SELECT city, country, COUNT(*) as count
    FROM clicks
    WHERE link_id = ? AND city IS NOT NULL
    GROUP BY city, country
    ORDER BY count DESC
    LIMIT 10
  `).all(linkId);
  
  // Clicks over time (last 30 days)
  const dailyStats = db.prepare(`
    SELECT 
      DATE(clicked_at) as date,
      COUNT(*) as count
    FROM clicks
    WHERE link_id = ? AND clicked_at >= datetime('now', '-30 days')
    GROUP BY DATE(clicked_at)
    ORDER BY date
  `).all(linkId);
  
  return {
    totalClicks: clicks.length,
    clicks,
    countryStats,
    cityStats,
    dailyStats
  };
}

export function getGlobalAnalytics() {
  const db = getDatabase();
  
  const totalLinks = db.prepare('SELECT COUNT(*) as count FROM links').get() as { count: number };
  const totalClicks = db.prepare('SELECT COUNT(*) as count FROM clicks').get() as { count: number };
  
  const recentClicks = db.prepare(`
    SELECT c.*, l.name as link_name, l.short_code
    FROM clicks c
    JOIN links l ON c.link_id = l.id
    ORDER BY c.clicked_at DESC
    LIMIT 10
  `).all();
  
  const topLinks = db.prepare(`
    SELECT l.*, COUNT(c.id) as recent_clicks
    FROM links l
    LEFT JOIN clicks c ON l.id = c.link_id AND c.clicked_at >= datetime('now', '-7 days')
    GROUP BY l.id
    ORDER BY recent_clicks DESC, l.click_count DESC
    LIMIT 5
  `).all();
  
  return {
    totalLinks: totalLinks.count,
    totalClicks: totalClicks.count,
    recentClicks,
    topLinks
  };
}

// Close database connection
export function closeDatabase() {
  if (db) {
    db.close();
  }
}