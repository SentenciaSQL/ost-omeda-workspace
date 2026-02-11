// ★ TASKS 2, 4, 5 — SHIP THIS LOGIC TO THE REAL REPO ★
//
// In the real repo, you'll integrate this logic into the
// existing query.component.ts (or a new sibling service).
// The simulation UI chrome (folder toggles, etc.) stays here.
// =============================================================
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, debounceTime } from 'rxjs';

import { OmedaPermission } from '../../constants/permissions.constants';
import { UserService } from '../../services/user.service';
import { FolderService } from '../../services/folder.service';
import { ChatbotLoaderService } from '../../services/chatbot-loader.service';
import { selectSelectionCriteria } from '../../store/audience.selectors';
import * as AudienceActions from '../../store/audience.actions';
import {
  SelectionCriteria,
  SelectionCriterion,
} from '../../models/selection-criteria.model';
import {
  ChatbotAudienceState,
  ChatbotFolder,
  ChatbotAction,
  ChatbotCommand,
  ChatbotUiLock,
} from '../../models/chatbot-contracts.model';

@Component({
  selector: 'app-audience-builder',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './audience-builder.component.html',
  styleUrls: ['./audience-builder.component.scss'],
})
export class AudienceBuilderComponent implements OnInit, OnDestroy {
  @ViewChild('chatbotContainer') chatbotContainerRef!: ElementRef<HTMLElement>;

  private readonly store = inject(Store);
  private readonly userService = inject(UserService);
  private readonly folderService = inject(FolderService);
  private readonly chatbotLoader = inject(ChatbotLoaderService);
  private readonly destroy$ = new Subject<void>();

  private chatbotEl: HTMLElement | null = null;

  // ---- Signals for template ----
  readonly hasAgentPermission = computed(
    () => this.userService.hasPermission(OmedaPermission.AUDIENCE_BUILDER_AGENT)
  );
  readonly criteria = signal<SelectionCriteria | null>(null);
  readonly totalCount = computed(() => this.criteria()?.totalCount ?? 0);
  readonly uiLocked = signal(false);
  readonly uiLockReason = signal('');
  readonly eventLog = signal<{ type: string; time: string; message: string }[]>([]);

  // ================================================================
  //  LIFECYCLE
  // ================================================================

