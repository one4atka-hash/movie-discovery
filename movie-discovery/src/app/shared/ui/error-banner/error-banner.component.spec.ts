import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ErrorNotifierService } from '@core/error-notifier.service';
import { ErrorBannerComponent } from './error-banner.component';

describe('ErrorBannerComponent', () => {
  it('renders active errors as an alert region', async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorBannerComponent],
    }).compileComponents();

    const notifier = TestBed.inject(ErrorNotifierService);
    notifier.show('Boom');

    const fixture = TestBed.createComponent(ErrorBannerComponent);
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.banner') as HTMLElement | null;
    expect(banner?.getAttribute('role')).toBe('alert');
    expect(banner?.getAttribute('aria-live')).toBe('assertive');
    expect(banner?.textContent).toContain('Boom');
  });
});
