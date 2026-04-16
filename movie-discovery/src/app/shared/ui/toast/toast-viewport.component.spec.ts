import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { I18nService } from '@shared/i18n/i18n.service';
import { ToastViewportComponent } from './toast-viewport.component';
import { ToastService, type ToastItem } from './toast.service';

describe('ToastViewportComponent', () => {
  it('uses polite status for success toasts and alert for errors', async () => {
    const items = signal<ToastItem[]>([
      { id: '1', kind: 'success', title: 'Saved', createdAt: 1 },
      { id: '2', kind: 'error', title: 'Failed', createdAt: 2 },
    ]);

    await TestBed.configureTestingModule({
      imports: [ToastViewportComponent],
      providers: [
        {
          provide: ToastService,
          useValue: {
            items: items.asReadonly(),
            dismiss: () => undefined,
          },
        },
        {
          provide: I18nService,
          useValue: {
            tmdbLocale: signal('en-US').asReadonly(),
            lang: () => 'en' as const,
            t: (key: string) => key,
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ToastViewportComponent);
    fixture.detectChanges();

    const region = fixture.nativeElement.querySelector('.toasts') as HTMLElement;
    const toasts = fixture.nativeElement.querySelectorAll('.toast') as NodeListOf<HTMLElement>;

    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-label')).toBe('a11y.notifications');
    expect(toasts[0]?.getAttribute('role')).toBe('status');
    expect(toasts[1]?.getAttribute('role')).toBe('alert');
  });
});
