import { Injectable, signal, computed } from '@angular/core';
import { ChatMessage, ChatSession, PendingAction } from '../models/chat.model';

@Injectable()
export class ChatStateService {
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _isAgentTyping = signal(false);
  private readonly _sessions = signal<ChatSession[]>([]);
  private readonly _activeSessionId = signal<string | null>(null);

  readonly messages = this._messages.asReadonly();
  readonly isAgentTyping = this._isAgentTyping.asReadonly();
  readonly sessions = this._sessions.asReadonly();
  readonly activeSessionId = this._activeSessionId.asReadonly();

  readonly hasMessages = computed(() => this._messages().some(m => m.role !== 'system'));

  readonly pendingActions = computed(() =>
    this._messages()
      .filter(m => m.action?.status === 'pending')
      .map(m => m.action!)
  );

  // ---- Session management (Chat History) ----

  startNewSession(): string {
    // Save current session first if it has messages
    this.saveCurrentSession();

    const id = crypto.randomUUID();
    this._activeSessionId.set(id);
    this._messages.set([]);
    return id;
  }

  private saveCurrentSession(): void {
    const msgs = this._messages().filter(m => m.role !== 'system');
    if (msgs.length === 0) return;

    const sessionId = this._activeSessionId() ?? crypto.randomUUID();
    const firstUserMsg = msgs.find(m => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
      : 'New conversation';
    const lastMsg = msgs[msgs.length - 1];
    const preview = lastMsg.content.slice(0, 80) + (lastMsg.content.length > 80 ? '...' : '');

    const session: ChatSession = {
      id: sessionId,
      title,
      preview,
      messages: [...this._messages()],
      createdAt: msgs[0]?.timestamp ?? Date.now(),
      updatedAt: Date.now(),
    };

    this._sessions.update(sessions => {
      const idx = sessions.findIndex(s => s.id === sessionId);
      if (idx >= 0) {
        const updated = [...sessions];
        updated[idx] = session;
        return updated;
      }
      return [session, ...sessions];
    });
  }

  loadSession(sessionId: string): void {
    this.saveCurrentSession();
    const session = this._sessions().find(s => s.id === sessionId);
    if (session) {
      this._activeSessionId.set(session.id);
      this._messages.set([...session.messages]);
    }
  }

  deleteSession(sessionId: string): void {
    this._sessions.update(s => s.filter(sess => sess.id !== sessionId));
    if (this._activeSessionId() === sessionId) {
      this._activeSessionId.set(null);
      this._messages.set([]);
    }
  }

  // ---- Message management ----

  addUserMessage(content: string): string {
    const id = crypto.randomUUID();
    this._messages.update(msgs => [
      ...msgs,
      { id, role: 'user', content, timestamp: Date.now() },
    ]);
    return id;
  }

  startAgentMessage(): string {
    const id = crypto.randomUUID();
    this._messages.update(msgs => [
      ...msgs,
      { id, role: 'agent', content: '', timestamp: Date.now(), streaming: true },
    ]);
    this._isAgentTyping.set(true);
    return id;
  }

  appendToAgentMessage(id: string, chunk: string): void {
    this._messages.update(msgs =>
      msgs.map(m => m.id === id ? { ...m, content: m.content + chunk } : m)
    );
  }

  finalizeAgentMessage(id: string): void {
    this._messages.update(msgs =>
      msgs.map(m => m.id === id ? { ...m, streaming: false } : m)
    );
    this._isAgentTyping.set(false);
    // Auto-save to session
    this.saveCurrentSession();
  }

  attachAction(messageId: string, action: PendingAction): void {
    this._messages.update(msgs =>
      msgs.map(m => m.id === messageId ? { ...m, action } : m)
    );
  }

  updateActionStatus(requestId: string, status: PendingAction['status'], resultSummary?: string): void {
    this._messages.update(msgs =>
      msgs.map(m => {
        if (m.action?.requestId === requestId) {
          return { ...m, action: { ...m.action, status, resultSummary } };
        }
        return m;
      })
    );
    this.saveCurrentSession();
  }

  addSystemMessage(content: string): void {
    this._messages.update(msgs => [
      ...msgs,
      { id: crypto.randomUUID(), role: 'system', content, timestamp: Date.now() },
    ]);
  }
}
