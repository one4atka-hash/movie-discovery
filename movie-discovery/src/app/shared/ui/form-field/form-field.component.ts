import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="field">
      @if (label(); as l) {
        <span class="field__label">{{ l }}</span>
      }
      <div class="field__control">
        <ng-content></ng-content>
      </div>
      @if (hint(); as h) {
        <p class="field__hint">{{ h }}</p>
      }
      @if (error(); as e) {
        <p class="field__err" role="alert">{{ e }}</p>
      }
    </label>
  `,
  styles: [
    `
      .field {
        display: grid;
        gap: 0.35rem;
        margin: 0;
      }

      .field__label {
        font-size: 0.9rem;
        color: var(--text-muted);
        font-weight: 600;
      }

      .field__control :where(input, select, textarea) {
        width: 100%;
        padding: 0.75rem 0.85rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-subtle);
        background: var(--bg-elevated);
        color: var(--text);
        outline: none;
      }

      .field__control :where(input, select, textarea):focus {
        border-color: color-mix(in srgb, var(--accent-secondary) 55%, var(--border-strong));
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-secondary) 18%, transparent);
      }

      .field__hint {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.88rem;
        line-height: 1.4;
      }

      .field__err {
        margin: 0;
        color: var(--accent);
        font-size: 0.92rem;
        line-height: 1.4;
      }
    `,
  ],
})
export class FormFieldComponent {
  readonly label = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
}
