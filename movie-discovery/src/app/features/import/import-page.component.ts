import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { StorageService } from '@core/storage.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { SectionComponent } from '@shared/ui/section/section.component';

import { ImportApiService, type ImportFormat, type ImportKind } from './import-api.service';

const TOKEN_KEY = 'server.jwt.token.v1';

@Component({
  selector: 'app-import-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SectionComponent,
    FormFieldComponent,
    ButtonComponent,
    CardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-section title="Import (MVP)">
      <app-card>
        <div class="grid">
          <app-form-field
            label="Server JWT token"
            hint="MVP: вставь JWT от backend (Bearer token). Мы сохраним его локально в браузере."
          >
            <textarea [(ngModel)]="token" rows="2" placeholder="eyJhbGciOi..."></textarea>
          </app-form-field>

          <div class="row2">
            <app-form-field label="Kind">
              <select [(ngModel)]="kind">
                <option value="diary">diary</option>
                <option value="watch_state">watch_state</option>
                <option value="favorites">favorites</option>
              </select>
            </app-form-field>
            <app-form-field label="Format">
              <select [(ngModel)]="format">
                <option value="json">json</option>
                <option value="csv">csv</option>
              </select>
            </app-form-field>
          </div>

          <app-form-field label="Payload" hint="JSON/CSV как строка (MVP: до 200KB).">
            <textarea [(ngModel)]="payload" rows="8" placeholder='{"items":[...]}'></textarea>
          </app-form-field>

          <div class="actions">
            <app-button variant="secondary" [disabled]="busy()" (click)="createJob()">
              Create job
            </app-button>
            <app-button variant="secondary" [disabled]="busy() || !jobId()" (click)="preview()">
              Preview
            </app-button>
            <app-button variant="primary" [disabled]="busy() || !jobId()" (click)="apply()">
              Apply
            </app-button>
          </div>

          @if (jobId(); as id) {
            <p class="meta">
              <b>Job</b>: <code>{{ id }}</code>
              @if (jobStatus(); as st) {
                · <b>Status</b>: {{ st }}
              }
            </p>
          }

          @if (previewSummary(); as s) {
            <p class="meta">
              <b>Preview</b>: total {{ s.totalRows }}, ok {{ s.okRows }}, conflict
              {{ s.conflictRows }}, error {{ s.errorRows }}
            </p>
          }

          @if (err(); as e) {
            <p class="err" role="alert">{{ e }}</p>
          }
        </div>
      </app-card>
    </app-section>

    <app-section title="Preview rows">
      <div sectionActions>
        <app-button variant="ghost" [disabled]="busy() || !jobId()" (click)="loadRows()"
          >Refresh</app-button
        >
      </div>

      @if (!jobId()) {
        <p class="muted">Создай job и сделай Preview, чтобы увидеть строки.</p>
      } @else {
        <app-card>
          <div class="rows-head">
            <span class="muted"
              >Total: <b>{{ rowsTotal() }}</b> · Showing: <b>{{ rows().length }}</b></span
            >
            <div class="pager">
              <app-button variant="ghost" [disabled]="busy() || !canRowsPrev()" (click)="rowsPrev()"
                >Prev</app-button
              >
              <span class="muted"
                >Offset: <b>{{ rowsOffset() }}</b> · Limit: <b>{{ rowsLimit() }}</b></span
              >
              <app-button variant="ghost" [disabled]="busy() || !canRowsNext()" (click)="rowsNext()"
                >Next</app-button
              >
            </div>
          </div>

          <div class="rows">
            @for (r of rows(); track r.rowN) {
              <div class="row">
                <div class="row__meta">
                  <span
                    ><b>#{{ r.rowN }}</b></span
                  >
                  <span class="pill" [class.pill--bad]="r.status !== 'ok'">{{ r.status }}</span>
                </div>
                <pre class="row__json">{{ pretty(r.mapped) }}</pre>
                @if (r.error) {
                  <p class="row__err">{{ r.error }}</p>
                }
                <div class="row__actions">
                  <app-button variant="ghost" (click)="openResolve(r.rowN, r.mapped)"
                    >Resolve</app-button
                  >
                </div>
              </div>
            }
          </div>
        </app-card>
      }
    </app-section>

    <app-section title="Conflicts">
      <div sectionActions>
        <app-button variant="ghost" [disabled]="busy() || !jobId()" (click)="loadConflicts()"
          >Refresh</app-button
        >
        <app-button variant="ghost" [disabled]="busy()" (click)="toggleShowResolved()">
          {{ showResolved() ? 'Show all' : 'Hide resolved' }}
        </app-button>
      </div>

      @if (!jobId()) {
        <p class="muted">Сначала создай job и сделай Preview.</p>
      } @else {
        <app-card>
          <div class="rows-head">
            <span class="muted"
              >Total: <b>{{ conflictsTotal() }}</b> · Showing:
              <b>{{ visibleConflicts().length }}</b></span
            >
            <div class="pager">
              <app-button
                variant="ghost"
                [disabled]="busy() || !canConflictsPrev()"
                (click)="conflictsPrev()"
                >Prev</app-button
              >
              <span class="muted"
                >Offset: <b>{{ conflictsOffset() }}</b> · Limit: <b>{{ conflictsLimit() }}</b></span
              >
              <app-button
                variant="ghost"
                [disabled]="busy() || !canConflictsNext()"
                (click)="conflictsNext()"
                >Next</app-button
              >
            </div>
          </div>

          @if (visibleConflicts().length === 0) {
            <p class="muted">Пока конфликтов нет (MVP).</p>
          } @else {
            <div class="rows">
              @for (c of visibleConflicts(); track c.id) {
                <div class="row">
                  <div class="row__meta">
                    <span
                      ><b>{{ c.entity }}</b> · <code>{{ c.key }}</code></span
                    >
                    <span class="muted">
                      {{ c.createdAt }}
                      @if (c.resolution) {
                        · <b>resolved</b>
                      }
                    </span>
                  </div>
                  <details class="details" open>
                    <summary class="details__sum">Incoming</summary>
                    <pre class="row__json">{{ pretty(c.incoming) }}</pre>
                  </details>
                  <details class="details">
                    <summary class="details__sum">Server</summary>
                    <pre class="row__json">{{ pretty(c.server) }}</pre>
                  </details>
                  @if (c.resolution) {
                    <details class="details">
                      <summary class="details__sum">Resolution</summary>
                      <pre class="row__json">{{ pretty(c.resolution) }}</pre>
                    </details>
                  }
                  <div class="row__actions" style="justify-content: space-between; gap: 0.5rem">
                    <app-button
                      variant="ghost"
                      [disabled]="busy() || !!c.resolution"
                      (click)="quickResolve(c.rowN, c.server)"
                      >Use server</app-button
                    >
                    <app-button
                      variant="ghost"
                      [disabled]="busy() || !!c.resolution"
                      (click)="quickResolve(c.rowN, c.incoming)"
                      >Use incoming</app-button
                    >
                    @if (c.rowN) {
                      <app-button
                        variant="ghost"
                        [disabled]="busy()"
                        (click)="openResolve(c.rowN, c.incoming)"
                        >Resolve row</app-button
                      >
                    }
                  </div>
                </div>
              }
            </div>
          }
        </app-card>
      }
    </app-section>

    @if (resolveOpen()) {
      <div class="modal" (click)="closeResolve()">
        <div class="modal__panel" (click)="$event.stopPropagation()">
          <h3 class="modal__title">Resolve row #{{ resolveRowN() }}</h3>
          <p class="muted">MVP: редактируем <code>mapped</code> JSON и отправляем resolve.</p>
          <app-form-field label="Status">
            <select [(ngModel)]="resolveStatus">
              <option value="ok">ok</option>
              <option value="error">error</option>
              <option value="pending">pending</option>
              <option value="conflict">conflict</option>
            </select>
          </app-form-field>
          <app-form-field label="Mapped (JSON)">
            <textarea [(ngModel)]="resolveMappedText" rows="8"></textarea>
          </app-form-field>
          <div class="actions">
            <app-button variant="secondary" (click)="closeResolve()">Cancel</app-button>
            <app-button variant="primary" [disabled]="busy()" (click)="submitResolve()"
              >Save</app-button
            >
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .grid {
        display: grid;
        gap: 0.85rem;
      }
      .row2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        align-items: center;
      }
      .meta {
        margin: 0;
        color: var(--text-muted);
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      .muted {
        color: var(--text-muted);
        margin: 0;
      }
      .err {
        margin: 0;
        color: var(--accent);
      }
      .rows-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.75rem;
        margin-bottom: 0.6rem;
        flex-wrap: wrap;
      }
      .pager {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .rows {
        display: grid;
        gap: 0.75rem;
      }
      .row {
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: 0.75rem;
        background: color-mix(in srgb, var(--bg-elevated) 70%, transparent);
      }
      .row__meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }
      .pill {
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        border: 1px solid var(--border-subtle);
        color: var(--text-muted);
        font-size: 0.85rem;
      }
      .pill--bad {
        border-color: color-mix(in srgb, var(--accent) 55%, var(--border-subtle));
        color: var(--text);
        background: color-mix(in srgb, var(--accent) 12%, transparent);
      }
      .row__json {
        margin: 0.55rem 0 0;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font-size: 0.9rem;
        color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      .row__err {
        margin: 0.5rem 0 0;
        color: var(--accent);
      }
      .row__actions {
        margin-top: 0.6rem;
        display: flex;
        justify-content: flex-end;
      }
      .details {
        margin-top: 0.55rem;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: 0.55rem 0.65rem;
        background: color-mix(in srgb, var(--bg-elevated) 55%, transparent);
      }
      .details__sum {
        cursor: pointer;
        color: var(--text-muted);
        font-weight: 600;
        margin-bottom: 0.35rem;
      }
      .modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: grid;
        place-items: center;
        padding: 1rem;
        z-index: 1000;
      }
      .modal__panel {
        width: min(720px, 100%);
        border: 1px solid var(--border-strong);
        background: color-mix(in srgb, var(--bg) 70%, #0b0b1f);
        border-radius: 18px;
        padding: 1rem;
        box-shadow: var(--shadow-lg);
      }
      .modal__title {
        margin: 0 0 0.65rem;
        font-size: 1.05rem;
      }
    `,
  ],
})
export class ImportPageComponent {
  private readonly api = inject(ImportApiService);
  private readonly storage = inject(StorageService);

  token = this.storage.get<string>(TOKEN_KEY, '') ?? '';
  kind: ImportKind = 'favorites';
  format: ImportFormat = 'json';
  payload = '';

  private readonly _busy = signal(false);
  readonly busy = this._busy.asReadonly();

  private readonly _jobId = signal<string | null>(null);
  readonly jobId = this._jobId.asReadonly();

  private readonly _jobStatus = signal<string | null>(null);
  readonly jobStatus = this._jobStatus.asReadonly();

  private readonly _err = signal<string | null>(null);
  readonly err = this._err.asReadonly();

  private readonly _previewSummary = signal<{
    totalRows: number;
    okRows: number;
    conflictRows: number;
    errorRows: number;
  } | null>(null);
  readonly previewSummary = this._previewSummary.asReadonly();

  private readonly _rows = signal<
    { rowN: number; status: string; mapped: unknown; error: string | null }[]
  >([]);
  readonly rows = this._rows.asReadonly();
  private readonly _rowsTotal = signal(0);
  readonly rowsTotal = this._rowsTotal.asReadonly();

  private readonly _rowsOffset = signal(0);
  readonly rowsOffset = this._rowsOffset.asReadonly();
  private readonly _rowsLimit = signal(50);
  readonly rowsLimit = this._rowsLimit.asReadonly();

  private readonly _conflicts = signal<
    {
      id: string;
      entity: string;
      key: string;
      rowN: number | null;
      server: unknown;
      incoming: unknown;
      resolution: unknown;
      createdAt: string;
    }[]
  >([]);
  readonly conflicts = this._conflicts.asReadonly();
  private readonly _showResolved = signal(false);
  readonly showResolved = this._showResolved.asReadonly();
  readonly visibleConflicts = computed(() =>
    this._showResolved() ? this._conflicts() : this._conflicts().filter((c) => !c.resolution),
  );
  private readonly _conflictsTotal = signal(0);
  readonly conflictsTotal = this._conflictsTotal.asReadonly();
  private readonly _conflictsOffset = signal(0);
  readonly conflictsOffset = this._conflictsOffset.asReadonly();
  private readonly _conflictsLimit = signal(50);
  readonly conflictsLimit = this._conflictsLimit.asReadonly();

  // resolve modal
  private readonly _resolveOpen = signal(false);
  readonly resolveOpen = this._resolveOpen.asReadonly();
  private readonly _resolveRowN = signal<number | null>(null);
  readonly resolveRowN = this._resolveRowN.asReadonly();
  resolveStatus: 'ok' | 'error' | 'pending' | 'conflict' = 'ok';
  resolveMappedText = '';

  readonly canSend = computed(() => Boolean(this.token.trim()));
  readonly canRowsPrev = computed(() => this._rowsOffset() > 0);
  readonly canRowsNext = computed(() => this._rowsOffset() + this._rowsLimit() < this._rowsTotal());
  readonly canConflictsPrev = computed(() => this._conflictsOffset() > 0);
  readonly canConflictsNext = computed(
    () => this._conflictsOffset() + this._conflictsLimit() < this._conflictsTotal(),
  );

  createJob(): void {
    this._err.set(null);
    const token = this.token.trim();
    if (!token) {
      this._err.set('JWT token обязателен.');
      return;
    }
    this.storage.set(TOKEN_KEY, token);
    this._busy.set(true);
    this.api
      .create(token, { kind: this.kind, format: this.format, payload: this.payload })
      .subscribe({
        next: (r) => {
          this._jobId.set(r.id);
          this._jobStatus.set('uploaded');
          this._previewSummary.set(null);
          this._rows.set([]);
          this._rowsTotal.set(0);
          this._rowsOffset.set(0);
          this._conflicts.set([]);
          this._conflictsTotal.set(0);
          this._conflictsOffset.set(0);
          this._busy.set(false);
        },
        error: (e) => this.handleHttpError(e),
      });
  }

  preview(): void {
    this._err.set(null);
    const token = this.token.trim();
    const id = this._jobId();
    if (!token || !id) return;
    this.storage.set(TOKEN_KEY, token);
    this._busy.set(true);
    this.api.preview(token, id).subscribe({
      next: (r) => {
        this._jobStatus.set('preview');
        this._previewSummary.set({
          totalRows: r.totalRows,
          okRows: r.okRows,
          conflictRows: r.conflictRows,
          errorRows: r.errorRows,
        });
        this._busy.set(false);
        this.loadRows();
        this.loadConflicts();
      },
      error: (e) => this.handleHttpError(e),
    });
  }

  loadRows(): void {
    this._err.set(null);
    const token = this.token.trim();
    const id = this._jobId();
    if (!token || !id) return;
    this.storage.set(TOKEN_KEY, token);
    this._busy.set(true);
    this.api.rows(token, id, { offset: this._rowsOffset(), limit: this._rowsLimit() }).subscribe({
      next: (r) => {
        this._rows.set(r.rows as any);
        this._rowsTotal.set(r.total);
        this._busy.set(false);
      },
      error: (e) => this.handleHttpError(e),
    });
  }

  rowsPrev(): void {
    const next = Math.max(0, this._rowsOffset() - this._rowsLimit());
    this._rowsOffset.set(next);
    this.loadRows();
  }

  rowsNext(): void {
    const next = this._rowsOffset() + this._rowsLimit();
    if (next >= this._rowsTotal()) return;
    this._rowsOffset.set(next);
    this.loadRows();
  }

  loadConflicts(): void {
    this._err.set(null);
    const token = this.token.trim();
    const id = this._jobId();
    if (!token || !id) return;
    this.storage.set(TOKEN_KEY, token);
    this._busy.set(true);
    this.api
      .conflicts(token, id, { offset: this._conflictsOffset(), limit: this._conflictsLimit() })
      .subscribe({
        next: (r) => {
          this._conflicts.set(r.conflicts as any);
          this._conflictsTotal.set(r.total);
          this._busy.set(false);
        },
        error: (e) => this.handleHttpError(e),
      });
  }

  conflictsPrev(): void {
    const next = Math.max(0, this._conflictsOffset() - this._conflictsLimit());
    this._conflictsOffset.set(next);
    this.loadConflicts();
  }

  conflictsNext(): void {
    const next = this._conflictsOffset() + this._conflictsLimit();
    if (next >= this._conflictsTotal()) return;
    this._conflictsOffset.set(next);
    this.loadConflicts();
  }

  toggleShowResolved(): void {
    this._showResolved.set(!this._showResolved());
  }

  quickResolve(rowN: number | null, mapped: unknown): void {
    this._err.set(null);
    const token = this.token.trim();
    const id = this._jobId();
    if (!token || !id) return;
    if (!rowN) {
      this._err.set('Row number неизвестен (нет rowN).');
      return;
    }
    this.storage.set(TOKEN_KEY, token);
    this._busy.set(true);
    this.api.resolveRow(token, id, rowN, { status: 'ok', mapped }).subscribe({
      next: () => {
        this._busy.set(false);
        this.loadRows();
        this.loadConflicts();
      },
      error: (e) => this.handleHttpError(e),
    });
  }

  apply(): void {
    this._err.set(null);
    const token = this.token.trim();
    const id = this._jobId();
    if (!token || !id) return;
    this.storage.set(TOKEN_KEY, token);
    this._busy.set(true);
    this.api.apply(token, id).subscribe({
      next: () => {
        this._jobStatus.set('applied');
        this._busy.set(false);
      },
      error: (e) => this.handleHttpError(e),
    });
  }

  openResolve(rowN: number | null, mapped: unknown): void {
    this._err.set(null);
    this._resolveRowN.set(rowN);
    this.resolveStatus = 'ok';
    this.resolveMappedText = this.pretty(mapped);
    this._resolveOpen.set(true);
  }

  closeResolve(): void {
    this._resolveOpen.set(false);
    this._resolveRowN.set(null);
  }

  submitResolve(): void {
    this._err.set(null);
    const token = this.token.trim();
    const id = this._jobId();
    const rowN = this._resolveRowN();
    if (!token || !id || !rowN) {
      this._err.set('Row number неизвестен (нет rowN). Открой resolve через "Resolve row".');
      return;
    }

    let mapped: unknown = null;
    try {
      mapped = JSON.parse(this.resolveMappedText || 'null');
    } catch {
      this._err.set('Mapped JSON невалиден.');
      return;
    }

    this._busy.set(true);
    this.api.resolveRow(token, id, rowN, { status: this.resolveStatus, mapped }).subscribe({
      next: () => {
        this._busy.set(false);
        this.closeResolve();
        this.loadRows();
      },
      error: (e) => this.handleHttpError(e),
    });
  }

  pretty(v: unknown): string {
    try {
      return JSON.stringify(v ?? null, null, 2);
    } catch {
      return String(v);
    }
  }

  private handleHttpError(e: unknown): void {
    const msg =
      e instanceof HttpErrorResponse
        ? `${e.status} ${e.statusText}${e.error?.message ? `: ${e.error.message}` : ''}`
        : 'Request failed';
    this._err.set(msg);
    this._busy.set(false);
  }
}
