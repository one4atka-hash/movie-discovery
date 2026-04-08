import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ErrorBannerComponent } from '@shared/ui/error-banner/error-banner.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ErrorBannerComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
  readonly isDark = signal(true);

  toggleTheme(): void {
    this.isDark.update((v) => !v);
    document.documentElement.classList.toggle('theme-light', !this.isDark());
  }
}
