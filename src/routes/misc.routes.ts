
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

    // Default reference data if network or page structure changes
    const defaultPipes = [
      {
        diameterInch: "1/2",
        thicknessMm: 2.8,
        diameterMm: 21.3,
        lengthM: 6,
        weightPerBranchKg: 7.68,
        location: "کارخانه",
        pricePerKg: 160500,
        name: "لوله گاز توکار سپاهان ۱/۲ اینچ ضخامت ۲.۸ میل",
        brand: "سپاهان (توکار مانیس گاز)",
        productUrl: "/product/لوله-گازی-توکار-سپاهان-سایز-1-2-اینچ/"
      },
      {
        diameterInch: "3/4",
        thicknessMm: 2.9,
        diameterMm: 26.7,
        lengthM: 6,
        weightPerBranchKg: 10.2,
        location: "کارخانه",
        pricePerKg: 160500,
        name: "لوله گاز توکار سپاهان ۳/۴ اینچ ضخامت ۲.۹ میل",
        brand: "سپاهان (توکار مانیس گاز)",
        productUrl: "/product/لوله-گازی-توکار-سپاهان-سایز-3-4-اینچ/"
      },
      {
        diameterInch: "1",
        thicknessMm: 3.4,
        diameterMm: 33.4,
        lengthM: 6,
        weightPerBranchKg: 15.06,
        location: "کارخانه",
        pricePerKg: 166500,
        name: "لوله گاز توکار سپاهان ۱ اینچ ضخامت ۳.۴ میل",
        brand: "سپاهان (توکار مانیس گاز)",
        productUrl: "/product/لوله-گازی-توکار-سپاهان-سایز-1-اینچ/"
      },
      {
        diameterInch: "1 1/4",
        thicknessMm: 3.6,
        diameterMm: 42.2,
        lengthM: 6,
        weightPerBranchKg: 20.58,
        location: "کارخانه",
        pricePerKg: 160500,
        name: "لوله گاز توکار سپاهان ۱ ۱/۴ اینچ ضخامت ۳.۶ میل",
        brand: "سپاهان (توکار مانیس گاز)",
        productUrl: "/product/لوله-گازی-توکار-سپاهان-سایز-1-4-1-اینچ/"
      },
      {
        diameterInch: "1 1/2",
        thicknessMm: 3.7,
        diameterMm: 48.3,
        lengthM: 6,
        weightPerBranchKg: 24.42,
        location: "کارخانه",
        pricePerKg: 160500,
        name: "لوله گاز توکار سپاهان ۱ ۱/۲ اینچ ضخامت ۳.۷ میل",
        brand: "سپاهان (توکار مانیس گاز)",
        productUrl: "/product/لوله-گازی-توکار-سپاهان-سایز-1-2-1-اینچ/"
      },
      {
        diameterInch: "2",
        thicknessMm: 3.9,
        diameterMm: 60.3,
        lengthM: 6,
        weightPerBranchKg: 32.52,
        location: "کارخانه",
        pricePerKg: 160500,
        name: "لوله گاز توکار سپاهان ۲ اینچ ضخامت ۳.۹ میل",
        brand: "سپاهان (توکار مانیس گاز)",
        productUrl: "/product/لوله-گازی-توکار-سپاهان-سایز-2-اینچ/"
      }
    ];

    let extractedList = [];

    if (html && html.includes("<table") && html.includes("tableRow_tBodyRow")) {
      const rows = html.match(/<tr class="tableRow_tBodyRow[^"]*"[\s\S]*?<\/tr>/gi) || [];
      for (const row of rows) {
        const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map(c => 
          c.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        );
        // Header order: [0:expand, 1:قطر inch, 2:ضخامت mm, 3:قطر mm, 4:طول m, 5:وزن شاخه kg, 6:محل بارگیری, 7:قیمت, 8:نمودار, 9:خرید]
        if (cells.length >= 8) {
          const diameterInch = cells[1] || "";
          const thicknessMm = parseFloat(cells[2]) || 0;
          const diameterMm = parseFloat(cells[3]) || 0;
          const lengthM = parseFloat(cells[4]) || 6;
          const weightPerBranchKg = parseFloat(cells[5]) || 0;
          const location = cells[6] || "کارخانه";
          
          // Clean price (extract digits)
          const priceRaw = cells[7] || "";
          const priceDigits = priceRaw.replace(/[^0-9]/g, '');
          const pricePerKg = parseInt(priceDigits, 10) || 0;

          // Extract link if present
          const linkMatch = row.match(/href="([^"]+)"/);
          const productUrl = linkMatch ? linkMatch[1] : "";

          const name = `لوله گاز توکار سپاهان ${diameterInch} اینچ ضخامت ${thicknessMm} میل (طول ${lengthM}m)`;

          extractedList.push({
            diameterInch,
            thicknessMm,
            diameterMm,
            lengthM,
            weightPerBranchKg,
            location,
            pricePerKg,
            name,
            brand: "سپاهان (توکار مانیس گاز)",
            productUrl
          });
        }
      }
    }

    const finalItems = extractedList.length > 0 ? extractedList : defaultPipes;

    // Calculate prices for all units: kg, meter, branch
    const enriched = finalItems.map((item, index) => {
      const kgPrice = item.pricePerKg || 0;
      const weight = item.weightPerBranchKg || 1;
      const length = item.lengthM || 6;
      const branchPrice = Math.round(kgPrice * weight);
      const meterPrice = length > 0 ? Math.round(branchPrice / length) : Math.round(branchPrice / 6);

      return {
        id: `pipe-online-${index + 1}`,
        ...item,
        pricePerKg: kgPrice,
        pricePerBranch: branchPrice,
        pricePerMeter: meterPrice,
        defaultCategory: "لوله گاز توکار سپاهان",
        mainUnit: "شاخه",
        secondaryUnitWeight: "کیلوگرم",
        secondaryUnitMeter: "متر",
        unitRatioWeight: weight, // هر شاخه = X کیلوگرم
        unitRatioMeter: length,  // هر شاخه = ۶ متر
      };
    });

    res.json({
      success: true,
      sourceUrl: targetUrl,
      sourceName: "مرکزآهن (Markaz Ahan)",
      title: "قیمت لوله گاز توکار سپاهان",
      timestamp: new Date().toISOString(),
      itemCount: enriched.length,
      items: enriched
    });

  } catch (err: any) {
    console.error("Scraping error:", err);
    res.status(500).json({ success: false, error: err.message || "خطا در دریافت قیمت‌ها از مرکز آهن" });
  }
});

export default router;
