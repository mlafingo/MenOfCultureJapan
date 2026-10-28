/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { PlacePOI, PlaceCategory } from '../types/journey';
import { formatTime } from '../utils/geoInterpolation';
import { ExternalLink, Play, MapPin, Copy, Check } from 'lucide-react';

interface PlaceCardProps {
  place: PlacePOI;
  isNearTime: boolean;
  onSeek: (time: number) => void;
  onCopyCoord: (id: string, coord: [number, number]) => void;
  isCopied: boolean;
}

const CATEGORY_STYLES: Record<string, string> = {
  stay: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  food: 'bg-amber-50 text-amber-800 border-amber-200',
  landmark: 'bg-pink-50 text-pink-700 border-pink-200',
  transit: 'bg-sky-50 text-sky-700 border-sky-200',
  viewpoint: 'bg-purple-50 text-purple-700 border-purple-200',
  default: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const PlaceCard = React.memo<PlaceCardProps>(({
  place,
  isNearTime,
  onSeek,
  onCopyCoord,
  isCopied,
}) => {
  const badgeStyle = CATEGORY_STYLES[place.category] || CATEGORY_STYLES.default;

  return (
    <div
      className={`p-3 rounded-[4px] border flex flex-col justify-between gap-2.5 transition-colors ${
        isNearTime
          ? 'bg-[#0e7490]/5 border-[#0e7490] shadow-xs ring-1 ring-[#0e7490]/30'
          : 'bg-[#f5f8f7] border-[#12293c]/15 hover:border-[#12293c]/30'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span
            className={`text-[9.5px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] border ${badgeStyle}`}
          >
            {place.category}
          </span>
          <span className="text-xs font-mono text-[#0e7490] font-bold tabular-nums">
            @ {formatTime(place.videoTimestamp)}
          </span>
        </div>

        <h4 className="text-sm font-bold text-[#172331] mb-1 leading-snug">
          {place.name}
        </h4>

        <p className="text-xs text-[#4f6276] leading-relaxed line-clamp-2">
          {place.description}
        </p>

        {place.address && (
          <p className="text-[11px] text-[#4f6276]/80 mt-1.5 flex items-center gap-1 truncate font-mono">
            <MapPin className="w-3 h-3 shrink-0 text-[#4f6276]" />
            <span>{place.address}</span>
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#12293c]/10">
        <button
          onClick={() => onSeek(place.videoTimestamp)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[3px] bg-[#edf3f3] hover:bg-[#e7eeee] text-[#172331] border border-[#12293c]/15 transition-colors cursor-pointer"
        >
          <Play className="w-3 h-3 fill-current text-[#0e7490]" />
          <span>PLAY</span>
        </button>

        <a
          href={place.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[3px] bg-[#0e7490] hover:bg-[#0f5a6a] text-white transition-colors shadow-xs"
        >
          <span>MAPS</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        <button
          onClick={() => onCopyCoord(place.id, place.coordinates)}
          className="p-1.5 rounded-[3px] bg-[#edf3f3] hover:bg-[#e7eeee] text-[#4f6276] hover:text-[#172331] border border-[#12293c]/15 transition-colors cursor-pointer"
          title="Copy Lat, Lng coordinates"
          aria-label="Copy coordinates"
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
});

PlaceCard.displayName = 'PlaceCard';

const CATEGORIES = [
  { id: 'all', label: 'ALL STOPS' },
  { id: 'stay', label: 'HOTELS' },
  { id: 'food', label: 'FOOD & RAMEN' },
  { id: 'landmark', label: 'LANDMARKS' },
  { id: 'viewpoint', label: 'VIEWPOINTS' },
  { id: 'transit', label: 'STATIONS' },
] as const;

interface PlacesListProps {
  places: PlacePOI[];
  currentTime: number;
  onSeek: (time: number) => void;
}

export const PlacesList: React.FC<PlacesListProps> = React.memo(({
  places,
  currentTime,
  onSeek,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPlaces = useMemo(() => {
    return selectedCategory === 'all'
      ? places
      : places.filter((p) => p.category === selectedCategory);
  }, [places, selectedCategory]);

  const handleCopyCoord = useCallback((id: string, coord: [number, number]) => {
    navigator.clipboard.writeText(`${coord[0].toFixed(5)}, ${coord[1].toFixed(5)}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Category filter segmented bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-[3px] whitespace-nowrap transition-colors cursor-pointer border ${
              selectedCategory === c.id
                ? 'bg-[#0e7490] text-white border-[#0f5a6a] font-bold shadow-xs'
                : 'bg-[#f5f8f7] text-[#4f6276] hover:text-[#172331] hover:bg-[#e7eeee] border-[#12293c]/15'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Places Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredPlaces.map((place) => {
          const isNearTime = Math.abs(currentTime - place.videoTimestamp) <= 15;
          return (
            <PlaceCard
              key={place.id}
              place={place}
              isNearTime={isNearTime}
              onSeek={onSeek}
              onCopyCoord={handleCopyCoord}
              isCopied={copiedId === place.id}
            />
          );
        })}
      </div>
    </div>
  );
});

PlacesList.displayName = 'PlacesList';
