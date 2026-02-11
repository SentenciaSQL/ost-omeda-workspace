import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ChatbotAuth, ChatbotAudienceState, ChatbotCommand,
  ChatbotConfig, ChatbotActionEvent, ChatbotUiLockEvent,
  ChatbotAgentStatusEvent, ChatbotErrorEvent,
} from './models/contracts.model';
import { PendingAction } from './models/chat.model';
import { AgentResponse } from './models/agent.model';
import { AgentService } from './services/agent.service';
import { ChatStateService } from './services/chat-state.service';

import { MessageListComponent } from './components/message-list/message-list.component';
import { ChatInputComponent } from './components/chat-input/chat-input.component';
import { PromptSuggestionsComponent } from './components/prompt-suggestions/prompt-suggestions.component';
import { HistoryTabComponent } from './components/history-tab/history-tab.component';

type Tab = 'chat' | 'history';

@Component({
  selector: 'omeda-chatbot',
  standalone: true,
  imports: [
    CommonModule, MessageListComponent, ChatInputComponent,
    PromptSuggestionsComponent, HistoryTabComponent,
  ],
  providers: [ChatStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.scss',
})
export class ChatbotComponent implements OnInit, OnDestroy, OnChanges {

  // ============================================
  // ★ TASK 7: INPUTS — Using @Input() decorators
  // Angular Elements maps these to element properties.
  // ============================================

  @Input() auth: ChatbotAuth | null = null;
  @Input() audienceBuilderState: ChatbotAudienceState | null = null;
  @Input() config: ChatbotConfig | null = null;
  @Input() command: ChatbotCommand | null = null;

  // ============================================
  // ★ TASK 7: OUTPUTS — Using @Output() EventEmitter
  // Angular Elements maps these to CustomEvents.
  // ============================================

  @Output() chatbotAction = new EventEmitter<ChatbotActionEvent>();
  @Output() chatbotMessage = new EventEmitter<string>();
  @Output() chatbotUiLock = new EventEmitter<ChatbotUiLockEvent>();
  @Output() chatbotAgentStatus = new EventEmitter<ChatbotAgentStatusEvent>();
  @Output() chatbotError = new EventEmitter<ChatbotErrorEvent>();
  @Output() chatbotReady = new EventEmitter<boolean>();

  // ============================================
  // Internal state (signals are fine here)
  // ============================================

  readonly chatState = inject(ChatStateService);
  private readonly agentService = inject(AgentService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly activeTab = signal<Tab>('chat');

  // Internal signal tracking the latest audience state
  // Agent service reads this when composing messages
  private readonly _latestAudienceState = signal<ChatbotAudienceState | null>(null);

  readonly currentPrompts = computed(() => {
    const custom = this.config?.prompts;
    return custom?.length ? custom : [
      'Build an audience of enterprise CTOs',
      'Refine my current selection for better reach',
      'Show me the current audience breakdown',
    ];
  });

  // ============================================
  // Lifecycle
  // ============================================

  ngOnInit(): void {
    this.chatbotAgentStatus.emit({ status: 'connected' });
    this.chatbotReady.emit(true);
  }

  ngOnDestroy(): void {
    this.agentService.disconnect();
  }

  /**
   * React to property changes from the host.
   * Angular Elements calls this when the host sets properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    // Handle command input
    if (changes['command'] && this.command) {
      this.handleCommand(this.command);
    }

    // Handle config changes (e.g. prompts update)
    if (changes['config']) {
      this.cdr.markForCheck();
    }

    // Handle audience state changes — notify the chat
    if (changes['audienceBuilderState'] && this.audienceBuilderState) {
      const prev = changes['audienceBuilderState'].previousValue as ChatbotAudienceState | null;
      const curr = this.audienceBuilderState;

      console.log(
        '[Chatbot] Received audience state:',
        curr.folders.length, 'folders,',
        curr.totalAudienceCount, 'records'
      );

      // Store latest state so agent can read it
      this._latestAudienceState.set(curr);

      // Show a subtle notification in chat if there was a previous state
      // (skip the initial set on mount)
      if (prev && prev.timestamp !== curr.timestamp) {
        const diff = this.describeStateDiff(prev, curr);
        if (diff) {
          this.chatState.addSystemMessage(`📊 Audience updated: ${diff}`);
          this.cdr.markForCheck();
        }
      }
    }
  }

  // ============================================
  // Chat
  // ============================================

  onUserMessage(text: string): void {
    this.activeTab.set('chat');
    this.chatState.addUserMessage(text);
    this.chatbotMessage.emit(text);
    this.sendToAgent(text);
    this.cdr.markForCheck();
  }

  private sendToAgent(message: string): void {
    const msgId = this.chatState.startAgentMessage();

    const history = this.chatState.messages()
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    this.agentService
      .sendMessage(
        message,
        this.auth ?? { userId: '', environmentId: '', profileId: '', permissions: [] },
        this.audienceBuilderState,
        history
      )
      .subscribe({
        next: (r: AgentResponse) => {
          this.handleAgentResponse(msgId, r);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.chatState.finalizeAgentMessage(msgId);
          this.chatState.addSystemMessage(`Error: ${err.message}`);
          this.chatbotError.emit({ code: 'AGENT_ERROR', message: err.message });
          this.cdr.markForCheck();
        },
      });
  }

  private handleAgentResponse(msgId: string, r: AgentResponse): void {
    switch (r.type) {
      case 'text':
        this.chatState.appendToAgentMessage(msgId, r.content ?? '');
        break;
      case 'action':
        if (r.action) {
          const pending: PendingAction = {
            type: r.action.type,
            requestId: crypto.randomUUID(),
            label: r.action.label,
            description: r.action.description,
            payload: r.action.payload,
            status: 'pending',
          };
          this.chatState.attachAction(msgId, pending);
        }
        break;
      case 'done':
        this.chatState.finalizeAgentMessage(msgId);
        break;
      case 'error':
        this.chatState.finalizeAgentMessage(msgId);
        this.chatState.addSystemMessage(`Agent error: ${r.error}`);
        break;
    }
  }

  // ============================================
  // ★ TASK 10: Action Emission ★
  // ============================================

  onActionConfirm(requestId: string): void {
    this.chatState.updateActionStatus(requestId, 'confirmed');
    const msg = this.chatState.messages().find(m => m.action?.requestId === requestId);
    if (!msg?.action) return;

    this.chatbotUiLock.emit({ locked: true, reason: 'Applying agent plan...' });
    this.chatbotAction.emit({
      type: msg.action.type,
      requestId: msg.action.requestId,
      confirmed: true,
      payload: msg.action.payload,
    });
    this.cdr.markForCheck();
  }

  onActionReject(requestId: string): void {
    this.chatState.updateActionStatus(requestId, 'rejected');
    this.chatState.addSystemMessage('Action dismissed.');
    this.cdr.markForCheck();
  }

  // ============================================
  // History
  // ============================================

  startNewChat(): void {
    this.chatState.startNewSession();
    this.activeTab.set('chat');
    this.cdr.markForCheck();
  }

  onLoadSession(sessionId: string): void {
    this.chatState.loadSession(sessionId);
    this.activeTab.set('chat');
    this.cdr.markForCheck();
  }

  onDeleteSession(sessionId: string): void {
    this.chatState.deleteSession(sessionId);
    this.cdr.markForCheck();
  }

  // ============================================
  // Host → Chatbot commands
  // ============================================

  private handleCommand(cmd: ChatbotCommand): void {
    console.log('[Chatbot] Received command:', cmd.type, cmd.payload);

    if (cmd.type === 'actionResult') {
      const { requestId, status, audienceCount, message } = cmd.payload;
      if (status === 'success') {
        this.chatState.updateActionStatus(
          requestId,
          'applied',
          `Applied successfully. New audience: ${audienceCount?.toLocaleString() ?? 'unknown'} records.`
        );
        this.chatState.addSystemMessage(
          `✅ Plan applied — audience is now ${audienceCount?.toLocaleString()} records.`
        );
      } else {
        this.chatState.updateActionStatus(
          requestId,
          'error',
          `Failed: ${message ?? 'Unknown error'}`
        );
      }
      this.chatbotUiLock.emit({ locked: false });
      this.cdr.markForCheck();
    }
  }

  // ============================================
  // State diff — describes what changed for the chat
  // ============================================

  private describeStateDiff(
    prev: ChatbotAudienceState,
    curr: ChatbotAudienceState
  ): string | null {
    const parts: string[] = [];

    // Count changes
    const countDiff = curr.totalAudienceCount - prev.totalAudienceCount;
    if (countDiff !== 0) {
      const dir = countDiff > 0 ? '↑' : '↓';
      parts.push(
        `${curr.totalAudienceCount.toLocaleString()} records (${dir}${Math.abs(countDiff).toLocaleString()})`
      );
    }

    // Folder-level changes
    for (const currFolder of curr.folders) {
      const prevFolder = prev.folders.find(f => f.id === currFolder.id);
      if (!prevFolder) {
        parts.push(`added folder "${currFolder.name}"`);
        continue;
      }

      const prevIds = new Set(prevFolder.selectedValues.map(v => v.id));
      const currIds = new Set(currFolder.selectedValues.map(v => v.id));

      const added = currFolder.selectedValues.filter(v => !prevIds.has(v.id));
      const removed = prevFolder.selectedValues.filter(v => !currIds.has(v.id));

      if (added.length > 0) {
        parts.push(`${currFolder.name}: +${added.map(v => v.label).join(', ')}`);
      }
      if (removed.length > 0) {
        parts.push(`${currFolder.name}: -${removed.map(v => v.label).join(', ')}`);
      }
    }

    // Removed folders
    for (const prevFolder of prev.folders) {
      if (!curr.folders.find(f => f.id === prevFolder.id)) {
        parts.push(`removed folder "${prevFolder.name}"`);
      }
    }

    return parts.length > 0 ? parts.join(' · ') : null;
  }
}
