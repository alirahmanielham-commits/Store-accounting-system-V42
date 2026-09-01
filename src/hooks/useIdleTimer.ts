import { useState, useEffect, useRef, useCallback } from 'react';

export function useIdleTimer(timeoutSeconds: number = 60, onIdle?: () => void) {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    setIsIdle(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (timeoutSeconds > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsIdle(true);
        if (onIdleRef.current) onIdleRef.current();
      }, timeoutSeconds * 1000);
    }
  }, [timeoutSeconds]);

  useEffect(() => {
    // When idle, we only want explicit actions to wake up (click, keypress)
    // When active, any small movement keeps it awake
    const activeEvents = ['mousemove', 'wheel', 'DOMMouseScroll', 'mousewheel', 'touchmove', 'MSPointerMove'];
    const wakeEvents = ['keydown', 'mousedown', 'touchstart', 'MSPointerDown', 'click'];
    
    const allEvents = isIdle ? wakeEvents : [...activeEvents, ...wakeEvents];
    
    // Throttle mousemove events slightly to avoid overwhelming the main thread
    let lastEventTime = 0;
    const handleEvent = (e: Event) => {
      const now = Date.now();
      // If it's a mousemove and less than 500ms since last event, ignore to save CPU
      if (e.type === 'mousemove' && now - lastEventTime < 500) {
        return;
      }
      lastEventTime = now;
      resetTimer();
    };
    
    allEvents.forEach(event => {
      document.addEventListener(event, handleEvent, { passive: true });
    });
    
    // Initial start
    if (!isIdle) {
      resetTimer();
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      allEvents.forEach(event => {
        document.removeEventListener(event, handleEvent);
      });
    };
  }, [timeoutSeconds, isIdle, resetTimer]);

  return { isIdle, resetTimer };
}
