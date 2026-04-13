import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { tmdbImg } from '@core/tmdb-images';
import { FavoritesService } from '@features/movies/data-access/services/favorites.service';
import { DiaryService } from '@features/diary/diary.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { SegmentedControlComponent } from '@shared/ui/segmented-control/segmented-control.component';
import { I18nService } from '@shared/i18n/i18n.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { loadDecisionCandidatesForShare } from './decision-shortlist-share.storage';
import {
  monthRecapShareRows,
  tonightShareRows,
  top10ShareRows,
  type ShareCardTemplate,
  type ShareDiaryRow,
  type ShareMovieRow,
} from './share-card-layout.util';

@Component({
  selector: 'app-share-cards-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, SegmentedControlComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/account">← {{ i18n.t('share.backAccount') }}</a>

      <header class="head">
        <h1 class="title">{{ i18n.t('share.title') }}</h1>
        <p class="sub">{{ i18n.t('share.subtitle') }}</p>
      </header>

      <div class="toolbar">
        <app-segmented
          ariaLabel="Share template"
          [options]="templateOptions()"
          [value]="template()"
          (select)="template.set($event)"
        />
        <label class="month" *ngIf="template() === 'month_recap'">
          <span class="month__lbl">{{ i18n.t('share.monthLabel') }}</span>
          <input
            class="month__input"
            type="month"
            [value]="monthYm()"
            (change)="onMonthPick($any($event.target).value)"
          />
        </label>
      </div>

      <p class="muted" *ngIf="emptyHint() as h">{{ h }}</p>

      <div class="previewWrap" *ngIf="hasRows()">
        <div #cardRoot class="cardRoot" data-testid="share-card-root">
          <div class="card">
            <header class="card__head">
              <div class="card__brand">{{ i18n.t('app.brand') }}</div>
              <div class="card__tag">{{ templateHeadline() }}</div>
              <div class="card__sub" *ngIf="template() === 'month_recap'">{{ monthYm() }}</div>
            </header>

            <div class="card__body">
              <div class="gridTop10" *ngIf="template() === 'top10'">
                <div class="cell" *ngFor="let m of top10(); trackBy: trackById">
                  <div class="poster" [class.poster--empty]="!m.poster_path">
                    <img
                      *ngIf="m.poster_path as p"
                      class="poster__img"
                      [src]="posterUrl(p)"
                      [alt]="m.title"
                      width="92"
                      height="138"
                      referrerpolicy="no-referrer"
                    />
                  </div>
                  <div class="cell__title">{{ m.title }}</div>
                </div>
              </div>

              <ul class="listMonth" *ngIf="template() === 'month_recap'">
                <li class="row" *ngFor="let e of monthRows(); trackBy: trackByDiary">
                  <span class="row__d">{{ e.watchedAt }}</span>
                  <span class="row__t">{{ e.title }}</span>
                </li>
              </ul>

              <div class="gridTonight" *ngIf="template() === 'tonight'">
                <div class="tn" *ngFor="let m of tonightRows(); trackBy: trackById">
                  <div class="poster poster--sm" [class.poster--empty]="!m.poster_path">
                    <img
                      *ngIf="m.poster_path as p"
                      class="poster__img"
                      [src]="posterUrl(p)"
                      [alt]="m.title"
                      width="74"
                      height="111"
                      referrerpolicy="no-referrer"
                    />
                  </div>
                  <div class="tn__title">{{ m.title }}</div>
                </div>
              </div>
            </div>

            <footer class="card__foot">{{ i18n.t('share.cardFooter') }}</footer>
          </div>
        </div>
      </div>

      <div class="actions" *ngIf="hasRows()">
        <app-button
          variant="primary"
          data-testid="share-export-png"
          [loading]="exporting()"
          (click)="exportPng()"
        >
          {{ i18n.t('share.exportPng') }}
        </app-button>
      </div>
    </section>
  `,
  styles: [
    `
      .page {
        padding: 1rem 0 2rem;
      }
      .back {
        display: inline-block;
        margin-bottom: 1rem;
        text-decoration: none;
        color: var(--text-muted);
      }
      .head {
        margin-bottom: 0.75rem;
      }
      .title {
        margin: 0 0 0.25rem;
      }
      .sub {
        margin: 0;
        color: var(--text-muted);
        max-width: 72ch;
        line-height: 1.5;
      }
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        margin-bottom: 0.75rem;
      }
      .month {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .month__lbl {
        font-size: 0.75rem;
        color: var(--text-muted);
      }
      .month__input {
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text);
        padding: 0.35rem 0.5rem;
        font: inherit;
      }
      .muted {
        color: var(--text-muted);
        margin: 0 0 0.75rem;
        line-height: 1.45;
      }
      .previewWrap {
        overflow-x: auto;
        margin-bottom: 1rem;
        border-radius: 12px;
        border: 1px solid var(--border-subtle);
        background: rgba(0, 0, 0, 0.2);
        padding: 0.75rem;
      }
      .cardRoot {
        width: 720px;
        height: 900px;
        margin: 0 auto;
      }
      .card {
        width: 720px;
        height: 900px;
        box-sizing: border-box;
        padding: 28px 24px 20px;
        display: flex;
        flex-direction: column;
        background: linear-gradient(160deg, #12122a 0%, #070712 48%, #0a0f18 100%);
        color: #f4f4ff;
        font-family:
          system-ui,
          -apple-system,
          'Segoe UI',
          sans-serif;
      }
      .card__head {
        text-align: center;
        margin-bottom: 18px;
      }
      .card__brand {
        font-size: 13px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.55);
        margin-bottom: 6px;
      }
      .card__tag {
        font-size: 22px;
        font-weight: 700;
        line-height: 1.2;
      }
      .card__sub {
        margin-top: 6px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.55);
      }
      .card__body {
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }
      .card__foot {
        margin-top: 12px;
        text-align: center;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.45);
      }
      .gridTop10 {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 10px 8px;
      }
      .cell__title,
      .tn__title {
        margin-top: 4px;
        font-size: 10px;
        line-height: 1.25;
        height: 25px;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .poster {
        width: 92px;
        height: 138px;
        border-radius: 6px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .poster--sm {
        width: 74px;
        height: 111px;
      }
      .poster__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .listMonth {
        list-style: none;
        margin: 0;
        padding: 0 8px;
      }
      .row {
        display: grid;
        grid-template-columns: 104px 1fr;
        gap: 10px;
        font-size: 14px;
        line-height: 1.35;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .row__d {
        font-variant-numeric: tabular-nums;
        color: rgba(255, 255, 255, 0.55);
      }
      .row__t {
        font-weight: 600;
      }
      .gridTonight {
        display: flex;
        flex-wrap: wrap;
        gap: 12px 10px;
        justify-content: center;
        align-content: flex-start;
        padding-top: 8px;
      }
      .tn {
        width: 120px;
        text-align: center;
      }
      .actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class ShareCardsPageComponent {
  readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  private readonly favorites = inject(FavoritesService);
  private readonly diary = inject(DiaryService);

  readonly cardRoot = viewChild<ElementRef<HTMLElement>>('cardRoot');

  readonly template = signal<ShareCardTemplate>('top10');
  readonly monthYm = signal(this.defaultYm());
  readonly exporting = signal(false);

  readonly templateOptions = computed(() => {
    this.i18n.dict();
    return [
      { value: 'top10' as const, label: this.i18n.t('share.templateTop10') },
      { value: 'month_recap' as const, label: this.i18n.t('share.templateMonth') },
      { value: 'tonight' as const, label: this.i18n.t('share.templateTonight') },
    ];
  });

  readonly diaryRows = computed<ShareDiaryRow[]>(() =>
    this.diary.sorted().map((e) => ({ watchedAt: e.watchedAt, title: e.title })),
  );

  readonly top10 = computed<ShareMovieRow[]>(() =>
    top10ShareRows(
      this.favorites.favorites().map((m) => ({
        id: m.id,
        title: m.title,
        poster_path: m.poster_path ?? null,
      })),
      10,
    ),
  );

  readonly monthRows = computed(() => monthRecapShareRows(this.diaryRows(), this.monthYm(), 10));

  readonly tonightRows = computed(() => {
    const stored = loadDecisionCandidatesForShare();
    return tonightShareRows(stored?.movies ?? [], 5);
  });

  readonly hasRows = computed(() => {
    const t = this.template();
    if (t === 'top10') return this.top10().length > 0;
    if (t === 'month_recap') return this.monthRows().length > 0;
    return this.tonightRows().length > 0;
  });

  readonly emptyHint = computed(() => {
    this.i18n.dict();
    const t = this.template();
    if (t === 'top10' && !this.top10().length) return this.i18n.t('share.emptyTop10');
    if (t === 'month_recap' && !this.monthRows().length) return this.i18n.t('share.emptyMonth');
    if (t === 'tonight' && !this.tonightRows().length) return this.i18n.t('share.emptyTonight');
    return null;
  });

  readonly templateHeadline = computed(() => {
    this.i18n.dict();
    const t = this.template();
    if (t === 'top10') return this.i18n.t('share.headTop10');
    if (t === 'month_recap') return this.i18n.t('share.headMonth');
    return this.i18n.t('share.headTonight');
  });

  posterUrl(path: string): string {
    return tmdbImg(185, path);
  }

  onMonthPick(v: string): void {
    if (v && /^\d{4}-\d{2}$/.test(v)) this.monthYm.set(v);
  }

  trackById(_: number, m: ShareMovieRow): number {
    return m.id;
  }

  trackByDiary(_: number, e: ShareDiaryRow): string {
    return `${e.watchedAt}:${e.title}`;
  }

  async exportPng(): Promise<void> {
    const el = this.cardRoot()?.nativeElement;
    if (!el || this.exporting()) return;
    this.exporting.set(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#070712',
        logging: false,
        useCORS: true,
      });
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('empty blob'));
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `movie-discovery-share-${this.template()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        }, 'image/png');
      });
      this.toast.show(
        'success',
        this.i18n.t('share.exportOkTitle'),
        this.i18n.t('share.exportOkBody'),
      );
    } catch {
      this.toast.show(
        'error',
        this.i18n.t('share.exportFailTitle'),
        this.i18n.t('share.exportFailBody'),
      );
    } finally {
      this.exporting.set(false);
    }
  }

  private defaultYm(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
