/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { JAPAN_VLOGS_DATA } from './data/japanVlogsData';
import { getInterpolatedPosition, formatTime } from './utils/geoInterpolation';
import { YouTubeSyncPlayer } from './components/YouTubeSyncPlayer';
import { JourneyMap } from './components/JourneyMap';
import { SegmentTimeline } from './components/SegmentTimeline';
import { PlacesList } from './components/PlacesList';
import {
  Compass,
  MapPin,
  ExternalLink,
  Film,
  Search,
  X,
  Play,
} from 'lucide-react';

// Static precomputed structures for 16-day series (O(1) lookups and zero recomputation)
const EPISODES = JAPAN_VLOGS_DATA;
const TOTAL_DAYS = EPISODES.length;
const EPISODES_BY_ID = new Map(EPISODES.map((e) => [e.id, e]));
const AVAILABLE_REGIONS = [
  'ALL',
  ...Array.from(new Set(EPISODES.map((e) => e.region).filter((r): r is string => Boolean(r)))),
];
const TOTAL_STOPS_COUNT = EPISODES.reduce((acc, ep) => acc + ep.places.length, 0);

export default function App() {
  const [activeEpisodeId, setActiveEpisodeId] = useState<string>('ep-01');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'places' | 'timeline'>('places');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [isPlaylistDrawerOpen, setIsPlaylistDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active episode object (O(1) lookup)
  const currentEpisode = useMemo(() => {
    return EPISODES_BY_ID.get(activeEpisodeId) || EPISODES[0];
  }, [activeEpisodeId]);

  // Calculate episode duration dynamically
  const episodeDuration = useMemo(() => {
    if (currentEpisode.totalDurationSeconds && currentEpisode.totalDurationSeconds > 0) {
      return currentEpisode.totalDurationSeconds;
    }
    const maxSeg = currentEpisode.segments.reduce((acc, s) => Math.max(acc, s.timeEnd), 0);
    const maxPlace = currentEpisode.places.reduce((acc, p) => Math.max(acc, p.videoTimestamp), 0);
    return Math.max(maxSeg, maxPlace, 900);
  }, [currentEpisode]);

  // Compute live interpolated GPS position
  const currentPosition = useMemo(() => {
    return getInterpolatedPosition(currentTime, currentEpisode.segments);
  }, [currentTime, currentEpisode.segments]);

  // Switch episode
  const handleSelectEpisode = React.useCallback((epId: string) => {
    setActiveEpisodeId(epId);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsPlaylistDrawerOpen(false);
  }, []);

  const handleSeek = React.useCallback((newTime: number) => {
    setCurrentTime(newTime);
  }, []);

  // Filter episodes dynamically based on region tag and search
  const filteredEpisodes = useMemo(() => {
    let list = EPISODES;
    if (selectedRegion !== 'ALL') {
      list = EPISODES.filter((e) => e.region === selectedRegion);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.overview.toLowerCase().includes(q) ||
          e.places.some((p) => p.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [selectedRegion, searchQuery]);

  return (
    <div className="min-h-screen bg-[#edf3f3] text-[#172331] flex flex-col font-sans">
      {/* LNReader Style Sharp Header with authentic lnreader.app colors */}
      <header className="sticky top-0 z-50 bg-[#f5f8f7]/95 backdrop-blur-md border-b border-[#12293c]/15 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-xs">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-[4px] bg-[#0e7490] text-white flex items-center justify-center font-bold shadow-xs">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-[#172331] uppercase">
                MoC in Japan
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] bg-[#0e7490]/10 text-[#0e7490] border border-[#0e7490]/25 font-bold">
                {TOTAL_DAYS} DAYS
              </span>
            </div>
            <span className="text-[11px] text-[#4f6276] font-mono hidden sm:block">
              Synchronized GPS Tracking &amp; Google Maps Places
            </span>
          </div>
        </div>

        {/* Region Filter Segmented Bar (Dynamically populated from data) */}
        <div className="hidden md:flex items-center gap-1 bg-[#eaf0f0] p-1 rounded-[4px] border border-[#12293c]/15 text-xs font-mono font-semibold">
          {AVAILABLE_REGIONS.map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-2.5 py-1 rounded-[3px] transition-colors cursor-pointer uppercase ${
                selectedRegion === region
                  ? 'bg-[#0e7490] text-white font-bold shadow-xs'
                  : 'text-[#4f6276] hover:text-[#172331] hover:bg-[#e7eeee]'
              }`}
            >
              {region} {region === 'ALL' ? `(${TOTAL_DAYS})` : ''}
            </button>
          ))}
        </div>

        {/* Actions (Catalog) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsPlaylistDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-[#f5f8f7] hover:bg-[#e7eeee] text-[#172331] text-xs font-mono font-semibold transition-colors cursor-pointer border border-[#12293c]/15 shadow-xs"
          >
            <Film className="w-3.5 h-3.5 text-[#0e7490]" />
            <span>DAYS ({TOTAL_DAYS})</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1540px] w-full mx-auto p-3 sm:p-4 lg:p-5 flex flex-col gap-3">
        {/* LNReader Horizontal Episode Selector Bar */}
        <div className="flex items-center gap-2 p-2 rounded-[5px] bg-[#f5f8f7] border border-[#12293c]/15 overflow-hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none w-full">
            <span className="text-[10px] font-mono font-bold text-[#4f6276] uppercase tracking-wider pl-1 pr-1 shrink-0">
              DAYS:
            </span>
            {filteredEpisodes.map((ep) => {
              const isSelected = activeEpisodeId === ep.id;
              return (
                <button
                  key={ep.id}
                  onClick={() => handleSelectEpisode(ep.id)}
                  className={`px-2.5 py-1 rounded-[3px] text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border font-mono ${
                    isSelected
                      ? 'bg-[#0e7490] text-white font-bold border-[#0f5a6a] shadow-xs'
                      : 'bg-[#edf3f3] text-[#172331] hover:text-[#0e7490] hover:bg-[#e7eeee] border-[#12293c]/15'
                  }`}
                >
                  <span
                    className={`px-1 py-0.2 rounded-[2px] text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-[#eaf0f0] text-[#0e7490]'
                    }`}
                  >
                    D{ep.dayNumber.toString().padStart(2, '0')}
                  </span>
                  <span className="truncate max-w-[130px] sm:max-w-[180px] font-sans font-medium text-xs">
                    {ep.title.replace(/ - MoC in Japan.*/, '').replace(/ \| MoC in Japan.*/, '').replace(/ \| Moc in Japan.*/, '')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Left Column (5 Cols): Video, Live HUD & Stopping Places */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* YouTube Player */}
            <YouTubeSyncPlayer
              youtubeId={currentEpisode.youtubeId}
              currentTime={currentTime}
              onTimeUpdate={handleSeek}
              isPlaying={isPlaying}
              onPlayStateChange={setIsPlaying}
              duration={episodeDuration}
            />

            {/* Live GPS & Walk Speed HUD */}
            <div className="p-3.5 rounded-[5px] bg-[#f5f8f7] border border-[#12293c]/15 flex flex-col gap-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-none bg-[#0e7490] animate-pulse" />
                  <span className="text-[#4f6276] font-mono text-[11px] font-bold uppercase">
                    GPS COORDINATES
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${currentPosition.lat},${currentPosition.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[#0e7490] hover:text-[#0f5a6a] hover:underline flex items-center gap-1 font-bold text-xs tabular-nums"
                  title="Open live coordinate in Google Maps"
                >
                  <span>{currentPosition.lat.toFixed(5)}, {currentPosition.lng.toFixed(5)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-between gap-3 p-2.5 rounded-[3px] bg-[#edf3f3] border border-[#12293c]/15">
                <div className="min-w-0">
                  <div className="text-[10px] text-[#4f6276] font-mono uppercase tracking-wider font-bold">
                    CURRENT STAGE
                  </div>
                  <div className="text-xs font-bold text-[#172331] truncate mt-0.5">
                    {currentPosition.segmentTitle || 'Stationary / Previewing'}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] text-[#4f6276] font-mono uppercase tracking-wider font-bold">
                    PACING CURVE
                  </div>
                  <div className="text-[11px] font-mono font-bold text-[#0e7490] bg-[#0e7490]/10 px-2 py-0.5 rounded-[2px] border border-[#0e7490]/25 inline-block mt-0.5">
                    {currentPosition.pacing === 'easeIn'
                      ? 'SLOW → FAST (EASE-IN)'
                      : currentPosition.pacing === 'easeOut'
                      ? 'FAST → SLOW (EASE-OUT)'
                      : 'UNIFORM PACING'}
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#4f6276] leading-relaxed font-normal">
                {currentEpisode.overview}
              </p>
            </div>

            {/* Tabs for Places / Timeline */}
            <div className="flex items-center gap-1 p-1 bg-[#f5f8f7] rounded-[5px] border border-[#12293c]/15 font-mono">
              <button
                onClick={() => setActiveTab('places')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-[3px] transition-colors cursor-pointer ${
                  activeTab === 'places'
                    ? 'bg-[#0e7490] text-white shadow-xs'
                    : 'text-[#4f6276] hover:text-[#172331]'
                }`}
              >
                VISITED STOPS ({currentEpisode.places.length})
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-[3px] transition-colors cursor-pointer ${
                  activeTab === 'timeline'
                    ? 'bg-[#0e7490] text-white shadow-xs'
                    : 'text-[#4f6276] hover:text-[#172331]'
                }`}
              >
                WALK STAGES ({currentEpisode.segments.length})
              </button>
            </div>

            {/* Tab Body */}
            {activeTab === 'places' ? (
              <PlacesList
                places={currentEpisode.places}
                currentTime={currentTime}
                onSeek={handleSeek}
              />
            ) : (
              <SegmentTimeline
                segments={currentEpisode.segments}
                currentTime={currentTime}
                activeSegmentId={currentPosition.segmentId}
                onSeek={handleSeek}
              />
            )}
          </div>

          {/* Right Column (7 Cols): Interactive Leaflet Map & Visited Stops Cards */}
          <div className="lg:col-span-7 flex flex-col gap-3 lg:sticky lg:top-16">
            {/* Map Container */}
            <div className="h-[540px] lg:h-[640px] w-full">
              <JourneyMap
                currentPosition={currentPosition}
                segments={currentEpisode.segments}
                places={currentEpisode.places}
                currentTime={currentTime}
                onSeek={handleSeek}
              />
            </div>

            {/* Visited Places Strip with Google Maps Buttons */}
            <div className="p-3.5 rounded-[5px] bg-[#f5f8f7] border border-[#12293c]/15 flex flex-col gap-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#172331] flex items-center gap-1.5 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-[#0e7490]" />
                  <span>DAY {currentEpisode.dayNumber} LOCATIONS (DIRECT GOOGLE MAPS)</span>
                </span>
                <span className="text-[11px] text-[#4f6276] font-mono">
                  {currentEpisode.places.length} LOCATIONS
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {currentEpisode.places.map((place) => (
                  <div
                    key={place.id}
                    className="p-2.5 rounded-[3px] bg-[#edf3f3] border border-[#12293c]/15 flex flex-col justify-between gap-2 hover:border-[#0e7490]/40 transition-colors"
                  >
                    <div>
                      <div className="text-[10px] uppercase font-mono font-bold text-[#4f6276] tracking-wider">
                        {place.category} · {formatTime(place.videoTimestamp)}
                      </div>
                      <div className="text-xs font-bold text-[#172331] truncate mt-0.5" title={place.name}>
                        {place.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-[#12293c]/10">
                      <button
                        onClick={() => handleSeek(place.videoTimestamp)}
                        className="flex-1 py-1 px-1.5 rounded-[2px] bg-[#f5f8f7] hover:bg-[#e7eeee] text-[11px] font-semibold text-[#172331] transition-colors flex items-center justify-center gap-1 border border-[#12293c]/15 cursor-pointer"
                        title="Seek video to this place"
                      >
                        <Play className="w-2.5 h-2.5 fill-current text-[#0e7490]" />
                        <span>Seek</span>
                      </button>
                      <a
                        href={place.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1 px-1.5 rounded-[2px] bg-[#0e7490] hover:bg-[#0f5a6a] text-[11px] font-bold text-white transition-colors flex items-center justify-center gap-1 shadow-xs"
                        title="Open in Google Maps"
                      >
                        <span>Maps</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>



      {/* LNReader Style Episode Catalog Modal */}
      {isPlaylistDrawerOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-5 bg-[#172331]/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl max-h-[88vh] bg-[#f5f8f7] border border-[#12293c]/20 rounded-[5px] shadow-2xl flex flex-col overflow-hidden text-[#172331]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#12293c]/15 bg-[#eaf0f0]">
              <div>
                <h2 className="text-base font-bold text-[#172331] flex items-center gap-2 font-mono">
                  <Film className="w-4 h-4 text-[#0e7490]" />
                  <span>EPISODE CATALOG ({TOTAL_DAYS} DAYS)</span>
                </h2>
                <p className="text-xs text-[#4f6276] mt-0.5">
                  Select any day to synchronize its route and explore verified stops.
                </p>
              </div>

              <button
                onClick={() => setIsPlaylistDrawerOpen(false)}
                className="p-1 rounded-[3px] text-[#4f6276] hover:text-[#172331] hover:bg-[#e7eeee] transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-5 py-2.5 border-b border-[#12293c]/15 bg-[#edf3f3]">
              <div className="relative">
                <Search className="w-4 h-4 text-[#4f6276] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter days, places, or landmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[3px] bg-[#f5f8f7] border border-[#12293c]/15 text-[#172331] placeholder:text-[#4f6276]/60 focus:outline-none focus:border-[#0e7490]"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#edf3f3]">
              {filteredEpisodes.map((ep) => {
                const isSelected = activeEpisodeId === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => handleSelectEpisode(ep.id)}
                    className={`p-3 rounded-[3px] border flex items-start gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#0e7490]/10 border-[#0e7490] shadow-xs ring-1 ring-[#0e7490]/30'
                        : 'bg-[#f5f8f7] border-[#12293c]/15 hover:border-[#12293c]/30 hover:bg-[#eaf0f0]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-[3px] bg-[#edf3f3] border border-[#12293c]/15 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] text-[#0e7490] font-bold font-mono uppercase">DAY</span>
                      <span className="text-sm font-extrabold text-[#172331] font-mono leading-none">
                        {ep.dayNumber}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-[#172331] leading-snug truncate">
                        {ep.title}
                      </h3>
                      <p className="text-[11px] text-[#4f6276] line-clamp-2 mt-1">
                        {ep.overview}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#4f6276] font-mono">
                        <span>{ep.segments.length} STAGES</span>
                        <span>·</span>
                        <span className="text-[#0e7490] font-semibold">{ep.places.length} GOOGLE STOPS</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-[#12293c]/15 bg-[#eaf0f0] flex items-center justify-between text-xs text-[#4f6276] font-mono">
              <div className="flex items-center gap-3">
                <span>{TOTAL_DAYS} EPISODES · {TOTAL_STOPS_COUNT}+ GOOGLE STOPS</span>
              </div>
              <button
                onClick={() => setIsPlaylistDrawerOpen(false)}
                className="px-3 py-1 rounded-[3px] bg-[#0e7490] hover:bg-[#0f5a6a] text-white font-bold transition-colors cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
