import { appConfig } from 'config';

export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  const value = imageUrl?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const base = appConfig.apiBaseUrl ? appConfig.apiBaseUrl.replace(/\/+$/, '') : '';
  const path = value.replace(/^\/+/, '');
  return base ? `${base}/${path}` : `/${path}`;
}
