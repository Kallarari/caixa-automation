import { Page } from 'puppeteer';

export interface ErrorDetails {
  message: string;
  functionName: string;
  fileName: string;
  step?: string;
  elementSelector?: string;
  outerHTML?: string | null;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
    bottom: number;
    right: number;
  } | null;
  display?: string | null;
  visibility?: string | null;
  opacity?: string | null;
}

export class ErrorHandler {
  /**
   * Captura detalhes completos de um erro
   */
  static async captureErrorDetails(
    error: any,
    functionName: string,
    fileName: string,
    page?: Page,
    elementSelector?: string,
    step?: string,
    elementIndex?: number
  ): Promise<ErrorDetails> {
    const details: ErrorDetails = {
      message: error.message || String(error),
      functionName,
      fileName,
    };

    if (step) {
      details.step = step;
    }

    if (elementSelector) {
      details.elementSelector = elementSelector;
    }

    if (page && elementSelector) {
      try {
        const elementInfo = await page.evaluate(
          (selector, index) => {
            const target = typeof index === "number"
              ? document.querySelectorAll(selector)[index] as Element | undefined
              : document.querySelector(selector);

            if (!target) {
              return null;
            }

            const el = target as HTMLElement;
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);

            return {
              outerHTML: el.outerHTML,
              boundingBox: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                bottom: rect.bottom,
                right: rect.right,
              },
              display: styles.display,
              visibility: styles.visibility,
              opacity: styles.opacity,
            };
          },
          elementSelector,
          elementIndex
        );

        if (elementInfo) {
          details.outerHTML = elementInfo.outerHTML
            ? elementInfo.outerHTML.slice(0, 2000)
            : null;
          details.boundingBox = elementInfo.boundingBox || null;
          details.display = elementInfo.display ?? null;
          details.visibility = elementInfo.visibility ?? null;
          details.opacity = elementInfo.opacity ?? null;
        }
      } catch {
        // Não adiciona detalhes extras se falhar a coleta do elemento
      }
    }

    return details;
  }

  /**
   * Formata erro para exibição
   */
  static formatError(details: ErrorDetails): string {
    let formatted = `[${details.functionName}@${details.fileName}] ${details.message}`;
    
    if (details.elementSelector) {
      formatted += ` | Elemento: ${details.elementSelector}`;
    }
    
    return formatted;
  }

  /**
   * Formata erro para JSON (relatório)
   */
  static formatErrorForReport(details: ErrorDetails): any {
    return {
      funcao: details.functionName,
      step: details.step || null,
      seletor: details.elementSelector || null,
      outerHTML: details.outerHTML || null,
      boundingBox: details.boundingBox || null,
      display: details.display || null,
      visibility: details.visibility || null,
      opacity: details.opacity || null,
    };
  }
}
