import * as React from 'react';
import Image from 'next/image';

import { cn } from '@/lib/utils';

type AvatarProps = React.ComponentProps<'div'> & {
  src?: string | null;
  alt?: string;
  fallback?: string | null;
};

function Avatar({ src, alt, fallback, className, ...props }: AvatarProps) {
  const imageSrc = src?.trim() || null;
  const fallbackText = React.useMemo(() => {
    const text = fallback?.trim();
    if (!text) return 'U';
    return text.charAt(0).toUpperCase();
  }, [fallback]);

  return (
    <div
      data-slot="avatar"
      className={cn(
        'relative inline-flex size-9 items-center justify-center overflow-hidden rounded-full border bg-muted text-sm font-semibold uppercase text-muted-foreground',
        className,
      )}
      aria-label={alt ?? fallbackText}
      {...props}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={alt ?? fallbackText}
          className="size-full object-cover"
          fill
          sizes="36px"
          unoptimized
        />
      ) : (
        <span aria-hidden="true">{fallbackText}</span>
      )}
    </div>
  );
}

export { Avatar };
