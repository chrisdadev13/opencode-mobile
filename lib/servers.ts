import * as SecureStore from 'expo-secure-store';

const SERVERS_KEY = 'servers';

export type Server = {
  id: number;
  url: string;
  label: string | null;
  created_at: string;
  last_used_at: string;
};

function readServers(): Server[] {
  const raw = SecureStore.getItem(SERVERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Server[];
}

function writeServers(servers: Server[]): void {
  SecureStore.setItem(SERVERS_KEY, JSON.stringify(servers));
}

let nextId = 0;

function getNextId(servers: Server[]): number {
  if (nextId === 0 && servers.length > 0) {
    nextId = Math.max(...servers.map((s) => s.id));
  }
  nextId += 1;
  return nextId;
}

export function getServers(): Server[] {
  return readServers().sort(
    (a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime()
  );
}

export function getLastUsedServer(): Server | null {
  return getServers()[0] ?? null;
}

export function addServer(url: string, label?: string): Server {
  const servers = readServers();
  const now = new Date().toISOString();
  const server: Server = {
    id: getNextId(servers),
    url,
    label: label ?? null,
    created_at: now,
    last_used_at: now,
  };
  servers.push(server);
  writeServers(servers);
  return server;
}

export function updateServerLastUsed(id: number): void {
  const servers = readServers();
  const server = servers.find((s) => s.id === id);
  if (server) {
    server.last_used_at = new Date().toISOString();
    writeServers(servers);
  }
}

export function removeServer(id: number): void {
  writeServers(readServers().filter((s) => s.id !== id));
}

export function clearAllServers(): void {
  SecureStore.deleteItemAsync(SERVERS_KEY);
}
