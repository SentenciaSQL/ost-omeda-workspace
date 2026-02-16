import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { tap, withLatestFrom, switchMap, catchError, EMPTY, map } from 'rxjs';
import { ChatActions } from './chat.actions';
import { selectConversationHistory, selectAudienceState, selectCurrentStreamingId } from './chat.selectors';
import { AgentService } from '../services/agent.service';
import { ContextService } from '../services/context.service';
import { SessionPersistenceService } from '../services/session-persistence.service';
import { PendingAction } from '../models/chat.model';

@Injectable()
export class ChatEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly agentService = inject(AgentService);
  private readonly contextService = inject(ContextService);
  private readonly persistence = inject(SessionPersistenceService);

  /**
   * When user sends a message or selects a prompt,
   * start agent communication.
   */
  sendToAgent$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.sendMessage, ChatActions.selectPrompt),
      withLatestFrom(
        this.store.select(selectConversationHistory),
        this.store.select(selectAudienceState),
      ),
      switchMap(([action, history, audienceState]) => {
        const content = 'content' in action ? action.content : (action as any).prompt;
        const context = this.contextService.buildRequestContext();

        // Dispatch start
        this.store.dispatch(ChatActions.agentResponseStart());

        return this.agentService
          .sendMessage(content, context.auth, audienceState, history)
          .pipe(
            withLatestFrom(this.store.select(selectCurrentStreamingId)),
            tap(([response, streamingId]) => {
              if (!streamingId) return;

              switch (response.type) {
                case 'text':
                  this.store.dispatch(ChatActions.agentResponseChunk({
                    messageId: streamingId,
                    chunk: response.content ?? '',
                  }));
                  break;
                case 'action':
                  if (response.action) {
                    const pending: PendingAction = {
                      type: response.action.type,
                      requestId: crypto.randomUUID(),
                      label: response.action.label,
                      description: response.action.description,
                      payload: response.action.payload,
                      status: 'pending',
                    };
                    this.store.dispatch(ChatActions.agentResponseAction({
                      messageId: streamingId,
                      action: pending,
                    }));
                  }
                  break;
                case 'done':
                  this.store.dispatch(ChatActions.agentResponseDone({
                    messageId: streamingId,
                  }));
                  break;
                case 'error':
                  this.store.dispatch(ChatActions.agentResponseError({
                    messageId: streamingId,
                    error: response.error ?? 'Unknown error',
                  }));
                  break;
              }
            }),
            catchError(err => {
              this.store.select(selectCurrentStreamingId).pipe(
                tap(id => {
                  if (id) {
                    this.store.dispatch(ChatActions.agentResponseError({
                      messageId: id,
                      error: err.message,
                    }));
                  }
                })
              ).subscribe();
              return EMPTY;
            }),
            // Effect doesn't dispatch — we dispatch inline
            map(() => ({ type: '[Chat] NOOP' })),
          );
      }),
    ), { dispatch: false }
  );

  /**
   * Story 4: Start Over — emit clearSelections action
   * so the host can reset the audience builder.
   */
  startOver$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.startOver),
      tap(() => {
        this.store.dispatch(ChatActions.clearSelections());
      }),
    ), { dispatch: false }
  );

  /**
   * Story 10: Persist sessions on changes
   */
  persistSessions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        ChatActions.agentResponseDone,
        ChatActions.startNewSession,
        ChatActions.deleteSession,
        ChatActions.actionResultReceived,
      ),
      withLatestFrom(this.store.select(state => (state as any).chat)),
      tap(([_, chatState]) => {
        this.persistence.saveSessions(chatState.sessions);
      }),
    ), { dispatch: false }
  );

  /**
   * Story 10: Load persisted sessions on init.
   * Call this from the component's ngOnInit.
   */
  loadPersistedSessions(): void {
    const sessions = this.persistence.loadSessions();
    if (sessions.length > 0) {
      this.store.dispatch(ChatActions.sessionsLoaded({ sessions }));
    }
  }
}
