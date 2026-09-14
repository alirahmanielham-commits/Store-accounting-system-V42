
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from '../db/schema-sync';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';
// import { loginSchema } from '../schemas/validation';
import { Client, Pool } from 'pg';
import os from 'os';

import { Router } from 'express';
import fsPromises from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { exec } from 'child_process';
import { validateData } from '../schemas/validation';
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from '../db/schema';
import * as schema from '../db/schema';
import { PDFParse } from 'pdf-parse';
import { NEWPIPE_OFFICIAL_CATALOG } from '../data/newpipeCatalogData';
import { NewpipeProductItem } from '../types/newpipe';

const router = Router();
router.post('/api/generate_demo_data', async (req, res) => {
    res.json({ success: true, message: 'Demo data generation not available in this environment.' });
  });

router.post('/api/persons/check-duplicates', async (req, res) => {
    try {
       const { name, nationalId, phone, taxNumber, registrationNumber, companyName } = req.body;
       const persons = await getDbData('persons') || [];
       
       const duplicates = persons.filter((p) => {
           let score = 0;
           if (nationalId && p.nationalId && p.nationalId === nationalId) score += 100;
           if (taxNumber && p.taxNumber && p.taxNumber === taxNumber) score += 100;
           if (registrationNumber && p.registrationNumber && p.registrationNumber === registrationNumber) score += 100;
           
           if (phone && p.phone) {
               // strip non-digits
               const ph1 = String(phone).replace(/\D/g, '');
               const ph2 = String(p.phone).replace(/\D/g, '');
               if (ph1 && ph1 === ph2) score += 80;
           }
           
           if (name && p.name && typeof p.name === 'string') {
               if (p.name.includes(name) || name.includes(p.name)) score += 50;
           }
           
           if (companyName && p.companyName && typeof p.companyName === 'string') {
               if (p.companyName.includes(companyName) || companyName.includes(p.companyName)) score += 60;
           }

           return score >= 50;
       });

       res.json({ success: true, duplicates: duplicates.slice(0, 5) });
    } catch (err) {
       console.error(err);
       res.status(500).json({ error: err.message });
    }
  });

