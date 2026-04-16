import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sec">
      @if (title(); as t) {
        <header class="sec__head">
          <h2 class="sec__title">{{ t }}</h2>
          <div class="sec__actions">
            <ng-content select="[sectionActions]"></ng-content>
          </div>
        </header>
      }
      <div class="sec__body">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: [
    `
      .sec {
        margin: 0 0 var(--space-4);
      }

      .sec__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--space-3);
        margin-bottom: var(--space-2);
      }

      .sec__title {
        margin: 0;
        font-size: var(--font-size-title-md);
        letter-spacing: -0.02em;
      }

      .sec__actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        justify-content: flex-end;
      }
    `,
  ],
})
export class SectionComponent {
  readonly title = input<string | null>(null);
}
