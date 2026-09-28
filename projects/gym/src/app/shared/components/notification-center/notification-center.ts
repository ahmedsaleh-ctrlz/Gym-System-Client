import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AppNotification, notificationTypeMeta } from '../../../core/models/notification.models';
import { NotificationCenterService } from '../../../core/services/notification-center.service';

@Component({
  imports: [ButtonModule],
  selector: 'app-notification-center',
  styleUrl: './notification-center.scss',
  templateUrl: './notification-center.html',
})
export class NotificationCenter {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly center = inject(NotificationCenterService);
  readonly opened = signal(false);
  readonly typeMeta = notificationTypeMeta;

  toggle(): void {
    this.opened.update((value) => !value);
    if (this.opened()) {
      this.center.initialize();
      this.center.load('all');
    }
  }

  @HostListener('document:click', ['$event'])
  closeWhenClickedOutside(event: MouseEvent): void {
    if (this.opened() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.opened.set(false);
    }
  }

  selectFilter(filter: 'all' | 'unread'): void {
    this.center.selectFilter(filter);
  }

  openNotification(notification: AppNotification): void {
    this.center.markAsRead(notification);
  }

  relativeTime(createdAt: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
