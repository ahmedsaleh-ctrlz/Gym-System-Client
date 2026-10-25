import { LoginResponse } from './login-response';

export type GoogleLoginStatus =
  | 'Authenticated'
  | 'RegistrationRequired'
  | 'EmailVerificationRequired'
  | 'SessionExpired';

export interface GoogleLoginOutcome {
  status: GoogleLoginStatus;
  tokens?: LoginResponse | null;
  message?: string;
}
