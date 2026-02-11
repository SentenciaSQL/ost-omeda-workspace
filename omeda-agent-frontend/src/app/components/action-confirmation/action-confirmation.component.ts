import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PendingAction } from '../../models/chat.model';

@Component({
  selector: 'cb-action-confirmation',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './action-confirmation.component.html',
  styleUrl: './action-confirmation.component.scss'
})
export class ActionConfirmationComponent {
  action = input.required<PendingAction>();
  confirm = output();
  reject = output();
}
