import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-lines',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap" role="status" [attr.aria-label]="label()">
      @for (i of indices(); track i) {
        <div class="line" [style.width.%]="widthFor(i)"></div>
      }
    </div>
  `,
  styles: [
    `
      .wrap {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 0.25rem 0 0.75rem;
      }
      .line {
        height: 12px;
        border-radius: 6px;
        background: linear-gradient(
          100deg,
          color-mix(in srgb, var(--bg-muted) 70%, transparent) 35%,
          color-mix(in srgb, var(--text-muted) 22%, transparent) 50%,
          color-mix(in srgb, var(--bg-muted) 70%, transparent) 65%
        );
        background-size: 200% 100%;
        animation: sk 1.1s ease-in-out infinite;
      }
      @keyframes sk {
        to {
          background-position-x: -200%;
        }
      }
    `,
  ],
})
export class SkeletonLinesComponent {
  readonly count = input(3);
  readonly label = input('Loading');

  indices(): number[] {
    const n = Math.max(1, Math.min(12, this.count()));
    return Array.from({ length: n }, (_, i) => i);
  }

  widthFor(i: number): number {
    return 100 - (i % 3) * 12;
  }
}
