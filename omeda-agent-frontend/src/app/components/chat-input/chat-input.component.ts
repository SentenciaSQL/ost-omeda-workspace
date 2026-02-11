import {
  Component, output, input, signal, ElementRef, viewChild,
  ChangeDetectionStrategy
} from '@angular/core';

@Component({
  selector: 'cb-chat-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-input.component.html',
  styleUrl: './chat-input.component.scss'
})
export class ChatInputComponent {
  disabled = input(false);
  messageSent = output<string>();
  inputValue = signal('');
  private inputEl = viewChild<ElementRef>('inputEl');

  onInput(el: HTMLTextAreaElement): void {
    this.inputValue.set(el.value);
    // Auto-grow
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 80) + 'px';
  }

  send(): void {
    const text = this.inputValue().trim();
    if (!text) return;
    this.messageSent.emit(text);
    this.inputValue.set('');
    const el = this.inputEl()?.nativeElement;
    if (el) { el.style.height = 'auto'; el.value = ''; }
  }

  onEnter(e: Event): void {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) { ke.preventDefault(); this.send(); }
  }
}
