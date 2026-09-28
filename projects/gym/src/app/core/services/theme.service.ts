import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'gym-theme-mode';

  readonly isDark = signal(false);

  constructor() {
    this.applyTheme(this.getInitialTheme(), false);
  }

  toggle(): void {
    this.applyTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(mode: ThemeMode): void {
    this.applyTheme(mode);
  }

  private applyTheme(mode: ThemeMode, persist = true): void {
    const dark = mode === 'dark';
    this.isDark.set(dark);
    this.document.documentElement.classList.toggle('app-dark', dark);
    this.document.documentElement.style.colorScheme = mode;

    if (persist) {
      try {
        localStorage.setItem(this.storageKey, mode);
      } catch {
        // A blocked storage context should not prevent theme switching.
      }
    }
  }

  private getInitialTheme(): ThemeMode {
    try {
      const savedTheme = localStorage.getItem(this.storageKey);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch {
      // Fall back to the OS preference when storage is unavailable.
    }

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }

    return 'light';
  }
}
