import { Page } from "puppeteer";
import { delay } from "../utils/delay";

/**
 * Conta quantos imóveis existem na página atual
 */
export async function contarImoveisNaPagina(page: Page): Promise<number> {
  await page.waitForSelector("#paginacao", { timeout: 10000 });

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
    await page.waitForSelector("#paginacao", { timeout: 5000 });
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
  await page.waitForSelector("#paginacao", { timeout: 10000 });

  await page.evaluate((index) => {
    const paginacaoDiv = document.querySelector("#paginacao");
    if (paginacaoDiv) {
      const links = paginacaoDiv.querySelectorAll(
        'a[href*="carregaListaImoveis"]'
      );
      if (links[index]) {
        (links[index] as HTMLElement).click();
      }
    }
  }, indicePagina);

  await delay(2000);
}
