import {
  Component, input, output, signal, effect,
  ChangeDetectionStrategy, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'cb-connection-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connection-banner.component.html',
  styleUrl: './connection-banner.component.scss'
})
export class ConnectionBannerComponent implements OnDestroy {
  status = input.required<string>();
  retryAttempt = input(0);
  retryMax = input(5);
  countdownMs = input(0);
  errorMessage = input<string | null>(null);
  retryClicked = output<void>();

  readonly visible = signal(false);
  readonly countdown = signal(0);

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const s = this.status();
      this.visible.set(s === 'connecting' || s === 'error' || s === 'disconnected');

      // Start countdown timer when connecting
      if (s === 'connecting' && this.countdownMs() > 0) {
        this.startCountdown(this.countdownMs());
      } else {
        this.stopCountdown();
      }
    },  { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(ms: number): void {
    this.stopCountdown();
    this.countdown.set(Math.ceil(ms / 1000));
    this.countdownInterval = setInterval(() => {
      this.countdown.update(c => {
        if (c <= 1) { this.stopCountdown(); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
