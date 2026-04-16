import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { LooksService } from '@core/looks.service';
import { ServerCinemaApiService } from '@core/server-cinema-api.service';
import { ServerSessionService } from '@core/server-session.service';
import { TmdbConfigurationService } from '@core/tmdb-configuration.service';
import { ReleaseReminderService } from '@features/notifications/release-reminder.service';
import { I18nService } from '@shared/i18n/i18n.service';
import { ShellComponent } from './shell.component';

@Component({ standalone: true, template: '<div>Home</div>' })
class HomeStubComponent {}

@Component({ standalone: true, template: '<div>Account</div>' })
class AccountStubComponent {}

describe('ShellComponent', () => {
  it('renders skip link, focusable main and aria-current on active nav item', async () => {
    const locale = signal('en-US');

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([
          { path: '', component: HomeStubComponent },
          { path: 'account', component: AccountStubComponent },
        ]),
        {
          provide: I18nService,
          useValue: {
            tmdbLocale: locale.asReadonly(),
            lang: () => 'en' as const,
            t: (key: string) => key,
            setTmdbLocale: () => undefined,
          },
        },
        {
          provide: TmdbConfigurationService,
          useValue: {
            primaryTranslations: signal(['en-US']).asReadonly(),
            loadPrimaryTranslations: () => of(['en-US']),
          },
        },
        {
          provide: LooksService,
          useValue: {
            looks: signal([{ id: 'sunset', name: 'Sunset', vars: {} }]).asReadonly(),
            activeId: signal('sunset').asReadonly(),
            setActive: () => undefined,
          },
        },
        {
          provide: ServerSessionService,
          useValue: {
            me: signal(null).asReadonly(),
            refreshMe: () => undefined,
          },
        },
        {
          provide: ServerCinemaApiService,
          useValue: {
            hasToken: () => false,
          },
        },
        {
          provide: ReleaseReminderService,
          useValue: {},
        },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/account');

    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const skipLink = root.querySelector('.skip-link') as HTMLAnchorElement | null;
    const main = root.querySelector('main') as HTMLElement | null;
    const current = root.querySelector('.nav a[aria-current="page"]') as HTMLAnchorElement | null;

    expect(skipLink?.getAttribute('href')).toBe('#main-content');
    expect(main?.id).toBe('main-content');
    expect(main?.getAttribute('tabindex')).toBe('-1');
    expect(current?.textContent).toContain('nav.account');
  });
});
