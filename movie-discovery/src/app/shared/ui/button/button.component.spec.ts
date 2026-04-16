import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ButtonComponent } from './button.component';

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <app-button [variant]="variant" [size]="size" [loading]="loading" [disabled]="disabled">
      Action
    </app-button>
  `,
})
class TestHostComponent {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon' = 'secondary';
  size: 'sm' | 'md' | 'lg' = 'lg';
  loading = false;
  disabled = false;
}

describe('ButtonComponent', () => {
  it('exposes variant and size contract on the host button', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;
    expect(button?.dataset['variant']).toBe('secondary');
    expect(button?.dataset['size']).toBe('lg');
    expect(button?.classList.contains('app-button--secondary')).toBe(true);
    expect(button?.classList.contains('app-button--lg')).toBe(true);
  });

  it('marks loading buttons as busy and disabled', async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.loading = true;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;
    const spinner = fixture.nativeElement.querySelector('.spinner') as HTMLElement | null;

    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('aria-busy')).toBe('true');
    expect(spinner).toBeTruthy();
  });
});
