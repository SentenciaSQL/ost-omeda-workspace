export interface AgentResponse {
  type: 'text' | 'action' | 'error' | 'done';
  content?: string;
  action?: {
    type: 'applySkittlePlan' | 'selectFolderValues' | 'openFolder';
    label: string;
    description: string;
    payload: any;
  };
  error?: string;
}
