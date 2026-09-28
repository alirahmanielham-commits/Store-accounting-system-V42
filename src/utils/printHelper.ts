/**
 * Pre-Print Check & Safe Printing Utility
 * Ensures that DOM content, custom fonts, images (logos, barcodes, signatures),
 * and layout calculations are completely loaded and rendered before triggering window.print().
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

/**
 * Checks and waits until the target printable element is fully mounted and non-empty.
 */
async function waitForElement(
  selector: string,
  timeoutMs: number = 3000
): Promise<HTMLElement | null> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      // 1. Direct query
      let el = document.querySelector<HTMLElement>(selector);

      // 2. Fallbacks for common printable selectors if generic .print-section was asked
      if (!el) {
        const fallbacks = [
          ".print-section",
          ".invoice-print-container",
          ".receipt-print-container",
          "#person-ledger-printable-content",
          "#person-ledger-printable-area",
          "#debts-credits-print-sheet",
          "#payslip-printable-sheet",
          ".standard-invoice-sheet",
          ".minimal-invoice-sheet",
          ".official-invoice-sheet",
          ".print-container",
          ".printable-area",
          "table"
        ];
        for (const fb of fallbacks) {
          const candidate = document.querySelector<HTMLElement>(fb);
          if (candidate && candidate.offsetHeight > 0) {
            el = candidate;
            break;
          }
        }
      }

      if (el && document.body.contains(el)) {
        // Ensure element has content and has been laid out by browser
        if (el.offsetHeight > 0 || el.scrollHeight > 0 || (el.innerText || "").trim().length > 0) {
          return resolve(el);
        }
      }

      if (Date.now() - startTime >= timeoutMs) {
        // Timeout reached - return whatever is found or null
        return resolve(el || document.body);
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
 * Performs a comprehensive Pre-Print Check and triggers printing safely.
 */
export async function safePrint(
  targetSelector: string = ".print-section",
  options: PrePrintOptions = {}
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? 3000;
  const requireImages = options.requireImagesLoaded ?? true;
  const requireFonts = options.requireFontsLoaded ?? true;

  try {
    if (options.onBeforePrint) {
      options.onBeforePrint();
    }

    // Step 1: Wait for Fonts
    if (requireFonts) {
      await waitForFonts(1000);
    }

    // Step 2: Verify Target DOM Element
    const element = await waitForElement(targetSelector, timeoutMs);

    // Step 3: Verify Images inside Target Element
    if (element && requireImages) {
      await waitForImages(element, 1500);
    }

    // Step 4: Double RAF to ensure browser layout & paint cycles are 100% committed
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 80);
        });
      });
    });

    // Step 5: Execute Window Print
    window.print();

    if (options.onAfterPrint) {
      options.onAfterPrint();
    }

    return true;
  } catch (error: any) {
    console.error("Pre-print check encountered an issue, falling back to standard print:", error);
    if (options.onError) {
      options.onError(error);
    }
    // Fallback direct print
    window.print();
    return false;
  }
}

export default safePrint;
