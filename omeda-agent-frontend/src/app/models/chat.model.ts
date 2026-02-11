export type MessageRole = 'user' | 'agent' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  action?: PendingAction | null;
  streaming?: boolean;
}

export interface PendingAction {
  type: 'applySkittlePlan' | 'selectFolderValues' | 'openFolder';
  requestId: string;
  label: string;
  description: string;
  payload: any;
  status: 'pending' | 'confirmed' | 'rejected' | 'applied' | 'error';
  resultSummary?: string;
}

/** A saved conversation session */
export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
