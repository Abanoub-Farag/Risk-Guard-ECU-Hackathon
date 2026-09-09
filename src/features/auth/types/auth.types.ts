export type UserRole = 'PATIENT' | 'CLINICIAN' | 'PHARMACIST' | 'ADMIN';

export interface User {
  id: string; // UUID
  role: UserRole;
  email?: string;
  name?: string;
  national_id?: string;
  pharmacy_id?: string;
}

export interface TokenPayload {
  sub: string;
  role: UserRole;
  national_id?: string;
  pharmacy_id?: string;
  iat: number;
  exp: number;
}

export interface Session {
  user: User;
  accessToken: string;
}

export interface LoginDTO {
  email?: string;
  password?: string;
  national_id?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string; // Optionally returned on some secure flows, usually HttpOnly
}
