import { useEffect, useState, useCallback } from 'react';

export interface UseDirtyFormOptions {
  isDirty: boolean;
  message?: string;
}

export function useDirtyForm({ isDirty, message = 'اطلاعات ذخیره نشده است. آیا مطمئنید که می‌خواهید بدون ذخیره کردن خارج شوید؟' }: UseDirtyFormOptions) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // 1. Browser unload / refresh protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);

  // 2. In-app navigation guard helper
  const guardNavigation = useCallback((action: () => void) => {
    if (isDirty) {
      setPendingAction(() => action);
      setShowPrompt(true);
      return false;
    }
    action();
    return true;
  }, [isDirty]);

  const confirmDiscard = useCallback(() => {
    setShowPrompt(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  const cancelDiscard = useCallback(() => {
    setShowPrompt(false);
    setPendingAction(null);
  }, []);

  return {
    isDirty,
    showPrompt,
    guardNavigation,
    confirmDiscard,
    cancelDiscard
  };
}

export default useDirtyForm;
