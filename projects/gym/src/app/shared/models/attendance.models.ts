export interface AttendanceRecord {
  attendanceId: number;
  memberId: number;
  memberName: string;
  checkInAtUtc: string;
}

export interface AttendancePageResponse {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  items: AttendanceRecord[];
}
