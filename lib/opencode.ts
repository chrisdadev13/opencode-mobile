import { createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk/client';
import { getLastUsedServer } from './servers';

let client: OpencodeClient | null = null;
let currentBaseUrl: string | null = null;

const DEFAULT_TIMEOUT = 10_000; // 10 seconds

// The SDK's default fetch wrapper sets `req.timeout = false` on the Request
// object, which React Native's fetch doesn't support and causes "Network
// request failed". We bypass it with a plain fetch passthrough.
const rnFetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input, init);

export function getClient(): OpencodeClient {
  const server = getLastUsedServer();
  if (!server) {
    throw new Error('No server configured');
  }

  // Recreate client if the server URL changed
  if (!client || currentBaseUrl !== server.url) {
    currentBaseUrl = server.url;
    client = createOpencodeClient({
      baseUrl: server.url,
      fetch: rnFetch,
    });
  }

  return client;
}

export function getServerUrl(): string {
  const server = getLastUsedServer();
  if (!server) throw new Error('No server configured');
  return server.url;
}

/** Fetch with a timeout (default 10s). Throws on timeout. */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeout?: number },
): Promise<Response> {
  const ms = init?.timeout ?? DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  const { timeout: _, ...rest } = init ?? {};
  return globalThis
    .fetch(input, { ...rest, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
}

export function resetClient() {
  client = null;
  currentBaseUrl = null;
}

export async function checkServerHealth(url: string): Promise<boolean> {
  try {
    const tempClient = createOpencodeClient({ baseUrl: url, fetch: rnFetch });
    const res = await tempClient.session.list();
    return !res.error;
  } catch {
    return false;
  }
}
