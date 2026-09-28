import { appConfig } from 'config';
import { resolveImageUrl } from '../../shared/image-url';

export const MEMBER_API_ORIGIN = appConfig.apiBaseUrl;

export function memberImageUrl(imageUrl: string | null | undefined): string | null {
  return resolveImageUrl(imageUrl);
}

export function memberFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function memberInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function daysBetween(from: string, to: string, today = new Date()): number {
  const end = new Date(to).getTime();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(0, Math.ceil((end - current) / 86_400_000));
}

export function membershipProgress(startDate: string, endDate: string, today = new Date()): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const current = today.getTime();
  if (end <= start) return 100;
  return Math.max(0, Math.min(100, ((current - start) / (end - start)) * 100));
}

export function statusSeverity(
  status: string,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  switch (status.toLowerCase()) {
    case 'active':
    case 'paid':
      return 'success';
    case 'scheduled':
      return 'info';
    case 'pending':
    case 'frozen':
      return 'warn';
    case 'expired':
    case 'failed':
    case 'cancelled':
      return 'danger';
    default:
      return 'secondary';
  }
}
