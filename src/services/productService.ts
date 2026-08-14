import { getStoreSettings } from './settingsService';
import { 
  getLocalData, 
  saveLocalData, 
  updateLocalData, 
  appendLocalData, 
  batchLocalData, 
  generateId, 
  parseToGregorianDate, 
  generateDocNumber, 
  updateDocCounter, 
  getDatabaseLogs, 
  addDatabaseLog, 
  getSystemLogs, 
  addSystemLog,
  ensureFiscalYearId
} from './coreService';
import { CompanySettings } from '../types';
import { convertToGregorian } from '../utils/format';
import { enqueueSyncTask, getSyncQueue } from './syncQueueService';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';



export const getProductCategories = async () => {
  const categories = await getLocalData<any[]>('product_categories', []);
  
  const queue = getSyncQueue();
  let resultList = [...categories];

  for (const task of queue) {
    if (task.operation === 'ADD_PRODUCT_CATEGORY') {
       resultList.push({ ...task.payload, isLocalUnsynced: true });
    } else if (task.operation === 'UPDATE_PRODUCT_CATEGORY') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) {
           resultList[idx] = { ...resultList[idx], ...task.payload.category, isLocalUnsynced: true };
       }
    } else if (task.operation === 'DELETE_PRODUCT_CATEGORY') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) {
           resultList.splice(idx, 1);
       }
    }
  }

  return resultList.sort((a, b) => b.createdAt - a.createdAt);
};

export const addProductCategoryToServer = async (category: any) => {
  const categories = await getLocalData<any[]>('product_categories', []);
  const now = Date.now();
  
  let maxCatCode = 0;
  for (let i = 0; i < (categories || []).length; i++) {
    const c = categories[i];
    if (c.code) {
      const num = parseInt(c.code, 10);
      if (!isNaN(num) && num > maxCatCode) maxCatCode = num;
    } else {
      const idx = i + 1;
      if (idx > maxCatCode) maxCatCode = idx;
    }
  }
  const catCode = (maxCatCode + 1).toString().padStart(2, '0');

  const newCategory = { ...category, code: catCode, id: category.id || generateId(), createdAt: now, updatedAt: now };
  await appendLocalData('product_categories', newCategory);
  return newCategory;
};

export const updateProductCategoryToServer = async (id: string, category: any) => {
  return await updateLocalData('product_categories', id, { ...category, updatedAt: Date.now() });
};

export const deleteProductCategoryToServer = async (id: string) => {
  await batchLocalData([{ type: 'delete', key: 'product_categories', id }]);
};

export const getProducts = async () => {
  const products = await getLocalData<any[]>('products', []);
  const baseList = (products || []).filter(p => !p.isDeleted);
  
  const queue = getSyncQueue();
  let resultList = [...baseList];

  for (const task of queue) {
    if (task.operation === 'ADD_PRODUCT') {
       resultList.push({ ...task.payload, isLocalUnsynced: true });
    } else if (task.operation === 'UPDATE_PRODUCT') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) {
           resultList[idx] = { ...resultList[idx], ...task.payload.product, isLocalUnsynced: true };
       }
    } else if (task.operation === 'DELETE_PRODUCT') {
       const idx = resultList.findIndex(p => p.id === task.payload.id || p.id === task.payload.originalId);
       if (idx !== -1) {
           resultList.splice(idx, 1);
       }
    }
  }

  return resultList.sort((a: any, b: any) => b.createdAt - a.createdAt);
};

