import { Product } from '../types';

export type UnitRatioDirection = 'main_to_secondary' | 'secondary_to_main';

/**
 * Determines whether the conversion formula is:
 * - 'main_to_secondary': 1 [Main] = ratio * [Secondary] (e.g. 1 شاخه = 6 متر, 1 کلاف = 100 متر)
 * - 'secondary_to_main': 1 [Secondary] = ratio * [Main] (e.g. 1 کارتن = 24 عدد, 1 بسته = 10 عدد)
 */
export function getUnitRatioDirection(
  product?: Partial<Product> | null,
  mainUnit?: string,
  secondaryUnit?: string
): UnitRatioDirection {
  if (product?.unitRatioDirection) {
    return product.unitRatioDirection;
  }

  const main = (mainUnit || product?.unit || '').trim().toLowerCase();
  const sec = (secondaryUnit || product?.secondaryUnit || '').trim().toLowerCase();

  // Pipe and bundle keywords where 1 Main Unit contains multiple Secondary Units (meters/kg)
  const isBranchLikeMain = ['شاخه', 'کلاف', 'بندیل', 'رول', 'طاقه'].some(k => main.includes(k));
  const isSubDivisionSec = ['متر', 'کیلوگرم', 'کیلو', 'گرم', 'سانت', 'سانتی‌متر', 'cm', 'm', 'kg'].some(k => sec.includes(k));

  if (isBranchLikeMain && isSubDivisionSec) {
    return 'main_to_secondary';
  }

  // Default to secondary_to_main (1 carton = 24 pieces)
  return 'secondary_to_main';
}

/**
 * Converts a quantity from selected unit to base (main) inventory unit.
 */
export function convertQuantityToBaseUnit(
  quantity: number,
  isSecondaryUnit: boolean,
  unitRatio?: number,
  direction?: UnitRatioDirection
): number {
  const qty = Number(quantity) || 0;
  if (!isSecondaryUnit || !unitRatio || unitRatio <= 0) {
    return qty;
  }

  if (direction === 'main_to_secondary') {
    // e.g. 1 شاخه = 6 متر. If selling 6 meters (secondary), that equals 6 / 6 = 1 شاخه (base).
    return qty / unitRatio;
  } else {
    // e.g. 1 کارتن = 24 عدد. If selling 2 cartons (secondary), that equals 2 * 24 = 48 عدد (base).
    return qty * unitRatio;
  }
}

/**
 * Calculates the price per unit based on whether the selected unit is main or secondary.
 * @param baseUnitPrice Price for 1 Main Unit
 */
export function getPriceForSelectedUnit(
  baseUnitPrice: number,
  isSecondaryUnit: boolean,
  unitRatio?: number,
  direction?: UnitRatioDirection
): number {
  const base = Number(baseUnitPrice) || 0;
  if (!isSecondaryUnit || !unitRatio || unitRatio <= 0) {
    return base;
  }

  if (direction === 'main_to_secondary') {
    // e.g. 1 شاخه = 6 متر, price per branch = 600,000 T.
    // Price per 1 meter (secondary) = 600,000 / 6 = 100,000 T.
    return Number((base / unitRatio).toFixed(2));
  } else {
    // e.g. 1 کارتن = 24 عدد, price per piece = 1,000 T.
    // Price per 1 carton (secondary) = 1,000 * 24 = 24,000 T.
    return Number((base * unitRatio).toFixed(2));
  }
}

/**
 * Calculates the price per 1 Main (Base) Unit from a given price in the selected unit.
 * e.g. If bought 1 carton (24 pcs) at 240,000 T, base unit price = 240,000 / 24 = 10,000 T.
 * e.g. If bought 1 meter (where 1 branch = 6 meters) at 100,000 T, base unit price = 100,000 * 6 = 600,000 T.
 */
export function convertPriceToBaseUnit(
  selectedUnitPrice: number,
  isSecondaryUnit: boolean,
  unitRatio?: number,
  direction?: UnitRatioDirection
): number {
  const price = Number(selectedUnitPrice) || 0;
  if (!isSecondaryUnit || !unitRatio || unitRatio <= 0) {
    return price;
  }

  if (direction === 'main_to_secondary') {
    return Number((price * unitRatio).toFixed(4));
  } else {
    return Number((price / unitRatio).toFixed(4));
  }
}

/**
 * Formats a human-readable conversion formula for display
 * e.g. "۱ شاخه = ۶ متر" or "۱ کارتن = ۲۴ عدد"
 */
export function formatUnitConversionFormula(
  mainUnit: string,
  secondaryUnit: string,
  unitRatio: number,
  direction: UnitRatioDirection,
  toPersianFn?: (val: any) => string
): string {
  const ratioStr = toPersianFn ? toPersianFn(unitRatio) : String(unitRatio);
  if (direction === 'main_to_secondary') {
    return `۱ ${mainUnit} = ${ratioStr} ${secondaryUnit}`;
  } else {
    return `۱ ${secondaryUnit} = ${ratioStr} ${mainUnit}`;
  }
}
