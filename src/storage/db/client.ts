import * as SQLite from 'expo-sqlite';

const DB_NAME = 'reading_app.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

const migrations: string[] = [
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS reading_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id TEXT NOT NULL UNIQUE,
    current_node_id TEXT NOT NULL,
    choice_history TEXT,
    visited_node_ids TEXT,
    last_read_at INTEGER,
    read_duration INTEGER DEFAULT 0,
    scroll_position REAL DEFAULT 0,
    page_index INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0
  );`,
];

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return dbInstance;
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync('PRAGMA journal_mode = WAL;');
  for (const statement of migrations) {
    await db.execAsync(statement);
  }
}
