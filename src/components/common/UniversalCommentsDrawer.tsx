import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MessageSquare,
  Send,
  User,
  Clock,
  Calendar,
  Trash2,
  Tag,
  Shield,
  Copy,
  Check,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import {
  EntityComment,
  CommentEntityType,
  getEntityComments,
  addEntityComment,
  deleteEntityComment
} from '../../services/commentsService';
import { useAuth } from '../../context/AuthContext';
import { toPersianDigits } from '../../utils/format';
import { playAudioFeedback } from '../../utils/audio';

interface UniversalCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: CommentEntityType;
  entityId: string | number;
  entityTitle: string;
  entitySubtitle?: string;
  showNotification?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function UniversalCommentsDrawer({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityTitle,
  entitySubtitle,
  showNotification
}: UniversalCommentsDrawerProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<EntityComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Type labels in Persian
  const entityTypeLabels: Record<CommentEntityType, string> = {
    person: 'طرف‌حساب',
    invoice: 'فاکتور',
    product: 'کالا / محصول',
    accounting_doc: 'سند حسابداری',
    receipt: 'رسید دریافت / پرداخت',
    check: 'چک بانکی صیادی'
  };

  // Load comments when drawer opens or entity changes
  useEffect(() => {
    if (isOpen && entityId) {
      loadComments();
      setTimeout(() => textareaRef.current?.focus(), 250);
    }
  }, [isOpen, entityType, entityId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await getEntityComments(entityType, entityId);
      setComments(data);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText) {
      if (showNotification) showNotification('لطفاً متن یادداشت را وارد فرمایید.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const currentAuthorName = user?.name || user?.username || 'کاربر سیستم';
      const currentAuthorId = user?.id ? String(user.id) : 'system';
      const currentAuthorRole = user?.role || 'کاربر';

      const newComment = await addEntityComment({
        entityType,
        entityId,
        text: cleanText,
        authorId: currentAuthorId,
        authorName: currentAuthorName,
        authorRole: currentAuthorRole
      });

      setComments(prev => [newComment, ...prev]);
      setInputText('');
      try { playAudioFeedback('success'); } catch (_) {}
      if (showNotification) showNotification('یادداشت با موفقیت ثبت شد.', 'success');
    } catch (err: any) {
      console.error('Error adding comment:', err);
      if (showNotification) showNotification(err.message || 'خطا در ثبت یادداشت', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('آیا از حذف این یادداشت اطمینان دارید؟')) return;

    try {
      await deleteEntityComment(commentId, {
        id: user?.id ? String(user.id) : undefined,
        role: user?.role
      });
      setComments(prev => prev.filter(c => c.id !== commentId));
      if (showNotification) showNotification('یادداشت حذف شد.', 'info');
    } catch (err: any) {
      if (showNotification) showNotification(err.message || 'خطا در حذف یادداشت', 'error');
    }
  };

  const handleCopyText = (comment: EntityComment) => {
    navigator.clipboard.writeText(comment.text);
    setCopiedId(comment.id);
    setTimeout(() => setCopiedId(null), 2000);
    if (showNotification) showNotification('متن در کلیپ‌بورد کپی شد.', 'info');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-start select-none" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          {/* Side Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative z-10 w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/50 dark:border-indigo-800/50 shadow-2xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                      {entityTypeLabels[entityType]}
                    </span>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {entityTitle}
                    </h2>
                  </div>
                  {entitySubtitle && (
                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      {entitySubtitle}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="بستن پنجره"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Form at Top */}
            <form onSubmit={handleAddComment} className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={3}
                  placeholder="ثبت یادداشت جدید... (کلید میانبر Ctrl+Enter جهت ثبت سریع)"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <User className="w-3.5 h-3.5" />
                  <span>ثبت‌کننده: <b>{user?.name || user?.username || 'شما'}</b></span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !inputText.trim()}
                  className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 transition shadow-xs shadow-indigo-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 rotate-180" />
                  <span>{submitting ? 'در حال ثبت...' : 'ثبت یادداشت'}</span>
                </button>
              </div>
            </form>

            {/* Comments Timeline Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  در حال بارگیری یادداشت‌ها...
                </div>
              ) : comments.length === 0 ? (
                <div className="py-16 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
                    هنوز یادداشتی ثبت نشده است
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    می‌توانید اولین یادداشت، جزئیات توافق یا پیگیری این مورد را در کادر بالا بنویسید.
                  </p>
                </div>
              ) : (
                <div className="relative border-r-2 border-indigo-100 dark:border-indigo-950/60 pr-4 mr-2 space-y-3.5">
                  {comments.map((c) => {
                    const isAuthor = user?.id && String(user.id) === c.authorId;
                    const canDelete = isAuthor || user?.role === 'admin';

                    return (
                      <div
                        key={c.id}
                        className="relative bg-slate-50 dark:bg-slate-850 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs group transition hover:border-indigo-200 dark:hover:border-indigo-900"
                      >
                        {/* Timeline Node Dot */}
                        <div className="absolute -right-[23px] top-4 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-xs" />

                        {/* Comment Header: Author & Date/Time */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-[10px] flex items-center justify-center">
                              {c.authorName ? c.authorName.charAt(0) : 'U'}
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                                {c.authorName}
                              </span>
                              {c.authorRole && (
                                <span className="text-[10px] text-slate-400 mr-1.5">
                                  ({c.authorRole === 'admin' ? 'مدیر' : c.authorRole})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono" dir="ltr">
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{toPersianDigits(c.timeStr)}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{toPersianDigits(c.shamsiDate)}</span>
                            </span>
                          </div>
                        </div>

                        {/* Comment Text */}
                        <p className="text-xs font-normal text-slate-800 dark:text-slate-200 leading-relaxed pt-2.5 whitespace-pre-wrap select-text">
                          {c.text}
                        </p>

                        {/* Comment Actions (Copy & Delete) */}
                        <div className="flex items-center justify-end gap-1.5 pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/60 opacity-80 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => handleCopyText(c)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                            title="کپی متن"
                          >
                            {copiedId === c.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(c.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="حذف یادداشت"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center">
              <span className="text-[11px] text-slate-400">
                مجموع: <b>{toPersianDigits(comments.length)}</b> یادداشت ثبت‌شده
              </span>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
