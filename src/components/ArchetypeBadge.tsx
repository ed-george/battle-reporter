'use client';

import React from 'react';
import Link from 'next/link';
import {
  getArchetypeIconUrl,
  getArchetypeDisplayName,
  getArchetypePrimaryIcon,
} from '@/lib/limitless';

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
  // Always source display name and icon from official Limitless API metadata
  const displayName = name || getArchetypeDisplayName(identifier);
  const icon = getArchetypePrimaryIcon(identifier);
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
      className={`inline-flex items-center rounded-lg font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 shadow-xs transition-colors ${sizeClasses}`}
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
