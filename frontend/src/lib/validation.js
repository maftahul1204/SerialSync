const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export function validateEmail(email) {
  const value = (email || '').trim();
  if (!value) return 'Email is required';
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters`;
  return null;
}

export function validateRegistration({ fullName, email, password }) {
  if (!(fullName || '').trim()) return 'Full name is required';
  return validateEmail(email) || validatePassword(password);
}

export function validateLogin({ email, password }) {
  return validateEmail(email) || validatePassword(password);
}
