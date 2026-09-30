/**
 * Unified Printing System with Isolated Iframe & Safe Fallback
 * Ensures that the EXACT preview content, custom webfonts (IRANYekanXFaNum),
 * CSS rules, logos, barcodes, and print layouts are sent to the printer
 * without any leakage from the host application, background tables, or modal controls.
 */

export interface PrePrintOptions {
  targetSelector?: string;
  timeoutMs?: number;
  requireImagesLoaded?: boolean;
  requireFontsLoaded?: boolean;
  minContentLength?: number;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
  onError?: (error: Error) => void;
}

export interface PrintOptions extends PrePrintOptions {
  paperSize?: "a4" | "a5" | "pos80" | string;
  margin?: string;
  documentTitle?: string;
  extraCss?: string;
  useIframe?: boolean;
}

/**
 * Checks and waits until the target printable element is fully mounted and has content.
 * CRITICAL: Never falls back to generic background tables or document.body to prevent
 * printing extraneous application content!
 */
async function waitForElement(
  target: string | HTMLElement,
  timeoutMs: number = 3500
): Promise<HTMLElement | null> {
  if (typeof target !== "string") {
    if (target && target.nodeType === Node.ELEMENT_NODE) {
      return target;
    }
    return null;
  }

  const selector = target;
  const startTime = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      // 1. Direct query
      let el = document.querySelector<HTMLElement>(selector);

      // 2. Specific printable fallbacks (strict only, NEVER 'table' or 'body'!)
      if (!el) {
        const strictFallbacks = [
          "#invoice-sheet-to-print",
          ".invoice-print-container",
          ".minimal-invoice-sheet",
          ".standard-invoice-sheet",
          ".official-invoice-sheet",
          ".compact-invoice-sheet",
          ".warehouse-print-sheet",
          ".receipt-print-container",
          "#person-ledger-printable-content",
          "#debts-credits-print-sheet",
          "#payslip-printable-sheet",
          "#order-list-printable-section",
          ".print-wrapper-target"
        ];
        for (const fb of strictFallbacks) {
          const candidate = document.querySelector<HTMLElement>(fb);
          if (candidate && (candidate.offsetHeight > 0 || candidate.scrollHeight > 0)) {
            el = candidate;
            break;
          }
        }
      }

      if (el && document.body.contains(el)) {
        if (el.offsetHeight > 0 || el.scrollHeight > 0 || (el.innerText || "").trim().length > 0) {
          return resolve(el);
        }
      }

      if (Date.now() - startTime >= timeoutMs) {
        return resolve(el || null);
      }

      requestAnimationFrame(check);
    };

    check();
  });
}

/**
 * Waits for all <img> tags within the element to complete loading or decoding.
 */
async function waitForImages(element: HTMLElement, timeoutMs: number = 2000): Promise<void> {
  const images = Array.from(element.querySelectorAll<HTMLImageElement>("img"));
  if (images.length === 0) return;

  const promises = images.map((img) => {
    if (img.complete && img.naturalWidth > 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), timeoutMs);
      if ("decode" in img && typeof img.decode === "function") {
        img.decode()
          .then(() => {
            clearTimeout(timer);
            resolve();
          })
          .catch(() => {
            clearTimeout(timer);
            resolve();
          });
      } else {
        img.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve();
        };
      }
    });
  });

  await Promise.all(promises);
}

/**
 * Ensures Persian and custom web fonts are fully ready.
 */
async function waitForFonts(timeoutMs: number = 1500): Promise<void> {
  if (typeof document !== "undefined" && "fonts" in document && document.fonts.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, timeoutMs))
      ]);
    } catch (_) {}
  }
}

/**
 * Collects all active CSS stylesheets, <style> tags, and font definitions
 * from the parent document to inject into the printing iframe.
 */
function extractStyles(): string {
  let combinedStyles = "";

  // 1. Collect all linked CSS stylesheets
  const linkTags = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  linkTags.forEach((link) => {
    if (link.href) {
      combinedStyles += `<link rel="stylesheet" href="${link.href}">\n`;
    }
  });

  // 2. Collect all <style> tags
  const styleTags = Array.from(document.querySelectorAll<HTMLStyleElement>("style"));
  styleTags.forEach((style) => {
    if (style.innerHTML) {
      combinedStyles += `<style>${style.innerHTML}</style>\n`;
    }
  });

  return combinedStyles;
}

/**
 * Prints the target element using an isolated, invisible iframe.
 * This guarantees that ONLY the preview document is sent to the printer,
 * eliminating all background application UI, sidebars, modals, or duplicate headers.
 */
