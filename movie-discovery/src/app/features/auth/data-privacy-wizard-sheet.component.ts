import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { I18nService } from '@shared/i18n/i18n.service';
import { BottomSheetComponent } from '@shared/ui/bottom-sheet/bottom-sheet.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';

type WizardTab = 'import' | 'export';
type ExportKind = 'diary' | 'watch_state' | 'favorites';
type ExportFormat = 'csv' | 'json';

@Component({
  selector: 'app-data-privacy-wizard-sheet',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    BottomSheetComponent,
    ButtonComponent,
    FormFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-bottom-sheet
      [open]="open()"
      [title]="i18n.t('account.dataWizard.title')"
      [ariaLabel]="i18n.t('account.dataWizard.aria')"
      (closed)="closed.emit()"
    >
      <div class="tabs" role="tablist" [attr.aria-label]="i18n.t('account.dataWizard.tabs.aria')">
        <button
          type="button"
          class="tab"
          role="tab"
          [attr.aria-selected]="tab() === 'import'"
          (click)="setTab('import')"
        >
          {{ i18n.t('account.dataWizard.tabs.import') }}
        </button>
        <button
          type="button"
          class="tab"
          role="tab"
          [attr.aria-selected]="tab() === 'export'"
          (click)="setTab('export')"
        >
          {{ i18n.t('account.dataWizard.tabs.export') }}
        </button>
      </div>

      @if (tab() === 'import') {
        <section class="step" role="tabpanel">
          <p class="muted" style="margin: 0 0 0.65rem">
            {{ i18n.t('account.dataWizard.import.purpose') }}
          </p>
          <p class="muted" style="margin: 0 0 0.75rem">
            {{ i18n.t('account.dataWizard.import.instruction') }}
          </p>

          <div class="actions">
            <app-button variant="primary" [routerLink]="['/import']" (click)="closed.emit()">
              {{ i18n.t('account.dataWizard.import.open') }}
            </app-button>
            <app-button variant="ghost" type="button" (click)="setTab('export')">
              {{ i18n.t('account.dataWizard.goExport') }}
            </app-button>
          </div>

          <details class="why" style="margin-top: 0.85rem">
            <summary class="why__sum">
              {{ i18n.t('account.dataWizard.import.detailsTitle') }}
            </summary>
            <p class="muted" style="margin: 0.35rem 0 0">
              {{ i18n.t('account.dataWizard.import.detailsBody') }}
            </p>
          </details>
        </section>
      } @else {
        <section class="step" role="tabpanel">
          <p class="muted" style="margin: 0 0 0.65rem">
            {{ i18n.t('account.dataWizard.export.purpose') }}
          </p>
          <p class="muted" style="margin: 0 0 0.75rem">
            {{ i18n.t('account.dataWizard.export.instruction') }}
          </p>

          <div class="row2">
            <app-form-field [label]="i18n.t('account.data.exportKind')">
              <select class="input" [formControl]="exportKind">
                <option value="diary">diary</option>
                <option value="watch_state">watch_state</option>
                <option value="favorites">favorites</option>
              </select>
            </app-form-field>
            <app-form-field [label]="i18n.t('account.data.exportFormat')">
              <select class="input" [formControl]="exportFormat">
                <option value="csv">csv</option>
                <option value="json">json</option>
              </select>
            </app-form-field>
          </div>

          <div class="actions">
            <app-button variant="primary" type="button" (click)="exportClick.emit(exportInput())">
              {{ i18n.t('account.data.exportDownload') }}
            </app-button>
            <app-button variant="ghost" type="button" (click)="setTab('import')">
              {{ i18n.t('account.dataWizard.goImport') }}
            </app-button>
          </div>

          @if (exportError(); as e) {
            <p class="err" role="alert" style="margin-top: 0.65rem">{{ e }}</p>
          }
        </section>
      }
    </app-bottom-sheet>
  `,
  styles: [
    `
      .muted {
        color: var(--text-muted);
        line-height: 1.45;
        max-width: 72ch;
      }
      .tabs {
        display: flex;
        gap: 0.5rem;
        padding: 0.25rem 0 0.65rem;
        border-bottom: 1px solid var(--border-subtle);
      }
      .tab {
        border: 1px solid var(--border-subtle);
        background: transparent;
        color: var(--text);
        border-radius: var(--radius-full);
        padding: 0.45rem 0.75rem;
        cursor: pointer;
      }
      .tab[aria-selected='true'] {
        background: color-mix(in srgb, var(--bg-elevated) 70%, transparent);
        border-color: var(--border-strong);
      }
      .step {
        padding-top: 0.75rem;
      }
      .actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .row2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-bottom: 0.85rem;
      }
      @media (max-width: 720px) {
        .row2 {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DataPrivacyWizardSheetComponent {
  readonly open = input<boolean>(false);
  readonly exportError = input<string | null>(null);
  readonly i18n = inject(I18nService);

  readonly closed = output<void>();
  readonly exportClick = output<{ kind: ExportKind; format: ExportFormat }>();

  readonly tab = signal<WizardTab>('import');

  readonly exportKind = new FormControl<ExportKind>('diary', { nonNullable: true });
  readonly exportFormat = new FormControl<ExportFormat>('csv', { nonNullable: true });

  exportInput(): { kind: ExportKind; format: ExportFormat } {
    return { kind: this.exportKind.value, format: this.exportFormat.value };
  }

  setTab(t: WizardTab): void {
    this.tab.set(t);
  }
}
