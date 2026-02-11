import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { ChatMessage, ChatSession, PendingAction } from '../models/chat.model';
import { AgentResponse } from '../models/agent.model';
import { ChatbotAudienceState, ChatbotCommand } from '../models/contracts.model';

export const ChatActions = createActionGroup({
  source: 'Chat',
  events: {
    // --- User actions ---
    'Send Message': props<{ content: string }>(),
    'Select Prompt': props<{ prompt: string }>(),

    // --- Agent streaming ---
    'Agent Response Start': emptyProps(),
    'Agent Response Chunk': props<{ messageId: string; chunk: string }>(),
    'Agent Response Action': props<{ messageId: string; action: PendingAction }>(),
    'Agent Response Done': props<{ messageId: string }>(),
    'Agent Response Error': props<{ messageId: string; error: string }>(),

    // --- Human-in-the-loop (Task 10) ---
    'Confirm Action': props<{ requestId: string }>(),
    'Reject Action': props<{ requestId: string }>(),
    'Action Result Received': props<{ requestId: string; status: 'success' | 'error'; audienceCount?: number; message?: string }>(),

    // --- Story 4: Controls ---
    'Start Over': emptyProps(),
    'Clear Selections': emptyProps(),

    // --- Story 8: Audience state sync ---
    'Audience State Updated': props<{ state: ChatbotAudienceState }>(),

    // --- Story 9: Programmatic UI updates ---
    'Dispatch UI Action': props<{ action: any }>(),

    // --- Session / History ---
    'Start New Session': emptyProps(),
    'Load Session': props<{ sessionId: string }>(),
    'Delete Session': props<{ sessionId: string }>(),
    'Sessions Loaded': props<{ sessions: ChatSession[] }>(),
    'Add System Message': props<{ content: string }>(),

    // --- Host commands ---
    'Host Command Received': props<{ command: ChatbotCommand }>(),

    // --- Connection (Story 7) ---
    'Connection Status Changed': props<{ status: 'connecting' | 'connected' | 'disconnected' | 'error'; message?: string }>(),
  },
});
