// This is the entry point. It registers <omeda-chatbot> as a
// custom element using @angular/elements.
// =============================================================
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ChatbotComponent } from './app/chatbot.component';
import { AgentService } from './app/services/agent.service';
import { MockAgentService } from './app/services/mock-agent.service';

(async () => {
  const app = await createApplication({
    providers: [
      provideExperimentalZonelessChangeDetection(),
      // ★ Swap to real SSE service when backend is ready:
      // { provide: AgentService, useClass: SseAgentService },
      { provide: AgentService, useClass: MockAgentService },
    ],
  });

  const ChatbotElement = createCustomElement(ChatbotComponent, {
    injector: app.injector,
  });

  // Register the custom element
  if (!customElements.get('omeda-chatbot')) {
    customElements.define('omeda-chatbot', ChatbotElement);
    console.log('[omeda-agent-frontend] <omeda-chatbot> registered');
  }
})();
