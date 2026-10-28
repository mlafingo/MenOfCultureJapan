/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RouteSegment, EasingType } from '../types/journey';
import { formatTime, haversineDistanceKm } from '../utils/geoInterpolation';

interface SegmentTimelineProps {
  segments: RouteSegment[];
  currentTime: number;
  activeSegmentId: string | null;
  onSeek: (time: number) => void;
}

export const SegmentTimeline: React.FC<SegmentTimelineProps> = ({
  segments,
  currentTime,
  activeSegmentId,
  onSeek,
}) => {
  const getPacingBadge = (pacing: EasingType) => {
    switch (pacing) {
      case 'easeIn':
        return {
          label: 'SLOW → FAST (EASE-IN)',
          color: 'text-amber-800 bg-amber-50 border-amber-200',
          desc: 'Starts slow, accelerates towards goal',
        };
      case 'easeOut':
        return {
          label: 'FAST → SLOW (EASE-OUT)',
          color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
          desc: 'Fast start, slows towards destination',
        };
      case 'easeInOut':
        return {
          label: 'SMOOTH (EASE-IN-OUT)',
          color: 'text-cyan-800 bg-cyan-50 border-cyan-200',
          desc: 'Gentle start and gentle deceleration',
        };
      case 'linear':
      default:
        return {
          label: 'STEADY (LINEAR)',
          color: 'text-[#4f6276] bg-[#edf3f3] border-[#12293c]/15',
          desc: 'Uniform constant pacing',
        };
    }
  };

  const calculateTotalDistanceKm = (path: [number, number][]) => {
    let dist = 0;
    for (let i = 0; i < path.length - 1; i++) {
      dist += haversineDistanceKm(path[i], path[i + 1]);
    }
    return dist;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-mono font-bold text-[#4f6276] uppercase tracking-wider">
          WALKING STAGES &amp; PACING CURVES
        </h3>
        <span className="text-xs font-mono text-[#0e7490] font-bold">
          {segments.length} STAGES
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {segments.map((seg, idx) => {
          const isActive = activeSegmentId === seg.id;
          const isPassed = currentTime > seg.timeEnd;
          const badge = getPacingBadge(seg.pacing);
          const distanceKm = calculateTotalDistanceKm(seg.path);
          const distanceStr =
            distanceKm < 1
              ? `${Math.round(distanceKm * 1000)}m`
              : `${distanceKm.toFixed(1)}km`;

          const segDuration = seg.timeEnd - seg.timeStart;
          const segProgress =
            isActive && segDuration > 0
              ? Math.max(0, Math.min(100, ((currentTime - seg.timeStart) / segDuration) * 100))
              : isPassed
              ? 100
              : 0;

          return (
            <div
              key={seg.id}
              onClick={() => onSeek(seg.timeStart)}
              className={`p-3 rounded-[4px] border transition-colors cursor-pointer relative overflow-hidden ${
                isActive
                  ? 'bg-[#0e7490]/5 border-[#0e7490] shadow-xs ring-1 ring-[#0e7490]/30'
                  : 'bg-[#f5f8f7] border-[#12293c]/15 hover:bg-[#eaf0f0]'
              }`}
            >
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 top-0 bg-[#0e7490]/10 pointer-events-none transition-all duration-150"
                  style={{ width: `${segProgress}%` }}
                />
              )}

              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-[2px] flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                      isActive
                        ? 'bg-[#0e7490] text-white'
                        : isPassed
                        ? 'bg-[#cbd7d7] text-[#172331]'
                        : 'bg-[#edf3f3] text-[#4f6276] border border-[#12293c]/15'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm font-bold truncate ${
                          isActive ? 'text-[#0e7490]' : 'text-[#172331]'
                        }`}
                      >
                        {seg.title}
                      </h4>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border ${badge.color}`}
                        title={badge.desc}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {seg.description && (
                      <p className="text-xs text-[#4f6276] mt-1 line-clamp-1">
                        {seg.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 text-right">
                  <span className="text-xs font-mono font-bold text-[#172331] tabular-nums">
                    {formatTime(seg.timeStart)} – {formatTime(seg.timeEnd)}
                  </span>
                  <span className="text-[10px] font-mono text-[#4f6276]">
                    {distanceStr} · {seg.path.length} pts
                  </span>
                </div>
              </div>

              {/* Progress bar line */}
              <div className="w-full bg-[#edf3f3] h-1 rounded-none mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    isActive ? 'bg-[#0e7490]' : isPassed ? 'bg-[#cbd7d7]' : 'bg-transparent'
                  }`}
                  style={{ width: `${segProgress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
