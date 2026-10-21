'use client';

import React from 'react';
import { getArchetypeIconUrl, getArchetypeIcons } from '@/lib/limitless';

interface ArchetypeIconProps {
  icon?: string;
  icons?: string[];
  identifier?: string;
  className?: string;
  alt?: string;
}

export function ArchetypeIcon({
  icon,
  icons,
  identifier,
  className = 'w-10 h-10',
  alt = '',
}: ArchetypeIconProps) {
  // Determine the sprite list
  let spriteList: string[] = [];
  if (Array.isArray(icons) && icons.length > 0) {
    spriteList = icons.filter(Boolean);
  } else if (identifier) {
    spriteList = getArchetypeIcons(identifier);
  } else if (icon) {
    spriteList = [icon];
  }

  if (spriteList.length === 0) {
    spriteList = ['default'];
  }

  // If an archetype has multiple pokemon sprites representing it, show both images together.
  // The space both images take up is the same as a single sprite, slightly overlayed
  // with one sprite in the top left of the space and the other in the bottom right.
  if (spriteList.length >= 2) {
    const primaryUrl = getArchetypeIconUrl(spriteList[0]);
    const secondaryUrl = getArchetypeIconUrl(spriteList[1]);

    return (
      <div className={`relative ${className} shrink-0 select-none`} aria-label={alt || undefined}>
        {/* Top-Left Sprite */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={primaryUrl}
          alt={alt}
          className="absolute top-0 left-0 w-[70%] h-[70%] object-contain z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Bottom-Right Sprite */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={secondaryUrl}
          alt=""
          className="absolute bottom-0 right-0 w-[70%] h-[70%] object-contain z-20 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Single sprite
  const singleUrl = getArchetypeIconUrl(spriteList[0]);
  return (
    <div className={`relative ${className} shrink-0 select-none flex items-center justify-center`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={singleUrl}
        alt={alt}
        className="w-full h-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}
