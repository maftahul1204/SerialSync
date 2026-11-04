export function homePathForRole(role) {
  if (role === 'assistant') return '/dashboard/assistant';
  if (role === 'phlebotomist') return '/dashboard/collections';
  if (role === 'doctor' || role === 'admin') return '/dashboard';
  return '/home';
}
