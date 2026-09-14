with open('src/components/modals/ProductCardModal.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Imports
imp_old = "import { addCommas, toPersianDigits, formatDateDisplay, formatAmount } from '../../utils/format';"
imp_new = "import { addCommas, toPersianDigits, formatDateDisplay, formatAmount } from '../../utils/format';\nimport { getUnitRatioDirection, getPriceForSelectedUnit, convertQuantityToBaseUnit, formatUnitConversionFormula } from '../../utils/unitConversion';"
assert imp_old in c, "imp_old not found"
c = c.replace(imp_old, imp_new, 1)

# 2. History quantity and price
h_old = """                 let qty = Number(item.quantity) || 0;
                 let uPrice = item.unitPrice;
                 if (item.isSecondaryUnit && product.unitRatio && product.unitRatio > 0) {
                    qty = qty * product.unitRatio;
                    uPrice = Number((Number(uPrice) / product.unitRatio).toFixed(4));
                 }"""
h_new = """                 const dir = product.unitRatioDirection || getUnitRatioDirection(product);
                 let qty = Number(item.quantity) || 0;
                 let uPrice = item.unitPrice;
                 if (item.isSecondaryUnit && product.unitRatio && product.unitRatio > 0) {
                    qty = convertQuantityToBaseUnit(qty, true, product.unitRatio, dir);
                    uPrice = getPriceForSelectedUnit(uPrice, false, product.unitRatio, dir);
                 }"""
assert h_old in c, "h_old not found"
c = c.replace(h_old, h_new, 1)

# 3. Stock badge
st_old = """                      {product.secondaryUnit && product.unitRatio && !loading && calculatedStock >= product.unitRatio && (
                        <div className="text-[10px] text-amber-700 mt-1 font-bold z-10 relative">
                          معادل {Math.floor(calculatedStock / product.unitRatio)} {product.secondaryUnit} و {calculatedStock % product.unitRatio} {product.unit}
                        </div>
                      )}"""
st_new = """                      {product.secondaryUnit && product.unitRatio && !loading && (
                        <div className="text-[10px] text-amber-700 mt-1 font-bold z-10 relative">
                          {(() => {
                            const dir = product.unitRatioDirection || getUnitRatioDirection(product);
                            if (dir === 'main_to_secondary') {
                              return `معادل ${toPersianDigits(calculatedStock * product.unitRatio)} ${product.secondaryUnit}`;
                            } else {
                              if (calculatedStock >= product.unitRatio) {
                                return `معادل ${toPersianDigits(Math.floor(calculatedStock / product.unitRatio))} ${product.secondaryUnit} و ${toPersianDigits(calculatedStock % product.unitRatio)} ${product.unit}`;
                              }
                              return `کمتر از ۱ ${product.secondaryUnit}`;
                            }
                          })()}
                        </div>
                      )}"""
assert st_old in c, "st_old not found"
c = c.replace(st_old, st_new, 1)

# 4. Product specs row
spec_old = """<span className="text-sm font-bold text-gray-800">{product.unit || 'عدد'} {product.secondaryUnit ? ` / ${product.secondaryUnit} (نسبت: ${product.unitRatio})` : ''}</span>"""
spec_new = """<span className="text-sm font-bold text-gray-800">
                        {product.unit || 'عدد'}
                        {product.secondaryUnit ? ` / ${product.secondaryUnit} (${formatUnitConversionFormula(product.unit || 'عدد', product.secondaryUnit, product.unitRatio || 1, product.unitRatioDirection || getUnitRatioDirection(product), toPersianDigits)})` : ''}
                      </span>"""
assert spec_old in c, "spec_old not found"
c = c.replace(spec_old, spec_new, 1)

with open('src/components/modals/ProductCardModal.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated ProductCardModal.tsx successfully!')
