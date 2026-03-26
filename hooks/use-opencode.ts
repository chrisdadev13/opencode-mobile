import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Session,
  Message,
  Part,
  SessionStatus,
  PermissionRequest,
  QuestionRequest,
  QuestionAnswer,
} from '@opencode-ai/sdk/v2/client';
import { useFocusEffect } from 'expo-router';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import { getClient, getServerUrl, fetchWithTimeout } from '@/lib/opencode';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return true;
  const msg = (e as Error)?.message ?? '';
  return msg === 'Aborted' || msg.includes('aborted');
}

function generateSessionName(seed: string): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    separator: '-',
    length: 3,
    style: 'lowerCase',
    seed,
  });
}

function isGenericTitle(title: string): boolean {
  return title.startsWith('New Session -');
}

function resolveTitle(session: Session): string {
  if (!isGenericTitle(session.title)) return session.title;
  return generateSessionName(session.id);
}

type ModelSelection = {
  providerID: string;
  modelID: string;
};

type ProviderInfo = {
  id: string;
  name: string;
  models: { id: string; name: string; variants: string[] }[];
};

type MessageWithParts = {
  info: Message;
  parts: Part[];
};

// ---------------------------------------------------------------------------
// useSessionStatuses — polls GET /session/status every 5s
// ---------------------------------------------------------------------------

const STATUS_POLL_INTERVAL = 5_000;

