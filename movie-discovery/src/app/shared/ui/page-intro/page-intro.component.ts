import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-intro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="intro">
      <div class="intro__head">
        <div class="intro__text">
          @if (title(); as t) {
            <h1 class="intro__title">{{ t }}</h1>
          }
          @if (purpose(); as p) {
            <p class="intro__purpose">{{ p }}</p>
          }
          @if (instruction(); as i) {
            <p class="intro__instruction">{{ i }}</p>
          }
        </div>
        <div class="intro__actions">
          <ng-content select="[pageActions]"></ng-content>
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .intro {
        margin: 0 0 1rem;
      }

      .intro__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }

      .intro__text {
        min-width: 0;
      }

      .intro__title {
        margin: 0;
        font-size: clamp(1.45rem, 2.4vw, 1.9rem);
        letter-spacing: -0.03em;
        line-height: 1.15;
      }

      .intro__purpose {
        margin: 0.55rem 0 0;
        color: var(--text);
        opacity: 0.92;
        font-size: 1.02rem;
        line-height: 1.45;
      }

      .intro__instruction {
        margin: 0.25rem 0 0;
        color: var(--text-muted);
        font-size: 0.95rem;
        line-height: 1.45;
      }

      .intro__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: flex-end;
        flex-shrink: 0;
      }

      @media (max-width: 720px) {
        .intro__head {
          flex-direction: column;
          align-items: stretch;
        }

        .intro__actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class PageIntroComponent {
  readonly title = input<string | null>(null);
  readonly purpose = input<string | null>(null);
  readonly instruction = input<string | null>(null);
}
