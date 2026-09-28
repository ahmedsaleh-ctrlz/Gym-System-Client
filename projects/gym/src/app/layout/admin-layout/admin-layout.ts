import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'auth';
import { finalize } from 'rxjs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ChartPie } from '@primeicons/angular/chart-pie';
import { Users } from '@primeicons/angular/users';
import { IdCard } from '@primeicons/angular/id-card';
import { Wallet } from '@primeicons/angular/wallet';
import { CalendarClock } from '@primeicons/angular/calendar-clock';
import { ChartLine } from '@primeicons/angular/chart-line';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { NotificationCenter } from '../../shared/components/notification-center/notification-center';
import { NotificationCenterService } from '../../core/services/notification-center.service';
import { ToastModule } from 'primeng/toast';

@Component({
  imports: [RouterOutlet, RouterLinkActive, RouterLink, ThemeToggle, NotificationCenter, ToastModule],
  selector: 'app-admin-layout',
  styleUrl: './admin-layout.scss',
  templateUrl: './admin-layout.html',
})
export class AdminLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationCenterService);
  readonly loggingOut = signal(false);

  constructor() {
    this.notifications.initialize();
  }

  logout(): void {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);
    this.notifications.disconnect();
    this.authService
      .logout()
      .pipe(
        finalize(() => {
          this.authService.clearSession();
          this.loggingOut.set(false);
          this.router.navigate(['/login']);
        }),
      )
      .subscribe();
  }
}
