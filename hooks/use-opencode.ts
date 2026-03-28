import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { AppState } from 'react-native';
import EventSource from 'react-native-sse';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import { getClient, getServerUrl } from '@/lib/opencode';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
      const client = getClient();
      const res = await client.session.status();
      if (res.data) {
        setStatuses(res.data as Record<string, SessionStatus>);
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
      const client = getClient();
      const res = await client.session.list();
      if (res.error) { setError('Failed to load sessions'); return; }
      if (Array.isArray(res.data)) {
        setSessions(res.data.map((s: Session) => ({ ...s, title: resolveTitle(s) })));
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

  // Poll session list every 5s while screen is focused
  useFocusEffect(useCallback(() => {
    refresh();
    const id = setInterval(refresh, 5_000);
    return () => clearInterval(id);
  }, [refresh]));

  const create = useCallback(async (title?: string) => {
    try {
      const client = getClient();
      const res = await client.session.create({ title });
      if (res.error || !res.data) return null;
      const session = { ...res.data, title: resolveTitle(res.data) } as Session;
      setSessions((prev) => [session, ...prev]);
      return session;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      const client = getClient();
      const res = await client.session.delete({ sessionID: id });
      if (res.error) { setError('Failed to delete session'); return; }
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
  const [pendingUserMsg, setPendingUserMsg] = useState<MessageWithParts | null>(null);

  // Derived messages: server data + optimistic pending message (if not yet confirmed)
  const displayMessages = useMemo(() => {
    if (!pendingUserMsg) return messages;
    const pendingText = pendingUserMsg.parts.find((p) => p.type === 'text')?.text;
    const alreadyInServer = messages.some(
      (m) =>
        m.info.role === 'user' &&
        m.parts.some((p) => p.type === 'text' && p.text === pendingText),
    );
    if (alreadyInServer) return messages;
    return [...messages, pendingUserMsg];
  }, [messages, pendingUserMsg]);

  // Clear pending message once server confirms it
  useEffect(() => {
    if (!pendingUserMsg) return;
    const pendingText = pendingUserMsg.parts.find((p) => p.type === 'text')?.text;
    const confirmed = messages.some(
      (m) =>
        m.info.role === 'user' &&
        m.parts.some((p) => p.type === 'text' && p.text === pendingText),
    );
    if (confirmed) setPendingUserMsg(null);
  }, [messages, pendingUserMsg]);

  // --- Fetch session title ---
  const fetchTitle = useCallback(async () => {
    try {
      const client = getClient();
      const res = await client.session.get({ sessionID: sessionId });
      if (res.data) setTitle(resolveTitle(res.data as Session));
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => { fetchTitle(); }, [fetchTitle]);

  // --- Fetch initial status from server ---
  useEffect(() => {
    async function fetchStatus() {
      try {
        const client = getClient();
        const res = await client.session.status();
        if (res.data?.[sessionId]) {
          setSessionStatus(res.data[sessionId] as SessionStatus);
        }
      } catch {
        // ignore
      }
    }
    fetchStatus();
  }, [sessionId]);

  // Track whether we've re-fetched the title after first assistant message
  const hasFetchedTitleAfterReply = useRef(false);

  // --- Load messages from server ---
  const hasLoadedMessages = useRef(false);
  const loadMessages = useCallback(async () => {
    if (!hasLoadedMessages.current) setLoading(true);
    try {
      setError(null);
      const client = getClient();
      const res = await client.session.messages({ sessionID: sessionId });
      if (Array.isArray(res.data)) {
        const normalized: MessageWithParts[] = res.data
          .filter((msg) => msg.info?.role)
          .map((msg) => ({ info: msg.info as Message, parts: msg.parts ?? [] }));
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

  // Fetch pending questions & permissions for this session
  const fetchPendingInteractions = useCallback(async () => {
    try {
      const client = getClient();
      const [qRes, pRes] = await Promise.all([
        client.question.list(),
        client.permission.list(),
      ]);
      const questions = (qRes.data ?? []) as QuestionRequest[];
      const pending = questions.find((q) => q.sessionID === sessionId);
      setPendingQuestion(pending ?? null);

      const permissions = (pRes.data ?? []) as PermissionRequest[];
      const pendingPerm = permissions.find((p) => p.sessionID === sessionId);
      setPendingPermission(pendingPerm ?? null);
    } catch { /* ignore */ }
  }, [sessionId]);

  useEffect(() => { fetchPendingInteractions(); }, [fetchPendingInteractions]);

  // Refetch messages + status + pending interactions when screen regains focus
  useFocusEffect(useCallback(() => {
    loadMessages();
    fetchPendingInteractions();
    // Also refresh status
    (async () => {
      try {
        const client = getClient();
        const res = await client.session.status();
        if (res.data?.[sessionId]) setSessionStatus(res.data[sessionId] as SessionStatus);
      } catch { /* ignore */ }
    })();
  }, [loadMessages, fetchPendingInteractions, sessionId]));

  // --- SSE via react-native-sse (native EventSource) ---
  // The SDK's fetch-based SSE is broken on React Native because Hermes
  // doesn't support TextDecoderStream / Web Streams API. This uses
  // native HTTP streaming (NSURLSession on iOS, OkHttp on Android).
  const sseAlive = useRef(false);

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;
    let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = 1000;
    let wasConnected = false; // only re-fetch after a real connection drops
    const HEARTBEAT_TIMEOUT = 15_000;
    const MAX_RETRY_DELAY = 30_000;

    function resetHeartbeat() {
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      heartbeatTimer = setTimeout(() => {
        console.log('[SSE] heartbeat timeout, reconnecting...');
        scheduleReconnect();
      }, HEARTBEAT_TIMEOUT);
    }

    function handleEvent(evt: { type: string; properties?: any }) {
      sseAlive.current = true;
      resetHeartbeat();

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

        if (info.role === 'assistant' && !hasFetchedTitleAfterReply.current) {
          hasFetchedTitleAfterReply.current = true;
          setTimeout(() => fetchTitle(), 1000);
        }
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

    function connect() {
      if (cancelled) return;
      if (es) { es.close(); es = null; }

      const url = `${getServerUrl()}/event`;
      console.log('[SSE] connecting to', url);

      es = new EventSource(url, { headers: { Accept: 'text/event-stream' } });

      es.addEventListener('open', () => {
        console.log('[SSE] connected');
        sseAlive.current = true;
        wasConnected = true;
        retryDelay = 1000; // reset backoff on success
        resetHeartbeat();
      });

      es.addEventListener('message', (event) => {
        if (!event.data) return;
        try {
          const parsed = JSON.parse(event.data);
          handleEvent(parsed);
        } catch (e) {
          console.warn('[SSE] parse error:', e);
        }
      });

      es.addEventListener('error', (event) => {
        console.warn('[SSE] error:', event);
        sseAlive.current = false;
        scheduleReconnect();
      });

      es.addEventListener('close', () => {
        console.log('[SSE] closed');
        sseAlive.current = false;
        scheduleReconnect();
      });
    }

    function scheduleReconnect() {
      if (cancelled) return;
      if (es) { es.close(); es = null; }
      if (reconnectTimer) return; // already scheduled

      // Only re-fetch if we had a working connection that dropped
      if (wasConnected) {
        wasConnected = false;
        loadMessages();
        fetchPendingInteractions();
      }

      console.log(`[SSE] reconnecting in ${retryDelay}ms...`);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
    }

    // Reconnect when app returns to foreground
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        console.log('[SSE] app foregrounded, reconnecting');
        retryDelay = 1000; // reset backoff
        wasConnected = true; // force re-fetch
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        scheduleReconnect();
      }
    });

    connect();

    return () => {
      cancelled = true;
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (es) { es.close(); es = null; }
      sseAlive.current = false;
      appStateListener.remove();
    };
  }, [sessionId, fetchTitle, loadMessages, fetchPendingInteractions]);

  // --- Polling fallback: catches anything SSE misses ---
  // Slow poll (5s) while idle, fast poll (2s) after sending a message.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sawBusy = useRef(false);
  const messageCountAtSend = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    try {
      const client = getClient();
      // Fetch status + messages + interactions all in parallel
      const [statusRes, msgRes, qRes, pRes] = await Promise.all([
        client.session.status(),
        client.session.messages({ sessionID: sessionId }),
        client.question.list(),
        client.permission.list(),
      ]);

      const status = statusRes.data?.[sessionId] as SessionStatus | undefined;
      if (status) {
        setSessionStatus(status);
        if (status.type === 'busy') {
          sawBusy.current = true;
        }
      }

      // Update pending interactions
      const questions = (qRes.data ?? []) as QuestionRequest[];
      setPendingQuestion(questions.find((q) => q.sessionID === sessionId) ?? null);
      const permissions = (pRes.data ?? []) as PermissionRequest[];
      setPendingPermission(permissions.find((p) => p.sessionID === sessionId) ?? null);

      if (Array.isArray(msgRes.data)) {
        const normalized: MessageWithParts[] = msgRes.data
          .filter((msg: any) => msg.info?.role)
          .map((msg: any) => ({ info: msg.info as Message, parts: msg.parts ?? [] }));
        setMessages(normalized);

        // If we sent a message and are waiting for a response:
        // only consider it "done" once we saw busy AND now idle
        // AND we got more messages back (the assistant replied).
        const isBusy = status?.type === 'busy';
        const gotReply = normalized.length > messageCountAtSend.current;
        if (!isBusy && sawBusy.current && gotReply) {
          console.log('[Poll] busy→idle with reply, switching to idle polling');
          sawBusy.current = false;
          fetchTitle();
          stopPolling();
          pollRef.current = setInterval(pollOnce, 5000);
        }
      }
    } catch (e) {
      console.warn('[Poll] error:', e);
    }
  }, [sessionId, fetchTitle, stopPolling]);

  // Always poll while the session screen is mounted.
  // Start at 5s (idle), speed up to 2s when sending.
  useEffect(() => {
    console.log('[Poll] starting idle polling (5s)');
    pollOnce();
    pollRef.current = setInterval(pollOnce, 5000);
    return stopPolling;
  }, [pollOnce, stopPolling]);

  const startFastPolling = useCallback(() => {
    console.log('[Poll] switching to fast polling (2s)');
    stopPolling();
    pollOnce();
    pollRef.current = setInterval(pollOnce, 2000);
  }, [pollOnce, stopPolling]);

  // --- Send message ---
  const sendMessage = useCallback(
    async (text: string, model?: ModelSelection, agent?: string, variant?: string) => {
      try {
        setSending(true);
        setError(null);

        // Optimistic user message — kept separate from server data to avoid
        // key conflicts when polling replaces the messages array.
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
        setPendingUserMsg(userMsg);
        setMessages((prev) => {
          messageCountAtSend.current = prev.length + 1; // current msgs + the user msg being sent
          return prev;
        });

        // Optimistically show busy & pause background polling so a stale
        // poll can't overwrite the optimistic status before the server acks.
        setSessionStatus({ type: 'busy' });
        stopPolling();

        const client = getClient();
        console.log('[Send] calling promptAsync...');
        const res = await client.session.promptAsync({
          sessionID: sessionId,
          parts: [{ type: 'text', text }],
          ...(model && { model: { providerID: model.providerID, modelID: model.modelID } }),
          ...(agent && { agent }),
          ...(variant && { variant }),
        });

        if (res.error) {
          const errData = res.error as any;
          const errMsg: string =
            errData?.data?.message || errData?.errors?.[0]?.message || 'Failed to send message';
          if (errMsg.toLowerCase().includes('busy')) {
            setPendingUserMsg(null);
            setError('Session is busy — please wait');
            setSessionStatus({ type: 'idle' });
          } else {
            setError(errMsg);
          }
          // Restart idle polling since we stopped it before promptAsync
          pollRef.current = setInterval(pollOnce, 5000);
          return;
        }

        console.log('[Send] promptAsync succeeded, switching to fast polling');
        sawBusy.current = false; // reset — we'll wait for server to confirm busy→idle
        startFastPolling();
      } catch (e) {
        setError((e as Error).message);
        // Restart idle polling since we stopped it before promptAsync
        pollRef.current = setInterval(pollOnce, 5000);
      } finally {
        setSending(false);
      }
    },
    [sessionId, startFastPolling, stopPolling, pollOnce]
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
    messages: displayMessages, loading, sending, error, sessionStatus, title, sendMessage, abort, refresh: loadMessages,
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
      const client = getClient();
      const res = await client.file.status();
      if (Array.isArray(res.data)) setFiles(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { files, loading, refresh };
}
