'use client';

import React from 'react';
import { getArchetypeIconUrl } from '@/lib/limitless';

interface ArchetypeIconProps {
  icon: string;
  className?: string;
}

export function ArchetypeIcon({ icon, className = 'w-10 h-10' }: ArchetypeIconProps) {
  const iconUrl = getArchetypeIconUrl(icon);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconUrl}
      alt=""
      className={`${className} object-contain`}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}
