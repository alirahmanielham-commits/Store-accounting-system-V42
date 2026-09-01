import { useState, useEffect, useRef } from 'react';

export function useIdleTimer(timeoutSeconds: number = 60, onIdle?: () => void) {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (isIdle) {
      setIsIdle(false);
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (timeoutSeconds > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsIdle(true);
        if (onIdle) onIdle();
      }, timeoutSeconds * 1000);
    }
  };

  useEffect(() => {
    // Events to listen to for user activity
    const events = ['mousemove', 'keydown', 'wheel', 'DOMMouseScroll', 'mousewheel', 'mousedown', 'touchstart', 'touchmove', 'MSPointerDown', 'MSPointerMove'];
    
    const handleEvent = () => resetTimer();
    
    events.forEach(event => {
      document.addEventListener(event, handleEvent, { passive: true });
    });
    
    // Initial start
    resetTimer();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleEvent);
      });
    };
  }, [timeoutSeconds, isIdle]);

  return { isIdle, resetTimer };
}
