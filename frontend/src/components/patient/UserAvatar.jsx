function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function UserAvatar({ name, imageUrl, size = 'md', showOnline }) {
  const sizes = {
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-base',
  };
  const dotSizes = { sm: 'h-2 w-2', md: 'h-2.5 w-2.5', lg: 'h-3 w-3' };

  return (
    <div className="relative inline-flex shrink-0">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className={`${sizes[size]} rounded-full border border-ss-border object-cover`}
        />
      ) : (
        <span
          className={`${sizes[size]} inline-flex items-center justify-center rounded-full border border-ss-primary/30 bg-gradient-to-br from-ss-primary/25 to-ss-secondary/20 font-semibold text-ss-text`}
        >
          {initialsFromName(name)}
        </span>
      )}
      {showOnline ? (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-ss-bg bg-ss-secondary`}
          aria-label="Online"
        />
      ) : null}
    </div>
  );
}
