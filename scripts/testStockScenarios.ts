import { calculateAllWarehouseStocks, validateStockAvailability } from '../src/utils/stockLogic';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('====================================================');
console.log('🧪 RUNNING COMPREHENSIVE INVENTORY LOGIC VERIFICATION');
console.log('====================================================\n');

// 1. Initial State: Warehouse 1 has 100 physical stock for Product P1 via initial stock or purchase
const product1 = { id: 'p1', name: 'کالای تست ۱', stock: 0, unit: 'عدد', type: 'goods' };
const warehouseA = { id: 'wh_a', name: 'انبار مرکزی' };
const warehouseB = { id: 'wh_b', name: 'انبار فرعی' };

// Scenario 1: Physical = 100, Sales Invoice = 100, Remittance = 0
{
  console.log('--- SCENARIO 1: Physical 100, Sales Invoice 100, Remittance 0 ---');
  const initialReceipt = {
    id: 'rec_1',
    type: 'warehouse_receipt',
    status: 'completed',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 100, unitPrice: 1000 }]
  };
  const salesInvoice = {
    id: 'inv_1',
    type: 'sale',
    status: 'approved',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 100, unitPrice: 2000 }]
  };

  const { productSummaryMap } = calculateAllWarehouseStocks({
    products: [product1],
    warehouses: [warehouseA],
    allDocs: [initialReceipt, salesInvoice]
  });

  const p1Summary = productSummaryMap['p1'];
  assert(p1Summary.totalPhysical === 100, `Physical stock is 100 (got ${p1Summary.totalPhysical})`);
  assert(p1Summary.totalReserved === 100, `Reserved stock is 100 (got ${p1Summary.totalReserved})`);
  assert(p1Summary.totalAvailable === 0, `Available stock is 0 (got ${p1Summary.totalAvailable})`);

  const whAStock = p1Summary.warehouses['wh_a'];
  assert(whAStock.physical === 100, `Wh A Physical stock is 100`);
  assert(whAStock.reserved === 100, `Wh A Reserved stock is 100`);
  assert(whAStock.available === 0, `Wh A Available stock is 0`);

  // Validation Test: Attempting to create a second invoice for 1 unit should FAIL!
  const validation = validateStockAvailability({
    docToValidate: {
      type: 'sale',
      warehouseId: 'wh_a',
      items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 1 }],
    },
    products: [product1],
    warehouses: [warehouseA],
    allDocs: [initialReceipt, salesInvoice]
  });
  assert(!validation.valid, `Cannot sell again when available is 0 (valid = false)`);
  assert(validation.details !== undefined && validation.details.length > 0, `Shortage details populated`);
  assert(validation.details![0].availableStock === 0, `Reported available stock is 0`);
}

// Scenario 2: Partial Remittance: Invoice 100, Remittance 40 -> Physical 60, Reserved 60, Available 0
{
  console.log('\n--- SCENARIO 2: Partial Remittance (Invoice 100, Remittance 40) ---');
  const initialReceipt = {
    id: 'rec_1',
    type: 'warehouse_receipt',
    status: 'completed',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 100, unitPrice: 1000 }]
  };
  const salesInvoice = {
    id: 'inv_1',
    invoiceNumber: 'INV-100',
    type: 'sale',
    status: 'approved',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 100, unitPrice: 2000 }]
  };
  const partialRemittance = {
    id: 'rem_1',
    type: 'warehouse_remittance',
    referenceInvoiceId: 'inv_1',
    status: 'completed',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 40, unitPrice: 1000 }]
  };

  const { productSummaryMap } = calculateAllWarehouseStocks({
    products: [product1],
    warehouses: [warehouseA],
    allDocs: [initialReceipt, salesInvoice, partialRemittance]
  });

  const p1 = productSummaryMap['p1'];
  assert(p1.totalPhysical === 60, `Physical stock is 60 (got ${p1.totalPhysical})`);
  assert(p1.totalReserved === 60, `Reserved stock is 60 (got ${p1.totalReserved})`);
  assert(p1.totalAvailable === 0, `Available stock is 0 (got ${p1.totalAvailable})`);
}

