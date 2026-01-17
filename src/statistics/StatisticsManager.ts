import {
  CityStatistics,
  StateStatistics,
  GlobalStatistics,
} from "../types/Statistics.types";

export class StatisticsManager {
  private cities: Map<string, CityStatistics> = new Map();
  private states: Map<string, StateStatistics> = new Map();
  private global: GlobalStatistics;
  private startTime: Date;

  constructor(totalEstados: number, totalCidades: number) {
    this.startTime = new Date();
    this.global = {
      totalEstados,
      totalCidades,
      estadosProcessados: 0,
      cidadesProcessadas: 0,
      cidadesComSucesso: 0,
      cidadesComErro: 0,
      imoveisSalvos: 0,
      imoveisDuplicados: 0,
      imoveisComErro: 0,
      tempoTotal: 0,
      erros: [],
    };
  }

  startCity(
    cidade: string,
    estado: string,
    cidadeId: string,
    estadoId: string
  ): void {
    const key = `${estadoId}-${cidadeId}`;
    this.cities.set(key, {
      cidade,
      estado,
      cidadeId,
      estadoId,
      status: "processing",
      imoveisEncontrados: 0,
      imoveisSalvos: 0,
      imoveisDuplicados: 0,
      imoveisComErro: 0,
      dataInicio: new Date(),
    });
  }

  finishCity(
    cidadeId: string,
    estadoId: string,
    status: "success" | "error",
    erro?: string
  ): void {
    const key = `${estadoId}-${cidadeId}`;
    const cityStats = this.cities.get(key);
    if (cityStats) {
      cityStats.status = status;
      cityStats.dataFim = new Date();
      if (cityStats.dataInicio) {
        cityStats.tempoProcessamento =
          cityStats.dataFim.getTime() - cityStats.dataInicio.getTime();
      }
      if (erro) {
        cityStats.erro = erro;
      }

      // Atualiza estatísticas globais
      this.global.cidadesProcessadas++;
      if (status === "success") {
        this.global.cidadesComSucesso++;
      } else {
        this.global.cidadesComErro++;
        if (cityStats.cidade && cityStats.estado) {
          this.global.erros.push({
            cidade: cityStats.cidade,
            estado: cityStats.estado,
            erro: erro || "Erro desconhecido",
          });
        }
      }
    }
  }

  updateCityImoveis(
    cidadeId: string,
    estadoId: string,
    salvos: number,
    duplicados: number,
    erros: number
  ): void {
    const key = `${estadoId}-${cidadeId}`;
    const cityStats = this.cities.get(key);
    if (cityStats) {
      cityStats.imoveisSalvos += salvos;
      cityStats.imoveisDuplicados += duplicados;
      cityStats.imoveisComErro += erros;
      cityStats.imoveisEncontrados = salvos + duplicados + erros;

      // Atualiza estatísticas globais
      this.global.imoveisSalvos += salvos;
      this.global.imoveisDuplicados += duplicados;
      this.global.imoveisComErro += erros;
    }
  }

  startState(estado: string, estadoId: string, totalCidades: number): void {
    this.states.set(estadoId, {
      estado,
      estadoId,
      totalCidades,
      cidadesProcessadas: 0,
      cidadesComSucesso: 0,
      cidadesComErro: 0,
      imoveisSalvos: 0,
      imoveisDuplicados: 0,
      imoveisComErro: 0,
      erros: [],
    });
  }

  updateStateFromCity(
    estadoId: string,
    cidade: string,
    status: "success" | "error",
    salvos: number,
    duplicados: number,
    erros: number,
    erro?: string
  ): void {
    const stateStats = this.states.get(estadoId);
    if (stateStats) {
      stateStats.cidadesProcessadas++;
      if (status === "success") {
        stateStats.cidadesComSucesso++;
      } else {
        stateStats.cidadesComErro++;
        stateStats.erros.push({ cidade, erro: erro || "Erro desconhecido" });
      }
      stateStats.imoveisSalvos += salvos;
      stateStats.imoveisDuplicados += duplicados;
      stateStats.imoveisComErro += erros;
    }
  }