export async function printViaIframe(
  target: string | HTMLElement = "#invoice-sheet-to-print",
  options: PrintOptions = {}
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? 3500;
  const paperSize = options.paperSize || "a4";
  const documentTitle = options.documentTitle || "پیش‌نمایش و چاپ سند";

  try {
    if (options.onBeforePrint) {
      options.onBeforePrint();
    }

    // Step 1: Wait for parent fonts
    if (options.requireFontsLoaded !== false) {
      await waitForFonts(1000);
    }

    // Step 2: Locate target DOM Element
    const targetElement = await waitForElement(target, timeoutMs);
    if (!targetElement) {
      console.warn(`[printViaIframe] Printable target not found: ${typeof target === 'string' ? target : 'Element'}`);
      return false;
    }

    // Step 3: Wait for images inside target
    if (options.requireImagesLoaded !== false) {
      await waitForImages(targetElement, 1500);
    }

    // Step 4: Clone the exact content
    const cloned = targetElement.cloneNode(true) as HTMLElement;

    // Remove any screen-only interactive controls inside target
    cloned.querySelectorAll(".no-print, [data-no-print='true'], .print\\:hidden").forEach((el) => {
      el.remove();
    });

    const targetHtml = cloned.outerHTML;

    // Step 5: Gather styles
    const extractedStyles = extractStyles();

    // Determine page size & margin
    let pageCss = "size: A4 portrait; margin: 6mm;";
    if (paperSize === "a5") {
      pageCss = "size: A5 portrait; margin: 4mm;";
    } else if (paperSize === "pos80" || paperSize === "thermal") {
      pageCss = "size: 80mm auto; margin: 2mm;";
    } else if (options.margin) {
      pageCss = `size: ${paperSize} portrait; margin: ${options.margin};`;
    }

    // Isolated print CSS reset
    const isolatedPrintCss = `
      <style>
        @page {
          ${pageCss}
        }
        *, *::before, *::after {
          box-sizing: border-box !important;
        }
        html, body {
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #0f172a !important;
          padding: 0 !important;
          margin: 0 auto !important;
          width: 100% !important;
          min-width: 0 !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          direction: rtl !important;
          text-align: right !important;
          font-family: 'IRANYekanXFaNum', 'Vazirmatn', system-ui, -apple-system, sans-serif !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #print-root {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        /* Override desktop preview bounds to allow natural multi-page flow */
        .invoice-print-container,
        .minimal-invoice-sheet,
        .standard-invoice-sheet,
        .official-invoice-sheet,
        .compact-invoice-sheet,
        .warehouse-print-sheet,
        .receipt-print-container,
        .print-section {
          width: 100% !important;
          max-width: 100% !important;
          min-height: 0 !important;
          box-shadow: none !important;
          border: none !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        table {
          width: 100% !important;
          max-width: 100% !important;
          border-collapse: collapse !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        tr, .print-avoid-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        thead {
          display: table-header-group !important;
        }
        tfoot {
          display: table-footer-group !important;
        }
        .no-print, [data-no-print="true"], .print\\:hidden {
          display: none !important;
          visibility: hidden !important;
        }
        ${options.extraCss || ""}
      </style>
    `;

    // Step 6: Create or reuse invisible printing iframe
    const oldIframe = document.getElementById("app-dedicated-print-iframe");
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "app-dedicated-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1024px";
    iframe.style.height = "768px";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Could not access iframe document");
    }

    // Step 7: Write complete isolated HTML document into iframe
    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${documentTitle}</title>
  ${extractedStyles}
  ${isolatedPrintCss}
</head>
<body dir="rtl" class="bg-white text-slate-800">
  <div id="print-root">
    ${targetHtml}
  </div>
</body>
</html>`);
    iframeDoc.close();

    // Step 8: Wait for fonts & images inside the iframe
    if (iframeDoc.fonts?.ready) {
      try {
        await Promise.race([
          iframeDoc.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 1000))
        ]);
      } catch (_) {}
    }

    if (options.requireImagesLoaded !== false && iframeDoc.body) {
      await waitForImages(iframeDoc.body, 1200);
    }

    // Double RAF to guarantee the iframe's layout engine has completed layout calculation
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 80);
        });
      });
    });

    // Step 9: Setup cleanup handler
    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      try {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (_) {}
      if (options.onAfterPrint) {
        options.onAfterPrint();
      }
    };

    if (iframe.contentWindow) {
      iframe.contentWindow.addEventListener("afterprint", cleanup, { once: true });
    }

    // Fallback cleanup timer in case afterprint does not fire
    setTimeout(cleanup, 3500);

    // Step 10: Trigger print in iframe
    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      return true;
    }

    throw new Error("Iframe contentWindow is not accessible");
  } catch (error: any) {
    console.warn("[printViaIframe] Iframe print failed, falling back to window print:", error);
    if (options.onError) {
      options.onError(error);
    }
    // Fallback: window-based print
    return safePrintFallback(typeof target === "string" ? target : ".print-section", options);
  }
}

/**
 * Window-based fallback printing with body isolation classes.
 */
async function safePrintFallback(
  targetSelector: string = ".print-section",
  options: PrePrintOptions = {}
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? 3000;
  let targetElement: HTMLElement | null = null;

  const cleanupBodyClasses = () => {
    if (typeof document !== "undefined") {
      document.body.classList.remove("printing-in-progress", "printing-modal-overlay", "printing-main-page");
      if (targetElement) {
        targetElement.removeAttribute("data-is-current-print-target");
      }
    }
  };

  try {
    targetElement = await waitForElement(targetSelector, timeoutMs);
    if (!targetElement) return false;

    if (typeof document !== "undefined") {
      document.body.classList.add("printing-in-progress", "printing-modal-overlay");
      targetElement.setAttribute("data-is-current-print-target", "true");
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 80);
        });
      });
    });

    if (typeof window !== "undefined") {
      const handleAfterPrint = () => {
        window.removeEventListener("afterprint", handleAfterPrint);
        cleanupBodyClasses();
        if (options.onAfterPrint) {
          options.onAfterPrint();
        }
      };
      window.addEventListener("afterprint", handleAfterPrint, { once: true });
    }

    window.print();
    setTimeout(cleanupBodyClasses, 1500);
    return true;
  } catch (err: any) {
    cleanupBodyClasses();
    window.print();
    return false;
  }
}

/**
 * Performs a comprehensive Pre-Print Check and triggers printing safely via iframe.
 * If useIframe is false or iframe is restricted, falls back gracefully.
 */
export async function safePrint(
  targetSelector: string = ".print-section",
  options: PrintOptions = {}
): Promise<boolean> {
  if (options.useIframe === false) {
    return safePrintFallback(targetSelector, options);
  }
  return printViaIframe(targetSelector, options);
}

export default safePrint;
