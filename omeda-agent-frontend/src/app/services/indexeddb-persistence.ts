import { ChatSession } from '../models/chat.model';
import { PersistenceBackend } from './session-persistence.service';

const DB_NAME = 'omeda-chatbot';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

/**
 * IndexedDB-based persistence for chat sessions.
 * Works in both the standalone chatbot and when loaded
 * as a custom element in the host app.
 */
export class IndexedDBPersistence implements PersistenceBackend {

  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('[IndexedDB] Failed to open:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  async save(sessions: ChatSession[]): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Clear existing and write all
    // (Simple approach — for large datasets, use diffing)
    await this.promisifyRequest(store.clear());

    for (const session of sessions) {
      store.put(this.serialize(session));
    }

    await this.promisifyTransaction(tx);
    console.log(`[IndexedDB] Saved ${sessions.length} sessions`);
  }

  async load(): Promise<ChatSession[]> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('updatedAt');

      const raw = await this.promisifyRequest<any[]>(index.getAll());
      const sessions = raw.map(r => this.deserialize(r));

      // Sort newest first
      sessions.sort((a, b) => b.updatedAt - a.updatedAt);

      console.log(`[IndexedDB] Loaded ${sessions.length} sessions`);
      return sessions;
    } catch (err) {
      console.error('[IndexedDB] Load failed:', err);
      return [];
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(sessionId);
    await this.promisifyTransaction(tx);
  }

  async clear(): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await this.promisifyTransaction(tx);
  }

  // --- Serialization (handles types IndexedDB can't store) ---

  private serialize(session: ChatSession): any {
    return {
      ...session,
      // Store messages as JSON string to avoid structured clone issues
      _messages: JSON.stringify(session.messages),
      messages: undefined,
    };
  }

  private deserialize(raw: any): ChatSession {
    return {
      ...raw,
      messages: raw._messages ? JSON.parse(raw._messages) : [],
      _messages: undefined,
    };
  }

  // --- IDB Promise helpers ---

  private promisifyRequest<T = any>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private promisifyTransaction(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
    });
  }
}
