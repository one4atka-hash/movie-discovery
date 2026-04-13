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
        margin: 0 0 1rem;
      }

      .sec__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.65rem;
      }

      .sec__title {
        margin: 0;
        font-size: 1.12rem;
        letter-spacing: -0.02em;
      }

      .sec__actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
    `,
  ],
})
export class SectionComponent {
  readonly title = input<string | null>(null);
}
