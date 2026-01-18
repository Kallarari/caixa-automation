import { Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { CityDivider, CityItem } from '../utils/cityDivider';
import { CityService } from './CityService';
import { PropertyService } from './PropertyService';
import { PropertyRepository } from '../repositories/PropertyRepository';
import { StatisticsManager } from '../statistics/StatisticsManager';
import { Logger } from '../utils/logger';
import { defaultConfig } from '../config/scraping.config';

export class WorkerService {
  private cityService: CityService | null = null;
  private statisticsManager: StatisticsManager;

  constructor(
    private workerId: number,
    private page: Page
  ) {
    // StatisticsManager será inicializado depois de carregar as cidades
    this.statisticsManager = new StatisticsManager(0, 0);
  }

  async processWorkerCities(): Promise<void> {
    Logger.separator('=');
    Logger.info(`🚀 WORKER ${this.workerId + 1} INICIANDO`);
    Logger.separator('=');

    const cities = CityDivider.loadWorkerCities(this.workerId);

    if (cities.length === 0) {
      Logger.warn(`⚠️  Worker ${this.workerId + 1} não tem cidades para processar`);
      return;
    }

    Logger.info(
      `📂 Worker ${this.workerId + 1} carregou ${cities.length} cidades`
    );

    // Inicializa estatísticas com o número correto de cidades
    this.statisticsManager = new StatisticsManager(1, cities.length);
    
    // Agora cria o CityService com o StatisticsManager correto
    const propertyRepository = new PropertyRepository();
    const propertyService = new PropertyService(propertyRepository);
    
    this.cityService = new CityService(
      this.page,
      propertyService,
      this.statisticsManager
    );

    let lastStateValue: string | null = null;
    const baseUrl = "https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?sltTipoBusca=imoveis";
    
    // Conta quantas cidades cada estado tem para inicializar corretamente
    const estadosMap = new Map<string, { state: string; count: number }>();
    cities.forEach(({ state, stateValue }) => {
      const existing = estadosMap.get(stateValue);
      if (existing) {
        existing.count++;
      } else {
        estadosMap.set(stateValue, { state, count: 1 });
      }
    });

    // Processa cada cidade
    for (let i = 0; i < cities.length; i++) {
      const { state, stateValue, city } = cities[i];
      
      Logger.info(
        `\n[Worker ${this.workerId + 1}] ${i + 1}/${cities.length}: ${city.innerText} - ${state}`
      );

      try {
        // Se mudou de estado, inicializa estatísticas do estado e navega para a página inicial
        if (lastStateValue !== stateValue) {
          // Inicializa estatísticas do estado
          const estadoInfo = estadosMap.get(stateValue);
          if (estadoInfo) {
            this.statisticsManager.startState(
              estadoInfo.state,
              stateValue,
              estadoInfo.count
            );
          }
          
          // Se não é o primeiro estado, finaliza o anterior
          if (lastStateValue !== null) {
            this.statisticsManager.finishState(lastStateValue);
          }
          
          Logger.info(
            `[Worker ${this.workerId + 1}] 🔄 Mudou de estado, navegando para página inicial...`
          );
          await this.page.goto(baseUrl, {
            waitUntil: "networkidle2",
            timeout: defaultConfig.navigationTimeoutMs,
          });
          // Aguarda os seletores estarem disponíveis
          await this.page.waitForSelector("#cmb_estado", { timeout: defaultConfig.selectorTimeoutMs });
          lastStateValue = stateValue;
        }

        if (!this.cityService) {
          throw new Error("CityService não foi inicializado");
        }
        
        await this.cityService.processCity(city, {
          state,
          stateValue,
        });
      } catch (error: any) {
        Logger.error(
          `[Worker ${this.workerId + 1}] ❌ Erro: ${error.message}`
        );
        
        // Em caso de erro, volta para a página inicial para o próximo processamento
        try {
          await this.page.goto(baseUrl, {
            waitUntil: "networkidle2",
            timeout: defaultConfig.navigationTimeoutMs,
          });
          await this.page.waitForSelector("#cmb_estado", { timeout: defaultConfig.selectorTimeoutMs });
          lastStateValue = null; // Força navegação na próxima iteração
        } catch (navError) {
          Logger.warn(
            `[Worker ${this.workerId + 1}] ⚠️  Erro ao navegar para página inicial: ${(navError as any).message}`
          );
        }
      }
    }
    
    // Finaliza o último estado processado
    if (lastStateValue !== null) {
      this.statisticsManager.finishState(lastStateValue);
    }

    Logger.separator('=');
    Logger.info(`✅ WORKER ${this.workerId + 1} CONCLUÍDO`);
    Logger.separator('=');

    // Exibe relatório do worker
    this.statisticsManager.printGlobalReport();

    // Salva relatório detalhado em JSON
    this.saveReportToJson();
  }

  private saveReportToJson(): void {
    try {
      const globalStats = this.statisticsManager.getGlobalStats();
      const citiesStats = this.statisticsManager.getAllCitiesStats();
      const statesStats = this.statisticsManager.getAllStatesStats();
      const startTime = this.statisticsManager.getStartTime();
      const endTime = new Date();

      // Calcula totais de imóveis processados
      const totalImoveisProcessados = 
        globalStats.imoveisSalvos + 
        globalStats.imoveisDuplicados + 
        globalStats.imoveisComErro;

      // Filtra apenas cidades com erro
      const cidadesComErro = citiesStats.filter(city => city.status === 'error');
      
      // Prepara o relatório
      const report = {
        workerId: this.workerId,
        workerNumber: this.workerId + 1,
        dataInicio: startTime.toISOString(),
        dataFim: endTime.toISOString(),
        tempoTotal: {
          milissegundos: globalStats.tempoTotal,
          segundos: Math.round(globalStats.tempoTotal / 1000),
          minutos: parseFloat((globalStats.tempoTotal / 1000 / 60).toFixed(2)),
          horas: parseFloat((globalStats.tempoTotal / 1000 / 60 / 60).toFixed(2)),
          formato: `${Math.floor(globalStats.tempoTotal / 1000 / 60)}m ${Math.floor((globalStats.tempoTotal / 1000) % 60)}s`
        },
        resumo: {
          totalCidades: globalStats.totalCidades,
          cidadesProcessadas: globalStats.cidadesProcessadas,
          cidadesComSucesso: globalStats.cidadesComSucesso,
          cidadesComErro: globalStats.cidadesComErro,
          totalImoveisProcessados: totalImoveisProcessados,
          imoveisSalvos: globalStats.imoveisSalvos,
          imoveisDuplicados: globalStats.imoveisDuplicados,
          imoveisComErro: globalStats.imoveisComErro,
          taxaSucesso: globalStats.cidadesProcessadas > 0 
            ? parseFloat(((globalStats.cidadesComSucesso / globalStats.cidadesProcessadas) * 100).toFixed(2))
            : 0
        },
        erros: {
          total: globalStats.erros.length,
          cidadesComErro: cidadesComErro.length,
          detalhes: globalStats.erros.map(erro => ({
            cidade: erro.cidade,
            estado: erro.estado,
            erro: erro.erro,
            erroDetalhado: erro.erroDetalhado || null
          })),
          cidadesDetalhadas: cidadesComErro.map(city => ({
            cidade: city.cidade,
            estado: city.estado,
            cidadeId: city.cidadeId,
            estadoId: city.estadoId,
            erro: city.erro || 'Erro desconhecido',
            erroDetalhado: city.erroDetalhado || null,
            imoveisEncontrados: city.imoveisEncontrados,
            imoveisSalvos: city.imoveisSalvos,
            imoveisDuplicados: city.imoveisDuplicados,
            imoveisComErro: city.imoveisComErro,
            tempoProcessamento: city.tempoProcessamento 
              ? {
                  milissegundos: city.tempoProcessamento,
                  segundos: Math.round(city.tempoProcessamento / 1000),
                  formato: `${Math.floor(city.tempoProcessamento / 1000)}s`
                }
              : null,
            dataInicio: city.dataInicio?.toISOString(),
            dataFim: city.dataFim?.toISOString()
          }))
        },
        cidades: citiesStats.map(city => ({
          cidade: city.cidade,
          estado: city.estado,
          cidadeId: city.cidadeId,
          estadoId: city.estadoId,
          status: city.status,
          imoveisEncontrados: city.imoveisEncontrados,
          imoveisSalvos: city.imoveisSalvos,
          imoveisDuplicados: city.imoveisDuplicados,
          imoveisComErro: city.imoveisComErro,
          erro: city.erro || null,
          erroDetalhado: city.erroDetalhado || null,
          tempoProcessamento: city.tempoProcessamento 
            ? {
                milissegundos: city.tempoProcessamento,
                segundos: Math.round(city.tempoProcessamento / 1000),
                formato: `${Math.floor(city.tempoProcessamento / 1000)}s`
              }
            : null,
          dataInicio: city.dataInicio?.toISOString(),
          dataFim: city.dataFim?.toISOString()
        })),
        estados: statesStats.map(state => ({
          estado: state.estado,
          estadoId: state.estadoId,
          totalCidades: state.totalCidades,
          cidadesProcessadas: state.cidadesProcessadas,
          cidadesComSucesso: state.cidadesComSucesso,
          cidadesComErro: state.cidadesComErro,
          imoveisSalvos: state.imoveisSalvos,
          imoveisDuplicados: state.imoveisDuplicados,
          imoveisComErro: state.imoveisComErro,
          erros: state.erros.map(erro => ({
            cidade: erro.cidade,
            erro: erro.erro,
            erroDetalhado: erro.erroDetalhado || null
          }))
        }))
      };

      // Cria diretório temp se não existir
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      // Salva o relatório
      const reportPath = path.join(tempDir, `worker-${this.workerId}-report.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

      Logger.success(
        `📄 Relatório salvo em: ${reportPath}`
      );
      Logger.info(
        `   ⏱️  Tempo total: ${report.tempoTotal.formato}`
      );
      Logger.info(
        `   📊 Imóveis processados: ${totalImoveisProcessados} (${globalStats.imoveisSalvos} salvos, ${globalStats.imoveisDuplicados} duplicados, ${globalStats.imoveisComErro} com erro)`
      );
      Logger.info(
        `   ❌ Cidades com erro: ${cidadesComErro.length} de ${globalStats.cidadesProcessadas}`
      );
    } catch (error: any) {
      Logger.error(
        `❌ Erro ao salvar relatório do worker ${this.workerId + 1}: ${error.message}`
      );
    }
  }
}
