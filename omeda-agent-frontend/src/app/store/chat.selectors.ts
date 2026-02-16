import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ChatState, CHAT_FEATURE_KEY } from './chat.reducer';

export const selectChatState = createFeatureSelector<ChatState>(CHAT_FEATURE_KEY);

export const selectMessages = createSelector(selectChatState, s => s.messages);
export const selectSessions = createSelector(selectChatState, s => s.sessions);
export const selectActiveSessionId = createSelector(selectChatState, s => s.activeSessionId);
export const selectIsAgentTyping = createSelector(selectChatState, s => s.isAgentTyping);
export const selectCurrentStreamingId = createSelector(selectChatState, s => s.currentStreamingId);
export const selectConnectionStatus = createSelector(selectChatState, s => s.connectionStatus);
export const selectAudienceState = createSelector(selectChatState, s => s.audienceState);
export const selectLastError = createSelector(selectChatState, s => s.lastError);

export const selectHasUserMessages = createSelector(
  selectMessages,
  msgs => msgs.some(m => m.role === 'user')
);

export const selectPendingActions = createSelector(
  selectMessages,
  msgs => msgs.filter(m => m.action?.status === 'pending').map(m => m.action!)
);

export const selectConversationHistory = createSelector(
  selectMessages,
  msgs => msgs
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))
);
