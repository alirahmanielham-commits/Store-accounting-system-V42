import { getLocalData, saveLocalData, generateId } from './coreService';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

export type CommentEntityType = 'person' | 'invoice' | 'product' | 'accounting_doc' | 'receipt' | 'check';

export interface EntityComment {
  id: string;
  entityType: CommentEntityType;
  entityId: string;
  text: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  createdAt: number;
  shamsiDate: string;
  timeStr: string;
  updatedAt?: number;
  tags?: string[];
}

/**
 * Helper to get current Shamsi date and time formatted
 */
export function getCurrentShamsiDateTime(): { shamsiDate: string; timeStr: string } {
  try {
    const d = new DateObject({ calendar: persian, locale: persian_fa });
    const shamsiDate = d.format('YYYY/MM/DD');
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;
    return { shamsiDate, timeStr };
  } catch {
    const now = new Date();
    return {
      shamsiDate: new Intl.DateTimeFormat('fa-IR').format(now),
      timeStr: now.toLocaleTimeString('fa-IR')
    };
  }
}

/**
 * Fetch all comments stored in the system
 */
export const getAllComments = async (): Promise<EntityComment[]> => {
  const comments = await getLocalData<EntityComment[]>('entity_comments', []);
  return Array.isArray(comments) ? comments : [];
};

/**
 * Get comments for a specific entity (e.g. invoice with ID 'inv-123')
 */
export const getEntityComments = async (
  entityType: CommentEntityType,
  entityId: string | number
): Promise<EntityComment[]> => {
  const all = await getAllComments();
  const cleanId = String(entityId);
  return all
    .filter(c => c.entityType === entityType && String(c.entityId) === cleanId)
    .sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Get comments count map for a list of entity IDs
 */
export const getCommentsCountMap = async (
  entityType: CommentEntityType,
  entityIds?: (string | number)[]
): Promise<Record<string, number>> => {
  const all = await getAllComments();
  const countMap: Record<string, number> = {};

  all.forEach(c => {
    if (c.entityType === entityType) {
      const eId = String(c.entityId);
      countMap[eId] = (countMap[eId] || 0) + 1;
    }
  });

  return countMap;
};

/**
 * Add a new comment to an entity
 */
export const addEntityComment = async (params: {
  entityType: CommentEntityType;
  entityId: string | number;
  text: string;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  tags?: string[];
}): Promise<EntityComment> => {
  const { entityType, entityId, text, authorId, authorName, authorRole, tags } = params;
  if (!text || !text.trim()) {
    throw new Error('متن یادداشت نمی‌تواند خالی باشد.');
  }

  const all = await getAllComments();
  const { shamsiDate, timeStr } = getCurrentShamsiDateTime();

  const newComment: EntityComment = {
    id: generateId(),
    entityType,
    entityId: String(entityId),
    text: text.trim(),
    authorId: authorId || 'system',
    authorName: authorName || 'کاربر سیستم',
    authorRole: authorRole || 'کاربر',
    createdAt: Date.now(),
    shamsiDate,
    timeStr,
    tags: tags || []
  };

  all.unshift(newComment);
  await saveLocalData('entity_comments', all);

  // Dispatch global window event so any visible badges or lists immediately refresh
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('entity_comments_changed', {
      detail: { entityType, entityId: String(entityId), comment: newComment }
    }));
  }

  return newComment;
};

/**
 * Delete a comment by ID
 */
export const deleteEntityComment = async (
  commentId: string,
  user?: { id?: string; role?: string }
): Promise<boolean> => {
  const all = await getAllComments();
  const target = all.find(c => c.id === commentId);
  if (!target) return false;

  // Author or admin can delete
  if (user && user.role !== 'admin' && user.id && target.authorId !== user.id) {
    throw new Error('شما تنها مجاز به حذف یادداشت‌های ثبت‌شده توسط خودتان هستید.');
  }

  const filtered = all.filter(c => c.id !== commentId);
  await saveLocalData('entity_comments', filtered);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('entity_comments_changed', {
      detail: { entityType: target.entityType, entityId: target.entityId, deletedId: commentId }
    }));
  }

  return true;
};
