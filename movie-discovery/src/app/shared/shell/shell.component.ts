import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ErrorBannerComponent } from '@shared/ui/error-banner/error-banner.component';
import { ReleaseReminderService } from '@features/notifications/release-reminder.service';
import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ErrorBannerComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
  private readonly _reminders = inject(ReleaseReminderService);
  readonly i18n = inject(I18nService);

  readonly isDark = signal(true);

  toggleTheme(): void {
    this.isDark.update((v) => !v);
    document.documentElement.classList.toggle('theme-light', !this.isDark());
  }

  toggleLang(): void {
    this.i18n.toggleLang();
  }
}