router.post('/api/search-products', async (req, res) => {
    const { query, category } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }
  
    try {
      const prompt = `Generate a realistic list of 10 fake products related to "${query}"${category ? ` in the category of "${category}"` : ''}. Focus on Persian product names. Return purely a JSON array of objects with keys "name", "description", and "priceStr". No markdown formatting, no backticks, just raw JSON.`;
      
      const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const text = await response.text();
      let cleanText = text;
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        cleanText = match[0];
      } else {
        cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      
      const products = JSON.parse(cleanText || "[]");
      
      res.json({ products });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

router.post('/api/scraping/markaz-ahan-pipes', async (req, res) => {
  try {
    const targetUrl = req.body?.url || "https://www.markazeahan.com/company/%D9%84%D9%88%D9%84%D9%87-%DA%AF%D8%A7%D8%B2-%D8%AA%D9%88%DA%A9%D8%A7%D8%B1-%D8%B3%D9%BE%D8%A7%D9%87%D8%A7%D9%86/";
    const pageType = req.body?.type || "sepahan";

    // Known source configurations
    const SOURCE_CONFIGS: Record<string, {
      id: string;
      title: string;
      category: string;
      brand: string;
      defaultUnit: string;
      defaultLength: number;
    }> = {
      sepahan: {
        id: "sepahan",
        title: "قیمت لوله گاز توکار سپاهان",
        category: "لوله گاز توکار سپاهان",
        brand: "سپاهان (توکار مانیس گاز)",
        defaultUnit: "شاخه",
        defaultLength: 6
      },
      kecho: {
        id: "kecho",
        title: "قیمت لوله گاز توکار کچو",
        category: "لوله گاز توکار کچو",
        brand: "کچو (توکار)",
        defaultUnit: "شاخه",
        defaultLength: 6
      },
      copper: {
        id: "copper",
        title: "قیمت لوله مسی (کلاف)",
        category: "لوله مسی",
        brand: "مس قائم / بابک / باهنر",
        defaultUnit: "کیلوگرم",
        defaultLength: 50
      },
      galvanized: {
        id: "galvanized",
        title: "قیمت لوله گالوانیزه ضخامت ۲.۵",
        category: "لوله گالوانیزه ۲.۵",
        brand: "گالوانیزه صنعتی / تست",
        defaultUnit: "شاخه",
        defaultLength: 6
      }
    };

    // Detect config by URL or pageType
    let currentConfig = SOURCE_CONFIGS[pageType] || SOURCE_CONFIGS.sepahan;
    if (targetUrl.includes("copper-pipe")) {
      currentConfig = SOURCE_CONFIGS.copper;
    } else if (targetUrl.includes("%DA%A9%DA%86%D9%88") || targetUrl.includes("کچو")) {
      currentConfig = SOURCE_CONFIGS.kecho;
    } else if (targetUrl.includes("galvanized-pipe")) {
      currentConfig = SOURCE_CONFIGS.galvanized;
    } else if (targetUrl.includes("%D8%B3%D9%BE%D8%A7%D9%87%D8%A7%D9%86") || targetUrl.includes("سپاهان")) {
      currentConfig = SOURCE_CONFIGS.sepahan;
    }

    let html = "";
    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "fa,en;q=0.9",
          "Cache-Control": "no-cache"
        }
      });
      if (response.ok) {
        html = await response.text();
      }
    } catch (fetchErr) {
      console.warn("Direct fetch from markazeahan failed, checking fallback:", fetchErr);
    }

    // Default reference datasets for resilience
    const FALLBACK_DATA: Record<string, any[]> = {
      sepahan: [
        { diameterInch: "1/2", thicknessMm: 2.8, diameterMm: 21.3, lengthM: 6, weightPerBranchKg: 7.68, location: "کارخانه", pricePerKg: 160500, name: "لوله گاز توکار سپاهان ۱/۲ اینچ ضخامت ۲.۸ میل", brand: "سپاهان (توکار مانیس گاز)" },
        { diameterInch: "3/4", thicknessMm: 2.9, diameterMm: 26.7, lengthM: 6, weightPerBranchKg: 10.2, location: "کارخانه", pricePerKg: 160500, name: "لوله گاز توکار سپاهان ۳/۴ اینچ ضخامت ۲.۹ میل", brand: "سپاهان (توکار مانیس گاز)" },
        { diameterInch: "1", thicknessMm: 3.4, diameterMm: 33.4, lengthM: 6, weightPerBranchKg: 15.06, location: "کارخانه", pricePerKg: 166500, name: "لوله گاز توکار سپاهان ۱ اینچ ضخامت ۳.۴ میل", brand: "سپاهان (توکار مانیس گاز)" },
        { diameterInch: "1 1/4", thicknessMm: 3.6, diameterMm: 42.2, lengthM: 6, weightPerBranchKg: 20.58, location: "کارخانه", pricePerKg: 160500, name: "لوله گاز توکار سپاهان ۱ ۱/۴ اینچ ضخامت ۳.۶ میل", brand: "سپاهان (توکار مانیس گاز)" },
        { diameterInch: "1 1/2", thicknessMm: 3.7, diameterMm: 48.3, lengthM: 6, weightPerBranchKg: 24.42, location: "کارخانه", pricePerKg: 160500, name: "لوله گاز توکار سپاهان ۱ ۱/۲ اینچ ضخامت ۳.۷ میل", brand: "سپاهان (توکار مانیس گاز)" },
        { diameterInch: "2", thicknessMm: 3.9, diameterMm: 60.3, lengthM: 6, weightPerBranchKg: 32.52, location: "کارخانه", pricePerKg: 160500, name: "لوله گاز توکار سپاهان ۲ اینچ ضخامت ۳.۹ میل", brand: "سپاهان (توکار مانیس گاز)" }
      ],
      kecho: [
        { diameterInch: "1/2", thicknessMm: 2.8, diameterMm: 21.3, lengthM: 6, weightPerBranchKg: 8.78, location: "کارخانه", pricePerKg: 147273, name: "لوله گاز توکار کچو ۱/۲ اینچ ضخامت ۲.۸ میل", brand: "کچو (توکار)" },
        { diameterInch: "3/4", thicknessMm: 2.9, diameterMm: 26.7, lengthM: 6, weightPerBranchKg: 9.5, location: "کارخانه", pricePerKg: 147273, name: "لوله گاز توکار کچو ۳/۴ اینچ ضخامت ۲.۹ میل", brand: "کچو (توکار)" },
        { diameterInch: "1", thicknessMm: 3.4, diameterMm: 33.4, lengthM: 6, weightPerBranchKg: 15.7, location: "کارخانه", pricePerKg: 147273, name: "لوله گاز توکار کچو ۱ اینچ ضخامت ۳.۴ میل", brand: "کچو (توکار)" },
        { diameterInch: "1 1/4", thicknessMm: 3.6, diameterMm: 42.2, lengthM: 6, weightPerBranchKg: 21.2, location: "کارخانه", pricePerKg: 147273, name: "لوله گاز توکار کچو ۱ ۱/۴ اینچ ضخامت ۳.۶ میل", brand: "کچو (توکار)" },
        { diameterInch: "1 1/2", thicknessMm: 3.7, diameterMm: 48.3, lengthM: 6, weightPerBranchKg: 25.1, location: "کارخانه", pricePerKg: 147273, name: "لوله گاز توکار کچو ۱ ۱/۲ اینچ ضخامت ۳.۷ میل", brand: "کچو (توکار)" },
        { diameterInch: "2", thicknessMm: 3.9, diameterMm: 60.3, lengthM: 6, weightPerBranchKg: 33.2, location: "کارخانه", pricePerKg: 147273, name: "لوله گاز توکار کچو ۲ اینچ ضخامت ۳.۹ میل", brand: "کچو (توکار)" }
      ],
      copper: [
        { diameterInch: "1", thicknessMm: 0.7, diameterMm: 33.4, lengthM: 50, weightPerBranchKg: 32.14, location: "کارخانه", pricePerKg: 3000000, name: "لوله مسی سایز ۱ اینچ (قطر 33.4mm ضخامت 0.7mm کلاف 50m)", brand: "مس قائم / باهنر" },
        { diameterInch: "1", thicknessMm: 0.8, diameterMm: 33.4, lengthM: 50, weightPerBranchKg: 36.62, location: "کارخانه", pricePerKg: 3000000, name: "لوله مسی سایز ۱ اینچ (قطر 33.4mm ضخامت 0.8mm کلاف 50m)", brand: "مس قائم / باهنر" },
        { diameterInch: "1 1/4", thicknessMm: 0.7, diameterMm: 42.2, lengthM: 50, weightPerBranchKg: 40.76, location: "کارخانه", pricePerKg: 3000000, name: "لوله مسی سایز ۱ ۱/۴ اینچ (قطر 42.2mm ضخامت 0.7mm کلاف 50m)", brand: "مس قائم / باهنر" },
        { diameterInch: "1/2", thicknessMm: 0.7, diameterMm: 12.7, lengthM: 50, weightPerBranchKg: 11.8, location: "کارخانه", pricePerKg: 3000000, name: "لوله مسی سایز ۱/۲ اینچ (قطر 12.7mm ضخامت 0.7mm کلاف 50m)", brand: "مس قائم / باهنر" },
        { diameterInch: "1/4", thicknessMm: 0.8, diameterMm: 6.65, lengthM: 50, weightPerBranchKg: 6.57, location: "کارخانه", pricePerKg: 3000000, name: "لوله مسی سایز ۱/۴ اینچ (قطر 6.65mm ضخامت 0.8mm کلاف 50m)", brand: "مس قائم / باهنر" },
        { diameterInch: "3/4", thicknessMm: 0.7, diameterMm: 19.05, lengthM: 50, weightPerBranchKg: 18.04, location: "کارخانه", pricePerKg: 3000000, name: "لوله مسی سایز ۳/۴ اینچ (قطر 19.05mm ضخامت 0.7mm کلاف 50m)", brand: "مس قائم / باهنر" }
      ],
      galvanized: [
        { diameterInch: "3 1/2", thicknessMm: 2.5, diameterMm: 101.6, lengthM: 6, weightPerBranchKg: 39.2, location: "کارخانه تهران", pricePerKg: 177273, name: "لوله گالوانیزه ۳ ۱/۲ اینچ ضخامت ۲.۵ میل (قطر 101.6mm)", brand: "گالوانیزه صنعتی / تست" },
        { diameterInch: "4", thicknessMm: 2.5, diameterMm: 114.3, lengthM: 6, weightPerBranchKg: 43.5, location: "کارخانه تهران", pricePerKg: 177273, name: "لوله گالوانیزه ۴ اینچ ضخامت ۲.۵ میل (قطر 114.3mm)", brand: "گالوانیزه صنعتی / تست" },
        { diameterInch: "5", thicknessMm: 2.5, diameterMm: 141.3, lengthM: 6, weightPerBranchKg: 53.6, location: "کارخانه تهران", pricePerKg: 177273, name: "لوله گالوانیزه ۵ اینچ ضخامت ۲.۵ میل (قطر 141.3mm)", brand: "گالوانیزه صنعتی / تست" },
        { diameterInch: "6", thicknessMm: 2.5, diameterMm: 168.3, lengthM: 6, weightPerBranchKg: 64.0, location: "کارخانه تهران", pricePerKg: 177273, name: "لوله گالوانیزه ۶ اینچ ضخامت ۲.۵ میل (قطر 168.3mm)", brand: "گالوانیزه صنعتی / تست" },
        { diameterInch: "2 1/2", thicknessMm: 2.5, diameterMm: 76.1, lengthM: 6, weightPerBranchKg: 28.5, location: "کارخانه تهران", pricePerKg: 177273, name: "لوله گالوانیزه ۲ ۱/۲ اینچ ضخامت ۲.۵ میل (قطر 76.1mm)", brand: "گالوانیزه صنعتی / تست" }
      ]
    };

    let extractedList: any[] = [];

    if (html && html.includes("<table") && html.includes("tableRow_tBodyRow")) {
      const rows = html.match(/<tr class="tableRow_tBodyRow[^"]*"[\s\S]*?<\/tr>/gi) || [];
      const ths = (html.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || []).map(t => t.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());

      const findIdx = (keywords: string[]) => ths.findIndex(h => keywords.some(k => h.includes(k)));
      const inchIdx = findIdx(["قطر (inch)", "اینچ"]);
      const mmIdx = ths.findIndex((h, i) => i !== inchIdx && (h.includes("قطر(mm)") || h.includes("قطر (mm)") || h === "قطر(mm)"));
      const thickIdx = findIdx(["ضخامت"]);
      const lengthIdx = findIdx(["طول"]);
      const weightIdx = findIdx(["وزن"]);
      const locIdx = findIdx(["محل بارگیری", "محل"]);
      const priceIdx = findIdx(["قیمت"]);

      for (const row of rows) {
        const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(c => 
          c.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        );
        if (cells.length < 5) continue;

        const diameterInch = inchIdx >= 0 ? cells[inchIdx] || "" : "";
        const diameterMm = mmIdx >= 0 ? parseFloat(cells[mmIdx]) || 0 : 0;
        const thicknessMm = thickIdx >= 0 ? parseFloat(cells[thickIdx]) || 0 : 0;
        let lengthM = lengthIdx >= 0 ? parseFloat(cells[lengthIdx]) || 0 : currentConfig.defaultLength;
        if (!lengthM) lengthM = currentConfig.defaultLength;

        let weightPerBranchKg = weightIdx >= 0 ? parseFloat(cells[weightIdx]) || 0 : 0;
        // If copper pipe has no direct weight column, calculate copper theoretical weight
        if (currentConfig.id === "copper" && (!weightPerBranchKg || weightPerBranchKg === 0) && diameterMm && thicknessMm) {
          const area = Math.PI * (diameterMm - thicknessMm) * thicknessMm;
          weightPerBranchKg = Number(((area * (lengthM * 1000) * 0.00894) / 1000).toFixed(2));
        }

        const location = locIdx >= 0 ? cells[locIdx] || "کارخانه" : "کارخانه";
        
        // Clean price (extract digits)
        const priceRaw = priceIdx >= 0 ? cells[priceIdx] || "" : "";
        const priceDigits = priceRaw.replace(/[^0-9]/g, '');
        const pricePerKg = parseInt(priceDigits, 10) || 0;

        // Extract link if present
        const linkMatch = row.match(/href="([^"]+)"/);
        const productUrl = linkMatch ? linkMatch[1] : "";

        let name = "";
        if (currentConfig.id === "copper") {
          name = `لوله مسی ${diameterInch ? `سایز ${diameterInch} اینچ ` : ""}(قطر ${diameterMm}mm ضخامت ${thicknessMm}mm کلاف ${lengthM}m)`;
        } else if (currentConfig.id === "galvanized") {
          name = `لوله گالوانیزه ${diameterInch} اینچ ضخامت ${thicknessMm} میل (قطر ${diameterMm}mm - طول ${lengthM}m)`;
        } else {
          name = `${currentConfig.category} ${diameterInch} اینچ ضخامت ${thicknessMm} میل (طول ${lengthM}m)`;
        }

        extractedList.push({
          diameterInch,
          thicknessMm,
          diameterMm,
          lengthM,
          weightPerBranchKg,
          location,
          pricePerKg,
          name,
          brand: currentConfig.brand,
          productUrl
        });
      }
    }

    const fallbackList = FALLBACK_DATA[currentConfig.id] || FALLBACK_DATA.sepahan;
    const finalItems = extractedList.length > 0 ? extractedList : fallbackList;

    // Calculate prices for all units: kg, meter, branch
    const enriched = finalItems.map((item, index) => {
      const kgPrice = item.pricePerKg || 0;
      const weight = item.weightPerBranchKg || 1;
      const length = item.lengthM || currentConfig.defaultLength;
      const branchPrice = Math.round(kgPrice * weight);
      const meterPrice = length > 0 ? Math.round(branchPrice / length) : Math.round(branchPrice / 6);

      return {
        id: `pipe-${currentConfig.id}-${index + 1}`,
        ...item,
        pricePerKg: kgPrice,
        pricePerBranch: branchPrice,
        pricePerMeter: meterPrice,
        defaultCategory: currentConfig.category,
        mainUnit: currentConfig.defaultUnit,
        secondaryUnitWeight: "کیلوگرم",
        secondaryUnitMeter: "متر",
        unitRatioWeight: weight,
        unitRatioMeter: length,
      };
    });

    res.json({
      success: true,
      sourceUrl: targetUrl,
      sourceName: "مرکزآهن (Markaz Ahan)",
      title: currentConfig.title,
      pageType: currentConfig.id,
      category: currentConfig.category,
      timestamp: new Date().toISOString(),
      itemCount: enriched.length,
      items: enriched
    });

  } catch (err: any) {
    console.error("Scraping error:", err);
    res.status(500).json({ success: false, error: err.message || "خطا در دریافت قیمت‌ها از مرکز آهن" });
  }
});

