import { describe, test, expect } from 'vitest';
import {
  getUnitRatioDirection,
  convertQuantityToBaseUnit,
  getPriceForSelectedUnit,
  convertPriceToBaseUnit,
  formatUnitConversionFormula
} from '../../src/utils/unitConversion';

describe('Unit Conversion Logic — Bidirectional & Multi-Unit Calculations', () => {
  describe('getUnitRatioDirection', () => {
    test('detects main_to_secondary for branch/pipe/bundle keywords (شاخه -> متر)', () => {
      const dir = getUnitRatioDirection(null, 'شاخه', 'متر');
      expect(dir).toBe('main_to_secondary');
    });

    test('detects main_to_secondary for کلاف -> متر', () => {
      const dir = getUnitRatioDirection(null, 'کلاف', 'متر');
      expect(dir).toBe('main_to_secondary');
    });

    test('detects secondary_to_main for packaging units (کارتن -> عدد)', () => {
      const dir = getUnitRatioDirection(null, 'عدد', 'کارتن');
      expect(dir).toBe('secondary_to_main');
    });

    test('respects explicit unitRatioDirection property on product', () => {
      const product = { unitRatioDirection: 'main_to_secondary' as const };
      const dir = getUnitRatioDirection(product, 'بسته', 'عدد');
      expect(dir).toBe('main_to_secondary');
    });
  });

  describe('convertQuantityToBaseUnit', () => {
    test('returns exact quantity if selected unit is main unit (isSecondaryUnit: false)', () => {
      expect(convertQuantityToBaseUnit(10, false, 24, 'secondary_to_main')).toBe(10);
    });

    test('returns exact quantity if ratio is invalid or missing', () => {
      expect(convertQuantityToBaseUnit(10, true, 0, 'secondary_to_main')).toBe(10);
      expect(convertQuantityToBaseUnit(10, true, -5, 'secondary_to_main')).toBe(10);
    });

    test('converts secondary to main for packaging (2 cartons * 24 = 48 pieces)', () => {
      // 1 carton = 24 pieces
      const baseQty = convertQuantityToBaseUnit(2, true, 24, 'secondary_to_main');
      expect(baseQty).toBe(48);
    });

    test('converts secondary to main for subdivision (12 meters / 6 = 2 branches)', () => {
      // 1 branch = 6 meters -> 12 meters sold = 2 branches base
      const baseQty = convertQuantityToBaseUnit(12, true, 6, 'main_to_secondary');
      expect(baseQty).toBe(2);
    });

    test('handles decimal quantities accurately', () => {
      // 3.5 cartons * 10 = 35 pieces
      expect(convertQuantityToBaseUnit(3.5, true, 10, 'secondary_to_main')).toBe(35);
      // 9 meters / 6 = 1.5 branches
      expect(convertQuantityToBaseUnit(9, true, 6, 'main_to_secondary')).toBe(1.5);
    });
  });

  describe('getPriceForSelectedUnit', () => {
    test('returns base unit price if not secondary unit', () => {
      expect(getPriceForSelectedUnit(50000, false, 12, 'secondary_to_main')).toBe(50000);
    });

    test('multiplies base price for packaging unit (base piece 1,000 * 24 = 24,000 per carton)', () => {
      const price = getPriceForSelectedUnit(1000, true, 24, 'secondary_to_main');
      expect(price).toBe(24000);
    });

    test('divides base price for subdivision unit (branch 600,000 / 6 = 100,000 per meter)', () => {
      const price = getPriceForSelectedUnit(600000, true, 6, 'main_to_secondary');
      expect(price).toBe(100000);
    });
  });

  describe('convertPriceToBaseUnit', () => {
    test('calculates base unit price when secondary carton price is provided', () => {
      // 1 carton (24 pcs) bought at 240,000 -> 10,000 per piece
      const basePrice = convertPriceToBaseUnit(240000, true, 24, 'secondary_to_main');
      expect(basePrice).toBe(10000);
    });

    test('calculates base unit price when meter price is provided', () => {
      // 1 meter bought at 100,000 (where 1 branch = 6 meters) -> 600,000 per branch
      const basePrice = convertPriceToBaseUnit(100000, true, 6, 'main_to_secondary');
      expect(basePrice).toBe(600000);
    });
  });

  describe('formatUnitConversionFormula', () => {
    test('formats default display formula without persian translator', () => {
      const formula = formatUnitConversionFormula('شاخه', 'متر', 6, 'main_to_secondary');
      expect(formula).toBe('۱ شاخه = 6 متر');
    });

    test('formats display formula with persian number formatter', () => {
      const toPersian = (val: any) => String(val).replace('6', '۶').replace('24', '۲۴');
      const formula1 = formatUnitConversionFormula('شاخه', 'متر', 6, 'main_to_secondary', toPersian);
      expect(formula1).toBe('۱ شاخه = ۶ متر');

      const formula2 = formatUnitConversionFormula('عدد', 'کارتن', 24, 'secondary_to_main', toPersian);
      expect(formula2).toBe('۱ کارتن = ۲۴ عدد');
    });
  });
});
