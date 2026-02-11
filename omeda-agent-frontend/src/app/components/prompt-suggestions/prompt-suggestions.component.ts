import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'cb-prompt-suggestions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prompt-suggestions.component.html',
  styleUrl: './prompt-suggestions.component.scss',
})
export class PromptSuggestionsComponent {
  prompts = input<string[]>([]);
  selected = output<string>();
}
