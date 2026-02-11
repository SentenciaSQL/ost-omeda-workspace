// This is the entry point. It registers <omeda-chatbot> as a
// custom element using @angular/elements.
// =============================================================
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';

import { ChatbotComponent } from './app/chatbot.component';
import { AgentService } from './app/services/agent.service';
import { MockAgentService } from './app/services/mock-agent.service';
import { ContextService } from './app/services/context.service';
import { ConnectionService } from './app/services/connection.service';
import { UIActionEmitterService } from './app/services/ui-action-emitter.service';
import { IndexedDBPersistence } from './app/services/indexeddb-persistence';
import { SessionPersistenceService } from './app/services/session-persistence.service';
import { chatReducer, CHAT_FEATURE_KEY } from './app/store/chat.reducer';
import { ChatEffects } from './app/store/chat.effects';

(async () => {
  const app = await createApplication({
    providers: [
      provideExperimentalZonelessChangeDetection(),
      provideStore({ [CHAT_FEATURE_KEY]: chatReducer }),
      provideEffects([ChatEffects]),

      // Services
      // ★ Swap to real SSE service when backend is ready:
      // { provide: AgentService, useClass: SseAgentService },
      { provide: AgentService, useClass: MockAgentService },
      ContextService,
      ConnectionService,
      UIActionEmitterService,
      SessionPersistenceService,
      ChatEffects,
    ],
  });

  const persistence = app.injector.get(SessionPersistenceService);
  persistence.registerBackend(new IndexedDBPersistence());

  const ChatbotElement = createCustomElement(ChatbotComponent, {
    injector: app.injector,
  });

  // Register the custom element
  if (!customElements.get('omeda-chatbot')) {
    customElements.define('omeda-chatbot', ChatbotElement);
    console.log('[omeda-agent-frontend] <omeda-chatbot> registered');
  }
})();
