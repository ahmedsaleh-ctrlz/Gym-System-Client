export type { MemberProfile as Member, ActiveMember, MemberPageResponse as MemberListResponse } from '../../../../shared/models/member.models';
export interface MemberFormValue {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  joinDate: string | null;
  notes: string;
  password: string;
}
