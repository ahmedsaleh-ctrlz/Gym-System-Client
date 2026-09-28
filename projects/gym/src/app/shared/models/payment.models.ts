export interface Payment {
  paymentId: number;
  subscriptionId: number;
  memberId: number;
  memberName: string;
  imageUrl?: string | null;
  planName: string;
  amount: number;
  paymentMethod: string | number;
  paymentReference?: string | null;
  status: string;
  paidAtUtc: string | null;
}

export interface PaymentFilters {
  pageNumber: number;
  pageSize: number;
  searchTerm: string;
  status: string;
  paymentMethod: number | null;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

export interface PayPaymentRequest {
  paymentId: number;
  paymentMethod: number;
  paymentReference: string | null;
  promoCodeId: number | null;
}

export interface RefundPaymentRequest {
  paymentId: number;
}

export interface StripePaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
}
