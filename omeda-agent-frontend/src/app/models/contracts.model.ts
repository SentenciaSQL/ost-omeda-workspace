export interface ChatbotAuth {
  jwt?: string;
  userId: string;
  environmentId: string;
  profileId: string;
  permissions: string[];
}

export interface ChatbotAudienceState {
  folders: ChatbotFolder[];
  totalAudienceCount: number;
  timestamp: number;
}

export interface ChatbotFolder {
  id: string;
  name: string;
  operator: 'AND' | 'OR' | 'NOT';
  selectedValues: { id: string; label: string }[];
}

export interface ChatbotCommand {
  type: 'actionResult' | 'stateSync' | 'error';
  id: string;
  timestamp: number;
  payload: any;
}

export interface ChatbotConfig {
  agentEndpoint?: string;
  theme?: 'light' | 'dark';
  position?: 'right' | 'left';
  locale?: string;
  prompts?: string[];
}

export interface ChatbotActionEvent {
  type: 'applySkittlePlan' | 'selectFolderValues' | 'openFolder';
  requestId: string;
  confirmed: boolean;
  payload: any;
}

export interface ChatbotUiLockEvent {
  locked: boolean;
  reason?: string;
}

export interface ChatbotAgentStatusEvent {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  message?: string;
}

export interface ChatbotErrorEvent {
  code: string;
  message: string;
  details?: any;
}
