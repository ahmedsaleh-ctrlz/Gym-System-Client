import { Component, inject, Input, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  host: {
    '[class.embedded]': 'embedded',
  },
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  @Input() embedded = false;

  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  readonly inApplicationShell = signal(this.isApplicationShell(this.router.url));

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.inApplicationShell.set(this.isApplicationShell(event.urlAfterRedirects)));
  }

  private isApplicationShell(url: string): boolean {
    return url.startsWith('/admin') || url.startsWith('/member');
  }
}
