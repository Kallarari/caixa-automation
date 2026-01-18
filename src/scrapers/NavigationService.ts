import { Page } from "puppeteer";
import { delay } from "../utils/delay";
import { defaultConfig } from "../config/scraping.config";
import { ErrorHandler } from "../utils/errorHandler";

/**
 * Navega para um imóvel específico na página atual pelo índice
 */
export async function navegarParaImovel(page: Page, indice: number): Promise<void> {
  try {
    await page.waitForSelector("#paginacao", { timeout: defaultConfig.selectorTimeoutMs });
  } catch (error: any) {
    const errorDetails = await ErrorHandler.captureErrorDetails(
      error,
      'navegarParaImovel',
      'NavigationService.ts',
      page,
      '#paginacao',
      'aguardar paginacao'
    );
    throw new Error(ErrorHandler.formatError(errorDetails));
  }

  try {
    const resultado = await page.evaluate((index) => {
      const imoveis = document.querySelectorAll("ul.control-group.no-bullets");
      if (!imoveis[index]) {
        return { erro: `Imóvel não encontrado no índice ${index}` };
      }
      
      const linkDetalhes = imoveis[index].querySelector(
        'a[onclick*="detalhe_imovel"]'
      );
      if (!linkDetalhes || !(linkDetalhes instanceof HTMLElement)) {
        return { erro: `Link de detalhes não encontrado para imóvel no índice ${index}` };
      }
      
      linkDetalhes.click();
      return { sucesso: true };
    }, indice);

    if (resultado.erro) {
      throw new Error(resultado.erro);
    }
  } catch (error: any) {
    const errorDetails = await ErrorHandler.captureErrorDetails(
      error,
      'navegarParaImovel',
      'NavigationService.ts',
      page,
      'a[onclick*="detalhe_imovel"]',
      `click detalhe_imovel indice=${indice}`,
      indice
    );
    throw new Error(ErrorHandler.formatError(errorDetails));
  }

  try {
    // Tenta aguardar o #preview primeiro (elemento mais específico)
    await page.waitForSelector("#preview", { timeout: defaultConfig.selectorTimeoutMs });
  } catch (error) {
    // Se #preview não existir, tenta outros elementos que indicam que a página carregou
    try {
      // Tenta aguardar por elementos comuns da página de detalhes
      await Promise.race([
        page.waitForSelector(".content", { timeout: defaultConfig.selectorTimeoutMs }),
        page.waitForSelector("h5", { timeout: defaultConfig.selectorTimeoutMs }),
        page.waitForSelector(".control-span-12_12", { timeout: defaultConfig.selectorTimeoutMs }),
        page.waitForFunction(
          () => document.body && document.body.innerText.length > 100,
          { timeout: defaultConfig.selectorTimeoutMs }
        ),
      ]);
    } catch (error2) {
      // Se nenhum seletor específico funcionar, apenas aguarda o body e um delay
      await page.waitForSelector("body", { timeout: defaultConfig.selectorTimeoutMs });
      await delay(defaultConfig.actionDelayMs);
    }
  }
}
