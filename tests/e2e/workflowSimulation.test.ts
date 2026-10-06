import { describe, test, expect } from 'vitest';
import { convertQuantityToBaseUnit, getPriceForSelectedUnit } from '../../src/utils/unitConversion';
import { calculateAllWarehouseStocks, validateStockAvailability } from '../../src/utils/stockLogic';

function validateAccountingVoucher(doc: {
  items?: Array<{ debit?: number; credit?: number; description?: string; ledgerAccountId?: string }>;
}) {
  if (!doc.items || !Array.isArray(doc.items) || doc.items.length < 2) {
    throw new Error('سند حسابداری باید حداقل شامل دو آرتیکل باشد.');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const it of doc.items) {
    const debit = Number(it.debit) || 0;
    const credit = Number(it.credit) || 0;
    totalDebit += debit;
    totalCredit += credit;
  }

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(
      `سند حسابداری تراز نیست. جمع بدهکار (${totalDebit.toLocaleString()}) با جمع بستانکار (${totalCredit.toLocaleString()}) مغایرت دارد.`
    );
  }

  return {
    valid: true,
    totalDebit,
    totalCredit,
    articleCount: doc.items.length
  };
}

describe('E2E Workflow Simulation — Core Business Lifecycle', () => {
  test('Complete End-to-End Cycle: Inbound Stock -> Multi-Unit Invoice -> Stock Reservation -> Remittance -> Double-Entry Balancing -> Payment Settlement', () => {
    // 1. Setup Master Data
    const customer = { id: 'cust-101', name: 'شرکت صنعتی پیشرو', mobile: '09121112233' };
    const warehouse = { id: 'wh-main', name: 'انبار مرکزی' };
    const product = {
      id: 'prod-pipe',
      name: 'لوله پلی‌اتیلن ۶۳',
      unit: 'شاخه',
      secondaryUnit: 'متر',
      unitRatio: 6,
      unitRatioDirection: 'main_to_secondary' as const,
      purchasePrice: 600000, // 600,000 T per branch
      stock: 0
    };

    // 2. Initial Inbound Receipt (Warehouse Receipt) bringing 100 branches into stock
    const inboundReceipt = {
      id: 'rec-101',
      type: 'warehouse_receipt',
      date: '2024-04-01',
      warehouseId: warehouse.id,
      items: [{ productId: product.id, quantity: 100 }]
    };

    const initialStockCalc = calculateAllWarehouseStocks({
      products: [product],
      warehouses: [warehouse],
      allDocs: [inboundReceipt]
    });

    const initialStock = initialStockCalc.stocksMap[`${product.id}_${warehouse.id}`];
    expect(initialStock.physicalStock).toBe(100);
    expect(initialStock.availableStock).toBe(100);
    expect(initialStock.reservedStock).toBe(0);

    // 3. Customer orders 24 meters (secondary unit)
    // Convert 24 meters -> 24 / 6 = 4 branches (base unit)
    const orderedMeters = 24;
    const baseQuantity = convertQuantityToBaseUnit(
      orderedMeters,
      true,
      product.unitRatio,
      product.unitRatioDirection
    );
    expect(baseQuantity).toBe(4);

    // Price per meter = 600,000 / 6 = 100,000 T
    const pricePerMeter = getPriceForSelectedUnit(
      product.purchasePrice,
      true,
      product.unitRatio,
      product.unitRatioDirection
    );
    expect(pricePerMeter).toBe(100000);
    const invoiceTotal = orderedMeters * pricePerMeter; // 24 * 100,000 = 2,400,000 T
    expect(invoiceTotal).toBe(2400000);

    // 4. Validate Stock Availability before issuing Sales Invoice
    const salesInvoice = {
      id: 'inv-sale-101',
      type: 'sale',
      invoiceNumber: 'INV-1403-001',
      date: '2024-04-05',
      customerId: customer.id,
      warehouseId: warehouse.id,
      status: 'confirmed',
      items: [{ productId: product.id, quantity: baseQuantity }]
    };

    const stockValidation = validateStockAvailability({
      docToValidate: salesInvoice,
      products: [product],
      warehouses: [warehouse],
      allDocs: [inboundReceipt],
      allowNegativeStock: false
    });
    expect(stockValidation.valid).toBe(true);

    // 5. Post Sales Invoice -> Stocks recalculate: physical is still 100, reserved is 4, available is 96
    const postInvoiceStockCalc = calculateAllWarehouseStocks({
      products: [product],
      warehouses: [warehouse],
      allDocs: [inboundReceipt, salesInvoice]
    });

    const reservedStock = postInvoiceStockCalc.stocksMap[`${product.id}_${warehouse.id}`];
    expect(reservedStock.physicalStock).toBe(100);
    expect(reservedStock.reservedStock).toBe(4);
    expect(reservedStock.availableStock).toBe(96);

    // 6. Generate Balanced Double-Entry Accounting Document for Sales Invoice
    // Debtor: Accounts Receivable (Customer) = 2,400,000
    // Creditor: Sales Revenue = 2,400,000
    const salesVoucher = {
      id: 'acc-doc-101',
      sourceType: 'invoice',
      sourceId: salesInvoice.id,
      items: [
        {
          debit: invoiceTotal,
          credit: 0,
          description: `بدهکار: ${customer.name}`,
          ledgerAccountId: '1101' // Accounts Receivable
        },
        {
          debit: 0,
          credit: invoiceTotal,
          description: `بستانکار: درآمد حاصل از فروش کالا`,
          ledgerAccountId: '4101' // Sales Revenue
        }
      ]
    };

    const salesVoucherValidation = validateAccountingVoucher(salesVoucher);
    expect(salesVoucherValidation.valid).toBe(true);
    expect(salesVoucherValidation.totalDebit).toBe(invoiceTotal);
    expect(salesVoucherValidation.totalCredit).toBe(invoiceTotal);

    // 7. Warehouse Remittance is issued to deliver the 4 branches physically
    const remittance = {
      id: 'rem-101',
      type: 'warehouse_remittance',
      date: '2024-04-06',
      invoiceId: salesInvoice.id,
      warehouseId: warehouse.id,
      items: [{ productId: product.id, quantity: baseQuantity }]
    };

    const postRemittanceCalc = calculateAllWarehouseStocks({
      products: [product],
      warehouses: [warehouse],
      allDocs: [inboundReceipt, salesInvoice, remittance]
    });

    const finalizedStock = postRemittanceCalc.stocksMap[`${product.id}_${warehouse.id}`];
    expect(finalizedStock.physicalStock).toBe(96); // Physical deducted
    expect(finalizedStock.reservedStock).toBe(0);   // Reservation cleared
    expect(finalizedStock.availableStock).toBe(96);

    // 8. Settlement: Customer pays 2,400,000 via Bank Transfer
    // Debtor: Bank = 2,400,000
    // Creditor: Accounts Receivable (Customer) = 2,400,000
    const settlementVoucher = {
      id: 'acc-doc-102',
      sourceType: 'transaction',
      items: [
        {
          debit: invoiceTotal,
          credit: 0,
          description: 'بدهکار: بانک سامان',
          ledgerAccountId: '1002' // Bank
        },
        {
          debit: 0,
          credit: invoiceTotal,
          description: `بستانکار: تسویه طرف حساب ${customer.name}`,
          ledgerAccountId: '1101' // Accounts Receivable
        }
      ]
    };

    const settlementValidation = validateAccountingVoucher(settlementVoucher);
    expect(settlementValidation.valid).toBe(true);
    expect(settlementValidation.totalDebit).toBe(invoiceTotal);
    expect(settlementValidation.totalCredit).toBe(invoiceTotal);
  });
});
