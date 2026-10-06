import { useState, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { calculateAllWarehouseStocks, validateStockAvailability } from '../utils/stockLogic';

export type WarehouseDocType =
  | 'warehouse_receipt'
  | 'warehouse_remittance'
  | 'warehouse_transfer'
  | 'waste'
  | 'stocktaking';

export interface UseWarehouseOpsOptions {
  defaultWarehouseId?: string;
}

export function useWarehouseOps(options: UseWarehouseOpsOptions = {}) {
  const { defaultWarehouseId } = options;

  const {
    warehouses,
    warehouseStocks,
    fetchWarehouses,
    fetchWarehouseStocks,
    recalculateWarehouseStocks,
    products
  } = useStore();

  const [activeWarehouseId, setActiveWarehouseId] = useState<string>(
    defaultWarehouseId || (warehouses.length > 0 ? String(warehouses[0].id) : '')
  );
  const [docType, setDocType] = useState<WarehouseDocType>('warehouse_receipt');
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState<string>('');
  const [isStocktakingActive, setIsStocktakingActive] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  // Available stock lookup for a product in a warehouse
  const getAvailableStock = useCallback(
    (productId: string, whId?: string): number => {
      const targetWh = whId || activeWarehouseId;
      if (!targetWh) return 0;
      const key = `${productId}_${targetWh}`;
      const found = warehouseStocks.find((s: any) => s && (s.id === key || (s.productId === productId && s.warehouseId === targetWh)));
      return found ? Number(found.availableStock || found.stock || 0) : 0;
    },
    [activeWarehouseId, warehouseStocks]
  );

  const getPhysicalStock = useCallback(
    (productId: string, whId?: string): number => {
      const targetWh = whId || activeWarehouseId;
      if (!targetWh) return 0;
      const key = `${productId}_${targetWh}`;
      const found = warehouseStocks.find((s: any) => s && (s.id === key || (s.productId === productId && s.warehouseId === targetWh)));
      return found ? Number(found.physicalStock || found.stock || 0) : 0;
    },
    [activeWarehouseId, warehouseStocks]
  );

  const getReservedStock = useCallback(
    (productId: string, whId?: string): number => {
      const targetWh = whId || activeWarehouseId;
      if (!targetWh) return 0;
      const key = `${productId}_${targetWh}`;
      const found = warehouseStocks.find((s: any) => s && (s.id === key || (s.productId === productId && s.warehouseId === targetWh)));
      return found ? Number(found.reservedStock || 0) : 0;
    },
    [activeWarehouseId, warehouseStocks]
  );

  const handleRecalculateStocks = useCallback(async () => {
    setIsRecalculating(true);
    try {
      await recalculateWarehouseStocks();
      await fetchWarehouseStocks();
    } finally {
      setIsRecalculating(false);
    }
  }, [recalculateWarehouseStocks, fetchWarehouseStocks]);

  const activeWarehouse = useMemo(() => {
    return warehouses.find((w: any) => String(w.id) === String(activeWarehouseId)) || null;
  }, [warehouses, activeWarehouseId]);

  return {
    warehouses,
    activeWarehouseId,
    setActiveWarehouseId,
    activeWarehouse,
    docType,
    setDocType,
    sourceWarehouseId,
    setSourceWarehouseId,
    destinationWarehouseId,
    setDestinationWarehouseId,
    isStocktakingActive,
    setIsStocktakingActive,
    isRecalculating,
    warehouseStocks,
    getAvailableStock,
    getPhysicalStock,
    getReservedStock,
    handleRecalculateStocks,
    refreshWarehouses: fetchWarehouses,
    refreshStocks: fetchWarehouseStocks
  };
}
