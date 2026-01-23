import { Page } from "puppeteer";
import { delay } from "../utils/delay";
import { defaultConfig } from "../config/scraping.config";
import { ErrorHandler } from "../utils/errorHandler";

/**
 * Conta quantos imóveis existem na página atual
 */
export async function contarImoveisNaPagina(page: Page): Promise<number> {
  await page.waitForSelector("#paginacao", { timeout: defaultConfig.selectorTimeoutMs });

  const totalImoveis = await page.evaluate(() => {
    const imoveis = document.querySelectorAll("ul.control-group.no-bullets");
    return imoveis.length;
  });

  return totalImoveis;
}

/**
 * Obtém o total de páginas disponíveis
 */
export async function obterTotalPaginas(page: Page): Promise<number> {
  try {
    await page.waitForSelector("#paginacao", { timeout: defaultConfig.selectorTimeoutMs });
  } catch (error) {
    // Se não encontrar a paginação, verifica se há imóveis na página
    const temImoveis = await page.evaluate(() => {
      const imoveis = document.querySelectorAll("ul.control-group.no-bullets");
      return imoveis.length > 0;
    });
    console.log("temImoveis: " + temImoveis);
    return temImoveis ? 1 : 0;
  }

  const totalPaginas = await page.evaluate(() => {
    const paginacaoDiv = document.querySelector("#paginacao");

    if (!paginacaoDiv) {
      return 0;
    }

    const links = paginacaoDiv.querySelectorAll(
      'a[href*="carregaListaImoveis"]'
    );

    // Se não há links de paginação mas há a div, significa 1 página
    return links.length > 0 ? links.length : 1;
  });

  return totalPaginas;
}

/**
 * Navega para uma página específica pelo índice (0 = primeira página)
 */
export async function navegarParaPagina(
  page: Page,
  indicePagina: number
): Promise<void> {
  try {
    await page.waitForSelector("#paginacao", { timeout: defaultConfig.selectorTimeoutMs });
  } catch (error: any) {
    const errorDetails = await ErrorHandler.captureErrorDetails(
      error,
      'navegarParaPagina',
      'PaginationScraper.ts',
      page,
      '#paginacao',
      'aguardar paginacao'
    );
    throw new Error(ErrorHandler.formatError(errorDetails));
  }

  try {
    const resultado = await page.evaluate(async(index) => {
      const paginacaoDiv = document.querySelector("#paginacao");
      if (!paginacaoDiv) {
        return { erro: "Div de paginação (#paginacao) não encontrada" };
      }

      await page.waitForSelector('#paginacao a[href*="carregaListaImoveis"]', {
        timeout: 5000,
      });

      const links = paginacaoDiv.querySelectorAll(
        'a[href*="carregaListaImoveis"]'
      );

      if (!links[index] || !(links[index] instanceof HTMLElement)) {
        return { erro: `Link de paginação não encontrado no índice ${index}` };
      }
      
      links[index].click();
      return { sucesso: true };
    }, indicePagina);

    if (resultado.erro) {
      throw new Error(resultado.erro);
    }
  } catch (error: any) {
    const errorDetails = await ErrorHandler.captureErrorDetails(
      error,
      'navegarParaPagina',
      'PaginationScraper.ts',
      page,
      'a[href*="carregaListaImoveis"]',
      `click paginacao indice=${indicePagina}`,
      indicePagina
    );
    throw new Error(ErrorHandler.formatError(errorDetails));
  }

  await delay(defaultConfig.actionDelayMs);
}
