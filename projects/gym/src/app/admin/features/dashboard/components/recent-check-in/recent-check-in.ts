import { Component, input, signal } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { RecentCheckIn } from '../../models/adminDashboardResponse';
import { DatePipe } from '@angular/common';
import { resolveImageUrl } from '../../../../../shared/image-url';
import { RouterLink } from '@angular/router';

@Component({
  imports: [AvatarModule, DatePipe, RouterLink],
  selector: 'app-recent-check-ins',
  styleUrl: './recent-check-in.scss',
  templateUrl: './recent-check-in.html',
})
export class RecentCheckIns {
  checkIns = input.required<RecentCheckIn[]>();
  private readonly failedImages = signal(new Set<number>());
  imageSource(imageUrl: string | null, memberId: number): string | null {
    if (!imageUrl || this.failedImages().has(memberId)) {
      return null;
    }

    return resolveImageUrl(imageUrl);
  }

  markImageAsFailed(memberId: number): void {
    this.failedImages.update((failed) => new Set(failed).add(memberId));
  }

  initials(memberName: string): string {
    return memberName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
