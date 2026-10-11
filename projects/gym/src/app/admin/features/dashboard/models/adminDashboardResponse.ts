export interface DashboardStats {
  totalMembers: number;
  activeSubscriptions: number;
  expiringSubscriptionsNext7Days: number;
  thisMonthRevenue: number;
  previousMonthRevenue: number;
  revenueGrowthPercentage: number;
  todayAttendanceCount: number;
  pendingPaymentsCount: number;
  underReviewPaymentsCount: number;
  mostPopularPlan: string;
  mostPopularPlanSubscriptionsCount: number;
}

export interface MembersSummary {
  totalMembers: number;
  newMembersThisMonth: number;
  newMembersPreviousMonth: number;
}

export interface SubscriptionsSummary {
  activeSubscriptions: number;
  frozenSubscriptions: number;
  scheduledSubscriptions: number;
  expiredSubscriptions: number;
  newSubscriptionsThisMonth: number;
  newSubscriptionsPreviousMonth: number;
  expiringSubscriptionsNext7Days: number;
  expiringSubscriptionsNext30Days: number;
  expiredSubscriptionsThisMonth: number;
}

export interface PaymentsSummary {
  pendingPaymentsCount: number;
  underReviewPaymentsCount: number;
  paidPaymentsCount: number;
  failedPaymentsCount: number;
  refundedPaymentsCount: number;
  cancelledPaymentsCount: number;
  rejectedPaymentsCount: number;
  pendingPaymentsAmount: number;
  underReviewPaymentsAmount: number;
}

export type DashboardPeriod = 'Month' | 'Year';

export interface PeriodQuery {
  period: DashboardPeriod;
  year: number;
  month?: number;
}

export interface RevenuePoint {
  date: string;
  amount: number;
}

export interface RevenueSummary {
  currentPeriodRevenue: number;
  previousPeriodRevenue: number;
  growthPercentage: number;
  data: RevenuePoint[];
}

export interface AttendancePoint {
  date: string;
  count: number;
}

export interface AttendanceSummary {
  currentPeriodAttendance: number;
  previousPeriodAttendance: number;
  growthPercentage: number;
  averageDailyAttendance: number;
  peakHour: number;
  peakHourAttendanceCount: number;
  data: AttendancePoint[];
}

export interface PlanPerformance {
  planId: number;
  planName: string;
  subscriptionsCount: number;
  revenue: number;
}

export interface PlansSummary {
  mostPopularPlan: string;
  mostPopularPlanSubscriptionsCount: number;
  highestRevenuePlan: string;
  highestPlanRevenue: number;
  plans: PlanPerformance[];
}

export interface RecentCheckIn {
  memberId: number;
  memberName: string;
  imageUrl: string | null;
  checkInAtUtc: string;
}

export interface RecentCheckInsResponse {
  checkIns: RecentCheckIn[];
}
