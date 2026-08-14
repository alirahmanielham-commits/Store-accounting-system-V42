export function generateEan13Checksum(barcode12: string): string {
    if (barcode12.length !== 12) {
        throw new Error("EAN-13 base must be exactly 12 digits");
    }
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(barcode12[i], 10);
        sum += (i % 2 === 0) ? digit : digit * 3;
    }
    
    const remainder = sum % 10;
    const checksum = remainder === 0 ? 0 : 10 - remainder;
    return checksum.toString();
}

export function generateEAN13(prefix: string, serial: string): string {
    const base = (prefix + serial).padStart(12, '0').slice(0, 12);
    return base + generateEan13Checksum(base);
}
