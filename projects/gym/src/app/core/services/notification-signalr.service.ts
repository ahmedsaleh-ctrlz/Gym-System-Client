import { Injectable, inject } from '@angular/core';
import { TokenService } from 'auth';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { AppNotification } from '../models/notification.models';
import { appConfig } from 'config';

@Injectable({ providedIn: 'root' })
export class NotificationSignalRService {
  private readonly tokenService = inject(TokenService);
  private readonly notificationSubject = new Subject<AppNotification>();
  private connection: HubConnection | null = null;
  private startPromise: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldConnect = false;

  readonly notificationReceived$ = this.notificationSubject.asObservable();

  connect(): void {
    this.shouldConnect = true;

    if (!this.tokenService.getAccessToken()) {
      this.scheduleReconnect();
      return;
    }

    if (this.connection && this.connection.state !== HubConnectionState.Disconnected) return;
    if (this.startPromise) return;

    const previousConnection = this.connection;
    if (previousConnection?.state === HubConnectionState.Disconnected) {
      void previousConnection.stop();
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${appConfig.apiBaseUrl}/hubs/notifications`, {
        accessTokenFactory: () => this.tokenService.getAccessToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection = connection;
    connection.off('NotificationReceived');
    connection.on('NotificationReceived', (notification: AppNotification) => {
      this.notificationSubject.next({
        ...notification,
        id: Number(notification.id),
        type: Number(notification.type),
      });
    });
    connection.onclose(() => {
      if (this.shouldConnect) {
        this.scheduleReconnect();
      }
    });

    this.startPromise = connection
      .start()
      .catch(() => {
        if (this.shouldConnect) {
          this.scheduleReconnect();
        }
      })
      .finally(() => {
        this.startPromise = null;
      });
  }

  disconnect(): void {
    this.shouldConnect = false;

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    const connection = this.connection;
    this.connection = null;
    this.startPromise = null;
    void connection?.stop();
  }

  private scheduleReconnect(): void {
    if (this.retryTimer || !this.shouldConnect) return;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, 5000);
  }
}
