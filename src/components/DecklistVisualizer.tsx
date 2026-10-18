'use client';

import React, { useState } from 'react';
import { Copy, Check, ExternalLink, List, Grid } from 'lucide-react';
import { formatForPTCGL, parseDecklist, getCardImageUrl } from '@/lib/ptcgl';

interface DecklistVisualizerProps {
  playerName: string;
  archetypeName: string;
  decklist?: string[] | null;
  limitlessUrl?: string;
}

export function DecklistVisualizer({
  playerName,
  archetypeName,
  decklist,
  limitlessUrl,
}: DecklistVisualizerProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'text'>('grid');

  if (!decklist || decklist.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
        No decklist registered for {playerName} in this tournament.
      </div>
    );
  }

  const parsed = parseDecklist(decklist);
  const totalCards = parsed.reduce((sum, c) => sum + c.count, 0);

  const handleCopyPTCGL = async () => {
    const formatted = formatForPTCGL(decklist);
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      console.warn('Clipboard write failed');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Header bar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">
            {playerName}&apos;s {archetypeName ? `${archetypeName} ` : ''}Deck
          </span>
          <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
            {totalCards} Cards
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-300/60">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visual Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('text')}
              className={`p-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'text' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Text View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Copy for PTCGL */}
          <button
            type="button"
            onClick={handleCopyPTCGL}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
              copied
                ? 'bg-green-50 text-green-700 border-green-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy for PTCGL</span>
              </>
            )}
          </button>

          {limitlessUrl && (
            <a
              href={limitlessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              title="View on Limitless TCG"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Body content */}
      <div className="p-4">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {parsed.map((card, idx) => {
              const imgUrl = getCardImageUrl(card.set, card.number);
              return (
                <div
                  key={`${card.set}-${card.number}-${idx}`}
                  className="relative group bg-slate-100 border border-slate-200 rounded-lg p-1.5 flex flex-col items-center justify-between text-center aspect-[2.5/3.5] hover:border-slate-400 transition-all"
                >
                  <div className="absolute top-1 left-1 bg-slate-900/90 text-white font-extrabold text-[11px] px-1.5 py-0.2 rounded-md z-10 shadow-xs">
                    {card.count}×
                  </div>

                  {/* Card image preview */}
                  <div className="w-full flex-1 relative flex items-center justify-center overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={`${card.set} ${card.number}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback text if card scan not on CDN
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="text-[11px] font-bold text-slate-600 p-1">
                      {card.set} {card.number}
                    </div>
                  </div>

                  <div className="w-full text-[10px] text-slate-500 truncate mt-1 font-mono">
                    {card.set} {card.number}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto text-slate-800 leading-relaxed">
            {formatForPTCGL(decklist)}
          </pre>
        )}
      </div>
    </div>
  );
}
