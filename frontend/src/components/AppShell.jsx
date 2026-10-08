export default function AppShell({ header, children, width = '6xl' }) {
  const max = width === '5xl' ? 'max-w-5xl' : width === '4xl' ? 'max-w-4xl' : 'max-w-6xl';
  return (
    <div className="ss-page min-h-screen">
      {header}
      <main className={`mx-auto w-full ${max} px-4 py-8 sm:px-6 lg:px-8 lg:py-10`}>{children}</main>
    </div>
  );
}
