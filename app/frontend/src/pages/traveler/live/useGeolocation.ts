// ─── useGeolocation — Geolocation API hook for live trip recording ───
import { useState, useRef, useCallback, useEffect } from 'react';

export interface TrackPoint {
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface UseGeolocationReturn {
  state: RecordingState;
  trackPoints: TrackPoint[];
  currentPosition: TrackPoint | null;
  error: string | null;
  elapsedMs: number;
  distanceKm: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  addManualPoint: (lat: number, lng: number) => void;
}

/** Haversine distance in km */
function haversine(a: TrackPoint, b: TrackPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa = Math.sin(dLat / 2);
  const sb = Math.sin(dLng / 2);
  const h =
    sa * sa +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sb * sb;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const MIN_ACCURACY_M = 50;   // ignore fixes worse than 50m
const MIN_DISTANCE_M = 5;    // ignore points within 5m of last
const MAX_SPEED_MPS = 200;   // ignore >720km/h (GPS glitch)

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<TrackPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const lastPointRef = useRef<TrackPoint | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current - pausedTimeRef.current);
    }, 1000);
  }, []);

  const onPosition = useCallback((pos: GeolocationPosition) => {
    const pt: TrackPoint = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      altitude: pos.coords.altitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      heading: pos.coords.heading,
      timestamp: pos.timestamp,
    };

    setCurrentPosition(pt);

    // Filter bad fixes
    if (pt.accuracy > MIN_ACCURACY_M) return;
    if (pt.speed !== null && pt.speed > MAX_SPEED_MPS) return;

    const last = lastPointRef.current;
    if (last) {
      const d = haversine(last, pt);
      if (d * 1000 < MIN_DISTANCE_M) return; // too close
      setDistanceKm(prev => prev + d);
    }

    lastPointRef.current = pt;
    setTrackPoints(prev => [...prev, pt]);
  }, []);

  const onError = useCallback((err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError('Location permission denied. Please enable location services.');
        break;
      case err.POSITION_UNAVAILABLE:
        setError('Location unavailable. Check GPS signal.');
        break;
      case err.TIMEOUT:
        // Timeouts are common — don't stop recording
        break;
    }
  }, []);

  const startWatch = useCallback(() => {
    if (watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000,
    });
  }, [onPosition, onError]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setError(null);
    setTrackPoints([]);
    setDistanceKm(0);
    setElapsedMs(0);
    lastPointRef.current = null;
    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;
    setState('recording');
    startWatch();
    startTimer();
  }, [startWatch, startTimer]);

  const pause = useCallback(() => {
    setState('paused');
    stopWatch();
    if (timerRef.current) clearInterval(timerRef.current);
    pausedTimeRef.current = Date.now() - startTimeRef.current - elapsedMs;
  }, [stopWatch, elapsedMs]);

  const resume = useCallback(() => {
    setState('recording');
    pausedTimeRef.current = Date.now() - startTimeRef.current - elapsedMs;
    startWatch();
    startTimer();
  }, [startWatch, startTimer, elapsedMs]);

  const stop = useCallback(() => {
    setState('stopped');
    stopWatch();
    if (timerRef.current) clearInterval(timerRef.current);
  }, [stopWatch]);

  const addManualPoint = useCallback((lat: number, lng: number) => {
    const pt: TrackPoint = {
      lat, lng, altitude: null, accuracy: 0, speed: null, heading: null,
      timestamp: Date.now(),
    };
    setTrackPoints(prev => [...prev, pt]);
  }, []);

  return {
    state, trackPoints, currentPosition, error, elapsedMs, distanceKm,
    start, pause, resume, stop, addManualPoint,
  };
}
