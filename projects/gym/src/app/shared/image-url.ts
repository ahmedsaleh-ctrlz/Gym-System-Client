import { appConfig } from 'config';

export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  const value = imageUrl?.trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value)
    ? value
    : `${appConfig.apiBaseUrl}/${value.replace(/^\/+/, '')}`;
}
