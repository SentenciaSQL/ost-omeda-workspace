import { Injectable, signal, computed } from '@angular/core';

export interface ConnectionConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
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
  private _nextRetryDelay = 0;

  // Signals for the banner
  private readonly _status = signal<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  private readonly _retryAttempt = signal(0);
  private readonly _nextRetryMs = signal(0);
  private readonly _errorMessage = signal<string | null>(null);

  readonly status = this._status.asReadonly();
  readonly retryAttempt = this._retryAttempt.asReadonly();
  readonly nextRetryMs = this._nextRetryMs.asReadonly();
  readonly maxRetries = computed(() => this.config.maxRetries);
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly isConnected = computed(() => this._status() === 'connected');

  configure(config: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  markConnected(): void {
    this._status.set('connected');
    this.retryCount = 0;
    this._retryAttempt.set(0);
    this._nextRetryMs.set(0);
    this._errorMessage.set(null);
    this.clearRetryTimeout();
  }

  markDisconnected(): void {
    this._status.set('disconnected');
    this.clearRetryTimeout();
  }

  /**
   * Handle a connection error with exponential backoff.
   * Returns a Promise that resolves when ready to retry,
   * or rejects if max retries exceeded.
   */
  async handleError(error: Error): Promise<void> {
    this.retryCount++;
    this._retryAttempt.set(this.retryCount);
    this._errorMessage.set(error.message);

    if (this.retryCount > this.config.maxRetries) {
      this._status.set('error');
      this._nextRetryMs.set(0);
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
    this._nextRetryDelay = actualDelay;
    this._nextRetryMs.set(actualDelay);

    console.log(`[Connection] Retry ${this.retryCount}/${this.config.maxRetries} in ${actualDelay}ms`);

    await new Promise<void>((resolve) => {
      this.retryTimeout = setTimeout(resolve, actualDelay);
    });
  }

  /**
   * Wraps an async operation with automatic retry logic.
   * Used by the agent service to retry failed requests.
   */
  async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    this.resetRetries();

    while (true) {
      try {
        this._status.set('connecting');
        const result = await operation();
        this.markConnected();
        return result;
      } catch (err: any) {
        try {
          await this.handleError(err);
          // Loop continues → retry
        } catch (finalErr) {
          // Max retries exceeded
          throw finalErr;
        }
      }
    }
  }

  /** Manual retry trigger (from the banner's Retry button) */
  forceRetry(): void {
    this.retryCount = 0;
    this._retryAttempt.set(0);
    this._status.set('connecting');
    this._errorMessage.set(null);
    this.clearRetryTimeout();
  }

  resetRetries(): void {
    this.retryCount = 0;
    this._retryAttempt.set(0);
    this._nextRetryMs.set(0);
    this._errorMessage.set(null);
    this.clearRetryTimeout();
  }

  private clearRetryTimeout(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }
}
