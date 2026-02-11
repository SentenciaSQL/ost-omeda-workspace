import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, SimpleChanges,
  signal, computed, inject,
  ChangeDetectionStrategy, ViewEncapsulation, ChangeDetectorRef, effect, Injector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';

import {
  ChatbotAuth, ChatbotAudienceState, ChatbotCommand,
  ChatbotConfig, ChatbotActionEvent, ChatbotUiLockEvent,
  ChatbotAgentStatusEvent, ChatbotErrorEvent,
} from './models/contracts.model';
import { UIAction } from './models/ui-actions.model';
import { ChatActions } from './store/chat.actions';
import * as ChatSelectors from './store/chat.selectors';
import { ChatEffects } from './store/chat.effects';
import { ContextService } from './services/context.service';
import { ConnectionService } from './services/connection.service';
import { UIActionEmitterService } from './services/ui-action-emitter.service';

import { MessageListComponent } from './components/message-list/message-list.component';
import { ChatInputComponent } from './components/chat-input/chat-input.component';
import { PromptSuggestionsComponent } from './components/prompt-suggestions/prompt-suggestions.component';
import { HistoryTabComponent } from './components/history-tab/history-tab.component';
import { ConnectionBannerComponent } from './components/connection-banner/connection-banner.component';

type Tab = 'chat' | 'history';

@Component({
  selector: 'omeda-chatbot',
  standalone: true,
  imports: [
    CommonModule, MessageListComponent, ChatInputComponent,
    PromptSuggestionsComponent, HistoryTabComponent, ConnectionBannerComponent
  ],
  providers: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.scss',
})
export class ChatbotComponent implements OnInit, OnDestroy, OnChanges {

  // ---- Inputs (Angular Elements compatible) ----
  @Input() auth: ChatbotAuth | null = null;
  @Input() audienceBuilderState: ChatbotAudienceState | null = null;
  @Input() config: ChatbotConfig | null = null;
  @Input() command: ChatbotCommand | null = null;

  // ---- Outputs ----
  @Output() chatbotAction = new EventEmitter<ChatbotActionEvent>();
  @Output() chatbotMessage = new EventEmitter<string>();
  @Output() chatbotUiLock = new EventEmitter<ChatbotUiLockEvent>();
  @Output() chatbotAgentStatus = new EventEmitter<ChatbotAgentStatusEvent>();
  @Output() chatbotError = new EventEmitter<ChatbotErrorEvent>();
  @Output() chatbotReady = new EventEmitter<boolean>();
  /** Story 9: Emits granular UI actions for the host */
  @Output() chatbotUiAction = new EventEmitter<UIAction>();
  /** Story 4: Emits when user clicks Start Over */
  @Output() chatbotClearSelections = new EventEmitter<void>();

  // ---- Injections ----
  private readonly store = inject(Store);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly contextService = inject(ContextService);
  private readonly connectionService = inject(ConnectionService);
  private readonly uiActionEmitter = inject(UIActionEmitterService);
  private readonly chatEffects = inject(ChatEffects);
  private readonly destroy$ = new Subject<void>();
  private readonly injector = inject(Injector);

  // ---- State from NgRx (via signals for template) ----
  readonly messages = signal<any[]>([]);
  readonly sessions = signal<any[]>([]);
  readonly activeSessionId = signal<string | null>(null);
  readonly isAgentTyping = signal(false);
  readonly hasUserMessages = signal(false);
  readonly connectionStatus = signal<string>('disconnected');
  readonly sessionsCount = computed(() => this.sessions().length);
  readonly retryAttempt = signal(0);
  readonly retryMaxAttempts = signal(5);
  readonly retryCountdownMs = signal(0);
  readonly connectionError = signal<string | null>(null);

  readonly activeTab = signal<Tab>('chat');

  readonly currentPrompts = computed(() => {
    const custom = this.config?.prompts;
    return custom?.length ? custom : [
      'Build an audience of enterprise CTOs',
      'Refine my current selection for better reach',
      'Show me the current audience breakdown',
    ];
  });

  // ---- Lifecycle ----

  ngOnInit(): void {
    // Subscribe NgRx selectors → signals for the template
    this.store.select(ChatSelectors.selectMessages)
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => { this.messages.set(v); this.cdr.markForCheck(); });

