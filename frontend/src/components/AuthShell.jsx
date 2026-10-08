import AuthLayout from '@/components/auth/AuthLayout';

/** @deprecated Use AuthLayout — kept so older imports do not break. */
export default function AuthShell({ children }) {
  return (
    <AuthLayout showRoles={false}>
      {children}
    </AuthLayout>
  );
}
