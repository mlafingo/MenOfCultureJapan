/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Radio } from 'lucide-react';
import { formatTime } from '../utils/geoInterpolation';

interface YouTubeSyncPlayerProps {
  youtubeId: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  duration?: number;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubeSyncPlayer: React.FC<YouTubeSyncPlayerProps> = ({
  youtubeId,
  currentTime,
  onTimeUpdate,
  isPlaying,
  onPlayStateChange,
  duration = 900,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);
  const [isApiReady, setIsApiReady] = useState<boolean>(false);
  const [internalTime, setInternalTime] = useState<number>(currentTime);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [videoDuration, setVideoDuration] = useState<number>(duration);

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };
  }, []);

  // Initialize or reload player when youtubeId changes
  useEffect(() => {
    if (!isApiReady || !containerRef.current) return;

    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        // ignore
      }
    }

    const playerId = 'yt-player-element';
    let target = document.getElementById(playerId);
    if (!target) {
      target = document.createElement('div');
      target.id = playerId;
      containerRef.current.appendChild(target);
    }

    playerRef.current = new window.YT.Player(playerId, {
      videoId: youtubeId,
      playerVars: {
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: any) => {
          const dur = event.target.getDuration();
          if (dur && dur > 0) setVideoDuration(dur);
          if (currentTime > 0) {
            event.target.seekTo(currentTime, true);
          }
        },
        onStateChange: (event: any) => {
          if (event.data === 1) {
            onPlayStateChange(true);
          } else if (event.data === 2 || event.data === 0) {
            onPlayStateChange(false);
          }
        },
      },
    });

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isApiReady, youtubeId]);

  // High-frequency polling when playing to smoothly animate map marker
  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const t = playerRef.current.getCurrentTime();
          if (typeof t === 'number' && !isNaN(t)) {
            setInternalTime(t);
            onTimeUpdate(t);
          }
        }
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, onTimeUpdate]);

  const handleSeek = (newTime: number) => {
    setInternalTime(newTime);
    onTimeUpdate(newTime);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(newTime, true);
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(nextSpeed);
    }
  };

  return (
    <div className="flex flex-col rounded-[5px] overflow-hidden bg-[#f5f8f7] border border-[#12293c]/15 shadow-xs">
      {/* 16:9 Video Canvas */}
      <div className="relative aspect-video w-full bg-black">
        <div ref={containerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
      </div>

      {/* Scrub bar & Controls in LNReader Style */}
      <div className="p-3 bg-[#eaf0f0] flex flex-col gap-2 border-t border-[#12293c]/10">
        {/* Progress Bar & Timecode Display */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-[#0e7490] tabular-nums">
            {formatTime(internalTime)}
          </span>
          <input
            type="range"
            min={0}
            max={videoDuration}
            step={0.5}
            value={internalTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#cbd7d7] rounded-none appearance-none cursor-pointer accent-[#0e7490] hover:h-2 transition-all"
          />
          <span className="text-xs font-mono text-[#4f6276] tabular-nums">
            {formatTime(videoDuration)}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={togglePlay}
              className="px-3 py-1.5 rounded-[3px] bg-[#0e7490] text-white hover:bg-[#0f5a6a] transition-colors cursor-pointer font-bold text-xs flex items-center gap-1.5 shadow-xs"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>PLAY</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleSeek(Math.max(0, internalTime - 10))}
              className="px-2 py-1.5 rounded-[3px] bg-[#f5f8f7] text-[#172331] hover:bg-[#e7eeee] transition-colors cursor-pointer border border-[#12293c]/15 flex items-center gap-1 text-xs"
              title="Back 10s"
              aria-label="Seek back 10 seconds"
            >
              <RotateCcw className="w-3 h-3 text-[#4f6276]" />
              <span className="font-mono text-[11px]">-10s</span>
            </button>

            <button
              onClick={toggleMute}
              className="p-1.5 rounded-[3px] bg-[#f5f8f7] text-[#172331] hover:bg-[#e7eeee] transition-colors cursor-pointer border border-[#12293c]/15"
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-600" /> : <Volume2 className="w-3.5 h-3.5 text-[#4f6276]" />}
            </button>

            <button
              onClick={cycleSpeed}
              className="px-2 py-1 text-xs font-mono font-semibold rounded-[3px] bg-[#f5f8f7] text-[#0e7490] hover:bg-[#e7eeee] transition-colors cursor-pointer border border-[#12293c]/15"
              title="Playback Rate"
            >
              {playbackSpeed}x
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#4f6276]">
            <Radio className={`w-3.5 h-3.5 ${isPlaying ? 'text-[#0e7490] animate-pulse' : 'text-[#94a8a8]'}`} />
            <span className="hidden sm:inline-block text-[11px] font-medium">
              {isPlaying ? 'GPS SYNCING' : 'READY'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
