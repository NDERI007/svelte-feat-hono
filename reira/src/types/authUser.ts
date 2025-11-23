export interface AuthUser {
  userID: string;
  email: string;
  sessionId: string;
  role: string;
  two_factor_enabled: boolean;
}
