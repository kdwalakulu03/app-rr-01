// ─── RecordingControls — floating bottom bar for live recording ───
import {
  Play, Pause, Square, MapPin, Clock, Navigation2, Activity,
} from 'lucide-react';
import type { RecordingState } from './useGeolocation';

interface Props {
  state: RecordingState;
  elapsedMs: number;
  distanceKm: number;
  speed: number | null;    // m/s
  accuracy: number | null;
  trackPointCount: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDropPin: () => void;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function formatSpeed(mps: number | null): string {
  if (mps === null || mps <= 0) return '—';
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

export default function RecordingControls({
  state, elapsedMs, distanceKm, speed, accuracy, trackPointCount,
  onStart, onPause, onResume, onStop, onDropPin,
}: Props) {
  const isIdle = state === 'idle';
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
      {/* Stats bar — only show when recording or paused */}
      {(isRecording || isPaused) && (
        <div className="bg-surface-card/90 backdrop-blur-md rounded-2xl px-5 py-3 shadow-xl border border-line flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5 text-content-body">
            <Clock className="w-4 h-4 text-primary-500" />
            <span className="font-mono font-semibold tabular-nums">{formatDuration(elapsedMs)}</span>
          </div>
          <div className="w-px h-5 bg-line" />
          <div className="flex items-center gap-1.5 text-content-body">
            <Navigation2 className="w-4 h-4 text-emerald-500" />
            <span className="font-mono font-semibold">{formatDistance(distanceKm)}</span>
          </div>
          <div className="w-px h-5 bg-line" />
          <div className="flex items-center gap-1.5 text-content-body">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="font-mono font-semibold">{formatSpeed(speed)}</span>
          </div>
          {accuracy !== null && (
            <>
              <div className="w-px h-5 bg-line" />
              <div className="flex items-center gap-1.5 text-content-muted text-xs">
                ±{Math.round(accuracy)}m
              </div>
            </>
          )}
          <div className="w-px h-5 bg-line" />
          <div className="text-content-muted text-xs">
            {trackPointCount} pts
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {isIdle && (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-lg transition-colors"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Recording
          </button>
        )}

        {isRecording && (
          <>
            <button
              onClick={onDropPin}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-card/90 backdrop-blur-md border border-line shadow-lg hover:bg-surface-hover transition-colors"
              title="Drop pin"
            >
              <MapPin className="w-5 h-5 text-primary-500" />
            </button>
            <button
              onClick={onPause}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg transition-colors"
              title="Pause"
            >
              <Pause className="w-6 h-6 fill-current" />
            </button>
            <button
              onClick={onStop}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
              title="Stop"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={onDropPin}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-card/90 backdrop-blur-md border border-line shadow-lg hover:bg-surface-hover transition-colors"
              title="Drop pin"
            >
              <MapPin className="w-5 h-5 text-primary-500" />
            </button>
            <button
              onClick={onResume}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-colors"
              title="Resume"
            >
              <Play className="w-6 h-6 fill-current" />
            </button>
            <button
              onClick={onStop}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-colors"
              title="Stop"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
