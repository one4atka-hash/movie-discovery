import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ErrorBannerComponent } from '@shared/ui/error-banner/error-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ErrorBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  readonly isDark = signal(true);

  toggleTheme(): void {
    this.isDark.update((v) => !v);
    document.documentElement.classList.toggle('theme-light', !this.isDark());
  }
}
