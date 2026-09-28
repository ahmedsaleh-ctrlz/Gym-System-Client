import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from 'config';
import { map, Observable } from 'rxjs';
import { AppNotification, NotificationPage } from '../models/notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${appConfig.apiUrl}/notifications`;

  getNotifications(pageNumber = 1, pageSize = 20, isRead?: boolean): Observable<NotificationPage> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (isRead !== undefined) params = params.set('isRead', isRead);

    return this.http.get<NotificationPage | AppNotification[]>(this.url, { params }).pipe(
      map((response) => Array.isArray(response)
        ? { pageNumber, pageSize, totalCount: response.length, items: response }
        : { ...response, items: response.items ?? [] }),
    );
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.url}/unread-count`);
  }

  markAsRead(notificationId: number): Observable<void> {
    return this.http.patch<void>(`${this.url}/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.url}/read-all`, {});
  }
}
