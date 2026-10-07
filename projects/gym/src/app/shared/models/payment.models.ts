export const PAYMENT_METHOD = {
  Cash: 0,
  Visa: 1,
  EWallet: 2,
  InstaPay: 3,
  Fawry: 4,
} as const;

export type PaymentMethodValue = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export interface PaymentMethodOption {
  label: string;
  value: PaymentMethodValue;
}

export const PAYMENT_METHOD_OPTIONS: readonly PaymentMethodOption[] = [
  { label: 'Cash', value: PAYMENT_METHOD.Cash },
  { label: 'Visa', value: PAYMENT_METHOD.Visa },
  { label: 'E-Wallet', value: PAYMENT_METHOD.EWallet },
  { label: 'Insta Pay', value: PAYMENT_METHOD.InstaPay },
  { label: 'Fawry', value: PAYMENT_METHOD.Fawry },
];

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
  paymentMethod: number | null;
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

export interface SubmitPaymentForReviewRequest {
  paymentId: number;
  paymentMethod: typeof PAYMENT_METHOD.EWallet | typeof PAYMENT_METHOD.InstaPay;
  paymentReference: string;
  promoCodeId: number | null;
}
