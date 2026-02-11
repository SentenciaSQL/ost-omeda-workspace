import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { AgentResponse } from '../models/agent.model';
import { AgentService } from './agent.service';
import { ChatbotAuth, ChatbotAudienceState } from '../models/contracts.model';

@Injectable()
export class MockAgentService extends AgentService {

  sendMessage(
    message: string,
    auth: ChatbotAuth,
    audienceState: ChatbotAudienceState | null,
    _history: { role: string; content: string }[]
  ): Observable<AgentResponse> {
    return new Observable((observer: Observer<AgentResponse>) => {
      const isActionReq = /build|apply|select|create|audience|skittle|plan/i.test(message);

      if (isActionReq && audienceState) {
        this.streamActionResponse(observer, audienceState);
      } else if (audienceState && /what|show|current|state|count/i.test(message)) {
        this.streamStateDescription(observer, audienceState);
      } else {
        this.streamTextResponse(observer, message);
      }
    });
  }

  disconnect(): void {}

  private streamActionResponse(obs: Observer<AgentResponse>, state: ChatbotAudienceState): void {
    const words = `Based on your current audience of ${state.totalAudienceCount.toLocaleString()} records, I've prepared a plan that refines your selection. Here's what I propose:`.split(' ');
    let i = 0;
    const iv = setInterval(() => {
      if (i < words.length) {
        obs.next({ type: 'text', content: words[i] + ' ' });
        i++;
      } else {
        clearInterval(iv);
        obs.next({
          type: 'action',
          action: {
            type: 'applySkittlePlan',
            label: 'Apply Audience Refinement',
            description: `Update selection across ${state.folders.length} folders to optimize targeting.`,
            payload: {
              criteria: state.folders.map(f => ({
                folderId: f.id, folderName: f.name, operator: f.operator,
                values: [
                  ...f.selectedValues.map(v => ({ ...v, selected: true })),
                  { id: `new-${crypto.randomUUID().slice(0, 8)}`, label: 'Agent-Suggested Value', selected: true },
                ],
              })),
            },
          },
        });
        obs.next({ type: 'done' });
        obs.complete();
      }
    }, 60);
  }

  private streamStateDescription(obs: Observer<AgentResponse>, state: ChatbotAudienceState): void {
    const lines = [
      `Your current audience has ${state.totalAudienceCount.toLocaleString()} records. `,
      `You have ${state.folders.length} folders configured:\n\n`,
    ];
    state.folders.forEach(f => {
      const vals = f.selectedValues.map(v => v.label).join(', ') || 'none selected';
      lines.push(`• **${f.name}** (${f.operator}): ${vals}\n`);
    });
    lines.push(`\nWould you like me to suggest refinements or build a new targeting plan?`);
    this.streamWords(obs, lines.join(''));
  }

  private streamTextResponse(obs: Observer<AgentResponse>, msg: string): void {
    const responses: Record<string, string> = {
      default: `I'm your Audience Builder assistant. I can help you analyze your current audience selection, suggest targeting refinements, or build a skittle plan. Try asking me to "show current state" or "build an audience plan".`,
      hello: `Hey! I'm the Audience Builder agent. I can see your current selection criteria and help you refine targeting. What would you like to do?`,
      help: `Here's what I can do:\n\n• **Analyze** your current audience selection\n• **Build** a skittle plan with refined targeting\n• **Suggest** folder values based on your goals\n\nJust tell me what you need!`,
    };
    let text = responses['default'];
    if (/hello|hi|hey/i.test(msg)) text = responses['hello'];
    if (/help|what can/i.test(msg)) text = responses['help'];
    this.streamWords(obs, text);
  }

  private streamWords(obs: Observer<AgentResponse>, text: string): void {
    const words = text.split(' ');
    let i = 0;
    const iv = setInterval(() => {
      if (i < words.length) {
        obs.next({ type: 'text', content: words[i] + ' ' });
        i++;
      } else {
        clearInterval(iv);
        obs.next({ type: 'done' });
        obs.complete();
      }
    }, 50);
  }
}
