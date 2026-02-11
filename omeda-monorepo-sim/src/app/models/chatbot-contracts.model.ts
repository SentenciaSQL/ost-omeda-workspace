/** What the host passes as auth info to the chatbot */
export interface ChatbotAuth {
  jwt?: string;          // When JWT endpoint is ready
  userId: string;
  environmentId: string;
  profileId: string;
  permissions: string[];
}

/** What the host passes as audience builder state */
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

/** Actions the chatbot emits back to the host */
export interface ChatbotAction {
  type: 'applySkittlePlan' | 'selectFolderValues' | 'openFolder';
  requestId: string;
  confirmed: boolean;
  payload: any;
}

/** Command the host sends back to the chatbot */
export interface ChatbotCommand {
  type: 'actionResult' | 'stateSync' | 'error';
  id: string;
  timestamp: number;
  payload: any;
}

/** UI lock event from chatbot */
export interface ChatbotUiLock {
  locked: boolean;
  reason?: string;
}
