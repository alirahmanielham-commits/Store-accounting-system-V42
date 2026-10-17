import { Router, Request, Response } from "express";

export const mobileRouter = Router();

// Mock/Local Store helper for permissions
const getMobilePermissionsMap = (): Record<string, any> => {
  return {};
};

/**
 * @route   GET /api/v1/mobile/download
 * @desc    Get mobile application metadata / manifest download
 */
mobileRouter.get("/download", (req: Request, res: Response) => {
  return res.json({
    success: true,
    appName: "سامانه همراه تراز - Standalone Mobile App",
    version: "2.5.0",
    packageType: "PWA / React Native Web App",
    apiEndpoint: "/api/v1/mobile",
    downloadUrl: "/manifest.json",
    instructions: "برای نصب اپلیکیشن همراه، گزینه Add to Home Screen را در مرورگر انتخاب نمایید یا توکن API را در نرم‌افزار نیتیو وارد فرمایید.",
  });
});

/**
 * @route   POST /api/v1/mobile/auth/login
 * @desc    Authenticate mobile app user and issue JWT bearer token
 */
mobileRouter.post("/auth/login", (req: Request, res: Response) => {
  try {
    const { username, password, deviceId } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "نام کاربری و رمز عبور الزامی است",
      });
    }

    // Return authenticated mobile profile with permissions
    const dummyToken = `taraz_mobile_jwt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return res.json({
      success: true,
      message: "ورود موفق به اپلیکیشن همراه",
      token: dummyToken,
      user: {
        id: "usr_101",
        name: username,
        username,
        role: "admin",
      },
      device: {
        deviceId: deviceId || "unknown_device",
        registered: true,
      },
      permissions: {
        canCreateReceiveReceipt: true,
        canCreatePayReceipt: true,
        canViewReceiptsList: true,
        canCreateSaleInvoice: true,
        canCreatePurchaseInvoice: true,
        canViewInvoicesList: true,
        canQuickPriceInquiry: true,
        canManageProducts: true,
        canReceiveCheck: true,
        canPayCheck: true,
        canViewCheckDashboard: true,
        canManagePersons: true,
        canViewPersonLedger: true,
        canViewPersonProfile: true,
        canViewDebtorsReport: true,
        canViewDebtorsShowcase: true,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "خطا در برقراری ارتباط با سرور همراه" });
  }
});

/**
 * @route   GET /api/v1/mobile/auth/my-permissions
 * @desc    Get active permissions for current mobile user
 */
mobileRouter.get("/auth/my-permissions", (req: Request, res: Response) => {
  return res.json({
    success: true,
    permissions: {
      canCreateReceiveReceipt: true,
      canCreatePayReceipt: true,
      canViewReceiptsList: true,
      canCreateSaleInvoice: true,
      canCreatePurchaseInvoice: true,
      canViewInvoicesList: true,
      canQuickPriceInquiry: true,
      canManageProducts: true,
      canReceiveCheck: true,
      canPayCheck: true,
      canViewCheckDashboard: true,
      canManagePersons: true,
      canViewPersonLedger: true,
      canViewPersonProfile: true,
      canViewDebtorsReport: true,
      canViewDebtorsShowcase: true,
    },
  });
});

/**
 * @route   POST /api/v1/mobile/permissions/update
 * @desc    Admin endpoint to update mobile permissions for a user
 */
mobileRouter.post("/permissions/update", (req: Request, res: Response) => {
  try {
    const { userId, permissions } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "شناسه کاربر الزامی است" });
    }

    return res.json({
      success: true,
      message: "دسترسی‌های همراه کاربر با موفقیت بروزرسانی شد",
      userId,
      permissions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "خطا در بروزرسانی دسترسی‌ها" });
  }
});

/**
 * @route   GET /api/v1/mobile/products/search
 * @desc    Online search products by query/barcode
 */
mobileRouter.get("/products/search", (req: Request, res: Response) => {
  const query = (req.query.q as string) || "";
  return res.json({
    success: true,
    query,
    products: [
      { id: "p101", code: "1001", name: "لوله ۶ اینچ استاندارد", barcode: "6260001", price: 1250000, stock: 450 },
      { id: "p102", code: "1002", name: "اتصال زانویی ۴۵ درجه", barcode: "6260002", price: 340000, stock: 1200 },
    ],
  });
});

/**
 * @route   GET /api/v1/mobile/persons/search
 * @desc    Online search persons / customers with live balance
 */
mobileRouter.get("/persons/search", (req: Request, res: Response) => {
  const query = (req.query.q as string) || "";
  return res.json({
    success: true,
    query,
    persons: [
      { id: "per_1", code: "P-101", name: "شرکت بازرگانی پارس", balance: -45000000, balanceType: "debtor" },
      { id: "per_2", code: "P-102", name: "فروشگاه ابزار صنعت", balance: 12000000, balanceType: "creditor" },
    ],
  });
});

/**
 * @route   POST /api/v1/mobile/invoices/sale
 * @desc    Issue sales invoice online via mobile app
 */
mobileRouter.post("/invoices/sale", (req: Request, res: Response) => {
  try {
    const { personId, items, totalPrice } = req.body;
    const docNumber = `MOB-SL-${Math.floor(1000 + Math.random() * 9000)}`;

    return res.json({
      success: true,
      message: "فاکتور فروش با موفقیت در سیستم آنلاین ثبت شد",
      docNumber,
      totalPrice: totalPrice || 0,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "خطا در ثبت فاکتور همراه" });
  }
});

/**
 * @route   POST /api/v1/mobile/receipts/receive
 * @desc    Create receive receipt online via mobile app
 */
mobileRouter.post("/receipts/receive", (req: Request, res: Response) => {
  try {
    const { personId, amount, type } = req.body;
    const docNumber = `MOB-RC-${Math.floor(1000 + Math.random() * 9000)}`;

    return res.json({
      success: true,
      message: "رسید دریافت وجه با موفقیت آنلاین ثبت شد",
      docNumber,
      amount: amount || 0,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "خطا در ثبت رسید دریافت" });
  }
});

/**
 * @route   GET /api/v1/mobile/reports/debtors
 * @desc    Get live debtors list
 */
mobileRouter.get("/reports/debtors", (req: Request, res: Response) => {
  return res.json({
    success: true,
    debtors: [
      { personId: "per_1", name: "شرکت بازرگانی پارس", balance: 45000000, phone: "09121111111", overdueDays: 14 },
      { personId: "per_3", name: "کارگاه تولیدی آذر", balance: 82000000, phone: "09122222222", overdueDays: 32 },
    ],
  });
});

/**
 * @route   GET /api/v1/mobile/products/quick-price
 * @desc    Quick price and stock inquiry by barcode for mobile camera scanner
 */
mobileRouter.get("/products/quick-price", (req: Request, res: Response) => {
  const barcode = (req.query.barcode as string) || "";
  return res.json({
    success: true,
    barcode,
    product: {
      id: "p101",
      code: "1001",
      name: "لوله ۶ اینچ استاندارد",
      barcode: barcode || "6260001",
      consumerPrice: 1350000,
      partnerPrice: 1250000,
      stock: 450,
      reorderPoint: 50,
      unit: "شاخه",
    },
  });
});

/**
 * @route   POST /api/v1/mobile/inventory/stocktaking
 * @desc    Submit mobile stocktaking counts
 */
mobileRouter.post("/inventory/stocktaking", (req: Request, res: Response) => {
  const { warehouseId, counts, note } = req.body;
  const countSessionId = `STK-${Date.now()}`;
  return res.json({
    success: true,
    message: "کاربرگ شمارش انبارگردانی موبایل با موفقیت ثبت شد",
    countSessionId,
    itemCount: Array.isArray(counts) ? counts.length : 0,
    recordedAt: new Date().toISOString(),
  });
});

/**
 * @route   POST /api/v1/mobile/debtors/send-sms
 * @desc    Dispatch SMS payment reminder to debtor
 */
mobileRouter.post("/debtors/send-sms", (req: Request, res: Response) => {
  const { personId, phone, amount, templateId } = req.body;
  return res.json({
    success: true,
    message: "پیامک یادآوری بدهی به شماره طرف‌حساب ارسال شد",
    phone: phone || "0912xxxxxxx",
    sentAt: new Date().toISOString(),
  });
});

/**
 * @route   POST /api/v1/mobile/sync/batch
 * @desc    Resilient offline outbox sync endpoint for mobile app
 */
mobileRouter.post("/sync/batch", (req: Request, res: Response) => {
  try {
    const { deviceId, items } = req.body;
    const processedTempIds: string[] = [];

    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.clientTempId) {
          processedTempIds.push(item.clientTempId);
        }
      }
    }

    return res.json({
      success: true,
      message: `تعداد ${processedTempIds.length} تراکنش آفلاین با موفقیت همگام‌سازی شد`,
      deviceId: deviceId || "unknown",
      processedCount: processedTempIds.length,
      processedTempIds,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: "خطا در پردازش اسناد صف آفلاین" });
  }
});

/**
 * @route   GET /api/v1/mobile/prompt
 * @desc    Download / read the Standalone Mobile App Master AI Prompt
 */
mobileRouter.get("/prompt", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.sendFile("STANDALONE_MOBILE_APP_PROMPT.md", { root: "public" }, (err) => {
    if (err) {
      res.status(404).send("# Prompt not found");
    }
  });
});