// Scenario 3: Full Remittance: Invoice 100, Remittance 100 -> Physical 0, Reserved 0, Available 0
{
  console.log('\n--- SCENARIO 3: Full Remittance (Invoice 100, Remittance 100) ---');
  const initialReceipt = {
    id: 'rec_1',
    type: 'warehouse_receipt',
    status: 'completed',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 100, unitPrice: 1000 }]
  };
  const salesInvoice = {
    id: 'inv_1',
    type: 'sale',
    status: 'approved',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 100, unitPrice: 2000 }]
  };
  const fullRemittance = {
    id: 'rem_1',
    type: 'warehouse_remittance',
    referenceInvoiceId: 'inv_1',
    status: 'completed',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 100, unitPrice: 1000 }]
  };

  const { productSummaryMap } = calculateAllWarehouseStocks({
    products: [product1],
    warehouses: [warehouseA],
    allDocs: [initialReceipt, salesInvoice, fullRemittance]
  });

  const p1 = productSummaryMap['p1'];
  assert(p1.totalPhysical === 0, `Physical stock is 0 (got ${p1.totalPhysical})`);
  assert(p1.totalReserved === 0, `Reserved stock is 0 (got ${p1.totalReserved})`);
  assert(p1.totalAvailable === 0, `Available stock is 0 (got ${p1.totalAvailable})`);
}

// Scenario 4: Voided / Cancelled Invoice: Physical 100, Voided Invoice 100 -> Reserved 0, Available 100
{
  console.log('\n--- SCENARIO 4: Voided / Cancelled Invoice ---');
  const initialReceipt = {
    id: 'rec_1',
    type: 'warehouse_receipt',
    status: 'completed',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 100, unitPrice: 1000 }]
  };
  const voidedInvoice = {
    id: 'inv_1',
    type: 'sale',
    status: 'voided', // cancelled/voided
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 100, unitPrice: 2000 }]
  };

  const { productSummaryMap } = calculateAllWarehouseStocks({
    products: [product1],
    warehouses: [warehouseA],
    allDocs: [initialReceipt, voidedInvoice]
  });

  const p1 = productSummaryMap['p1'];
  assert(p1.totalPhysical === 100, `Physical stock remains 100`);
  assert(p1.totalReserved === 0, `Reserved stock is 0 when invoice is voided`);
  assert(p1.totalAvailable === 100, `Available stock is 100 when invoice is voided`);
}

// Scenario 5: Edited Invoice: Quantity reduced from 100 to 70 -> Reserved automatically updates to 70, Available 30
{
  console.log('\n--- SCENARIO 5: Edited Invoice (Modified from 100 to 70) ---');
  const initialReceipt = {
    id: 'rec_1',
    type: 'warehouse_receipt',
    status: 'completed',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 100, unitPrice: 1000 }]
  };
  const editedInvoice = {
    id: 'inv_1',
    type: 'sale',
    status: 'approved',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 70, unitPrice: 2000 }]
  };

  const { productSummaryMap } = calculateAllWarehouseStocks({
    products: [product1],
    warehouses: [warehouseA],
    allDocs: [initialReceipt, editedInvoice]
  });

  const p1 = productSummaryMap['p1'];
  assert(p1.totalPhysical === 100, `Physical stock is 100`);
  assert(p1.totalReserved === 70, `Reserved stock is automatically 70 (got ${p1.totalReserved})`);
  assert(p1.totalAvailable === 30, `Available stock is 30 (got ${p1.totalAvailable})`);

  // Testing editing in-flight: validate editing the existing invoice to 90 (which is <= 100)
  const editValidationPass = validateStockAvailability({
    docToValidate: {
      id: 'inv_1',
      type: 'sale',
      warehouseId: 'wh_a',
      items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 90 }],
    },
    products: [product1],
    warehouses: [warehouseA],
    allDocs: [initialReceipt, editedInvoice],
  });
  assert(editValidationPass.valid, `Editing invoice to 90 is valid against physical 100`);

  // Editing invoice to 110 (which > 100) must fail
  const editValidationFail = validateStockAvailability({
    docToValidate: {
      id: 'inv_1',
      type: 'sale',
      warehouseId: 'wh_a',
      items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 110 }],
    },
    products: [product1],
    warehouses: [warehouseA],
    allDocs: [initialReceipt, editedInvoice],
  });
  assert(!editValidationFail.valid, `Editing invoice to 110 fails because physical is 100`);
}

