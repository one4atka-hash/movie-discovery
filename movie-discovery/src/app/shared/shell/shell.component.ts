import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { readThemePreference, writeThemePreference } from '@core/browser-prefs';
import { localeToFlagEmoji } from '@core/locale-flag.util';
import { ServerCinemaApiService } from '@core/server-cinema-api.service';
import { ServerSessionService } from '@core/server-session.service';
import { TmdbConfigurationService } from '@core/tmdb-configuration.service';
import { ErrorBannerComponent } from '@shared/ui/error-banner/error-banner.component';
import { ToastViewportComponent } from '@shared/ui/toast/toast-viewport.component';
import { ReleaseReminderService } from '@features/notifications/release-reminder.service';
import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ErrorBannerComponent,
    ToastViewportComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly tmdbCfg = inject(TmdbConfigurationService);
  readonly i18n = inject(I18nService);
  readonly serverSession = inject(ServerSessionService);
  private readonly cinemaApi = inject(ServerCinemaApiService);

  readonly isDark = signal(true);
  readonly serverConnected = computed(() => Boolean(this.serverSession.me()));

  /** Подписи локалей для `<select>` (как список primary_translations на TMDB). */
  readonly localeOptions = signal<readonly { code: string; label: string; flag: string }[]>([]);

  constructor() {
    inject(ReleaseReminderService);
    if (this.cinemaApi.hasToken()) {
      this.serverSession.refreshMe({ silent: true });
    }
    const theme = readThemePreference();
    const dark = theme !== 'light';
    this.isDark.set(dark);
    document.documentElement.classList.toggle('theme-light', !dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#06060f' : '#f4f5fc');
    if (theme === null) {
      writeThemePreference(dark ? 'dark' : 'light');
    }

    this.tmdbCfg.loadPrimaryTranslations().subscribe((codes) => {
      this.ensureValidLocale(codes);
    });

    effect(() => {
      const codes = this.tmdbCfg.primaryTranslations();
      const displayLocale = this.i18n.tmdbLocale();
      untracked(() => {
        this.localeOptions.set(this.buildLocaleOptions(codes, displayLocale));
      });
    });
  }

  toggleTheme(): void {
    this.isDark.update((v) => !v);
    const light = !this.isDark();
    document.documentElement.classList.toggle('theme-light', light);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', light ? '#f4f5fc' : '#06060f');
    writeThemePreference(light ? 'light' : 'dark');
  }

  onLocaleChange(ev: Event): void {
    const val = (ev.target as HTMLSelectElement).value;
    this.i18n.setTmdbLocale(val, this.tmdbCfg.primaryTranslations());
  }

  private ensureValidLocale(codes: readonly string[]): void {
    const cur = this.i18n.tmdbLocale();
    if (!codes.length) return;
    if (!codes.includes(cur)) {
      const fallback = codes.includes('en-US') ? 'en-US' : codes[0];
      this.i18n.setTmdbLocale(fallback, codes);
    }
  }

  private buildLocaleOptions(
    codes: readonly string[],
    displayLocale: string,
  ): { code: string; label: string; flag: string }[] {
    let sortLocale = displayLocale;
    let dn: Intl.DisplayNames;
    try {
      dn = new Intl.DisplayNames([displayLocale], { type: 'language' });
    } catch {
      sortLocale = 'en';
      try {
        dn = new Intl.DisplayNames(['en'], { type: 'language' });
      } catch {
        return [...codes]
          .sort()
          .map((code) => ({ code, label: code, flag: localeToFlagEmoji(code) }));
      }
    }
    const labelFor = (code: string) => {
      try {
        return dn.of(code) ?? code;
      } catch {
        return code;
      }
    };
    return [...codes]
      .map((code) => ({ code, label: labelFor(code), flag: localeToFlagEmoji(code) }))
      .sort((a, b) => a.label.localeCompare(b.label, sortLocale));
  }
}