export function useSessionStatuses() {
  const [statuses, setStatuses] = useState<Record<string, SessionStatus>>({});

  const fetchStatuses = useCallback(async () => {
    try {
      const baseUrl = getServerUrl();
      const res = await fetchWithTimeout(`${baseUrl}/session/status`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setStatuses(data as Record<string, SessionStatus>);
      }
    } catch {
      // retry next interval
    }
  }, []);

  // Poll while mounted
  useEffect(() => {
    fetchStatuses();
    const id = setInterval(fetchStatuses, STATUS_POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchStatuses]);

  // Refetch immediately when screen gains focus
  useFocusEffect(useCallback(() => { fetchStatuses(); }, [fetchStatuses]));

  return statuses;
}

// ---------------------------------------------------------------------------
// useSessions — session list CRUD
// ---------------------------------------------------------------------------

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    // Only show loading spinner on the very first fetch.
    // After that, silently update in the background so the UI
    // never flashes back to a spinner.
    if (!hasLoaded.current) setLoading(true);
    try {
      setError(null);
      const baseUrl = getServerUrl();
      const res = await fetchWithTimeout(`${baseUrl}/session`);
      if (!res.ok) { setError('Failed to load sessions'); return; }
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data.map((s: Session) => ({ ...s, title: resolveTitle(s) })));
        hasLoaded.current = true;
      }
    } catch (e) {
      // Only show error if we have no data yet
      if (!hasLoaded.current) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Silently refetch when screen gains focus
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const create = useCallback(async (title?: string) => {
    try {
      const baseUrl = getServerUrl();
      const res = await fetchWithTimeout(`${baseUrl}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const session = { ...data, title: resolveTitle(data) } as Session;
      setSessions((prev) => [session, ...prev]);
      return session;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      const baseUrl = getServerUrl();
      const res = await fetchWithTimeout(`${baseUrl}/session/${id}`, { method: 'DELETE' });
      if (!res.ok) { setError('Failed to delete session'); return; }
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  return { sessions, loading, error, refresh, create, remove };
}

// ---------------------------------------------------------------------------
// useProviders
// ---------------------------------------------------------------------------

export function useProviders() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultModel, setDefaultModel] = useState<ModelSelection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const client = getClient();
        const res = await client.config.providers();
        if (res.data) {
          const data = res.data as any;
          const providerList: ProviderInfo[] = (data.providers ?? []).map(
            (p: any) => ({
              id: p.id,
              name: p.name || p.id,
              models: Object.values(p.models ?? {}).map((m: any) => ({
                id: m.id,
                name: m.name || m.id,
                variants: Object.keys(m.variants ?? {}),
              })),
            })
          );
          setProviders(providerList);

          if (data.default?.provider && data.default?.model) {
            setDefaultModel({
              providerID: data.default.provider,
              modelID: data.default.model,
            });
          } else if (providerList.length > 0 && providerList[0]!.models.length > 0) {
            setDefaultModel({
              providerID: providerList[0]!.id,
              modelID: providerList[0]!.models[0]!.id,
            });
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { providers, defaultModel, loading };
}

// ---------------------------------------------------------------------------
// useSession — single session: messages, status, send, SSE
// ---------------------------------------------------------------------------

export function useSession(sessionId: string) {
  const [messages, setMessages] = useState<MessageWithParts[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({ type: 'idle' });
  const [title, setTitle] = useState<string>('');
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<QuestionRequest | null>(null);

  // --- Fetch session title ---
  useEffect(() => {
    async function fetchTitle() {
      try {
        const baseUrl = getServerUrl();
        const res = await fetchWithTimeout(`${baseUrl}/session`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          const session = data.find((s: Session) => s.id === sessionId);
          if (session) setTitle(resolveTitle(session));
        }
      } catch {
        // ignore
      }
    }
    fetchTitle();
  }, [sessionId]);

  // --- Fetch initial status from server ---
  useEffect(() => {
    async function fetchStatus() {
      try {
        const baseUrl = getServerUrl();
        const res = await fetchWithTimeout(`${baseUrl}/session/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.[sessionId]) {
          setSessionStatus(data[sessionId] as SessionStatus);
        }
      } catch {
        // ignore
      }
    }
    fetchStatus();
  }, [sessionId]);

  // --- Load messages from server ---
  const hasLoadedMessages = useRef(false);
  const loadMessages = useCallback(async () => {
    if (!hasLoadedMessages.current) setLoading(true);
    try {
      setError(null);
      const baseUrl = getServerUrl();
      const res = await fetchWithTimeout(`${baseUrl}/session/${sessionId}/message`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const normalized: MessageWithParts[] = data
          .map((msg: any) => {
            if (msg.info) return { info: msg.info as Message, parts: msg.parts ?? [] };
            const { parts, ...info } = msg;
            return { info: info as Message, parts: parts ?? [] };
          })
          .filter((msg) => msg.info?.role);
        setMessages(normalized);
        hasLoadedMessages.current = true;
      }
    } catch (e) {
      if (!hasLoadedMessages.current) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Refetch messages + status when screen regains focus
  useFocusEffect(useCallback(() => {
    loadMessages();
    // Also refresh status
    (async () => {
      try {
        const baseUrl = getServerUrl();
        const res = await fetchWithTimeout(`${baseUrl}/session/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.[sessionId]) setSessionStatus(data[sessionId] as SessionStatus);
      } catch { /* ignore */ }
    })();
  }, [loadMessages, sessionId]));

  // --- SSE for real-time updates ---
  useEffect(() => {
    let cancelled = false;

    async function subscribe() {
      try {
        const client = getClient();
        const result = await client.event.subscribe();
        if (!result.stream) return;

        for await (const event of result.stream) {
          if (cancelled) break;
          const evt = event as any;

          // Message info updated
          if (
            evt.type === 'message.updated' &&
            evt.properties?.info?.sessionID === sessionId
          ) {
            const info = evt.properties.info as Message;
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.info.id === info.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx]!, info, parts: updated[idx]!.parts };
                return updated;
              }
              return [...prev, { info, parts: [] }];
            });
          }

          // Message part updated
          if (
            evt.type === 'message.part.updated' &&
            evt.properties?.part?.sessionID === sessionId
          ) {
            const part = evt.properties.part as Part;
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.info.id === part.messageID);
              if (idx >= 0) {
                const updated = [...prev];
                const msg = updated[idx]!;
                const partIdx = msg.parts.findIndex((p) => p.id === part.id);
                if (partIdx >= 0) {
                  const newParts = [...msg.parts];
                  newParts[partIdx] = part;
                  updated[idx] = { ...msg, parts: newParts };
                } else {
                  updated[idx] = { ...msg, parts: [...msg.parts, part] };
                }
                return updated;
              }
              return [
                ...prev,
                {
                  info: {
                    id: part.messageID,
                    sessionID: sessionId,
                    role: 'assistant' as const,
                    time: { created: Date.now() / 1000 },
                    agent: '',
                    parentID: '',
                    modelID: '',
                    providerID: '',
                    mode: '',
                    path: { cwd: '', root: '' },
                    cost: 0,
                    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
                  },
                  parts: [part],
                },
              ];
            });
          }

          // Session status
          if (evt.type === 'session.status' && evt.properties?.sessionID === sessionId) {
            setSessionStatus(evt.properties.status as SessionStatus);
          }
          if (evt.type === 'session.idle' && evt.properties?.sessionID === sessionId) {
            setSessionStatus({ type: 'idle' });
          }

          // Permission requests
          if (evt.type === 'permission.asked' && evt.properties?.sessionID === sessionId) {
            setPendingPermission(evt.properties as PermissionRequest);
          }
          if (evt.type === 'permission.replied' && evt.properties?.sessionID === sessionId) {
            setPendingPermission(null);
          }

          // Question requests
          if (evt.type === 'question.asked' && evt.properties?.sessionID === sessionId) {
            setPendingQuestion(evt.properties as QuestionRequest);
          }
          if (
            (evt.type === 'question.replied' || evt.type === 'question.rejected') &&
            evt.properties?.sessionID === sessionId
          ) {
            setPendingQuestion(null);
          }
        }
      } catch {
        // stream ended
      }
    }

    subscribe();
    return () => { cancelled = true; };
  }, [sessionId]);

  // --- Send message ---
  const sendMessage = useCallback(
    async (text: string, model?: ModelSelection, agent?: string, variant?: string) => {
      try {
        setSending(true);
        setError(null);

        // Optimistic user message
        const tempId = `temp-${Date.now()}`;
        const userMsg: MessageWithParts = {
          info: {
            id: tempId,
            sessionID: sessionId,
            role: 'user',
            time: { created: Date.now() / 1000 },
            agent: '',
            model: { providerID: model?.providerID ?? '', modelID: model?.modelID ?? '' },
          },
          parts: [{ id: `${tempId}-p`, sessionID: sessionId, messageID: tempId, type: 'text', text }],
        };
        setMessages((prev) => [...prev, userMsg]);

        const baseUrl = getServerUrl();
        const res = await fetchWithTimeout(`${baseUrl}/session/${sessionId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts: [{ type: 'text', text }],
            ...(model && { model: { providerID: model.providerID, modelID: model.modelID } }),
            ...(agent && { agent }),
            ...(variant && { variant }),
          }),
          timeout: 60_000,
        });
        const data = await res.json();

        if (!res.ok) {
          const errMsg: string =
            data?.data?.message || data?.error?.message || 'Failed to send message';
          if (errMsg.toLowerCase().includes('busy')) {
            setMessages((prev) => prev.filter((m) => m.info.id !== tempId));
            setError('Session is busy — please wait');
          } else {
            setError(errMsg);
          }
          return;
        }

        // Normalize response
        const responseInfo: Message = data.info ?? (() => { const { parts: _, ...r } = data; return r; })();
        const responseParts: Part[] = data.parts ?? [];

        // Merge — SSE may have already streamed parts
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.info.id === responseInfo.id);
          if (idx >= 0) {
            const existing = prev[idx]!;
            const merged = existing.parts.length >= responseParts.length ? existing.parts : responseParts;
            const updated = [...prev];
            updated[idx] = { info: { ...existing.info, ...responseInfo } as Message, parts: merged };
            return updated;
          }
          return [...prev, { info: responseInfo, parts: responseParts }];
        });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSending(false);
      }
    },
    [sessionId]
  );

  const abort = useCallback(async () => {
    try {
      const client = getClient();
      await client.session.abort({ sessionID: sessionId });
    } catch {
      // ignore
    }
  }, [sessionId]);

  const replyPermission = useCallback(
    async (requestID: string, reply: 'once' | 'always' | 'reject') => {
      try {
        const client = getClient();
        await client.permission.reply({ requestID, reply });
      } catch {
        // clear on failure to prevent stuck UI
      } finally {
        setPendingPermission(null);
      }
    },
    [],
  );

  const replyQuestion = useCallback(
    async (requestID: string, answers: QuestionAnswer[]) => {
      try {
        const client = getClient();
        await client.question.reply({ requestID, answers });
      } catch {
        // clear on failure to prevent stuck UI
      } finally {
        setPendingQuestion(null);
      }
    },
    [],
  );

  const rejectQuestion = useCallback(
    async (requestID: string) => {
      try {
        const client = getClient();
        await client.question.reject({ requestID });
      } catch {
        // clear on failure to prevent stuck UI
      } finally {
        setPendingQuestion(null);
      }
    },
    [],
  );

  return {
    messages, loading, sending, error, sessionStatus, title, sendMessage, abort, refresh: loadMessages,
    pendingPermission, replyPermission,
    pendingQuestion, replyQuestion, rejectQuestion,
  };
}

// ---------------------------------------------------------------------------
// useProjectInfo
// ---------------------------------------------------------------------------

export type FileStatus = {
  path: string;
  added: number;
  removed: number;
  status: string;
};

export type ProjectInfo = {
  path: string;
  branch: string;
};

export function useProjectInfo() {
  const [info, setInfo] = useState<ProjectInfo | null>(null);

  useEffect(() => {
    async function load() {
      const client = getClient();
      let path = '';
      let branch = '';

      try {
        const res = await client.path.get();
        path = (res.data as any)?.directory ?? '';
      } catch { /* unavailable */ }

      try {
        const res = await client.vcs.get();
        branch = (res.data as any)?.branch ?? '';
      } catch { /* unavailable */ }

      if (path || branch) setInfo({ path, branch });
    }
    load();
  }, []);

  return info;
}

// ---------------------------------------------------------------------------
// useFileStatus
// ---------------------------------------------------------------------------

export function useFileStatus() {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const baseUrl = getServerUrl();
      const res = await fetchWithTimeout(`${baseUrl}/file/status`);
      const data = await res.json();
      if (Array.isArray(data)) setFiles(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { files, loading, refresh };
}
