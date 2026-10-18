'use client';

import React, { useRef } from 'react';
import { ExternalLink } from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  currentTimestamp: number;
  onTimeChange?: (seconds: number) => void;
}

export function YouTubePlayer({ videoId, currentTimestamp }: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&start=${currentTimestamp}&enablejsapi=1&rel=0`;
  const externalUrl = `https://www.youtube.com/watch?v=${videoId}&t=${currentTimestamp}s`;

  return (
    <div className="w-full bg-black rounded-2xl overflow-hidden shadow-xl border border-slate-800">
      <div className="relative aspect-video w-full">
        <iframe
          key={`${videoId}-${currentTimestamp}`}
          ref={iframeRef}
          src={embedUrl}
          title="Pokémon TCG Stream Broadcast"
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Broadcast Timestamp: <strong className="text-white font-mono">{formatTime(currentTimestamp)}</strong></span>
        </div>

        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
        >
          <span>Open on YouTube</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
