import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'studyos.db')
  console.log(`[DB] Initializing database at: ${dbPath}`)

  db = new Database(dbPath)

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Run schema — try multiple paths for dev vs production
  const schemaPaths = [
    join(__dirname, '../../src/main/db/schema.sql'),
    join(__dirname, 'db/schema.sql'),
    join(__dirname, '../main/db/schema.sql'),
    join(__dirname, 'schema.sql'),
  ]

  let schemaApplied = false
  for (const p of schemaPaths) {
    try {
      const schema = readFileSync(p, 'utf-8')
      db.exec(schema)
      console.log(`[DB] Schema applied from: ${p}`)
      schemaApplied = true
      break
    } catch {}
  }

  if (!schemaApplied) {
    // Embedded minimal schema as fallback
    console.warn('[DB] Could not load schema.sql — using embedded schema')
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL, mode TEXT NOT NULL, started_at DATETIME NOT NULL, ended_at DATETIME, planned_seconds INTEGER, actual_seconds INTEGER DEFAULT 0, pause_count INTEGER DEFAULT 0, pause_total_seconds INTEGER DEFAULT 0, distraction_attempts INTEGER DEFAULT 0, bypass_count INTEGER DEFAULT 0, focus_score REAL, recall_submitted BOOLEAN DEFAULT 0, fullscreen_used BOOLEAN DEFAULT 0, quick_start_used BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, metadata TEXT DEFAULT '{}');
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, section TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      INSERT OR IGNORE INTO settings (key, value, section) VALUES ('timer.defaultMode', '"pomodoro"', 'timer');
    `)
  }

  console.log('[DB] Database ready')
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    console.log('[DB] Database closed')
  }
}
