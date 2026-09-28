import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MemberService } from '../../../../shared/services/member.service';
import { MemberFormValue, MemberListResponse } from '../models/member.models';

/** Admin form adapter. All member API communication lives in MemberService. */
@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly members = inject(MemberService);

  getMembers(pageNumber: number, pageSize: number, searchTerm: string): Observable<MemberListResponse> {
    return this.members.getMembers(pageNumber, pageSize, searchTerm);
  }

  getActiveMembers() {
    return this.members.getActiveMembers();
  }

  createMember(value: MemberFormValue): Observable<void> {
    return this.members.createAdminMember({
      firstName: value.firstName,
      lastName: value.lastName,
      email: value.email,
      phoneNumber: value.phoneNumber,
      dateOfBirth: value.dateOfBirth,
      joinDate: value.joinDate,
      notes: value.notes,
      password: value.password,
    });
  }

  updateMember(id: number, value: MemberFormValue): Observable<void> {
    return this.members.updateAdminMember(id, {
      firstName: value.firstName,
      lastName: value.lastName,
      phoneNumber: value.phoneNumber,
      dateOfBirth: value.dateOfBirth,
      joinDate: value.joinDate,
      notes: value.notes,
    });
  }

  deleteMember(id: number): Observable<void> {
    return this.members.deleteMember(id);
  }
}
