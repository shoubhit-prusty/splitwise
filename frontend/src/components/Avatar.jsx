/**
 * Avatar component — generates colored initials-based avatars.
 */
export default function Avatar({ name = '', color = '#6366f1', size = 40, className = '' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`flex items-center justify-center font-semibold rounded-full select-none shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.35,
        color: '#fff',
        boxShadow: `0 0 0 2px rgba(0,0,0,0.3)`,
      }}
    >
      {initials || '?'}
    </div>
  );
}
