export enum PromoDiscountType {
  Percentage = 1,
  FixedAmount = 2,
}

export enum PromoCodeAudience {
  Everyone = 1,
  NewMembers = 2,
}

export interface PromoCodeResponse {
  id: number;
  code: string;
  planId: number;
  planName: string;
  discountType: PromoDiscountType | string;
  discountValue: number;
  maxDiscount: number | null;
  minimumPurchaseAmount: number | null;
  audience: PromoCodeAudience | string;
  usageLimit: number;
  usageCount: number;
  expiresAtUtc: string;
  isActive: boolean;
}

export interface CreatePromoCodeRequest {
  code: string;
  planId: number;
  discountType: PromoDiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minimumPurchaseAmount: number | null;
  audience: PromoCodeAudience;
  usageLimit: number;
  expiresAtUtc: string;
}

export interface PromoCodePreviewRequest {
  promoCode: string;
  memberId: number;
  planId: number;
}
