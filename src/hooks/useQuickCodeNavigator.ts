import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getQuickCodes, 
  findItemByCode, 
  normalizeDigit, 
  QuickCodeItem,
  subscribeToQuickCodes 
} from '../services/quickCodeService';
import { playAudioFeedback } from '../utils/audio';

export interface QuickCodeHUDState {
  visible: boolean;
  code: string;
  title?: string;
  status: 'typing' | 'success' | 'error';
  message?: string;
}

interface UseQuickCodeNavigatorOptions {
  onExecute: (item: QuickCodeItem) => void;
  enabled?: boolean;
}

export function useQuickCodeNavigator({ onExecute, enabled = true }: UseQuickCodeNavigatorOptions) {
  const [items, setItems] = useState<QuickCodeItem[]>(() => getQuickCodes());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hudState, setHudState] = useState<QuickCodeHUDState>({
    visible: false,
    code: '',
    status: 'typing',
  });

  const bufferRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onExecuteRef = useRef(onExecute);
  onExecuteRef.current = onExecute;

  // Keep items synced
  useEffect(() => {
    return subscribeToQuickCodes((updated) => setItems(updated));
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetBuffer = useCallback(() => {
    clearTimers();
    bufferRef.current = '';
  }, [clearTimers]);

  const hideHUDWithDelay = useCallback((delayMs: number = 1200) => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      setHudState((prev) => ({ ...prev, visible: false }));
    }, delayMs);
  }, []);

  const executeCode = useCallback((code: string): boolean => {
    const item = findItemByCode(code, items);
    if (item && item.enabled) {
      playAudioFeedback('success');
      setHudState({
        visible: true,
        code,
        title: item.title,
        status: 'success',
        message: `اجرای: ${item.title}`,
      });
      hideHUDWithDelay(1400);
      resetBuffer();
      onExecuteRef.current(item);
      return true;
    } else {
      playAudioFeedback('scan_error');
      setHudState({
        visible: true,
        code,
        status: 'error',
        message: `کد دسترسی ۲ رقمی [${code}] یافت نشد یا غیرفعال است`,
      });
      hideHUDWithDelay(2000);
      resetBuffer();
      return false;
    }
  }, [items, hideHUDWithDelay, resetBuffer]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Shortcut to open search modal: Alt + K or F2
      if ((e.altKey && (e.key === 'k' || e.key === 'K' || e.key === 'ن')) || e.key === 'F2') {
        e.preventDefault();
        setIsModalOpen((prev) => !prev);
        resetBuffer();
        setHudState((prev) => ({ ...prev, visible: false }));
        return;
      }

      // If modal is open, do not handle direct buffer typing here (the modal input handles it)
      if (isModalOpen) return;

      // 2. Check if user is typing inside an input, textarea, select, or contenteditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]') ||
          target.closest('.no-quick-code'))
      ) {
        return;
      }

      // 3. Ignore modifier keys (Ctrl, Alt, Meta) for direct digit entry
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // 4. Handle Escape key to cancel typing
      if (e.key === 'Escape' && bufferRef.current.length > 0) {
        resetBuffer();
        setHudState((prev) => ({ ...prev, visible: false }));
        return;
      }

      // 5. Check if key is a digit (Persian, Arabic, or English)
      const digit = normalizeDigit(e.key);
      if (digit === null) {
        // If user typed a non-digit while buffering, reset buffer
        if (bufferRef.current.length > 0 && e.key.length === 1) {
          resetBuffer();
          setHudState((prev) => ({ ...prev, visible: false }));
        }
        return;
      }

      // User typed a digit
      clearTimers();

      if (bufferRef.current.length === 0) {
        // First digit
        bufferRef.current = digit;
        playAudioFeedback('scan');
        setHudState({
          visible: true,
          code: digit,
          status: 'typing',
          message: 'رقم دوم را وارد کنید...',
        });

        // Set 1.6s timeout to enter 2nd digit
        timerRef.current = setTimeout(() => {
          resetBuffer();
          setHudState((prev) => ({ ...prev, visible: false }));
        }, 1600);
      } else if (bufferRef.current.length === 1) {
        // Second digit complete!
        const fullCode = bufferRef.current + digit;
        executeCode(fullCode);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      clearTimers();
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, [enabled, isModalOpen, clearTimers, resetBuffer, executeCode]);

  return {
    items,
    isModalOpen,
    setIsModalOpen,
    hudState,
    executeCode,
  };
}
