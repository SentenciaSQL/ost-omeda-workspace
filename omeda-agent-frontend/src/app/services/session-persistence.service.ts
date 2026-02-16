import { Injectable, signal } from '@angular/core';
import { ChatSession } from '../models/chat.model';

export type PersistenceBackend = {
  save: (sessions: ChatSession[]) => Promise<void>;
  load: () => Promise<ChatSession[]>;
};

@Injectable()
export class SessionPersistenceService {
  private backend: PersistenceBackend | null = null;
  private memoryStore: ChatSession[] = [];

  private readonly _isSaving = signal(false);
  private readonly _lastSaved = signal<number | null>(null);
  readonly isSaving = this._isSaving.asReadonly();
  readonly lastSaved = this._lastSaved.asReadonly();

  /**
   * Register a persistence backend.
   * If not registered, uses in-memory only.
   * Host can provide localStorage, IndexedDB, or API-based backend.
   */
  registerBackend(backend: PersistenceBackend): void {
    this.backend = backend;
  }

  async saveSessions(sessions: ChatSession[]): Promise<void> {
    this.memoryStore = [...sessions];

    if (this.backend) {
      this._isSaving.set(true);
      try {
        await this.backend.save(sessions);
        this._lastSaved.set(Date.now());
      } catch (err) {
        console.error('[SessionPersistence] Save failed:', err);
      } finally {
        this._isSaving.set(false);
      }
    }
  }

  loadSessions(): ChatSession[] {
    // Sync load from memory; async load from backend is separate
    return this.memoryStore;
  }

  async loadSessionsAsync(): Promise<ChatSession[]> {
    if (this.backend) {
      try {
        this.memoryStore = await this.backend.load();
      } catch (err) {
        console.error('[SessionPersistence] Load failed:', err);
      }
    }
    return this.memoryStore;
  }
}
