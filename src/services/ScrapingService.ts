import { Page } from "puppeteer";
import { ScrapingConfig } from "../config/scraping.config";
import { ProcessingFilter } from "../filters/ProcessingFilter";
import { StatisticsManager } from "../statistics/StatisticsManager";
import { CityService } from "./CityService";
import { PropertyService } from "./PropertyService";
import { PropertyRepository } from "../repositories/PropertyRepository";
import { getAllCitiesForAllStates } from "../scrapers/CityScraper";
import { Logger } from "../utils/logger";

export class ScrapingService {
  private cityService: CityService;
  private propertyService: PropertyService;

  constructor(
    private config: ScrapingConfig,
    private statisticsManager: StatisticsManager,
    private filter: ProcessingFilter,
    private page: Page
  ) {
    const propertyRepository = new PropertyRepository();
    this.propertyService = new PropertyService(propertyRepository);
    this.cityService = new CityService(
      this.page,
      this.propertyService,
      this.statisticsManager
    );
  }

  async processAll(): Promise<void> {
    Logger.separator();
    Logger.info("📊 INICIANDO PROCESSAMENTO DE TODAS AS CIDADES");
    
    const estadoInicioId = this.filter.getEstadoId();
    const cidadeInicioId = this.filter.getCidadeId();
    
    if (estadoInicioId && cidadeInicioId) {
      const cities = await getAllCitiesForAllStates(this.page);
      const estadoInicio = cities.find((s) => s.stateValue === estadoInicioId);
      const cidadeInicio = estadoInicio?.cities.find(
        (c) => c.value === cidadeInicioId
      );
      if (estadoInicio && cidadeInicio) {
        Logger.info(
          `📍 Começando a partir de: ${cidadeInicio.innerText} - ${estadoInicio.state} (IDs: ${cidadeInicioId} / ${estadoInicioId})`
        );
      } else {
        Logger.warn("⚠️  Aviso: IDs não encontrados. Processando todas as cidades.");
      }
    }
    
    Logger.separator();

    const cities = await getAllCitiesForAllStates(this.page);
    await this.page.reload();

    // Flag para controlar quando começar a processar
    let comecarProcessamentoState = !estadoInicioId;
    let comecarProcessamentoCity = !cidadeInicioId;

    for (const stateData of cities) {
      // Verifica se chegou no estado de início
      if (
        !comecarProcessamentoState &&
        estadoInicioId &&
        stateData.stateValue === estadoInicioId
      ) {
        comecarProcessamentoState = true;
      }

      // Se ainda não deve começar, pula este estado
      if (!comecarProcessamentoState) {
        Logger.info(
          `⏭️  Pulando estado: ${stateData.state} (ID: ${stateData.stateValue})`
        );
        continue;
      }

      // Inicializa estatísticas do estado
      this.statisticsManager.startState(
        stateData.state,
        stateData.stateValue,
        stateData.cities.length
      );

      for (let i = 0; i < stateData.cities.length; i++) {
        const city = stateData.cities[i];

        // Se é o primeiro estado após começar, verifica se chegou na cidade de início
        if (
          !comecarProcessamentoCity &&
          cidadeInicioId &&
          city.value === cidadeInicioId
        ) {
          comecarProcessamentoCity = true;
        }

        // Se ainda não deve começar, pula esta cidade
        if (!comecarProcessamentoCity) {
          Logger.info(
            `⏭️  Pulando cidade: ${city.innerText} - ${stateData.state}`
          );
          continue;
        }

        await this.cityService.processCity(city, stateData);
      }

      this.statisticsManager.finishState(stateData.stateValue);
    }
  }

  async processState(stateId: string): Promise<void> {
    Logger.separator();
    Logger.info(`📊 PROCESSANDO ESTADO: ${stateId}`);
    Logger.separator();

    const cities = await getAllCitiesForAllStates(this.page);
    await this.page.reload();

    const stateData = cities.find((s) => s.stateValue === stateId);
    if (!stateData) {
      Logger.error(`❌ Estado com ID ${stateId} não encontrado`);
      return;
    }

    this.statisticsManager.startState(
      stateData.state,
      stateData.stateValue,
      stateData.cities.length
    );

    for (const city of stateData.cities) {
      await this.cityService.processCity(city, stateData);
    }

    this.statisticsManager.finishState(stateData.stateValue);
  }

  async processCity(stateId: string, cityId: string): Promise<void> {
    Logger.separator();
    Logger.info(`📊 PROCESSANDO CIDADE: ${cityId} do estado ${stateId}`);
    Logger.separator();

    const cities = await getAllCitiesForAllStates(this.page);
    await this.page.reload();

    const stateData = cities.find((s) => s.stateValue === stateId);
    if (!stateData) {
      Logger.error(`❌ Estado com ID ${stateId} não encontrado`);
      return;
    }

    const city = stateData.cities.find((c) => c.value === cityId);
    if (!city) {
      Logger.error(`❌ Cidade com ID ${cityId} não encontrada no estado ${stateId}`);
      return;
    }

    this.statisticsManager.startState(
      stateData.state,
      stateData.stateValue,
      1
    );

    await this.cityService.processCity(city, stateData);

    this.statisticsManager.finishState(stateData.stateValue);
  }
}
