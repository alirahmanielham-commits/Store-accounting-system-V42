import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { CommentEntityType } from '../../services/commentsService';

interface CommentBadgeButtonProps {
  entityType: CommentEntityType;
  entityId: string | number;
  entityTitle?: string;
  count?: number;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  showZeroBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

export default function CommentBadgeButton({
  entityType,
  entityId,
  entityTitle,
  count: initialCount,
  onClick,
  className = '',
  showZeroBadge = false,
  size = 'md',
  title: customTitle
}: CommentBadgeButtonProps) {
  const [commentCount, setCommentCount] = useState<number>(initialCount || 0);

  // Sync with prop when passed
  useEffect(() => {
    if (typeof initialCount === 'number') {
      setCommentCount(initialCount);
    }
  }, [initialCount]);

  // Listen to global entity comment updates
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (
        e.detail &&
        e.detail.entityType === entityType &&
        String(e.detail.entityId) === String(entityId)
      ) {
        if (e.detail.deletedId) {
          setCommentCount(prev => Math.max(0, prev - 1));
        } else if (e.detail.comment) {
          setCommentCount(prev => prev + 1);
        }
      }
    };

    window.addEventListener('entity_comments_changed', handleUpdate);
    return () => window.removeEventListener('entity_comments_changed', handleUpdate);
  }, [entityType, entityId]);

  const hasComments = commentCount > 0;

    const sizeClasses =
      size === 'sm'
        ? 'p-1.5 rounded-lg'
        : size === 'lg'
          ? 'p-2.5 rounded-2xl'
          : 'p-2 rounded-xl';

    const iconSizeClasses =
      size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        className={`relative inline-flex items-center justify-center transition-all cursor-pointer ${sizeClasses} ${
          hasComments
            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-2xs'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        } ${className}`}
        title={customTitle || (hasComments ? `${commentCount} یادداشت / کامنت ثبت‌شده` : 'افزودن یادداشت یا کامنت')}
      >
        <MessageSquare className={`${iconSizeClasses} shrink-0`} />
      
      {/* Badge Indicator */}
      {(hasComments || showZeroBadge) && (
        <span
          className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold font-mono flex items-center justify-center shadow-xs transition-transform ${
            hasComments
              ? 'bg-amber-600 text-white ring-2 ring-white dark:ring-slate-900'
              : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          {commentCount}
        </span>
      )}
    </button>
  );
}
