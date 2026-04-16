import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { SegmentedControlComponent, type SegmentedOption } from './segmented-control.component';

type ModeValue = 'first' | 'second' | 'third';

@Component({
  standalone: true,
  imports: [SegmentedControlComponent],
  template: `
    <app-segmented
      ariaLabel="Segmented test"
      [options]="options"
      [value]="value()"
      (select)="value.set($event)"
    />
  `,
})
class SegmentedControlHostComponent {
  readonly value = signal<ModeValue>('first');
  readonly options: readonly SegmentedOption<ModeValue>[] = [
    { value: 'first', label: 'First' },
    { value: 'second', label: 'Second' },
    { value: 'third', label: 'Third', disabled: true },
  ];
}

describe('SegmentedControlComponent', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [SegmentedControlHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(SegmentedControlHostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders as radiogroup with one selected option', async () => {
    const fixture = await setup();
    const root = fixture.nativeElement as HTMLElement;
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('.seg__btn')];

    expect(root.querySelector('.seg')?.getAttribute('role')).toBe('radiogroup');
    expect(buttons[0]?.getAttribute('role')).toBe('radio');
    expect(buttons[0]?.getAttribute('aria-checked')).toBe('true');
    expect(buttons[0]?.getAttribute('tabindex')).toBe('0');
    expect(buttons[1]?.getAttribute('tabindex')).toBe('-1');
  });

  it('moves selection with arrow keys and skips disabled options', async () => {
    const fixture = await setup();
    const root = fixture.nativeElement as HTMLElement;
    const first = root.querySelectorAll<HTMLButtonElement>('.seg__btn')[0]!;

    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('second');
    expect(document.activeElement).toBe(root.querySelectorAll<HTMLButtonElement>('.seg__btn')[1]);
  });

  it('selects focused option on Enter', async () => {
    const fixture = await setup();
    const root = fixture.nativeElement as HTMLElement;
    const second = root.querySelectorAll<HTMLButtonElement>('.seg__btn')[1]!;

    second.focus();
    second.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('second');
  });
});
