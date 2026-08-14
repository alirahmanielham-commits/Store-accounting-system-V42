import { useEffect, useRef } from 'react';

interface UseHardwareScannerProps {
  onScan: (barcode: string) => void;
  /** Maximum time (in ms) between keystrokes to be considered a scanner */
  timeToEvaluate?: number;
  /** Minimum length of a barcode */
  minLength?: number;
}

export function useHardwareScanner({
  onScan,
  timeToEvaluate = 50,
  minLength = 4,
}: UseHardwareScannerProps) {
  const buffer = useRef<string>('');
  const lastKeyTime = useRef<number>(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea unless we explicitly want to allow it.
      // Actually, if we are in an input, we might still want to capture it, but usually, 
      // if the user focuses on an input, the input captures the scanner anyway. 
      // Let's capture only if we aren't focused on a text input, OR if it's really fast.
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;
      
      if (timeDiff > timeToEvaluate) {
        buffer.current = ''; // Reset buffer if typed too slowly
      }

      // Scanner usually sends 'Enter' at the end
      if (e.key === 'Enter' && buffer.current.length >= minLength) {
        // If it came fast enough, it's a scan
        if (timeDiff <= timeToEvaluate) {
            e.preventDefault();
            onScan(buffer.current);
        }
        buffer.current = '';
        return;
      }

      // Only accept printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer.current += e.key;
      }
      
      lastKeyTime.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onScan, timeToEvaluate, minLength]);
}
