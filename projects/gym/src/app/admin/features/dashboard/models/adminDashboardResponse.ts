export interface AdminDashboardResponse {
  // Members
  totalMembers: number;
  activeSubscriptions: number;
  frozenSubscriptions: number;
  scheduledSubscriptions: number;
  expiredSubscriptions: number;

  // Attendance
  todayAttendanceCount: number;
  thisWeekAttendanceCount: number;
  peakHour: number;
  peakHourAttendanceCount: number;
  attendance: AttendancePoint[];
  recentCheckIns: RecentCheckIn[];

  // Revenue
  todayRevenue: number;
  thisMonthRevenue: number;
  totalRevenue: number;
  revenue: RevenuePoint[];

  // Plans
  mostPopularPlan: string;
  mostPopularPlanSubscriptionsCount: number;

  // Payments
  pendingPaymentsCount: number;
  paidPaymentsCount: number;
}

export interface RevenuePoint {
  date: string;
  amount: number;
}

export interface AttendancePoint {
  date: string;
  count: number;
}

export interface RecentCheckIn {
  memberId: number;
  memberName: string;
  imageUrl: string | null;
  checkInAtUtc: string;
}
