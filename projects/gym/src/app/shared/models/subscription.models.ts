export interface Subscription {
  subscriptionId: number;
  memberId: number;
  planId: number;
  memberName: string;
  planName: string;
  price: number;
  startDate: string;
  endDate: string;
  status: string;
  freezeCountUsed: number;
  totalFreezeDaysUsed: number;
}

export interface SubscriptionFilters {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
  status: string;
  planName: string;
  startDateFrom: string;
  startDateTo: string;
  endDateFrom: string;
  endDateTo: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export interface CreateSubscriptionRequest {
  memberId: number;
  planId: number;
  startDate: string;
}

export interface RenewSubscriptionRequest {
  memberId: number;
  planId: number;
}

export interface FreezeSubscriptionRequest {
  freezeDays: number;
}
