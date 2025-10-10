export function requireUser(): string {
  const user = process.env.DEMO_USER_ID || 'u_demo';
  return user;
}
