import { useEffect, useRef, useCallback, useState } from 'react';

interface UseSessionTimeoutOptions {
  timeoutMs: number;
  warningMs?: number; // When to show warning (ms before timeout)
  onTimeout: () => void;
  onWarning?: () => void;
  enabled?: boolean;
}

export function useSessionTimeout({
  timeoutMs,
  warningMs,
  onTimeout,
  onWarning,
  enabled = true,
}: UseSessionTimeoutOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  const onWarningRef = useRef(onWarning);
  const [showWarning, setShowWarning] = useState(false);

  onTimeoutRef.current = onTimeout;
  onWarningRef.current = onWarning;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    setShowWarning(false);

    if (!enabled) return;

    // Set warning timer
    if (warningMs && warningMs < timeoutMs) {
      const warningDelay = timeoutMs - warningMs;
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true);
        onWarningRef.current?.();
      }, warningDelay);
    }

    // Set logout timer
    timerRef.current = setTimeout(() => {
      setShowWarning(false);
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs, warningMs, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => resetTimer();
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [resetTimer, enabled]);

  return { resetTimer, showWarning, dismissWarning: () => { setShowWarning(false); resetTimer(); } };
}
