import { StateCreator } from 'zustand';
import {
  getProducts,
  getProductCategories,
  addProduct,
  updateProduct,
  deleteProduct,
  addProductCategory,
  updateProductCategory,
  deleteProductCategory
} from '../../services/productService';

export interface ProductSlice {
  products: any[];
  productCategories: any[];
  isLoadingProducts: boolean;
  isLoadingCategories: boolean;
  productSearchTerm: string;
  selectedCategory: string;
  productViewMode: 'grid' | 'table';

  fetchProducts: () => Promise<void>;
  fetchProductCategories: () => Promise<void>;
  addProduct: (product: any) => Promise<any>;
  updateProduct: (id: string, product: any) => Promise<any>;
  deleteProduct: (id: string) => Promise<void>;
  addProductCategory: (category: any) => Promise<any>;
  updateProductCategory: (id: string, category: any) => Promise<any>;
  deleteProductCategory: (id: string) => Promise<void>;
  setProductSearchTerm: (term: string) => void;
  setSelectedCategory: (catId: string) => void;
  setProductViewMode: (mode: 'grid' | 'table') => void;
}

export const createProductSlice: StateCreator<ProductSlice> = (set, get) => ({
  products: [],
  productCategories: [],
  isLoadingProducts: false,
  isLoadingCategories: false,
  productSearchTerm: '',
  selectedCategory: '',
  productViewMode: 'grid',

  fetchProducts: async () => {
    set({ isLoadingProducts: true });
    try {
      const data = await getProducts();
      set({ products: data || [] });
    } catch (e) {
      console.error('Error fetching products in store:', e);
    } finally {
      set({ isLoadingProducts: false });
    }
  },

  fetchProductCategories: async () => {
    set({ isLoadingCategories: true });
    try {
      const data = await getProductCategories();
      set({ productCategories: data || [] });
    } catch (e) {
      console.error('Error fetching product categories in store:', e);
    } finally {
      set({ isLoadingCategories: false });
    }
  },

  addProduct: async (productData) => {
    const newProduct = await addProduct(productData);
    await get().fetchProducts();
    return newProduct;
  },

  updateProduct: async (id, productData) => {
    const updated = await updateProduct(id, productData);
    await get().fetchProducts();
    return updated;
  },

  deleteProduct: async (id) => {
    await deleteProduct(id);
    await get().fetchProducts();
  },

  addProductCategory: async (categoryData) => {
    const newCat = await addProductCategory(categoryData);
    await get().fetchProductCategories();
    return newCat;
  },

  updateProductCategory: async (id, categoryData) => {
    const updated = await updateProductCategory(id, categoryData);
    await get().fetchProductCategories();
    return updated;
  },

  deleteProductCategory: async (id) => {
    await deleteProductCategory(id);
    await get().fetchProductCategories();
  },

  setProductSearchTerm: (term) => set({ productSearchTerm: term }),
  setSelectedCategory: (catId) => set({ selectedCategory: catId }),
  setProductViewMode: (mode) => set({ productViewMode: mode }),
});
