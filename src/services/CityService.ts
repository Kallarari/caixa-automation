import { Page } from "puppeteer";
import { extractAllPropertiesData } from "../scrapers/PropertyScraper";
import { selectCity } from "../scrapers/CityScraper";
import { PropertyService } from "./PropertyService";
import { StatisticsManager } from "../statistics/StatisticsManager";
import { delay } from "../utils/delay";
import { notifyError } from "../utils/notifier";

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
      notifyError("ERRO NO SCRAPING", "Veja no console para mais detalhes");
      await delay(2000);

      this.statisticsManager.finishCity(
        city.value,
        stateData.stateValue,
        "error",
        error.message
      );

      this.statisticsManager.updateStateFromCity(
        stateData.stateValue,
        city.innerText,
        "error",
        0,
        0,
        0,
        error.message
      );

      console.error(`   ❌ Erro: ${error.message}`);
    }

    // Tenta voltar para a lista de cidades
    try {
      await this.page.waitForSelector("#altera_0 a", { timeout: 5000 });
      console.log("clicando no botão de voltar para a lista de cidade");
      await this.page.click("#altera_0 a");
    } catch (error: any) {
      await this.page.goto(
        "https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?sltTipoBusca=imoveis",
        {
          waitUntil: "networkidle2",
        }
      );

      console.error(
        `❌ Erro ao clicar no botão de voltar para a lista de cidade: ${error.message}`
      );
    }

    await delay(1000);
  }
}
