import { getDB } from './db';

export type Server = {
  id: number;
  url: string;
  label: string | null;
  created_at: string;
  last_used_at: string;
};

type ServerRow = {
  id: number;
  url: string;
  label: string | null;
  created_at: string;
  last_used_at: string;
};

export function getServers(): Server[] {
  const db = getDB();
  const result = db.execute<ServerRow>('SELECT * FROM servers ORDER BY last_used_at DESC');
  return result.rows._array;
}

export function getLastUsedServer(): Server | null {
  const servers = getServers();
  return servers[0] ?? null;
}

export function addServer(url: string, label?: string): Server {
  const db = getDB();
  const result = db.execute<ServerRow>(
    'INSERT INTO servers (url, label) VALUES (?, ?) RETURNING *',
    [url, label ?? null]
  );
  return result.rows._array[0]!;
}

export function updateServerLastUsed(id: number): void {
  const db = getDB();
  db.execute("UPDATE servers SET last_used_at = datetime('now') WHERE id = ?", [id]);
}

export function removeServer(id: number): void {
  const db = getDB();
  db.execute('DELETE FROM servers WHERE id = ?', [id]);
}

export function clearAllServers(): void {
  const db = getDB();
  db.execute('DELETE FROM servers');
}
