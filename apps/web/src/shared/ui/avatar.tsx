import type { HTMLAttributes } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  readonly name: string;
  readonly src?: string;
  readonly size?: AvatarSize;
  readonly statusColor?: string;
}

const sizeClass: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  const [first, second] = parts;
  if (!first) return '';
  const firstInitial = first[0] ?? '';
  const secondInitial = second?.[0] ?? '';
  return `${firstInitial}${secondInitial}`.toUpperCase();
};

export function Avatar({
  name,
  src,
  size = 'md',
  statusColor,
  className = '',
  ...props
}: Readonly<AvatarProps>) {
  return (
    <div className={`relative inline-flex ${className}`} {...props}>
      <div
        className={`flex items-center justify-center rounded-full border border-th-border bg-th-hover text-foreground ${sizeClass[size]}`}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className="font-medium tracking-wide">{getInitials(name)}</span>
        )}
      </div>
      {statusColor ? (
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-th-card"
          style={{ backgroundColor: statusColor }}
        />
      ) : null}
    </div>
  );
}
