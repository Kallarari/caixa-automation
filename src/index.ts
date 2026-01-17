import { ScrapingConfig, defaultConfig } from "./config/scraping.config";
import { createBrowser } from "./config/browser.config";
import { ProcessingFilter } from "./filters/ProcessingFilter";
import { StatisticsManager } from "./statistics/StatisticsManager";
import { ScrapingService } from "./services/ScrapingService";
import { Logger } from "./utils/logger";
import { getAllCitiesForAllStates } from "./scrapers/CityScraper";

async function start() {
  Logger.info("Iniciando scraping...");

  const config: ScrapingConfig = {
    ...defaultConfig,
    mode: (process.env.MODE as any) || "all", // 'all' | 'state' | 'city'
    estadoInicioId: process.env.ESTADO_ID || "", // ID do estado
    cidadeInicioId: process.env.CIDADE_ID || "", // ID da cidade
    // ==================================================
  };

  // Cria o browser
  const browser = await createBrowser({
    headless: config.headless,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto(config.baseUrl, {
    waitUntil: "networkidle2",
  });

  // Obtém todas as cidades para inicializar estatísticas
  const cities = await getAllCitiesForAllStates(page);
  const totalCidades = cities.reduce(
    (acc, state) => acc + state.cities.length,
    0
  );

  const statisticsManager = new StatisticsManager(cities.length, totalCidades);
  const filter = new ProcessingFilter(
    config.mode,
    config.estadoInicioId,
    config.cidadeInicioId
  );
  const scrapingService = new ScrapingService(
    config,
    statisticsManager,
    filter,
    page
  );

  try {
    switch (config.mode) {
      case "city":
        if (!config.estadoInicioId || !config.cidadeInicioId) {
          Logger.error(
            "❌ Modo 'city' requer estadoInicioId e cidadeInicioId configurados"
          );
          break;
        }
        await scrapingService.processCity(
          config.estadoInicioId,
          config.cidadeInicioId
        );
        break;
      case "state":
        if (!config.estadoInicioId) {
          Logger.error("❌ Modo 'state' requer estadoInicioId configurado");
          break;
        }
        await scrapingService.processState(config.estadoInicioId);
        break;
      case "all":
      default:
        await scrapingService.processAll();
        break;
    }
  } catch (error: any) {
    Logger.error(`❌ Erro durante o processamento: ${error.message}`);
  } finally {
    // Exibe relatório final
    statisticsManager.printGlobalReport();

    await browser.close();
  }
}

start();
