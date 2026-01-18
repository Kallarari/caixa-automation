import { Page } from "puppeteer";
import { extractAllPropertiesData } from "../scrapers/PropertyScraper";
import { selectCity } from "../scrapers/CityScraper";
import { PropertyService } from "./PropertyService";
import { StatisticsManager } from "../statistics/StatisticsManager";
import { delay } from "../utils/delay";
import { notifyError } from "../utils/notifier";
import { ErrorHandler } from "../utils/errorHandler";
import { defaultConfig } from "../config/scraping.config";

export class CityService {
  constructor(
    private page: Page,
    private propertyService: PropertyService,
    private statisticsManager: StatisticsManager
  ) {}

  async processCity(
    city: { innerText: string; value: string },
    stateData: { state: string; stateValue: string }
  ): Promise<void> {
    this.statisticsManager.startCity(
      city.innerText,
      stateData.state,
      city.value,
      stateData.stateValue
    );

    console.log(`\n📍 Processando: ${city.innerText} - ${stateData.state}`);

    try {
      await selectCity(this.page, city.value, stateData.stateValue);
      const propertiesData = await extractAllPropertiesData(this.page);
      console.log("\n💾 Salvando dados no banco de dados...\n");

      const { salvos, duplicados, erros } =
        await this.propertyService.saveProperties(propertiesData);

      this.statisticsManager.updateCityImoveis(
        city.value,
        stateData.stateValue,
        salvos,
        duplicados,
        erros
      );

      this.statisticsManager.finishCity(
        city.value,
        stateData.stateValue,
        "success"
      );

      this.statisticsManager.updateStateFromCity(
        stateData.stateValue,
        city.innerText,
        "success",
        salvos,
        duplicados,
        erros
      );
    } catch (error: any) {
     // notifyError("ERRO NO SCRAPING", "Veja no console para mais detalhes");
      await delay(2000);

      // Captura detalhes completos do erro
      const errorDetails = await ErrorHandler.captureErrorDetails(
        error,
        'processCity',
        'CityService.ts',
        this.page,
        undefined,
        'processCity'
      );

      const errorMessage = ErrorHandler.formatError(errorDetails);
      const errorForReport = ErrorHandler.formatErrorForReport(errorDetails);

      this.statisticsManager.finishCity(
        city.value,
        stateData.stateValue,
        "error",
        errorMessage,
        errorForReport
      );

      this.statisticsManager.updateStateFromCity(
        stateData.stateValue,
        city.innerText,
        "error",
        0,
        0,
        0,
        errorMessage,
        errorForReport
      );

      console.error(`   ❌ Erro: ${errorMessage}`);
    }

    // Tenta voltar para a lista de cidades
    try {
      const botaoAlterar = await this.page.$("#altera_0 a");
      if (botaoAlterar) {
        console.log("clicando no botão de voltar para a lista de cidade");
        try {
          await this.page.click("#altera_0 a");
        } catch (error: any) {
          const errorDetails = await ErrorHandler.captureErrorDetails(
            error,
            'processCity (voltar para lista)',
            'CityService.ts',
            this.page,
            '#altera_0 a',
            'click alterar'
          );
          console.error(`❌ Erro ao clicar em #altera_0 a: ${ErrorHandler.formatError(errorDetails)}`);
          // Navega diretamente em caso de erro
          await this.page.goto(
            "https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?sltTipoBusca=imoveis",
            {
              waitUntil: "networkidle2",
              timeout: defaultConfig.navigationTimeoutMs,
            }
          );
        }
      } else {
        console.warn("⚠️  Botão #altera_0 a não encontrado, navegando diretamente...");
        await this.page.goto(
          "https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?sltTipoBusca=imoveis",
          {
            waitUntil: "networkidle2",
            timeout: defaultConfig.navigationTimeoutMs,
          }
        );
      }
    } catch (error: any) {
      await this.page.goto(
        "https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?sltTipoBusca=imoveis",
        {
          waitUntil: "networkidle2",
          timeout: defaultConfig.navigationTimeoutMs,
        }
      );

      const errorDetails = await ErrorHandler.captureErrorDetails(
        error,
        'processCity (navegação de retorno)',
        'CityService.ts',
        this.page,
        undefined,
        'navegacao retorno'
      );
      console.error(
        `❌ Erro ao voltar para lista de cidades: ${ErrorHandler.formatError(errorDetails)}`
      );
    }

    await delay(1000);
  }
}
