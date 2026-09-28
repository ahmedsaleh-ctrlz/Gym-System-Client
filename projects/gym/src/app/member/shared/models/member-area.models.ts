export type { MemberProfile } from '../../../shared/models/member.models';

export type { Subscription as MemberSubscription } from '../../../shared/models/subscription.models';

export type { Payment as MemberPayment } from '../../../shared/models/payment.models';

export type { Plan as MemberPlan } from '../../../shared/models/plan.models';

export type {
  UpdateMemberImageRequest,
  UpdateMemberRequest,
} from '../../../shared/models/member.models';

export type {
  CreateSubscriptionRequest as CreateMemberSubscriptionRequest,
  FreezeSubscriptionRequest as FreezeMemberSubscriptionRequest,
  RenewSubscriptionRequest as RenewMemberSubscriptionRequest,
} from '../../../shared/models/subscription.models';

export interface UpdatePasswordRequest {
  memberId: number;
  currentPassword: string;
  newPassword: string;
}

export type { StripePaymentIntentResult } from '../../../shared/models/payment.models';