  finishState(estadoId: string): void {
    this.global.estadosProcessados++;
  }

  getCityStats(cidadeId: string, estadoId: string): CityStatistics | undefined {
    const key = `${estadoId}-${cidadeId}`;
    return this.cities.get(key);
  }

  getStateStats(estadoId: string): StateStatistics | undefined {
    return this.states.get(estadoId);
  }

  getGlobalStats(): GlobalStatistics {
    const endTime = new Date();
    this.global.tempoTotal = endTime.getTime() - this.startTime.getTime();
    return { ...this.global };
  }

  printCityReport(cidadeId: string, estadoId: string): void {
    const stats = this.getCityStats(cidadeId, estadoId);
    if (stats) {
      console.log(`\n📊 Relatório da Cidade: ${stats.cidade} - ${stats.estado}`);
      console.log(`   Status: ${stats.status}`);
      console.log(`   Imóveis encontrados: ${stats.imoveisEncontrados}`);
      console.log(`   Imóveis salvos: ${stats.imoveisSalvos}`);
      console.log(`   Imóveis duplicados: ${stats.imoveisDuplicados}`);
      console.log(`   Imóveis com erro: ${stats.imoveisComErro}`);
      if (stats.tempoProcessamento) {
        console.log(
          `   Tempo: ${(stats.tempoProcessamento / 1000).toFixed(2)}s`
        );
      }
      if (stats.erro) {
        console.log(`   Erro: ${stats.erro}`);
      }
    }
  }

  printStateReport(estadoId: string): void {
    const stats = this.getStateStats(estadoId);
    if (stats) {
      console.log(`\n📊 Relatório do Estado: ${stats.estado}`);
      console.log(`   Total de cidades: ${stats.totalCidades}`);
      console.log(`   Cidades processadas: ${stats.cidadesProcessadas}`);
      console.log(`   Cidades com sucesso: ${stats.cidadesComSucesso}`);
      console.log(`   Cidades com erro: ${stats.cidadesComErro}`);
      console.log(`   Imóveis salvos: ${stats.imoveisSalvos}`);
      console.log(`   Imóveis duplicados: ${stats.imoveisDuplicados}`);
      console.log(`   Imóveis com erro: ${stats.imoveisComErro}`);
      if (stats.erros.length > 0) {
        console.log(`   Erros:`);
        stats.erros.forEach((erro) => {
          console.log(`     - ${erro.cidade}: ${erro.erro}`);
        });
      }
    }
  }

  printGlobalReport(): void {
    const stats = this.getGlobalStats();
    console.log("\n" + "=".repeat(80));
    console.log("📊 RELATÓRIO GLOBAL");
    console.log("=".repeat(80));
    console.log(`Total de estados: ${stats.totalEstados}`);
    console.log(`Total de cidades: ${stats.totalCidades}`);
    console.log(`Estados processados: ${stats.estadosProcessados}`);
    console.log(`Cidades processadas: ${stats.cidadesProcessadas}`);
    console.log(`Cidades com sucesso: ${stats.cidadesComSucesso}`);
    console.log(`Cidades com erro: ${stats.cidadesComErro}`);
    console.log(`Imóveis salvos: ${stats.imoveisSalvos}`);
    console.log(`Imóveis duplicados: ${stats.imoveisDuplicados}`);
    console.log(`Imóveis com erro: ${stats.imoveisComErro}`);
    console.log(
      `Tempo total: ${(stats.tempoTotal / 1000 / 60).toFixed(2)} minutos`
    );
    if (stats.erros.length > 0) {
      console.log(`\nErros encontrados: ${stats.erros.length}`);
      stats.erros.slice(0, 10).forEach((erro) => {
        console.log(`  - ${erro.cidade} - ${erro.estado}: ${erro.erro}`);
      });
      if (stats.erros.length > 10) {
        console.log(`  ... e mais ${stats.erros.length - 10} erros`);
      }
    }
    console.log("=".repeat(80));
  }
}
