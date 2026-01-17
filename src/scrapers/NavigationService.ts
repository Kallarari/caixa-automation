import { Page } from "puppeteer";
import { delay } from "../utils/delay";

/**
 * Navega para um imóvel específico na página atual pelo índice
 */
export async function navegarParaImovel(page: Page, indice: number): Promise<void> {
  await page.waitForSelector("#paginacao", { timeout: 10000 });

  await page.evaluate((index) => {
    const imoveis = document.querySelectorAll("ul.control-group.no-bullets");
    if (imoveis[index]) {
      const linkDetalhes = imoveis[index].querySelector(
        'a[onclick*="detalhe_imovel"]'
      );
      if (linkDetalhes) {
        (linkDetalhes as HTMLElement).click();
      }
    }
  }, indice);

  try {
    // Tenta aguardar o #preview primeiro (elemento mais específico)
    await page.waitForSelector("#preview", { timeout: 5000 });
  } catch (error) {
    // Se #preview não existir, tenta outros elementos que indicam que a página carregou
    try {
      // Tenta aguardar por elementos comuns da página de detalhes
      await Promise.race([
        page.waitForSelector(".content", { timeout: 5000 }),
        page.waitForSelector("h5", { timeout: 5000 }),
        page.waitForSelector(".control-span-12_12", { timeout: 5000 }),
        page.waitForFunction(
          () => document.body && document.body.innerText.length > 100,
          { timeout: 5000 }
        ),
      ]);
    } catch (error2) {
      // Se nenhum seletor específico funcionar, apenas aguarda o body e um delay
      await page.waitForSelector("body", { timeout: 5000 });
      await delay(1000);
    }
  }
}
