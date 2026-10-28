/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { InterpolatedPosition, PlacePOI, RouteSegment } from '../types/journey';
import { formatTime } from '../utils/geoInterpolation';
import { Locate, Navigation, Layers, ExternalLink, Play } from 'lucide-react';

interface JourneyMapProps {
  currentPosition: InterpolatedPosition;
  segments: RouteSegment[];
  places: PlacePOI[];
  currentTime: number;
  onSeek: (timeSeconds: number) => void;
}

export const JourneyMap: React.FC<JourneyMapProps> = ({
  currentPosition,
  segments,
  places,
  currentTime,
  onSeek,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylinesRef = useRef<{ [segId: string]: L.Polyline }>({});
  const poiMarkersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [mapStyle, setMapStyle] = useState<'streets' | 'dark' | 'satellite'>('streets');

  // Tile layers definition
  const TILE_URLS = {
    streets: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  const ATTRIBUTIONS = {
    streets: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    dark: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    satellite: 'Tiles &copy; Esri',
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = currentPosition.lat || 35.6762;
    const initialLng = currentPosition.lng || 139.6503;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    tileLayerRef.current = L.tileLayer(TILE_URLS.streets, {
      attribution: ATTRIBUTIONS.streets,
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Tile Layer when style changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    tileLayerRef.current = L.tileLayer(TILE_URLS[mapStyle], {
      attribution: ATTRIBUTIONS[mapStyle],
      maxZoom: 19,
    }).addTo(mapRef.current);
  }, [mapStyle]);

  // Render Route Segments
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing polylines
    Object.values(polylinesRef.current).forEach((p) => p.remove());
    polylinesRef.current = {};

    segments.forEach((seg) => {
      const isCurrent = currentPosition.segmentId === seg.id;
      const polyline = L.polyline(seg.path, {
        color: isCurrent ? '#0e7490' : '#64748b',
        weight: isCurrent ? 5 : 3,
        opacity: isCurrent ? 0.95 : 0.6,
        dashArray: isCurrent ? undefined : '5, 5',
      }).addTo(mapRef.current!);

      polyline.on('click', () => {
        onSeek(seg.timeStart);
      });

      polyline.bindTooltip(
        `<span style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;color:#172331;">${seg.title}</span><br/><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#4f6276;">${formatTime(seg.timeStart)} - ${formatTime(seg.timeEnd)}</span>`,
        { sticky: true }
      );

      polylinesRef.current[seg.id] = polyline;
    });

    // Fit bounds on route change
    const allCoords = segments.flatMap((s) => s.path);
    if (allCoords.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(allCoords);
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [segments]);

  // Update active segment styles dynamically
  useEffect(() => {
    segments.forEach((seg) => {
      const polyline = polylinesRef.current[seg.id];
      if (polyline) {
        const isCurrent = currentPosition.segmentId === seg.id;
        polyline.setStyle({
          color: isCurrent ? '#0e7490' : '#64748b',
          weight: isCurrent ? 6 : 3,
          opacity: isCurrent ? 1 : 0.5,
          dashArray: isCurrent ? undefined : '5, 5',
        });
      }
    });
  }, [currentPosition.segmentId]);

  // Render POI Place Markers (LNReader sharp square tag badges)
  useEffect(() => {
    if (!mapRef.current) return;

    poiMarkersRef.current.forEach((m) => m.remove());
    poiMarkersRef.current = [];

    places.forEach((poi) => {
      const getCategoryBadge = (cat: string) => {
        switch (cat) {
          case 'stay':
            return {
              color: '#4f46e5',
              svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>',
            };
          case 'food':
            return {
              color: '#d97706',
              svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v18"/><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/></svg>',
            };
          case 'landmark':
            return {
              color: '#db2777',
              svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#db2777" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>',
            };
          case 'transit':
            return {
              color: '#0284c7',
              svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/></svg>',
            };
          case 'viewpoint':
            return {
              color: '#7c3aed',
              svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
            };
          default:
            return {
              color: '#059669',
              svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
            };
        }
      };

      const badge = getCategoryBadge(poi.category);

      // Sharp LNReader style square badge with subtle 4px border radius
      const html = `
        <div style="background-color: #f5f8f7; border: 1.5px solid ${badge.color}; border-radius: 4px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(18, 41, 60, 0.18); cursor: pointer; transition: transform 0.15s ease;">
          ${badge.svg}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-poi-marker',
        html,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
      });

      const marker = L.marker(poi.coordinates, { icon: customIcon }).addTo(mapRef.current!);

      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-0 text-[#172331]';
      popupDiv.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:4px;">
          <span style="background:${badge.color}18; color:${badge.color}; border:1px solid ${badge.color}40; padding:2px 6px; border-radius:3px; font-size:10px; font-family:'JetBrains Mono',monospace; font-weight:700; text-transform:uppercase;">
            ${poi.category}
          </span>
          <span style="font-family:'JetBrains Mono',monospace; font-size:11px; color:#4f6276; font-weight:600;">
            @ ${formatTime(poi.videoTimestamp)}
          </span>
        </div>
        <div style="font-weight:700; font-size:13.5px; margin-bottom:4px; color:#172331; font-family:'Space Grotesk',sans-serif;">
          ${poi.name}
        </div>
        <div style="font-size:12px; color:#4f6276; margin-bottom:10px; line-height:1.4; font-family:'Space Grotesk',sans-serif;">
          ${poi.description}
        </div>
        <div style="display:flex; gap:6px;">
          <button id="poi-jump-${poi.id}" style="flex:1; display:inline-flex; align-items:center; justify-content:center; gap:5px; padding:6px 8px; background:#edf3f3; color:#172331; border:1px solid rgba(18,41,60,0.18); border-radius:3px; font-size:11px; font-weight:700; cursor:pointer; font-family:'Space Grotesk',sans-serif; letter-spacing:0.4px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#0e7490" stroke="#0e7490" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            <span>PLAY</span>
          </button>
          <a href="${poi.googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="flex:1; display:inline-flex; align-items:center; justify-content:center; gap:5px; padding:6px 8px; background:#0e7490; color:#ffffff; border:1px solid #0f5a6a; border-radius:3px; font-size:11px; font-weight:700; text-decoration:none; font-family:'Space Grotesk',sans-serif; letter-spacing:0.4px;">
            <span>MAPS</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      `;

      marker.bindPopup(popupDiv);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`poi-jump-${poi.id}`);
        if (btn) {
          btn.onclick = () => {
            onSeek(poi.videoTimestamp);
          };
        }
      });

      poiMarkersRef.current.push(marker);
    });
  }, [places, onSeek]);

  // Live GPS Cursor Update
  useEffect(() => {
    if (!mapRef.current) return;

    const { lat, lng, bearingDeg } = currentPosition;

    if (!markerRef.current) {
      const cursorHtml = `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 4px; background: rgba(14, 116, 144, 0.2); border: 1px solid rgba(14, 116, 144, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 20px; height: 20px; border-radius: 4px; background: #0e7490; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(14, 116, 144, 0.4); display: flex; align-items: center; justify-content: center; transform: rotate(${bearingDeg}deg); transition: transform 0.15s linear;">
            <div style="width: 0; height: 0; border-left: 3px solid transparent; border-right: 3px solid transparent; border-bottom: 6px solid #ffffff; margin-top: -1px;"></div>
          </div>
        </div>
      `;

      const cursorIcon = L.divIcon({
        className: 'gps-cursor-marker',
        html: cursorHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      markerRef.current = L.marker([lat, lng], { icon: cursorIcon, zIndexOffset: 1000 }).addTo(
        mapRef.current
      );
    } else {
      markerRef.current.setLatLng([lat, lng]);

      const el = markerRef.current.getElement();
      if (el) {
        const arrow = el.querySelector('div > div:nth-child(2)') as HTMLElement;
        if (arrow) {
          arrow.style.transform = `rotate(${bearingDeg}deg)`;
        }
      }
    }

    if (autoFollow && mapRef.current) {
      const center = mapRef.current.getCenter();
      const distMeters = center.distanceTo([lat, lng]);
      // Only trigger pan animation if moved by more than 10 meters to prevent frame drops
      if (distMeters > 10) {
        mapRef.current.panTo([lat, lng], { animate: true, duration: 0.35 });
      }
    }
  }, [currentPosition, autoFollow]);

  const fitAllRoute = () => {
    if (!mapRef.current) return;
    const allCoords = segments.flatMap((s) => s.path);
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-[5px] overflow-hidden border border-[#12293c]/15 bg-[#f5f8f7] shadow-xs flex flex-col">
      {/* Top Map HUD & Controls in LNReader Style */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex items-center justify-between pointer-events-none gap-2">
        {/* Active Stage & Coordinates Banner */}
        <div className="pointer-events-auto flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] bg-[#f5f8f7]/95 backdrop-blur-md border border-[#12293c]/15 shadow-xs text-xs">
          <span className="w-2 h-2 rounded-none bg-[#0e7490] rotate-45 animate-pulse" />
          <span className="font-semibold text-[#172331] truncate max-w-[170px] sm:max-w-[240px]">
            {currentPosition.segmentTitle || 'Route Overview'}
          </span>
          <span className="text-[#0e7490] font-mono text-[11px] font-bold border-l border-[#12293c]/15 pl-2">
            {currentPosition.progressPercent}%
          </span>
        </div>

        {/* Map Control Buttons */}
        <div className="pointer-events-auto flex items-center gap-1 bg-[#f5f8f7]/95 backdrop-blur-md p-1 rounded-[3px] border border-[#12293c]/15 shadow-xs">
          <button
            onClick={() => setAutoFollow(!autoFollow)}
            className={`p-1.5 rounded-[3px] transition-colors cursor-pointer text-xs flex items-center gap-1 ${
              autoFollow
                ? 'bg-[#0e7490] text-white font-bold'
                : 'text-[#4f6276] hover:bg-[#edf3f3] hover:text-[#172331]'
            }`}
            title={autoFollow ? 'Auto-Follow: ON' : 'Auto-Follow: OFF'}
            aria-label="Toggle auto follow GPS"
          >
            <Locate className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono text-[10px]">FOLLOW</span>
          </button>

          <button
            onClick={fitAllRoute}
            className="p-1.5 rounded-[3px] text-[#4f6276] hover:bg-[#edf3f3] hover:text-[#172331] transition-colors cursor-pointer flex items-center gap-1 text-xs"
            title="Fit Entire Route"
            aria-label="Fit entire route"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono text-[10px]">BOUNDS</span>
          </button>

          {/* Style Selector */}
          <div className="flex items-center gap-0.5 border-l border-[#12293c]/15 pl-1">
            <button
              onClick={() => setMapStyle('streets')}
              className={`px-2 py-0.5 text-[11px] rounded-[3px] transition-colors cursor-pointer font-mono font-medium ${
                mapStyle === 'streets'
                  ? 'bg-[#0e7490]/15 text-[#0e7490] font-bold border border-[#0e7490]/30'
                  : 'text-[#4f6276] hover:text-[#172331]'
              }`}
            >
              MAP
            </button>
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-2 py-0.5 text-[11px] rounded-[3px] transition-colors cursor-pointer font-mono font-medium ${
                mapStyle === 'dark'
                  ? 'bg-[#0e7490]/15 text-[#0e7490] font-bold border border-[#0e7490]/30'
                  : 'text-[#4f6276] hover:text-[#172331]'
              }`}
            >
              DARK
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`px-2 py-0.5 text-[11px] rounded-[3px] transition-colors cursor-pointer font-mono font-medium ${
                mapStyle === 'satellite'
                  ? 'bg-[#0e7490]/15 text-[#0e7490] font-bold border border-[#0e7490]/30'
                  : 'text-[#4f6276] hover:text-[#172331]'
              }`}
            >
              SAT
            </button>
          </div>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* Bottom Technical Route Legend */}
      <div className="absolute bottom-2.5 left-2.5 z-[1000] pointer-events-auto bg-[#f5f8f7]/95 backdrop-blur-md px-2.5 py-1 rounded-[3px] border border-[#12293c]/15 shadow-xs text-[10px] text-[#4f6276] flex items-center gap-3 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-[#0e7490]" />
          <span className="font-semibold text-[#0e7490]">ACTIVE PATH</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-[#94a3b8] border-b border-dashed border-[#94a3b8]" />
          <span>FULL ROUTE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-[#db2777] rounded-none rotate-45" />
          <span>GOOGLE STOP</span>
        </div>
      </div>
    </div>
  );
};
