import {
  Component, input, effect, ElementRef, viewChild,
  ChangeDetectionStrategy, output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../models/chat.model';
import { ActionConfirmationComponent } from '../action-confirmation/action-confirmation.component';

@Component({
  selector: 'cb-message-list',
  standalone: true,
  imports: [CommonModule, ActionConfirmationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-list.component.html',
  styleUrl: './message-list.component.scss'
})
export class MessageListComponent {
  messages = input.required<ChatMessage[]>();
  isTyping = input(false);
  confirmAction = output<string>();
  rejectAction = output<string>();

  private scrollRef = viewChild<ElementRef>('scrollContainer');

  constructor() {
    effect(() => {
      this.messages();
      this.isTyping();
      setTimeout(() => {
        const el = this.scrollRef()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      }, 0);
    });
  }

  formatContent(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }
}
