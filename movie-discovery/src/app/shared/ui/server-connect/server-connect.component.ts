import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ServerCinemaApiService } from '@core/server-cinema-api.service';
import { ServerSessionService } from '@core/server-session.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';

@Component({
  selector: 'app-server-connect',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, FormFieldComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-card>
      <app-form-field [label]="label()" [hint]="hint()">
        @if (session.me(); as me) {
          <p class="muted" style="margin: 0 0 0.5rem">
            Connected as <b>{{ me.email }}</b>
          </p>
          <div class="actions" style="margin-top: 0.5rem">
            <app-button
              variant="secondary"
              [loading]="session.busy()"
              [disabled]="session.busy()"
              (click)="disconnect()"
            >
              Disconnect
            </app-button>
            <app-button
              variant="ghost"
              [loading]="session.busy()"
              [disabled]="session.busy()"
              (click)="session.refreshMe()"
            >
              Refresh status
            </app-button>
            <app-button
              variant="ghost"
              [disabled]="session.busy()"
              (click)="showAdvanced.set(!showAdvanced())"
            >
              {{ showAdvanced() ? 'Hide advanced' : 'Advanced' }}
            </app-button>
          </div>
        } @else {
          <div class="row2">
            <app-form-field label="Email">
              <input class="input" [(ngModel)]="email" autocomplete="email" />
            </app-form-field>
            <app-form-field label="Password">
              <input
                class="input"
                type="password"
                [(ngModel)]="password"
                autocomplete="current-password"
              />
            </app-form-field>
          </div>
          <div class="actions" style="margin-top: 0.5rem">
            <app-button
              variant="secondary"
              [loading]="session.busy()"
              [disabled]="session.busy()"
              (click)="login()"
            >
              Connect (login)
            </app-button>
            <app-button
              variant="ghost"
              [loading]="session.busy()"
              [disabled]="session.busy()"
              (click)="register()"
            >
              Create account
            </app-button>
            <app-button
              variant="ghost"
              [disabled]="session.busy()"
              (click)="showAdvanced.set(!showAdvanced())"
            >
              {{ showAdvanced() ? 'Hide advanced' : 'Advanced' }}
            </app-button>
          </div>
          @if (session.err(); as err) {
            <p class="muted" role="alert" style="margin-top: 0.65rem">{{ err }}</p>
          }
        }

        @if (showAdvanced()) {
          <details style="margin-top: 0.65rem" open>
            <summary>Advanced: raw server token</summary>
            <textarea [(ngModel)]="tokenText" rows="2" placeholder="eyJhbGciOi..."></textarea>
            <div class="actions" style="margin-top: 0.5rem">
              <app-button
                variant="secondary"
                [disabled]="session.busy() || !tokenText.trim()"
                (click)="applyToken()"
              >
                Use token
              </app-button>
              <app-button variant="ghost" [disabled]="session.busy()" (click)="clearToken()"
                >Clear token</app-button
              >
            </div>
          </details>
        }
      </app-form-field>
    </app-card>
  `,
  styles: [
    `
      .muted {
        margin: 0;
        color: var(--text-muted);
        line-height: 1.45;
        max-width: 72ch;
      }
      .actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .row2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
      @media (max-width: 720px) {
        .row2 {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ServerConnectComponent {
  readonly label = input<string>('Connect to server (optional)');
  readonly hint = input<string>('');

  readonly session = inject(ServerSessionService);
  private readonly api = inject(ServerCinemaApiService);

  readonly showAdvanced = signal(false);
  email = '';
  password = '';
  tokenText = '';

  readonly connected = computed(() => Boolean(this.session.me()));

  constructor() {
    this.tokenText = this.api.getToken() ?? '';
    if (this.api.hasToken()) this.session.refreshMe({ silent: true });
  }

  login(): void {
    this.session.login(this.email, this.password);
  }

  register(): void {
    this.session.register(this.email, this.password);
  }

  disconnect(): void {
    this.session.disconnect();
  }

  applyToken(): void {
    const t = this.tokenText.trim();
    if (!t) return;
    this.api.setToken(t);
    this.session.refreshMe();
  }

  clearToken(): void {
    this.tokenText = '';
    this.session.disconnect();
  }
}
