import { Component } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div class="loader">
      <div class="spinner"></div>
    </div>
  `,
  styles: [
    `
      .loader {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem 0;
      }

      .spinner {
        width: 32px;
        height: 32px;
        border-radius: 9999px;
        border: 3px solid rgba(255, 255, 255, 0.12);
        border-top-color: #ff5f6d;
        animation: spin 0.7s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `
  ]
})
export class LoaderComponent {}