  ngOnInit(): void {
    this.log('info', 'AudienceBuilderComponent initialized');

    // Subscribe to criteria for local display AND for Task 4
    this.store.select(selectSelectionCriteria)
      .pipe(takeUntil(this.destroy$))
      .subscribe(criteria => this.criteria.set(criteria));

    // Attempt chatbot mount (Task 3) after view settles
    setTimeout(() => this.tryMountChatbot(), 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.removeChatbotEventListeners();
  }

  // ================================================================
  //  TASK 3: Mount Chatbot
  // ================================================================

  private async tryMountChatbot(): Promise<void> {
    if (!this.hasAgentPermission()) {
      this.log('info', 'Agent permission OFF — chatbot not mounted');
      return;
    }

    const container = this.chatbotContainerRef?.nativeElement;
    if (!container) {
      this.log('info', 'Container not found — chatbot not mounted');
      return;
    }

    try {
      this.chatbotEl = await this.chatbotLoader.loadAndMount(container);
      this.log('chatbot-mount', '<omeda-chatbot> mounted successfully');

      // Task 4: Wire state bridge
      this.setupStateBridge();

      // Task 5: Wire event listeners
      this.setupEventListeners();
    } catch (err) {
      this.log('info', `Chatbot load failed: ${err}. This is expected if the chatbot bundle isn't served yet.`);
      // Show placeholder in container
      container.innerHTML = `
        <div style="text-align:center; padding:20px; color:#4a90d9;">
          <p style="font-size:40px; margin:0;">🤖</p>
          <p><strong>Chatbot Mount Point</strong></p>
          <p style="font-size:12px; color:#888;">
            Bundle not loaded.<br/>
            Start the chatbot dev server or<br/>
            the &lt;omeda-chatbot&gt; element will appear here.
          </p>
        </div>
      `;
    }
  }

  // ================================================================
  //  ★ TASK 4: State Bridge — Selection Criteria → Chatbot ★
  //  SHIP THIS METHOD (adjust NgRx selector import)
  // ================================================================

  private setupStateBridge(): void {
    if (!this.chatbotEl) return;

    this.store.select(selectSelectionCriteria)
      .pipe(
        debounceTime(300), // Avoid flooding during rapid checkbox toggles
        takeUntil(this.destroy$),
      )
      .subscribe(criteria => {
        const chatbotState = this.mapToChatbotState(criteria);

        // Set the property on the custom element
        (this.chatbotEl as any).audienceBuilderState = chatbotState;

        this.log(
          'state-bridge',
          `Pushed state → chatbot (${chatbotState.folders.length} folders, ${chatbotState.totalAudienceCount} audience)`
        );
      });
  }

  /**
   * Maps Omeda's internal SelectionCriteria shape to the chatbot's contract.
   * ★ SHIP THIS — this is the mapping function between internal and contract types.
   */
  private mapToChatbotState(criteria: SelectionCriteria): ChatbotAudienceState {
    return {
      folders: criteria.criteria.map(c => ({
        id: c.folderId,
        name: c.folderName,
        operator: c.operator,
        selectedValues: c.values
          .filter(v => v.selected)
          .map(v => ({ id: v.id, label: v.label })),
      })),
      totalAudienceCount: criteria.totalCount,
      timestamp: criteria.lastModified,
    };
  }

  // ================================================================
  //  ★ TASK 5: Event Listener Shell — Chatbot → Host Actions ★
  //  SHIP THIS METHOD (adjust FolderService / Store imports)
  // ================================================================

  private chatbotActionHandler = ((e: Event) => {
    const action = (e as CustomEvent<ChatbotAction>).detail;
    this.log('chatbot-action', `Received action: ${action.type} (confirmed: ${action.confirmed})`);

    if (!action.confirmed) return;

    // MVP: Only handle applySkittlePlan
    if (action.type === 'applySkittlePlan') {
      this.handleApplySkittlePlan(action);
    }

    // Future action types go here:
    // if (action.type === 'selectFolderValues') { ... }
    // if (action.type === 'openFolder') { ... }
  }).bind(this);

  private chatbotUiLockHandler = ((e: Event) => {
    const lock = (e as CustomEvent<ChatbotUiLock>).detail;
    this.uiLocked.set(lock.locked);
    this.uiLockReason.set(lock.reason ?? 'Chatbot is working...');
    this.log('chatbot-action', `UI Lock: ${lock.locked ? 'LOCKED' : 'UNLOCKED'} — ${lock.reason ?? ''}`);
  }).bind(this);

  private setupEventListeners(): void {
    if (!this.chatbotEl) return;

    this.chatbotEl.addEventListener('chatbotAction', this.chatbotActionHandler);
    this.chatbotEl.addEventListener('chatbotUiLock', this.chatbotUiLockHandler);

    this.log('info', 'Event listeners attached (chatbotAction, chatbotUiLock)');
  }

  private removeChatbotEventListeners(): void {
    if (!this.chatbotEl) return;
    this.chatbotEl.removeEventListener('chatbotAction', this.chatbotActionHandler);
    this.chatbotEl.removeEventListener('chatbotUiLock', this.chatbotUiLockHandler);
  }

  /**
   * MVP handler for applySkittlePlan.
   * Uses the same flow as opening a saved query (Joseph's suggestion).
   */
  private handleApplySkittlePlan(action: ChatbotAction): void {
    this.log('chatbot-action', 'Applying skittle plan via folderService.submitData...');

    this.folderService
      .submitData(this.transformToOmedaFormat(action.payload))
      .subscribe({
        next: (response) => {
          // Update the store
          this.store.dispatch(AudienceActions.setSelectionCriteria({ data: response }));

          // Send result back to chatbot
          const command: ChatbotCommand = {
            type: 'actionResult',
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            payload: {
              requestId: action.requestId,
              status: 'success',
              audienceCount: response.totalCount,
            },
          };
          if (this.chatbotEl) {
            (this.chatbotEl as any).command = command;
          }

          this.log('chatbot-action', `✅ Skittle plan applied. New audience: ${response.totalCount}`);
        },
        error: (err) => {
          const command: ChatbotCommand = {
            type: 'error',
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            payload: {
              requestId: action.requestId,
              status: 'error',
              message: err.message,
            },
          };
          if (this.chatbotEl) {
            (this.chatbotEl as any).command = command;
          }
          this.log('chatbot-action', `❌ Skittle plan failed: ${err.message}`);
        },
      });
  }

  /**
   * Transforms chatbot payload shape to Omeda's internal format.
   * Adjust this mapping when integrating into the real repo.
   */
  private transformToOmedaFormat(chatbotPayload: any): any {
    // For now, pass through — in real repo, map to Omeda's API shape
    return chatbotPayload;
  }

  // ================================================================
  //  SIMULATION HELPERS (not shipped to real repo)
  // ================================================================

  togglePermission(): void {
    this.userService.toggleAgentPermission();
    this.log('info', `Agent permission toggled: ${this.hasAgentPermission() ? 'ON' : 'OFF'}`);

    // Re-mount or unmount chatbot
    if (this.hasAgentPermission()) {
      setTimeout(() => this.tryMountChatbot(), 0);
    } else {
      this.chatbotEl = null;
    }
  }

  resetCriteria(): void {
    this.store.dispatch(AudienceActions.loadMockCriteria());
    this.log('info', 'Criteria reset to initial state');
  }

  onValueToggle(folderId: string, valueId: string, event: Event): void {
    const selected = (event.target as HTMLInputElement).checked;
    this.store.dispatch(AudienceActions.updateCriterionValue({ folderId, valueId, selected }));
  }

  private log(type: string, message: string): void {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.eventLog.update(log => [{ type, time, message }, ...log].slice(0, 50));
  }
}