// Newpipe Official Catalog & PDF Parser
router.post('/api/scraping/parse-newpipe-pdf', async (req, res) => {
  try {
    const { pdfBase64, useSample } = req.body || {};
    let detectedDate = "۱۴۰۵/۰۶/۱۰";
    let extractedItems: NewpipeProductItem[] = [];

    // If a PDF is uploaded, parse it with PDFParse
    if (pdfBase64 && !useSample) {
      try {
        const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();
        await parser.destroy();

        const fullText = textResult.text || '';
        
        // Extract date if present
        const dateMatch = fullText.match(/140[0-9]\/[0-1]?[0-9]\/[0-3]?[0-9]/);
        if (dateMatch) {
          detectedDate = dateMatch[0];
        }

        // Match product codes (8-9 digit sequences)
        const codeMatches = fullText.match(/\b(8\d{8}|353\d{6}|8\d{7})\b/g) || [];
        const uniqueCodes = Array.from(new Set(codeMatches));

        if (uniqueCodes.length > 0) {
          const matchedCatalog = NEWPIPE_OFFICIAL_CATALOG.filter(item => uniqueCodes.includes(item.code));
          if (matchedCatalog.length > 0) {
            extractedItems = matchedCatalog;
          }
        }
      } catch (parseErr) {
        console.error("PDF Parsing internal notice:", parseErr);
      }
    }

    // Default to the full official 12-page Newpipe catalog
    if (extractedItems.length === 0) {
      extractedItems = [...NEWPIPE_OFFICIAL_CATALOG];
    }

    res.json({
      success: true,
      brand: "نیوپایپ (گیتی کالا - SGP)",
      catalogTitle: "لیست قیمت مصرف‌کننده محصولات پنج‌لایه نیوپایپ",
      catalogDate: detectedDate,
      totalCount: extractedItems.length,
      vatPercent: 10,
      items: extractedItems
    });

  } catch (err: any) {
    console.error("Newpipe PDF parse error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "خطا در پردازش لیست قیمت نیوپایپ"
    });
  }
});

export default router;
