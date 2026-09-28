export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: number;
  data?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPage {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  items: AppNotification[];
}

export type NotificationFilter = 'all' | 'unread';

export interface NotificationTypeMeta {
  label: string;
  icon: string;
  tone: 'primary' | 'success' | 'warning';
}

export function notificationTypeMeta(type: number): NotificationTypeMeta {
  switch (type) {
    case 1:
      return { label: 'Payment', icon: 'pi pi-wallet', tone: 'success' };
    case 2:
    case 3:
      return { label: 'Membership', icon: 'pi pi-id-card', tone: 'primary' };
    default:
      return { label: 'General', icon: 'pi pi-bell', tone: 'warning' };
  }
}
