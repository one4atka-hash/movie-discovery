import { Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button class="app-button" type="button">
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      .app-button {
        border: none;
        border-radius: 9999px;
        padding: 0.5rem 1.25rem;
        cursor: pointer;
        font: inherit;
        background: linear-gradient(135deg, #ff5f6d, #ffc371);
        color: #0b0b0f;
        transition: transform 0.12s ease-out, box-shadow 0.12s ease-out, filter 0.12s ease-out;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
      }

      .app-button:hover {
        transform: translateY(-1px);
        filter: brightness(1.05);
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
      }

      .app-button:active {
        transform: translateY(1px) scale(0.98);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }
    `
  ]
})
export class ButtonComponent {
  readonly variant = input<'primary' | 'ghost'>('primary');
}