    this.store.select(ChatSelectors.selectSessions)
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => { this.sessions.set(v); this.cdr.markForCheck(); });

    this.store.select(ChatSelectors.selectActiveSessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => { this.activeSessionId.set(v); this.cdr.markForCheck(); });

    this.store.select(ChatSelectors.selectIsAgentTyping)
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => { this.isAgentTyping.set(v); this.cdr.markForCheck(); });

    this.store.select(ChatSelectors.selectHasUserMessages)
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => { this.hasUserMessages.set(v); this.cdr.markForCheck(); });

    this.store.select(ChatSelectors.selectConnectionStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => { this.connectionStatus.set(v); this.cdr.markForCheck(); });

    const connSvc = this.connectionService;
    effect(() => {
      this.retryAttempt.set(connSvc.retryAttempt());
      this.retryMaxAttempts.set(connSvc.maxRetries());
      this.retryCountdownMs.set(connSvc.nextRetryMs());
      this.connectionError.set(connSvc.errorMessage());
      this.cdr.markForCheck();
    }, { injector: this.injector });

    // Story 12: Set auth context
    if (this.auth) {
      this.contextService.setAuth(this.auth);
    }

    // Story 10: Load persisted sessions
    this.chatEffects.loadPersistedSessions();

    // Story 9: Register UI action handler
    this.uiActionEmitter.registerHandler(async (action) => {
      this.chatbotUiAction.emit(action);
      return { actionId: crypto.randomUUID(), action, status: 'success' };
    });

    // Ready
    this.connectionService.markConnected();
    this.store.dispatch(ChatActions.connectionStatusChanged({ status: 'connected' }));
    this.chatbotAgentStatus.emit({ status: 'connected' });
    this.chatbotReady.emit(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Story 12: Update auth context
    if (changes['auth'] && this.auth) {
      this.contextService.setAuth(this.auth);
    }

    // Story 8: Audience state sync
    if (changes['audienceBuilderState'] && this.audienceBuilderState) {
      this.contextService.setAudienceState(this.audienceBuilderState);
      this.store.dispatch(ChatActions.audienceStateUpdated({ state: this.audienceBuilderState }));

      const prev = changes['audienceBuilderState'].previousValue as ChatbotAudienceState | null;
      if (prev && prev.timestamp !== this.audienceBuilderState.timestamp) {
        const diff = this.describeStateDiff(prev, this.audienceBuilderState);
        if (diff) {
          this.store.dispatch(ChatActions.addSystemMessage({ content: `📊 Audience updated: ${diff}` }));
        }
      }
    }

    // Host command
    if (changes['command'] && this.command) {
      this.handleCommand(this.command);
    }
  }

  onRetryConnection(): void {
    this.connectionService.forceRetry();
    // Re-send the last message if there was one
    const lastUserMsg = this.messages()
      .filter(m => m.role === 'user')
      .pop();
    if (lastUserMsg) {
      this.store.dispatch(ChatActions.sendMessage({ content: lastUserMsg.content }));
    }
  }

  // ---- User interactions ----

  onUserMessage(text: string): void {
    this.activeTab.set('chat');
    this.store.dispatch(ChatActions.sendMessage({ content: text }));
    this.chatbotMessage.emit(text);
  }

  onPromptSelected(prompt: string): void {
    this.activeTab.set('chat');
    this.store.dispatch(ChatActions.selectPrompt({ prompt }));
    this.chatbotMessage.emit(prompt);
  }

  /** Story 4: Start Over */
  onStartOver(): void {
    this.store.dispatch(ChatActions.startOver());
    this.chatbotClearSelections.emit();
  }

  // ---- Actions (Task 10) ----

  onActionConfirm(requestId: string): void {
    this.store.dispatch(ChatActions.confirmAction({ requestId }));

    const msg = this.messages().find(m => m.action?.requestId === requestId);
    if (!msg?.action) return;

    this.chatbotUiLock.emit({ locked: true, reason: 'Applying agent plan...' });
    this.chatbotAction.emit({
      type: msg.action.type,
      requestId,
      confirmed: true,
      payload: msg.action.payload,
    });

    // Story 9: Parse into granular UI actions
    if (msg.action.type === 'applySkittlePlan') {
      const uiActions = this.uiActionEmitter.parseSkittlePlan(msg.action.payload);
      this.uiActionEmitter.executeActions(uiActions);
    }
  }

  onActionReject(requestId: string): void {
    this.store.dispatch(ChatActions.rejectAction({ requestId }));
  }

  // ---- History ----

  startNewChat(): void {
    this.store.dispatch(ChatActions.startNewSession());
    this.activeTab.set('chat');
  }

  onLoadSession(sessionId: string): void {
    this.store.dispatch(ChatActions.loadSession({ sessionId }));
    this.activeTab.set('chat');
  }

  onDeleteSession(sessionId: string): void {
    this.store.dispatch(ChatActions.deleteSession({ sessionId }));
  }

  // ---- Host commands ----

  private handleCommand(cmd: ChatbotCommand): void {
    if (cmd.type === 'actionResult') {
      this.store.dispatch(ChatActions.actionResultReceived({
        requestId: cmd.payload.requestId,
        status: cmd.payload.status,
        audienceCount: cmd.payload.audienceCount,
        message: cmd.payload.message,
      }));
      this.chatbotUiLock.emit({ locked: false });
    }
  }

  // ---- Helpers ----

  private describeStateDiff(
    prev: ChatbotAudienceState,
    curr: ChatbotAudienceState
  ): string | null {
    const parts: string[] = [];

    const countDiff = curr.totalAudienceCount - prev.totalAudienceCount;
    if (countDiff !== 0) {
      const dir = countDiff > 0 ? '↑' : '↓';
      parts.push(`${curr.totalAudienceCount.toLocaleString()} records (${dir}${Math.abs(countDiff).toLocaleString()})`);
    }

    for (const f of curr.folders) {
      const pf = prev.folders.find(x => x.id === f.id);
      if (!pf) { parts.push(`added "${f.name}"`); continue; }
      const prevIds = new Set(pf.selectedValues.map(v => v.id));
      const currIds = new Set(f.selectedValues.map(v => v.id));
      const added = f.selectedValues.filter(v => !prevIds.has(v.id));
      const removed = pf.selectedValues.filter(v => !currIds.has(v.id));
      if (added.length) parts.push(`${f.name}: +${added.map(v => v.label).join(', ')}`);
      if (removed.length) parts.push(`${f.name}: -${removed.map(v => v.label).join(', ')}`);
    }
    for (const pf of prev.folders) {
      if (!curr.folders.find(f => f.id === pf.id)) parts.push(`removed "${pf.name}"`);
    }

    return parts.length > 0 ? parts.join(' · ') : null;
  }
}
