import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from 'config';
import { forkJoin, map, Observable } from 'rxjs';
import {
  ActiveMember,
  AdminUpdateMemberRequest,
  CreateMemberRequest,
  MemberPageResponse,
  MemberProfile,
  UpdateMemberImageRequest,
  UpdateMemberRequest,
} from '../models/member.models';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly http = inject(HttpClient);
  private readonly url = `${appConfig.apiUrl}/members`;

  getMe(): Observable<MemberProfile> {
    return this.http.get<MemberProfile>(`${this.url}/me`);
  }

  getMember(id: number): Observable<MemberProfile> {
    return this.http.get<MemberProfile>(`${this.url}/${id}`);
  }

  getMembers(pageNumber: number, pageSize: number, searchTerm: string): Observable<MemberPageResponse> {
    const terms = searchTerm.trim().split(/\s+/).filter(Boolean);
    if (terms.length > 1) {
      return forkJoin(terms.map((term) => this.getMembersPage(1, Math.max(pageSize, 100), term))).pipe(
        map((responses) => {
          const uniqueMembers = new Map<number, MemberProfile>();
          responses.flatMap((response) => response.items ?? []).forEach((member) => uniqueMembers.set(member.memberId, member));
          const matchingMembers = [...uniqueMembers.values()].filter((member) => {
            const fullName = `${member.firstName} ${member.lastName}`.toLocaleLowerCase();
            return terms.every((term) => fullName.includes(term.toLocaleLowerCase()));
          });
          const start = (pageNumber - 1) * pageSize;
          return { pageNumber, pageSize, totalCount: matchingMembers.length, items: matchingMembers.slice(start, start + pageSize) };
        }),
      );
    }
    return this.getMembersPage(pageNumber, pageSize, terms[0] ?? '');
  }

  getActiveMembers(): Observable<ActiveMember[]> {
    return this.http.get<ActiveMember[]>(`${this.url}/active`);
  }

  createAdminMember(request: CreateMemberRequest): Observable<void> {
    return this.http.post<void>(this.url, request);
  }

  updateAdminMember(id: number, request: AdminUpdateMemberRequest): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}`, request);
  }

  deleteMember(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  updateMember(id: number, request: UpdateMemberRequest): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}`, request);
  }

  updateMemberImage(id: number, request: UpdateMemberImageRequest): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}/image`, request);
  }

  private getMembersPage(pageNumber: number, pageSize: number, searchTerm: string): Observable<MemberPageResponse> {
    let params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    if (searchTerm.trim()) params = params.set('searchTerm', searchTerm.trim());
    return this.http.get<MemberPageResponse>(this.url, { params });
  }
}
