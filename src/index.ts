import { ScrapingConfig, defaultConfig } from "./config/scraping.config";
import { createBrowser } from "./config/browser.config";
import { ProcessingFilter } from "./filters/ProcessingFilter";
import { StatisticsManager } from "./statistics/StatisticsManager";
import { ScrapingService } from "./services/ScrapingService";
import { WorkerService } from "./services/WorkerService";
import { Logger } from "./utils/logger";
import { getAllCitiesForAllStates } from "./scrapers/CityScraper";
import { CityDivider } from "./utils/cityDivider";

async function start() {
  Logger.info("Iniciando scraping...");

  const config: ScrapingConfig = {
    ...defaultConfig,
    mode: (process.env.MODE as any) || "all",
    estadoInicioId: process.env.ESTADO_ID || "",
    cidadeInicioId: process.env.CIDADE_ID || "",
  };

  // Modo divide: divide cidades em grupos e salva em arquivos
  if (config.mode === "divide") {
    Logger.info("📊 Modo divisão: dividindo cidades em grupos...");
    
    const browser = await createBrowser({
      headless: config.headless,
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.goto(config.baseUrl, {
      waitUntil: "networkidle2",
      timeout: config.navigationTimeoutMs,
    });

    const cities = await getAllCitiesForAllStates(page);
    CityDivider.divideAndSave(cities);
    
    await browser.close();
    Logger.success("✅ Divisão concluída! Execute os workers agora.");
    return;
  }

  // Modo worker: processa grupo específico
  if (config.mode === "worker") {
    const workerId = parseInt(process.env.WORKER_ID || "0");
    
    if (isNaN(workerId) || workerId < 0 || workerId >= 6) {
      Logger.error("❌ WORKER_ID deve ser um número entre 0 e 5");
      return;
    }

    const browser = await createBrowser({
      headless: config.headless,
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.goto(config.baseUrl, {
      waitUntil: "networkidle2",
      timeout: config.navigationTimeoutMs,
    });

    const workerService = new WorkerService(workerId, page);

    try {
      await workerService.processWorkerCities();
    } catch (error: any) {
      Logger.error(`❌ Erro no worker ${workerId + 1}: ${error.message}`);
    } finally {
      await browser.close();
    }

    return;
  }

  // Modos normais: all, state, city
  const browser = await createBrowser({
    headless: config.headless,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto(config.baseUrl, {
    waitUntil: "networkidle2",
    timeout: config.navigationTimeoutMs,
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
