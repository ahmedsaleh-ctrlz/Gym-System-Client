import { computed, inject, Injectable, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, of } from 'rxjs';
import { AppNotification, NotificationFilter } from '../models/notification.models';
import { NotificationsApiService } from './notifications-api.service';
import { NotificationSignalRService } from './notification-signalr.service';

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private readonly api = inject(NotificationsApiService);
  private readonly signalR = inject(NotificationSignalRService);
  private readonly messages = inject(MessageService);

  readonly activeFilter = signal<NotificationFilter>('all');
  readonly allNotifications = signal<AppNotification[]>([]);
  readonly unreadNotifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly notifications = computed(() => this.activeFilter() === 'unread' ? this.unreadNotifications() : this.allNotifications());
  readonly canLoadMore = computed(() => {
    const unread = this.activeFilter() === 'unread';
    const items = unread ? this.unreadNotifications() : this.allNotifications();
    return items.length < (unread ? this.unreadTotal : this.allTotal);
  });

  private initialized = false;
  private allLoaded = false;
  private unreadLoaded = false;
  private allPage = 0;
  private unreadPage = 0;
  private allTotal = 0;
  private unreadTotal = 0;
  private readonly knownIds = new Set<string>();

  constructor() {
    this.signalR.notificationReceived$.subscribe((notification) => this.receiveRealtime(notification));
  }

  initialize(): void {
    this.signalR.connect();
    if (this.initialized) return;
    this.initialized = true;
    this.api.getUnreadCount().pipe(catchError(() => of(0))).subscribe((count) => this.unreadCount.set(count));
  }

  selectFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
    this.load(filter);
  }

  load(filter: NotificationFilter = this.activeFilter(), force = false): void {
    const loaded = filter === 'unread' ? this.unreadLoaded : this.allLoaded;
    if (loaded && !force) return;
    this.activeFilter.set(filter);
    this.loading.set(true);
    this.api.getNotifications(1, 20, filter === 'unread' ? false : undefined).subscribe({
      next: (response) => { this.setPage(filter, response.items, response.totalCount, 1); this.loading.set(false); },
      error: () => { this.loading.set(false); this.messages.add({ severity: 'error', summary: 'Notifications unavailable', detail: 'We could not load your notifications. Please try again.' }); },
    });
  }

  loadMore(): void {
    if (this.loadingMore() || !this.canLoadMore()) return;
    const filter = this.activeFilter();
    const nextPage = filter === 'unread' ? this.unreadPage + 1 : this.allPage + 1;
    this.loadingMore.set(true);
    this.api.getNotifications(nextPage, 20, filter === 'unread' ? false : undefined).subscribe({
      next: (response) => { this.setPage(filter, response.items, response.totalCount, nextPage, true); this.loadingMore.set(false); },
      error: () => { this.loadingMore.set(false); this.messages.add({ severity: 'error', summary: 'Could not load more', detail: 'Please try again.' }); },
    });
  }

  markAsRead(notification: AppNotification): void {
    if (notification.isRead) return;
    const notificationKey = this.notificationKey(notification);
    const wasLoadedUnread = this.unreadNotifications().some((item) => this.notificationKey(item) === notificationKey);
    this.api.markAsRead(Number(notification.id)).subscribe({
      next: () => {
        this.allNotifications.update((items) => items.map((item) => this.notificationKey(item) === notificationKey ? { ...item, isRead: true } : item));
        this.unreadNotifications.update((items) => items.filter((item) => this.notificationKey(item) !== notificationKey));
        if (wasLoadedUnread) this.unreadTotal = Math.max(0, this.unreadTotal - 1);
        this.unreadCount.update((count) => Math.max(0, count - 1));
      },
      error: () => this.messages.add({ severity: 'error', summary: 'Could not mark notification', detail: 'Please try again.' }),
    });
  }

  markAllAsRead(): void {
    if (this.unreadCount() === 0) return;
    this.api.markAllAsRead().subscribe({
      next: () => { this.allNotifications.update((items) => items.map((item) => ({ ...item, isRead: true }))); this.unreadNotifications.set([]); this.unreadTotal = 0; this.unreadCount.set(0); },
      error: () => this.messages.add({ severity: 'error', summary: 'Could not mark all as read', detail: 'Please try again.' }),
    });
  }

  disconnect(): void { this.signalR.disconnect(); }

  private receiveRealtime(notification: AppNotification): void {
    if (!notification) return;
    const notificationKey = this.notificationKey(notification);
    if (this.knownIds.has(notificationKey) || this.hasNotification(notificationKey)) return;
    this.knownIds.add(notificationKey);
    if (this.allLoaded) this.allNotifications.update((items) => [notification, ...items]);
    if (this.unreadLoaded && !notification.isRead) this.unreadNotifications.update((items) => [notification, ...items]);
    if (!notification.isRead) this.unreadCount.update((count) => count + 1);
    this.messages.add({ severity: 'info', summary: notification.title, detail: notification.message, life: 6000 });
  }

  private hasNotification(id: string): boolean {
    return this.allNotifications().some((item) => this.notificationKey(item) === id) || this.unreadNotifications().some((item) => this.notificationKey(item) === id);
  }

  private setPage(filter: NotificationFilter, items: AppNotification[], total: number, page: number, append = false): void {
    items.forEach((item) => this.knownIds.add(this.notificationKey(item)));
    if (filter === 'unread') {
      this.unreadNotifications.update((current) => this.uniqueItems(append ? [...current, ...items] : items));
      this.unreadTotal = total; this.unreadPage = page; this.unreadLoaded = true;
      this.unreadCount.set(total);
    } else {
      this.allNotifications.update((current) => this.uniqueItems(append ? [...current, ...items] : items));
      this.allTotal = total; this.allPage = page; this.allLoaded = true;
    }
  }

  private uniqueItems(items: AppNotification[]): AppNotification[] {
    return [...new Map(items.map((item) => [this.notificationKey(item), item])).values()];
  }

  private notificationKey(notification: AppNotification): string {
    return String(notification.id);
  }
}
