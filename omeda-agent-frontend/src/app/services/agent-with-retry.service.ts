import { Injectable, inject } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { AgentService } from './agent.service';
import { ConnectionService } from './connection.service';
import { AgentResponse } from '../models/agent.model';
import { ChatbotAuth, ChatbotAudienceState } from '../models/contracts.model';

/**
 * Wraps the real AgentService (Mock or SSE) with retry logic.
 * If the agent call fails, ConnectionService handles backoff
 * and retries automatically.
 */
@Injectable()
export class AgentWithRetryService extends AgentService {
  private readonly innerAgent = inject(AgentService, { skipSelf: true });
  private readonly connection = inject(ConnectionService);

  private currentSub: Subscription | null = null;

  sendMessage(
    message: string,
    auth: ChatbotAuth,
    audienceState: ChatbotAudienceState | null,
    history: { role: string; content: string }[]
  ): Observable<AgentResponse> {
    const subject = new Subject<AgentResponse>();

    this.sendWithRetry(message, auth, audienceState, history, subject);

    return subject.asObservable();
  }

  disconnect(): void {
    this.currentSub?.unsubscribe();
    this.innerAgent.disconnect();
  }

  private async sendWithRetry(
    message: string,
    auth: ChatbotAuth,
    audienceState: ChatbotAudienceState | null,
    history: { role: string; content: string }[],
    subject: Subject<AgentResponse>,
  ): Promise<void> {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.currentSub = this.innerAgent
            .sendMessage(message, auth, audienceState, history)
            .subscribe({
              next: (response) => {
                subject.next(response);
                if (response.type === 'done') {
                  this.connection.markConnected();
                }
              },
              error: (err) => {
                reject(err);
              },
              complete: () => {
                subject.complete();
                resolve();
              },
            });
        });
        // Success — exit loop
        return;
      } catch (err: any) {
        attempt++;
        console.error(`[AgentRetry] Attempt ${attempt} failed:`, err.message);

        if (attempt >= maxAttempts) {
          // Let ConnectionService handle the backoff and UI
          try {
            await this.connection.handleError(err);
            // After backoff, try one more time
            attempt = 0; // Reset for another full round
          } catch (finalErr) {
            // Max retries exhausted
            subject.next({ type: 'error', error: 'Connection failed. Please try again.' });
            subject.next({ type: 'done' });
            subject.complete();
            return;
          }
        } else {
          // Quick retry without backoff for first attempts
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }
  }
}
