import { createReducer, on } from '@ngrx/store';
import { ChatActions } from './chat.actions';
import { ChatMessage, ChatSession, PendingAction } from '../models/chat.model';
import { ChatbotAudienceState } from '../models/contracts.model';

export const CHAT_FEATURE_KEY = 'chat';

export interface ChatState {
  messages: ChatMessage[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  isAgentTyping: boolean;
  currentStreamingId: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  connectionMessage: string | null;
  audienceState: ChatbotAudienceState | null;
  lastError: string | null;
}

const initialState: ChatState = {
  messages: [],
  sessions: [],
  activeSessionId: null,
  isAgentTyping: false,
  currentStreamingId: null,
  connectionStatus: 'disconnected',
  connectionMessage: null,
  audienceState: null,
  lastError: null,
};

export const chatReducer = createReducer(
  initialState,

  // --- User sends message ---
  on(ChatActions.sendMessage, (state, { content }) => ({
    ...state,
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content,
        timestamp: Date.now(),
      },
    ],
  })),

  on(ChatActions.selectPrompt, (state, { prompt }) => ({
    ...state,
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: prompt,
        timestamp: Date.now(),
      },
    ],
  })),

  // --- Agent streaming ---
  on(ChatActions.agentResponseStart, (state) => {
    const id = crypto.randomUUID();
    return {
      ...state,
      isAgentTyping: true,
      currentStreamingId: id,
      messages: [
        ...state.messages,
        {
          id,
          role: 'agent' as const,
          content: '',
          timestamp: Date.now(),
          streaming: true,
        },
      ],
    };
  }),

  on(ChatActions.agentResponseChunk, (state, { messageId, chunk }) => ({
    ...state,
    messages: state.messages.map(m =>
      m.id === messageId ? { ...m, content: m.content + chunk } : m
    ),
  })),

  on(ChatActions.agentResponseAction, (state, { messageId, action }) => ({
    ...state,
    messages: state.messages.map(m =>
      m.id === messageId ? { ...m, action } : m
    ),
  })),

  on(ChatActions.agentResponseDone, (state, { messageId }) => ({
    ...state,
    isAgentTyping: false,
    currentStreamingId: null,
    messages: state.messages.map(m =>
      m.id === messageId ? { ...m, streaming: false } : m
    ),
  })),

  on(ChatActions.agentResponseError, (state, { messageId, error }) => ({
    ...state,
    isAgentTyping: false,
    currentStreamingId: null,
    lastError: error,
    messages: [
      ...state.messages.map(m =>
        m.id === messageId ? { ...m, streaming: false } : m
      ),
      {
        id: crypto.randomUUID(),
        role: 'system' as const,
        content: `Error: ${error}`,
        timestamp: Date.now(),
      },
    ],
  })),

  // --- Action confirmation ---
  on(ChatActions.confirmAction, (state, { requestId }) => ({
    ...state,
    messages: state.messages.map(m =>
      m.action?.requestId === requestId
        ? { ...m, action: { ...m.action!, status: 'confirmed' as const } }
        : m
    ),
  })),

  on(ChatActions.rejectAction, (state, { requestId }) => ({
    ...state,
    messages: [
      ...state.messages.map(m =>
        m.action?.requestId === requestId
          ? { ...m, action: { ...m.action!, status: 'rejected' as const } }
          : m
      ),
      {
        id: crypto.randomUUID(),
        role: 'system' as const,
        content: 'Action dismissed.',
        timestamp: Date.now(),
      },
    ],
  })),

  on(ChatActions.actionResultReceived, (state, { requestId, status, audienceCount, message }) => {
    const resultSummary = status === 'success'
      ? `Applied successfully. New audience: ${audienceCount?.toLocaleString() ?? 'unknown'} records.`
      : `Failed: ${message ?? 'Unknown error'}`;

    return {
      ...state,
      messages: [
        ...state.messages.map(m =>
          m.action?.requestId === requestId
            ? { ...m, action: { ...m.action!, status: (status === 'success' ? 'applied' : 'error') as any, resultSummary } }
            : m
        ),
        {
          id: crypto.randomUUID(),
          role: 'system' as const,
          content: status === 'success'
            ? `✅ Plan applied — audience is now ${audienceCount?.toLocaleString()} records.`
            : `⚠️ Action failed: ${message}`,
          timestamp: Date.now(),
        },
      ],
    };
  }),

  // --- Story 4: Start Over ---
  on(ChatActions.startOver, (state) => ({
    ...state,
    messages: [{
      id: crypto.randomUUID(),
      role: 'system' as const,
      content: 'Conversation cleared. Audience Builder selections have been reset.',
      timestamp: Date.now(),
    }],
    isAgentTyping: false,
    currentStreamingId: null,
  })),

  // --- Story 8: Audience state ---
  on(ChatActions.audienceStateUpdated, (state, { state: audState }) => ({
    ...state,
    audienceState: audState,
  })),

  // --- Session management ---
  on(ChatActions.startNewSession, (state) => {
    const sessions = saveCurrentToSessions(state);
    return {
      ...state,
      sessions,
      messages: [],
      activeSessionId: crypto.randomUUID(),
      isAgentTyping: false,
      currentStreamingId: null,
    };
  }),

  on(ChatActions.loadSession, (state, { sessionId }) => {
    const sessions = saveCurrentToSessions(state);
    const session = sessions.find(s => s.id === sessionId);
    return {
      ...state,
      sessions,
      messages: session ? [...session.messages] : state.messages,
      activeSessionId: sessionId,
    };
  }),

  on(ChatActions.deleteSession, (state, { sessionId }) => ({
    ...state,
    sessions: state.sessions.filter(s => s.id !== sessionId),
    ...(state.activeSessionId === sessionId
      ? { messages: [], activeSessionId: null }
      : {}),
  })),

  on(ChatActions.sessionsLoaded, (state, { sessions }) => ({
    ...state,
    sessions,
  })),

  on(ChatActions.addSystemMessage, (state, { content }) => ({
    ...state,
    messages: [
      ...state.messages,
      { id: crypto.randomUUID(), role: 'system' as const, content, timestamp: Date.now() },
    ],
  })),

  // --- Connection ---
  on(ChatActions.connectionStatusChanged, (state, { status, message }) => ({
    ...state,
    connectionStatus: status,
    connectionMessage: message ?? null,
  })),
);

/** Helper: saves current messages into sessions list */
function saveCurrentToSessions(state: ChatState): ChatSession[] {
  const msgs = state.messages.filter(m => m.role !== 'system');
  if (msgs.length === 0) return state.sessions;

  const sessionId = state.activeSessionId ?? crypto.randomUUID();
  const firstUser = msgs.find(m => m.role === 'user');
  const title = firstUser
    ? firstUser.content.slice(0, 50) + (firstUser.content.length > 50 ? '...' : '')
    : 'New conversation';
  const last = msgs[msgs.length - 1];

  const session: ChatSession = {
    id: sessionId,
    title,
    preview: last.content.slice(0, 80),
    messages: [...state.messages],
    createdAt: msgs[0]?.timestamp ?? Date.now(),
    updatedAt: Date.now(),
  };

  const existing = state.sessions.findIndex(s => s.id === sessionId);
  if (existing >= 0) {
    const updated = [...state.sessions];
    updated[existing] = session;
    return updated;
  }
  return [session, ...state.sessions];
}
