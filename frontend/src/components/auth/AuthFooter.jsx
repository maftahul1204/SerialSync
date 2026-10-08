export default function AuthFooter() {
  return (
    <div className="mt-8 text-center text-xs leading-relaxed text-ss-muted">
      <p>
        <span className="text-ss-tertiary">☎</span> Need clinic help? Call Reception Hotline:{' '}
        <a href="tel:16247" className="font-semibold text-ss-tertiary hover:underline">
          16247
        </a>
      </p>
      <p className="mt-2">Available 24/7 for urgent clinical queue queries</p>
    </div>
  );
}