export const addProductToServer = async (product: any) => {
  const products = await getLocalData<any[]>('products', []);
  const categories = await getLocalData<any[]>('product_categories', []);
  const now = Date.now();

  let newCode = product.code;
  if (!newCode && product.categoryId) {
    const catIndex = categories.findIndex(c => String(c.id) === String(product.categoryId));
    const category = categories[catIndex];
    let catCode = category?.code;
    if (!catCode && catIndex !== -1) {
      catCode = (catIndex + 1).toString().padStart(2, '0');
    } else if (!catCode) {
      catCode = '00';
    }

    const catProducts = products.filter(p => String(p.categoryId) === String(product.categoryId));
    let maxNum = 0;
    for(const p of catProducts) {
      if (p.code && typeof p.code === 'string' && p.code.startsWith(`${catCode}-`)) {
        const numStr = p.code.replace(`${catCode}-`, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    maxNum++;
    newCode = `${catCode}-${maxNum.toString().padStart(3, '0')}`;
  } else if (!newCode) {
    // If no category is chosen, use '00' prefix
    let maxNum = 0;
    const catProducts = products.filter(p => !p.categoryId || p.categoryId === '');
    for(const p of catProducts) {
      if (p.code && typeof p.code === 'string' && p.code.startsWith(`00-`)) {
        const numStr = p.code.replace(`00-`, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    maxNum++;
    newCode = `00-${maxNum.toString().padStart(3, '0')}`;
  }
  
  // Check if there is specific configuration for Product Code in settings
  const settings = await getStoreSettings();
  if (settings && (settings as any).prefix_product !== undefined) {
    newCode = await generateDocNumber('product');
  }

  const newProduct = { ...product, code: newCode, id: product.id || generateId(), createdAt: now, updatedAt: now };
  await appendLocalData('products', newProduct);
  
  if (newProduct.code) {
      await updateDocCounter('product', newProduct.code);
  }

  const purchasePrice = Number(newProduct.purchasePrice || newProduct.buyPrice || 0);
  const salePrice = Number(newProduct.price || newProduct.sellPrice || 0);
  const priceChangeDate = newProduct.priceChangeDate || new Date().toISOString();
  
  if (purchasePrice > 0) {
      await appendLocalData('product_price_history', {
          id: generateId(),
          productId: newProduct.id,
          date: priceChangeDate,
          type: 'purchase',
          price: purchasePrice
      });
  }
  if (salePrice > 0) {
      await appendLocalData('product_price_history', {
          id: generateId(),
          productId: newProduct.id,
          date: priceChangeDate,
          type: 'sale',
          price: salePrice
      });
  }
  
  if (typeof addSystemLog !== 'undefined') {
    await addSystemLog('ADD_' + 'Product'.toUpperCase(), 'ثبت رکورد جدید در products', 'Product', newProduct.id);
  }

  return newProduct;
};

export const updateProductToServer = async (id: string, product: any) => {
  const products = await getLocalData<any[]>('products', []);
  const index = products.findIndex((p: any) => String(p.id) === String(id));
  if (index !== -1) {
    const oldProduct = products[index];
    const newProduct = { ...oldProduct, ...product, updatedAt: Date.now() };
    
    const newBuy = Number(newProduct.purchasePrice || newProduct.buyPrice || 0);
    const newSell = Number(newProduct.price || newProduct.sellPrice || 0);
    const oldBuy = Number(oldProduct.purchasePrice || oldProduct.buyPrice || 0);
    const oldSell = Number(oldProduct.price || oldProduct.sellPrice || 0);
    
    const priceChangeDate = newProduct.priceChangeDate || new Date().toISOString();
    
    if (newBuy !== oldBuy && newBuy > 0) {
        await appendLocalData('product_price_history', {
            id: generateId(),
            productId: newProduct.id,
            date: priceChangeDate,
            type: 'purchase',
            price: newBuy
        });
    }
    if (newSell !== oldSell && newSell > 0) {
        await appendLocalData('product_price_history', {
            id: generateId(),
            productId: newProduct.id,
            date: priceChangeDate,
            type: 'sale',
            price: newSell
        });
    }

    const updated = await updateLocalData('products', id, newProduct);
  
    if (typeof addSystemLog !== 'undefined') {
      await addSystemLog('UPDATE_' + 'Product'.toUpperCase(), 'ویرایش کالا', 'Product', updated.id);
    }
    return updated;
  }
  return null;
};

export const deleteProductToServer = async (id: string) => {
  const products = await getLocalData<any[]>('products', []);
  await saveLocalData('products', products.filter((p: any) => String(p.id) !== String(id)));
};

export const syncProductLatestPrices = async (productId: string) => {
  const history = await getLocalData<any[]>('product_price_history', []);
  const productHistory = history.filter((h: any) => String(h.productId) === String(productId));

  if (productHistory.length === 0) return;

  // Sort by date descending (latest first)
  // Store original insertion index to use as secondary sort (higher index = newer)
  productHistory.forEach((h: any, i: number) => h._index = i);
  
  // Sort by date descending, then by insertion index descending
  productHistory.sort((a: any, b: any) => {
      const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (b._index || 0) - (a._index || 0);
  });

  const latestPurchase = productHistory.find((h: any) => h.type === 'purchase')?.price || 0;
  const latestSale = productHistory.find((h: any) => h.type === 'sale')?.price || 0;

  const products = await getLocalData<any[]>('products', []);
  const index = products.findIndex((p: any) => String(p.id) === String(productId));
  if (index !== -1) {
    const product = products[index];
    const updatePayload: any = {};
    let shouldUpdate = false;
    
    if (latestPurchase > 0 && product.purchasePrice !== latestPurchase) {
      updatePayload.purchasePrice = latestPurchase;
      shouldUpdate = true;
    }
    if (latestSale > 0 && product.price !== latestSale) {
      updatePayload.price = latestSale;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      const newProduct = { ...product, ...updatePayload, updatedAt: Date.now() };
      await updateLocalData('products', product.id, newProduct);
    }
  }
};

export const getProductPriceHistory = async (productId: string) => {
  const allHistory = await getLocalData<any[]>('product_price_history', []);
  return allHistory.filter((h: any) => String(h.productId) === String(productId));
};

export const updateProductPriceHistory = async (id: string, updatedData: any) => {
  const result = await updateLocalData('product_price_history', id, updatedData);
  if (updatedData && updatedData.productId) {
      await syncProductLatestPrices(updatedData.productId);
  } else {
      const oldHistories = await getLocalData<any[]>('product_price_history', []);
      const history = oldHistories.find(h => String(h.id) === String(id));
      if (history && history.productId) {
          await syncProductLatestPrices(history.productId);
      }
  }
  return result;
};




export const useGetProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: getProducts
  });
};

export const useGetProductCategories = () => {
  return useQuery({
    queryKey: ['product_categories'],
    queryFn: getProductCategories
  });
};

export const useAddProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, product }: { id: string, product: any }) => updateProduct(id, product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
};

export const addProduct = async (product: any) => {
  const localId = generateId();
  const now = Date.now();
  const newProduct = { ...product, id: localId, createdAt: now, updatedAt: now };
  enqueueSyncTask('ADD_PRODUCT', newProduct);
  return newProduct;
};
export const updateProduct = async (id: string, product: any) => {
  enqueueSyncTask('UPDATE_PRODUCT', { id, product });
  return { ...product, id };
};
export const deleteProduct = async (id: string) => {
  enqueueSyncTask('DELETE_PRODUCT', { id });
};

export const addProductCategory = async (category: any) => {
  const localId = generateId();
  const now = Date.now();
  const newCategory = { ...category, id: localId, createdAt: now, updatedAt: now };
  enqueueSyncTask('ADD_PRODUCT_CATEGORY', newCategory);
  return newCategory;
};
export const updateProductCategory = async (id: string, category: any) => {
  enqueueSyncTask('UPDATE_PRODUCT_CATEGORY', { id, category });
  return { ...category, id };
};
export const deleteProductCategory = async (id: string) => {
  enqueueSyncTask('DELETE_PRODUCT_CATEGORY', { id });
};
