'use client';

import React from 'react';
import Link from 'next/link';
import { getArchetypeIconUrl, POPULAR_ARCHETYPES } from '@/lib/limitless';

interface ArchetypeBadgeProps {
  identifier: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
}

export function ArchetypeBadge({
  identifier,
  name,
  size = 'md',
  clickable = true,
}: ArchetypeBadgeProps) {
  // Look up archetype name and icon from popular registry if name isn't passed
  const found = POPULAR_ARCHETYPES.find((a) => a.identifier === identifier);
  const displayName = name || found?.name || identifier.replace(/-/g, ' ');
  const icon = found?.icons?.[0] || identifier.split('-')[0];
  const iconUrl = getArchetypeIconUrl(icon);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs sm:text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm sm:text-base px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  const content = (
    <span
      className={`inline-flex items-center rounded-lg font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-xs transition-colors ${sizeClasses}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconUrl}
        alt=""
        className={`${iconSizes} object-contain shrink-0`}
        onError={(e) => {
          // If icon doesn't exist on CDN, hide broken img icon
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
      <span className="truncate max-w-[160px] sm:max-w-[200px]">{displayName}</span>
    </span>
  );

  if (clickable) {
    return (
      <Link href={`/archetype/${identifier}`} className="inline-block transition-transform hover:scale-[1.02]">
        {content}
      </Link>
    );
  }

  return content;
}
