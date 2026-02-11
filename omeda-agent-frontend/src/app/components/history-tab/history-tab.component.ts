import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatSession } from '../../models/chat.model';

@Component({
  selector: 'cb-history-tab',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history-tab.component.html',
  styleUrl: './history-tab.component.scss'
})
export class HistoryTabComponent {
  sessions = input.required<ChatSession[]>();
  activeSessionId = input<string | null>(null);
  loadSession = output<string>();
  deleteSession = output<string>();

  onDelete(e: Event, id: string): void {
    e.stopPropagation();
    this.deleteSession.emit(id);
  }

  formatDate(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
