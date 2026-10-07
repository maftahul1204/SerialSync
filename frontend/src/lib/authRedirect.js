export function homePathForRole(role) {
  if (role === 'doctor' || role === 'admin') return '/dashboard';
  return '/home';
}
