import { open, type NitroSQLiteConnection } from 'react-native-nitro-sqlite';

let db: NitroSQLiteConnection | null = null;

export function getDB(): NitroSQLiteConnection {
  if (!db) {
    db = open({ name: 'opencode.db' });
    db.execute(`
      CREATE TABLE IF NOT EXISTS servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        label TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        last_used_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}
