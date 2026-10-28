/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

export type PlaceCategory = 'stay' | 'food' | 'landmark' | 'transit' | 'viewpoint' | 'shop';

export interface PlacePOI {
  id: string;
  name: string;
  category: PlaceCategory;
  coordinates: [number, number]; // [lat, lng]
  videoTimestamp: number; // in seconds
  description: string;
  googleMapsUrl: string;
  address?: string;
  photoUrl?: string;
}

export interface RouteSegment {
  id: string;
  title: string;
  timeStart: number; // in seconds
  timeEnd: number;   // in seconds
  pacing: EasingType; // 'easeIn' represents "slow at first, faster at last"
  description?: string;
  // Ordered sequence of [lat, lng] along the walking/transit path
  path: [number, number][];
}

export interface VlogEpisode {
  id: string;
  dayNumber: number;
  title: string;
  youtubeId: string;
  youtubeUrl: string;
  channelName: string;
  region?: string; // e.g. 'Tokyo' | 'Kyoto & Osaka' | 'Nara' (dynamically derived)
  tags?: string[];
  totalDurationSeconds?: number;
  overview: string;
  segments: RouteSegment[];
  places: PlacePOI[];
}

export interface InterpolatedPosition {
  lat: number;
  lng: number;
  segmentId: string | null;
  segmentTitle: string | null;
  pacing: EasingType;
  progressPercent: number;
  isMoving: boolean;
  bearingDeg: number;
}
