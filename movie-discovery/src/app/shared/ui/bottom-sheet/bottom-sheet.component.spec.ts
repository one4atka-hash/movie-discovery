import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { BottomSheetComponent } from './bottom-sheet.component';

@Component({
  standalone: true,
  imports: [BottomSheetComponent],
  template: `
    <button type="button" data-testid="opener" (click)="open.set(true)">Open</button>
    <app-bottom-sheet
      [open]="open()"
      title="Sheet title"
      ariaLabel="Sheet dialog"
      [closeOnBackdrop]="closeOnBackdrop()"
      (closed)="handleClosed()"
    >
      <button type="button" data-testid="first-action">First</button>
      <button type="button" data-testid="last-action">Last</button>
    </app-bottom-sheet>
  `,
})
class TestHostComponent {
  readonly open = signal(false);
  readonly closeOnBackdrop = signal(true);
  closedCount = 0;

  handleClosed(): void {
    this.closedCount += 1;
    this.open.set(false);
  }
}

describe('BottomSheetComponent', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    return fixture;
  }

  function mountShellBackground(): HTMLElement[] {
    const selectors = [
      ['a', 'skip-link'],
      ['header', 'shell__header'],
      ['app-error-banner', ''],
      ['app-toast-viewport', ''],
      ['main', ''],
    ] as const;

    return selectors.map(([tag, className], index) => {
      const el = document.createElement(tag);
      if (className) {
        el.className = className;
      }
      if (tag === 'main') {
        el.id = 'main-content';
      }
      el.setAttribute('data-testid', `background-${index}`);
      document.body.appendChild(el);
      return el;
    });
  }

  it('closes on Escape and restores focus to opener', async () => {
    const fixture = await setup();
    const opener = fixture.nativeElement.querySelector(
      '[data-testid="opener"]',
    ) as HTMLButtonElement;

    opener.focus();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const panel = fixture.nativeElement.querySelector('.sheet__panel') as HTMLElement;
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.closedCount).toBe(1);
    expect(document.activeElement).toBe(opener);
  });

  it('traps focus inside the sheet when tabbing from the last element', async () => {
    const fixture = await setup();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const closeButton = fixture.nativeElement.querySelector('.sheet__close') as HTMLButtonElement;
    const lastAction = fixture.nativeElement.querySelector(
      '[data-testid="last-action"]',
    ) as HTMLButtonElement;

    lastAction.focus();
    lastAction.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    fixture.detectChanges();

    expect(document.activeElement).toBe(closeButton);
  });

  it('respects closeOnBackdrop=false', async () => {
    const fixture = await setup();
    fixture.componentInstance.closeOnBackdrop.set(false);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const backdrop = fixture.nativeElement.querySelector('.sheet') as HTMLElement;
    backdrop.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(0);
    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('hides shell background from assistive tech while open and restores it on close', async () => {
    const backgroundElements = mountShellBackground();
    const fixture = await setup();

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    for (const element of backgroundElements) {
      expect(element.getAttribute('aria-hidden')).toBe('true');
      expect(element.hasAttribute('inert')).toBe(true);
    }

    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    for (const element of backgroundElements) {
      expect(element.hasAttribute('aria-hidden')).toBe(false);
      expect(element.hasAttribute('inert')).toBe(false);
      element.remove();
    }
  });
});
