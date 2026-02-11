import { Observable } from 'rxjs';
import { AgentResponse } from '../models/agent.model';
import { ChatbotAuth, ChatbotAudienceState } from '../models/contracts.model';

export abstract class AgentService {
  abstract sendMessage(
    message: string,
    auth: ChatbotAuth,
    audienceState: ChatbotAudienceState | null,
    conversationHistory: { role: string; content: string }[]
  ): Observable<AgentResponse>;

  abstract disconnect(): void;
}