// Scenario 6: Multi-Warehouse Setup: Warehouse A has 100 physical and 40 reserved (avail 60); Warehouse B has 50 physical and 0 reserved (avail 50)
{
  console.log('\n--- SCENARIO 6: Multi-Warehouse Independence ---');
  const receiptA = {
    id: 'rec_a',
    type: 'warehouse_receipt',
    status: 'completed',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 100, unitPrice: 1000 }]
  };
  const receiptB = {
    id: 'rec_b',
    type: 'warehouse_receipt',
    status: 'completed',
    items: [{ productId: 'p1', warehouseId: 'wh_b', quantity: 50, unitPrice: 1000 }]
  };
  const invoiceA = {
    id: 'inv_a',
    type: 'sale',
    status: 'approved',
    items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 40, unitPrice: 2000 }]
  };

  const { productSummaryMap } = calculateAllWarehouseStocks({
    products: [product1],
    warehouses: [warehouseA, warehouseB],
    allDocs: [receiptA, receiptB, invoiceA]
  });

  const p1 = productSummaryMap['p1'];
  // Total across all warehouses
  assert(p1.totalPhysical === 150, `Total physical is 150`);
  assert(p1.totalReserved === 40, `Total reserved is 40`);
  assert(p1.totalAvailable === 110, `Total available is 110`);

  // Warehouse A
  const stockA = p1.warehouses['wh_a'];
  assert(stockA.physical === 100, `Wh A Physical is 100`);
  assert(stockA.reserved === 40, `Wh A Reserved is 40`);
  assert(stockA.available === 60, `Wh A Available is 60`);

  // Warehouse B
  const stockB = p1.warehouses['wh_b'];
  assert(stockB.physical === 50, `Wh B Physical is 50`);
  assert(stockB.reserved === 0, `Wh B Reserved is 0`);
  assert(stockB.available === 50, `Wh B Available is 50`);

  // Trying to sell 70 from Warehouse A should fail (only 60 available)
  const validationWhAFail = validateStockAvailability({
    docToValidate: {
      type: 'sale',
      warehouseId: 'wh_a',
      items: [{ productId: 'p1', warehouseId: 'wh_a', quantity: 70 }],
    },
    products: [product1],
    warehouses: [warehouseA, warehouseB],
    allDocs: [receiptA, receiptB, invoiceA]
  });
  assert(!validationWhAFail.valid, `Attempting to sell 70 from Wh A fails (available is 60)`);

  // Trying to sell 50 from Warehouse B should succeed (50 available)
  const validationWhBPass = validateStockAvailability({
    docToValidate: {
      type: 'sale',
      warehouseId: 'wh_b',
      items: [{ productId: 'p1', warehouseId: 'wh_b', quantity: 50 }],
    },
    products: [product1],
    warehouses: [warehouseA, warehouseB],
    allDocs: [receiptA, receiptB, invoiceA]
  });
  assert(validationWhBPass.valid, `Attempting to sell 50 from Wh B succeeds`);
}

console.log('\n====================================================');
console.log('🎉 ALL INVENTORY LOGIC TEST SCENARIOS PASSED 100%!');
console.log('====================================================\n');
