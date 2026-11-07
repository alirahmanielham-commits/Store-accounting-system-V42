import { describe, it, expect, beforeEach, vi } from 'vitest';

let mockStore: Record<string, any[]> = {};

vi.mock('../../src/services/coreService', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getLocalData: vi.fn(async (table: string) => {
      return mockStore[table] || [];
    }),
    saveLocalData: vi.fn(async (table: string, data: any[]) => {
      mockStore[table] = data;
      return data;
    }),
    getActiveStoreId: vi.fn(() => 'default')
  };
});

import {
  getCurrentShamsiDateTime,
  getAllComments,
  getEntityComments,
  getCommentsCountMap,
  addEntityComment,
  deleteEntityComment
} from '../../src/services/commentsService';

describe('Universal Comments Service', () => {
  beforeEach(() => {
    mockStore = {};
  });

  it('generates valid Shamsi date and time string', () => {
    const { shamsiDate, timeStr } = getCurrentShamsiDateTime();
    expect(shamsiDate).toMatch(/^[۰-۹0-9]{4}\/[۰-۹0-9]{2}\/[۰-۹0-9]{2}$/);
    expect(timeStr).toMatch(/^[۰-۹0-9]{2}:[۰-۹0-9]{2}:[۰-۹0-9]{2}$/);
  });

  it('adds and retrieves comments for different entities', async () => {
    const comment1 = await addEntityComment({
      entityType: 'person',
      entityId: 'p-101',
      text: 'یادداشت مشتری خوش‌حساب',
      authorName: 'مدیر مالی',
      authorRole: 'admin',
      authorId: 'usr-1'
    });

    expect(comment1.id).toBeDefined();
    expect(comment1.text).toBe('یادداشت مشتری خوش‌حساب');
    expect(comment1.authorName).toBe('مدیر مالی');
    expect(comment1.shamsiDate).toBeDefined();
    expect(comment1.timeStr).toBeDefined();

    const comment2 = await addEntityComment({
      entityType: 'invoice',
      entityId: 'inv-500',
      text: 'تحویل با باربری انجام شود',
      authorName: 'مسئول انبار',
      authorRole: 'warehouse',
      authorId: 'usr-2'
    });

    const personComments = await getEntityComments('person', 'p-101');
    expect(personComments.length).toBe(1);
    expect(personComments[0].id).toBe(comment1.id);

    const invoiceComments = await getEntityComments('invoice', 'inv-500');
    expect(invoiceComments.length).toBe(1);
    expect(invoiceComments[0].id).toBe(comment2.id);

    const countMap = await getCommentsCountMap('person');
    expect(countMap['p-101']).toBe(1);
    expect(countMap['p-999']).toBeUndefined();
  });

  it('deletes a comment correctly', async () => {
    const c1 = await addEntityComment({
      entityType: 'product',
      entityId: 'prod-1',
      text: 'موجودی انبار بررسی شود',
      authorName: 'انباردار'
    });

    const c2 = await addEntityComment({
      entityType: 'product',
      entityId: 'prod-1',
      text: 'قیمت به‌روزرسانی شد',
      authorName: 'مدیر فروش'
    });

    let comments = await getEntityComments('product', 'prod-1');
    expect(comments.length).toBe(2);

    const deleted = await deleteEntityComment(c1.id, 'product', 'prod-1');
    expect(deleted).toBe(true);

    comments = await getEntityComments('product', 'prod-1');
    expect(comments.length).toBe(1);
    expect(comments[0].id).toBe(c2.id);
  });
});
