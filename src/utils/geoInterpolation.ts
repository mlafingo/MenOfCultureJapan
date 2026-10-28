/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EasingType, InterpolatedPosition, RouteSegment } from '../types/journey';

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse mm:ss or hh:mm:ss string into total seconds
 */
export function parseTimeString(str: string): number {
  if (!str) return 0;
  const parts = str.trim().split(':').map((p) => parseFloat(p));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

/**
 * Applies easing function to normalize progress [0, 1]
 * 'easeIn' satisfies "slow at first, faster at last"
 */
export function applyEasing(u: number, type: EasingType): number {
  const clamped = Math.max(0, Math.min(1, u));
  switch (type) {
    case 'easeIn':
      // Starts slowly, accelerates towards the end
      return Math.pow(clamped, 2.2);
    case 'easeOut':
      // Fast at first, slows down near destination
      return 1 - Math.pow(1 - clamped, 2.2);
    case 'easeInOut':
      // Slow start, fast middle, slow finish
      return clamped < 0.5
        ? 2 * Math.pow(clamped, 2)
        : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    case 'linear':
    default:
      return clamped;
  }
}

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
export function haversineDistanceKm(c1: [number, number], c2: [number, number]): number {
  const R = 6371; // Earth radius in km
  const lat1 = (c1[0] * Math.PI) / 180;
  const lat2 = (c2[0] * Math.PI) / 180;
  const deltaLat = ((c2[0] - c1[0]) * Math.PI) / 180;
  const deltaLng = ((c2[1] - c1[1]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates bearing angle in degrees from coord 1 to coord 2
 */
export function calculateBearing(c1: [number, number], c2: [number, number]): number {
  const lat1 = (c1[0] * Math.PI) / 180;
  const lat2 = (c2[0] * Math.PI) / 180;
  const deltaLng = ((c2[1] - c1[1]) * Math.PI) / 180;

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

/**
 * Given a polyline path and a normalized progress distance [0..totalDistance],
 * returns the exact interpolated coordinate [lat, lng] and bearing.
 */
function interpolateAlongPolyline(
  path: [number, number][],
  targetFraction: number
): { coord: [number, number]; bearing: number } {
  if (path.length === 0) {
    return { coord: [35.6762, 139.6503], bearing: 0 };
  }
  if (path.length === 1) {
    return { coord: path[0], bearing: 0 };
  }

  // Pre-calculate cumulative lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const len = haversineDistanceKm(path[i], path[i + 1]);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) {
    return { coord: path[0], bearing: 0 };
  }

  const targetDist = Math.max(0, Math.min(1, targetFraction)) * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDist || i === segmentLengths.length - 1) {
      const segFraction = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
      const p1 = path[i];
      const p2 = path[i + 1];
      const lat = p1[0] + (p2[0] - p1[0]) * segFraction;
      const lng = p1[1] + (p2[1] - p1[1]) * segFraction;
      const bearing = calculateBearing(p1, p2);
      return { coord: [lat, lng], bearing };
    }
    accumulated += segLen;
  }

  return {
    coord: path[path.length - 1],
    bearing: calculateBearing(path[path.length - 2], path[path.length - 1]),
  };
}

/**
 * Given the current video time (in seconds) and all segments of the episode,
 * computes the live walking position, active segment, and progress percentage.
 */
export function getInterpolatedPosition(
  currentTimeSeconds: number,
  segments: RouteSegment[]
): InterpolatedPosition {
  if (segments.length === 0) {
    return {
      lat: 35.6762,
      lng: 139.6503,
      segmentId: null,
      segmentTitle: null,
      pacing: 'linear',
      progressPercent: 0,
      isMoving: false,
      bearingDeg: 0,
    };
  }

  // Check if current time falls within an active segment
  for (const seg of segments) {
    if (currentTimeSeconds >= seg.timeStart && currentTimeSeconds <= seg.timeEnd) {
      const duration = seg.timeEnd - seg.timeStart;
      const rawProgress = duration > 0 ? (currentTimeSeconds - seg.timeStart) / duration : 0;
      const easedProgress = applyEasing(rawProgress, seg.pacing);
      const { coord, bearing } = interpolateAlongPolyline(seg.path, easedProgress);

      return {
        lat: coord[0],
        lng: coord[1],
        segmentId: seg.id,
        segmentTitle: seg.title,
        pacing: seg.pacing,
        progressPercent: Math.round(easedProgress * 100),
        isMoving: true,
        bearingDeg: bearing,
      };
    }
  }

  // If time is before the first segment, place at start of first segment
  if (currentTimeSeconds < segments[0].timeStart) {
    const firstCoord = segments[0].path[0] || [35.6762, 139.6503];
    return {
      lat: firstCoord[0],
      lng: firstCoord[1],
      segmentId: null,
      segmentTitle: `Before ${segments[0].title}`,
      pacing: segments[0].pacing,
      progressPercent: 0,
      isMoving: false,
      bearingDeg: 0,
    };
  }

  // Find the most recent segment that ended
  let lastEndedSeg = segments[0];
  for (const seg of segments) {
    if (currentTimeSeconds > seg.timeEnd) {
      lastEndedSeg = seg;
    }
  }

  const lastCoord = lastEndedSeg.path[lastEndedSeg.path.length - 1];
  return {
    lat: lastCoord[0],
    lng: lastCoord[1],
    segmentId: null,
    segmentTitle: `Paused at end of ${lastEndedSeg.title}`,
    pacing: lastEndedSeg.pacing,
    progressPercent: 100,
    isMoving: false,
    bearingDeg: 0,
  };
}
