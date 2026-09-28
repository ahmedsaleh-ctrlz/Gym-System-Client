export interface Invoice {
  invoiceNumber: string;
  paymentId: number;
  memberName: string;
  planName: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  subTotal: number;
  discount: number;
  tax: number;
  total: number;
  promoCode: string | null;
  paymentMethod: string | number;
  paymentReference: string | null;
  issuedAt: string;
}
