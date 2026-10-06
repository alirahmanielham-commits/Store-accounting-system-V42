import { describe, test, expect } from 'vitest';
import { calculateAllProductsWAC } from '../../src/services/cogsService';
import { calculateAllWarehouseStocks, validateStockAvailability } from '../../src/utils/stockLogic';

describe('COGS & Inventory Engine — Weighted Average Cost & Kardex Reservance', () => {
  describe('Moving Weighted Average Cost (WAC / میانگین وزنی متحرک)', () => {
    test('calculates correct moving weighted average on successive purchases', () => {
      const products = [
        {
          id: 'p1',
          name: 'روغن موتور',
          stock: 10,
          purchasePrice: 100000 // Initial 10 units @ 100,000 = 1,000,000 T
        }
      ];

      const invoices = [
        {
          id: 'inv-buy-1',
          type: 'purchase',
          date: '2024-04-10',
          items: [
            {
              productId: 'p1',
              quantity: 20,
              unitPrice: 160000 // Inbound 20 units @ 160,000 = 3,200,000 T
            }
          ]
        }
      ];

      const summaries = calculateAllProductsWAC(products, invoices, []);
      const summary = summaries.get('p1');

      expect(summary).toBeDefined();
      expect(summary?.currentStock).toBe(30);
      expect(summary?.totalInventoryValue).toBe(4200000);
      // New WAC = (1,000,000 + 3,200,000) / 30 = 140,000
      expect(summary?.weightedAverageCost).toBe(140000);
      expect(summary?.latestPurchasePrice).toBe(160000);
    });

    test('maintains initial unit cost if no new purchases occurred', () => {
      const products = [
        {
          id: 'p2',
          name: 'فیلتر هوا',
          stock: 5,
          purchasePrice: 50000
        }
      ];

      const summaries = calculateAllProductsWAC(products, [], []);
      const summary = summaries.get('p2');

      expect(summary?.weightedAverageCost).toBe(50000);
      expect(summary?.currentStock).toBe(5);
      expect(summary?.totalInventoryValue).toBe(250000);
    });
  });

  describe('Warehouse Stock Reservance & Kardex Available Stock', () => {
    const mockWarehouses = [{ id: 'wh-main', name: 'انبار مرکزی' }];
    const mockProducts = [
      {
        id: 'prod-10',
        name: 'لاستیک بارز',
        warehouseId: 'wh-main',
        stock: 0,
        purchasePrice: 1000000
      }
    ];

    test('sales invoice creates reserved stock without reducing physical stock until remitted', () => {
      const mockDocs = [
        // Purchase (receipt) brings in 50 physical stock
        {
          id: 'rec-1',
          type: 'warehouse_receipt',
          date: '2024-04-01',
          warehouseId: 'wh-main',
          items: [{ productId: 'prod-10', quantity: 50 }]
        },
        // Unremitted sales invoice for 15 units
        {
          id: 'inv-sale-1',
          type: 'sale',
          date: '2024-04-05',
          warehouseId: 'wh-main',
          status: 'confirmed',
          items: [{ productId: 'prod-10', quantity: 15 }]
        }
      ];

      const result = calculateAllWarehouseStocks({
        products: mockProducts,
        warehouses: mockWarehouses,
        allDocs: mockDocs
      });

      const stock = result.stocksMap['prod-10_wh-main'];
      expect(stock).toBeDefined();
      expect(stock.physicalStock).toBe(50);
      expect(stock.reservedStock).toBe(15);
      expect(stock.availableStock).toBe(35); // 50 - 15 = 35 available
    });

    test('warehouse remittance releases reserved stock and reduces physical stock', () => {
      const mockDocs = [
        // Inbound 50
        {
          id: 'rec-1',
          type: 'warehouse_receipt',
          date: '2024-04-01',
          warehouseId: 'wh-main',
          items: [{ productId: 'prod-10', quantity: 50 }]
        },
        // Invoice for 20
        {
          id: 'inv-sale-2',
          type: 'sale',
          date: '2024-04-05',
          warehouseId: 'wh-main',
          status: 'confirmed',
          items: [{ productId: 'prod-10', quantity: 20 }]
        },
        // Remittance for 20 fulfilling inv-sale-2
        {
          id: 'rem-1',
          type: 'warehouse_remittance',
          date: '2024-04-06',
          invoiceId: 'inv-sale-2',
          warehouseId: 'wh-main',
          items: [{ productId: 'prod-10', quantity: 20 }]
        }
      ];

      const result = calculateAllWarehouseStocks({
        products: mockProducts,
        warehouses: mockWarehouses,
        allDocs: mockDocs
      });

      const stock = result.stocksMap['prod-10_wh-main'];
      expect(stock.physicalStock).toBe(30); // 50 - 20
      expect(stock.reservedStock).toBe(0);  // fully remitted
      expect(stock.availableStock).toBe(30);
    });

    test('validateStockAvailability rejects order when requested quantity exceeds available stock', () => {
      const mockDocs = [
        {
          id: 'rec-1',
          type: 'warehouse_receipt',
          date: '2024-04-01',
          warehouseId: 'wh-main',
          items: [{ productId: 'prod-10', quantity: 10 }]
        }
      ];

      // Requesting 15 when only 10 are available
      const docToValidate = {
        type: 'sale',
        warehouseId: 'wh-main',
        items: [{ productId: 'prod-10', quantity: 15 }]
      };

      const valResult = validateStockAvailability({
        docToValidate,
        products: mockProducts,
        warehouses: mockWarehouses,
        allDocs: mockDocs,
        allowNegativeStock: false
      });

      expect(valResult.valid).toBe(false);
      expect(valResult.details?.[0].availableStock).toBe(10);
      expect(valResult.details?.[0].requestedQty).toBe(15);
    });

    test('validateStockAvailability approves order when available stock is sufficient', () => {
      const mockDocs = [
        {
          id: 'rec-1',
          type: 'warehouse_receipt',
          date: '2024-04-01',
          warehouseId: 'wh-main',
          items: [{ productId: 'prod-10', quantity: 25 }]
        }
      ];

      const docToValidate = {
        type: 'sale',
        warehouseId: 'wh-main',
        items: [{ productId: 'prod-10', quantity: 10 }]
      };

      const valResult = validateStockAvailability({
        docToValidate,
        products: mockProducts,
        warehouses: mockWarehouses,
        allDocs: mockDocs,
        allowNegativeStock: false
      });

      expect(valResult.valid).toBe(true);
    });
  });
});
