// =============================================================
// This is the core integration service. Copy this file
// (adjusting imports) into the monorepo.
// =============================================================
import { Injectable, inject, OnDestroy } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

interface ChatbotAuth {
  jwt?: string;
  userId: string;
  environmentId: string;
  profileId: string;
  permissions: string[];
}

@Injectable({ providedIn: 'root' })
export class ChatbotLoaderService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  private scriptLoaded = false;
  private scriptElement: HTMLScriptElement | null = null;
  private chatbotElement: HTMLElement | null = null;

  async loadAndMount(container: HTMLElement): Promise<HTMLElement> {
    // 1. Load the bundle script
    if (!this.scriptLoaded) {
      await this.injectScript(environment.chatbotBundleUrl);
      this.scriptLoaded = true;

      // Wait for the custom element to register
      // (Angular bootstraps async after script loads)
      await customElements.whenDefined('omeda-chatbot');
    }

    // 2. Create and configure the element
    const chatbotEl = document.createElement('omeda-chatbot');
    (chatbotEl as any).auth = this.buildAuthPayload();

    // 3. Mount
    container.innerHTML = '';
    container.appendChild(chatbotEl);
    this.chatbotElement = chatbotEl;

    console.log('[ChatbotLoader] <omeda-chatbot> mounted');
    return chatbotEl;
  }

  private buildAuthPayload(): ChatbotAuth {
    const user = this.userService.userInfo();
    return {
      jwt: this.authService.getJwt() ?? undefined,
      userId: user.userId,
      environmentId: user.databaseId,
      profileId: user.profileId,
      permissions: user.permissions,
    };
  }

  private injectScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.type = 'module';  // Angular 18 outputs ESM
      script.async = true;
      script.onload = () => {
        console.log('[ChatbotLoader] Script loaded:', url);
        resolve();
      };
      script.onerror = (err) => {
        console.error('[ChatbotLoader] Failed to load:', url);
        reject(new Error(`Failed to load chatbot bundle from ${url}`));
      };
      document.head.appendChild(script);
      this.scriptElement = script;
    });
  }

  ngOnDestroy(): void {
    this.chatbotElement?.remove();
    this.scriptElement?.remove();
    this.chatbotElement = null;
    this.scriptElement = null;
    this.scriptLoaded = false;
  }
}
