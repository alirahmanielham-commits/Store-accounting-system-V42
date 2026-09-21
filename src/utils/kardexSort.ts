// Kardex & Inventory Transaction Sorting & Ordering Engine
// Enforces strict chronological ordering and accounting business logic:
// 1. Initial Stock (موجودی اول دوره / سند افتتاحیه) is ALWAYS the first row.
// 2. Calendar Dates are sorted chronologically (earlier date first).
// 3. Within the same calendar day / timestamp:
//    Inward movements (ورود به انبار: رسید انبار، خرید، برگشت از فروش) ALWAYS precede
//    Outward movements (خروج از انبار: حواله انبار، فروش، برگشت از خرید، ضایعات)
//    Rule: کالا ابتدا وارد شده و سپس خارج می‌شود (Goods must enter before exiting).
// 4. Ties within the same direction are ordered by time-of-day, createdAt, and document number.

/**
 * Standard pure-math Jalali to Gregorian date converter (zero dependency)
 */
export function jalaliToGregorianDate(jy: number, jm: number, jd: number): Date {
  jy = jy - 979;
  jm = jm - 1;
  jd = jd - 1;

  let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4);
  for (let i = 0; i < jm; ++i) {
    j_day_no += (i < 6) ? 31 : 30;
  }
  j_day_no += jd;

  let g_day_no = j_day_no + 79;

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;

    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }

  let i = 0;
  const g_days_in_month = [31, (leap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (i = 0; i < 12 && g_day_no >= g_days_in_month[i]; ++i) {
    g_day_no -= g_days_in_month[i];
  }
  const gm = i + 1;
  const gd = g_day_no + 1;

  return new Date(gy, gm - 1, gd, 0, 0, 0, 0);
}

/**
 * Parses any date (Jalali string, Gregorian ISO, Date object, or timestamp)
 * and accurately incorporates time and createdAt to compute milliseconds timestamp.
 */
export function parseDocDateToTimestamp(dateInput: any, timeInput?: string, createdAt?: any): number {
  let ts: number | null = null;
  let isDateMidnightOnly = false;

  if (typeof dateInput === 'number' && !isNaN(dateInput) && dateInput > 10000000) {
    ts = dateInput;
  } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    ts = dateInput.getTime();
    if (dateInput.getHours() === 0 && dateInput.getMinutes() === 0 && dateInput.getSeconds() === 0) {
      isDateMidnightOnly = true;
    }
  } else if (typeof dateInput === 'string' && dateInput.trim()) {
    let s = dateInput.trim();
    // Normalize Persian and Arabic digits to ASCII
    s = s.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
         .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

    if (s.includes('T')) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        ts = d.getTime();
      }
    } else {
      const cleanSlash = s.replace(/-/g, '/');
      const parts = cleanSlash.split(/[\s/:]+/);
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);

      if (!isNaN(y) && y >= 1300 && y <= 1500 && !isNaN(m) && !isNaN(d)) {
        // Jalali date format
        const gDate = jalaliToGregorianDate(y, m, d);
        if (gDate && !isNaN(gDate.getTime())) {
          ts = gDate.getTime();
          isDateMidnightOnly = true;
        }
      } else {
        const dObj = new Date(s.replace(/\//g, '-'));
        if (!isNaN(dObj.getTime())) {
          ts = dObj.getTime();
          if (dObj.getHours() === 0 && dObj.getMinutes() === 0) {
            isDateMidnightOnly = true;
          }
        }
      }
    }
  }

  // Fallback to createdAt if dateInput could not be parsed
  if (!ts && createdAt) {
    const cTs = new Date(createdAt).getTime();
    if (!isNaN(cTs)) ts = cTs;
  }

  if (!ts) {
    ts = Date.now();
  }

  // Incorporate explicit time if present (e.g., "14:30" or "14:30:15")
  if (timeInput && typeof timeInput === 'string' && timeInput.trim()) {
    const cleanTime = timeInput.trim()
      .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
      .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
    const tParts = cleanTime.split(':').map(p => parseInt(p, 10));
    if (tParts.length >= 2 && !isNaN(tParts[0]) && !isNaN(tParts[1])) {
      const d = new Date(ts);
      d.setHours(tParts[0], tParts[1], !isNaN(tParts[2]) ? tParts[2] : 0, 0);
      ts = d.getTime();
      isDateMidnightOnly = false;
    }
  } else if (isDateMidnightOnly && createdAt) {
    // If date was specified as a calendar date without time, borrow hours/minutes/seconds from createdAt
    const cDate = new Date(createdAt);
    if (!isNaN(cDate.getTime())) {
      const d = new Date(ts);
      d.setHours(cDate.getHours(), cDate.getMinutes(), cDate.getSeconds(), cDate.getMilliseconds());
      ts = d.getTime();
    }
  }

  return ts;
}

