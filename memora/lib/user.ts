/**
 * User Session Management
 * 
 * Manages authenticated user sessions with localStorage
 */

import type { User } from './auth';

export function getUserId(): string {
  if (typeof window === 'undefined') {
    return 'user-default';
  }

  const user = getUser();
  return user?.user_id || 'user-guest';
}

export function getUser(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const userJson = localStorage.getItem('memora_user');
  if (!userJson) {
    return null;
  }

  try {
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('memora_user', JSON.stringify(user));
    console.log('[User] Logged in:', user.email);
  }
}

export function clearUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('memora_user');
    console.log('[User] Logged out');
  }
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}
