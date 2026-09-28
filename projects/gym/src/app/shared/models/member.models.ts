export interface MemberProfile {
  memberId: number;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  imageUrl: string | null;
  joinDate: string;
  notes: string | null;
}

export interface UpdateMemberRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  joinDate: string;
  notes: string | null;
}

export interface UpdateMemberImageRequest {
  imageUrl: string;
}

export interface MemberPageResponse {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  items: MemberProfile[];
}

export interface ActiveMember {
  memberId: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  imageUrl: string | null;
}

export interface CreateMemberRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  joinDate: string | null;
  notes: string;
  password: string;
}

export interface AdminUpdateMemberRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  joinDate: string | null;
  notes: string;
}