/**
 * Returns document priority for Kardex sorting:
 * Lower number = higher priority (comes first).
 *
 * Priorities:
 * 0: Initial stock (موجودی اول دوره) - always top
 * 10..15: Inward movements (ورود به انبار: رسید انبار، خرید، برگشت از فروش)
 * 20..25: Outward movements (خروج از انبار: حواله انبار، فروش، برگشت از خرید، ضایعات)
 */
export function getDocumentTypePriority(docType?: string, direction?: string): number {
  const dt = String(docType || '').toLowerCase();
  const dir = String(direction || '').toLowerCase();

  // 1. Initial stock is ALWAYS highest priority (0)
  if (dt === 'initial_stock' || dt === 'opening_stock' || dt === 'opn') return 0;

  // 2. Inwards (ورود به انبار): 10 to 19
  if (dt === 'warehouse_receipt' || dt === 'receipt') return 10;
  if (dt === 'purchase' || dt === 'purchase_invoice') return 11;
  if (dt === 'sales_return' || dt === 'sale_return') return 12;
  if (dir === 'in') return 15;

  // 3. Outwards (خروج از انبار): 20 to 29
  if (dt === 'warehouse_remittance' || dt === 'remittance') return 20;
  if (dt === 'sale' || dt === 'sales_invoice') return 21;
  if (dt === 'purchase_return') return 22;
  if (dt === 'waste') return 23;
  if (dir === 'out') return 25;

  return 30;
}

/**
 * Chronological Kardex Comparator
 * Guarantees that:
 * 1. Initial stock is always first.
 * 2. Earlier calendar dates precede later dates.
 * 3. On the same calendar day, Inward (رسید ورود) ALWAYS precedes Outward (حواله خروج).
 * 4. Ties within the same category are broken by exact time, createdAt, and document number.
 */
export function compareKardexTransactions(a: any, b: any): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // 1. Initial Stock check (موجودی اول دوره)
  const aIsInit = a.documentType === 'initial_stock' || a.documentType === 'opening_stock' || a.type === 'initial_stock';
  const bIsInit = b.documentType === 'initial_stock' || b.documentType === 'opening_stock' || b.type === 'initial_stock';
  if (aIsInit && !bIsInit) return -1;
  if (!aIsInit && bIsInit) return 1;
  if (aIsInit && bIsInit) return 0;

  // 2. Compare Timestamps
  const tsA = Number(a.timestamp) || parseDocDateToTimestamp(a.date, a.time, a.createdAt);
  const tsB = Number(b.timestamp) || parseDocDateToTimestamp(b.date, b.time, b.createdAt);

  // Check if they are on different calendar days
  const dateA = new Date(tsA);
  const dateB = new Date(tsB);

  const calDayA = `${dateA.getFullYear()}-${String(dateA.getMonth() + 1).padStart(2, '0')}-${String(dateA.getDate()).padStart(2, '0')}`;
  const calDayB = `${dateB.getFullYear()}-${String(dateB.getMonth() + 1).padStart(2, '0')}-${String(dateB.getDate()).padStart(2, '0')}`;

  if (calDayA !== calDayB) {
    return calDayA.localeCompare(calDayB);
  }

  // 3. Within the SAME calendar day:
  // INWARD (ورود / رسید) MUST ALWAYS PRECEDE OUTWARD (خروج / حواله)!
  // "کالا ابتدا وارد شده و سپس خارج شده"
  const prioA = getDocumentTypePriority(a.documentType || a.type, a.type);
  const prioB = getDocumentTypePriority(b.documentType || b.type, b.type);

  if (prioA !== prioB) {
    return prioA - prioB;
  }

  // 4. Same direction/priority on the same day:
  // Check exact time-of-day timestamps
  if (tsA !== tsB) {
    return tsA - tsB;
  }

  // Check createdAt if available
  if (a.createdAt && b.createdAt) {
    const cA = new Date(a.createdAt).getTime();
    const cB = new Date(b.createdAt).getTime();
    if (cA !== cB && !isNaN(cA) && !isNaN(cB)) {
      return cA - cB;
    }
  }

  // Check document numbers (e.g., #1 before #2)
  const numA = parseInt(String(a.documentNumber || a.invoiceNumber || '').replace(/\D/g, ''), 10);
  const numB = parseInt(String(b.documentNumber || b.invoiceNumber || '').replace(/\D/g, ''), 10);
  if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
    return numA - numB;
  }

  return String(a.id || '').localeCompare(String(b.id || ''));
}
