import { Injectable, signal } from '@angular/core';
import { ChatbotAuth, ChatbotAudienceState } from '../models/contracts.model';

export interface AgentRequestContext {
  auth: ChatbotAuth;
  environmentId: string;
  profileId: string;
  audienceState: ChatbotAudienceState | null;
  sessionId: string | null;
  timestamp: number;
}

@Injectable()
export class ContextService {
  private readonly _auth = signal<ChatbotAuth | null>(null);
  private readonly _audienceState = signal<ChatbotAudienceState | null>(null);
  private readonly _sessionId = signal<string | null>(null);

  /** Called by chatbot component when host sets auth */
  setAuth(auth: ChatbotAuth): void {
    this._auth.set(auth);
  }

  /** Called when audience state updates */
  setAudienceState(state: ChatbotAudienceState): void {
    this._audienceState.set(state);
  }

  /** Called on session changes */
  setSessionId(id: string | null): void {
    this._sessionId.set(id);
  }

  /**
   * Build the full context payload for an agent request.
   * This is attached to every LangChain call (Story 6/12).
   */
  buildRequestContext(): AgentRequestContext {
    const auth = this._auth() ?? {
      userId: '',
      environmentId: '',
      profileId: '',
      permissions: [],
    };

    return {
      auth,
      environmentId: auth.environmentId,
      profileId: auth.profileId,
      audienceState: this._audienceState(),
      sessionId: this._sessionId(),
      timestamp: Date.now(),
    };
  }

  /** Check if we have valid auth */
  isAuthenticated(): boolean {
    const auth = this._auth();
    return !!auth && !!auth.userId && !!auth.environmentId;
  }
}
