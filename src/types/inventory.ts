/**
 * Inventory Domain Types
 * Defines interfaces for Warehouses, Stock Levels, and Stock Movement
 */

export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  managerName?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: number | string;
}

export interface WarehouseStockRecord {
  id: string; // `${productId}_${warehouseId}`
  productId: string;
  warehouseId: string;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  lastUpdated?: number;
}

export type InventoryMovementType =
  | 'receipt'
  | 'remittance'
  | 'transfer_in'
  | 'transfer_out'
  | 'waste'
  | 'adjustment'
  | 'initial_stock';

export interface InventoryMovement {
  id: string;
  date: string;
  productId: string;
  warehouseId: string;
  type: InventoryMovementType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  documentType: string;
  documentId: string;
  documentNumber?: string;
  description?: string;
  timestamp: number;
}
