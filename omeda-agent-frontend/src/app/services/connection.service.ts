import { Injectable, signal, computed } from '@angular/core';

export interface ConnectionConfig {
  maxRetries: number;
  baseDelay: number;     // ms
  maxDelay: number;      // ms
  backoffMultiplier: number;
}

const DEFAULT_CONFIG: ConnectionConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

@Injectable()
export class ConnectionService {
  private config = DEFAULT_CONFIG;
  private retryCount = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly _status = signal<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  private readonly _retryInfo = signal<{ attempt: number; nextIn: number } | null>(null);

  readonly status = this._status.asReadonly();
  readonly retryInfo = this._retryInfo.asReadonly();
  readonly isConnected = computed(() => this._status() === 'connected');

  configure(config: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  markConnected(): void {
    this._status.set('connected');
    this.retryCount = 0;
    this._retryInfo.set(null);
    this.clearRetryTimeout();
  }

  markDisconnected(): void {
    this._status.set('disconnected');
    this.clearRetryTimeout();
  }

  /**
   * Handle a connection error. Returns a Promise that resolves
   * when it's time to retry, or rejects if max retries exceeded.
   */
  async handleError(error: Error): Promise<void> {
    this.retryCount++;

    if (this.retryCount > this.config.maxRetries) {
      this._status.set('error');
      this._retryInfo.set(null);
      throw new Error(
        `Connection failed after ${this.config.maxRetries} attempts: ${error.message}`
      );
    }

    this._status.set('connecting');

    // Exponential backoff with jitter
    const delay = Math.min(
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, this.retryCount - 1),
      this.config.maxDelay,
    );
    const jitter = delay * 0.2 * Math.random();
    const actualDelay = Math.round(delay + jitter);

    this._retryInfo.set({
      attempt: this.retryCount,
      nextIn: actualDelay,
    });

    console.log(
      `[Connection] Retry ${this.retryCount}/${this.config.maxRetries} in ${actualDelay}ms`
    );

    await new Promise<void>((resolve) => {
      this.retryTimeout = setTimeout(resolve, actualDelay);
    });
  }

  resetRetries(): void {
    this.retryCount = 0;
    this._retryInfo.set(null);
    this.clearRetryTimeout();
  }

  private clearRetryTimeout(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }
}
