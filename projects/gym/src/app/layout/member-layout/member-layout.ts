import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from 'auth';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { finalize, filter } from 'rxjs';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { NotificationCenter } from '../../shared/components/notification-center/notification-center';
import { NotificationCenterService } from '../../core/services/notification-center.service';
import { ToastModule } from 'primeng/toast';
import { MemberProfile } from '../../member/shared/models/member-area.models';
import { MemberService } from '../../shared/services/member.service';
import { memberFullName, memberImageUrl, memberInitials } from '../../member/shared/member.helpers';

@Component({
  imports: [ButtonModule, AvatarModule, RouterOutlet, RouterLink, RouterLinkActive, ThemeToggle, NotificationCenter, ToastModule],
  selector: 'app-member-layout',
  styleUrl: './member-layout.scss',
  templateUrl: './member-layout.html',
})
export class MemberLayout {
  private readonly memberService = inject(MemberService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = inject(NotificationCenterService);

  profile = signal<MemberProfile | null>(null);
  loggingOut = signal(false);
  navigationLoading = signal(false);
  readonly imageUrl = memberImageUrl;
  readonly fullName = memberFullName;
  readonly initials = memberInitials;

  constructor() {
    this.notifications.initialize();
    this.memberService.getMe().subscribe({ next: (profile) => this.profile.set(profile) });

    this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationStart ||
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.navigationLoading.set(event instanceof NavigationStart);
      });
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

