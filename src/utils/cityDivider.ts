import * as fs from 'fs';
import * as path from 'path';
import { StateData } from '../types/Scraping.types';
import { Logger } from './logger';

export interface CityItem {
  state: string;
  stateValue: string;
  city: {
    innerText: string;
    value: string;
  };
}

export class CityDivider {
  private static readonly NUM_WORKERS = 6;
  private static readonly TEMP_DIR = path.join(process.cwd(), 'temp');

  /**
   * Achata a estrutura de estados/cidades em um array simples
   */
  static flattenCities(cities: StateData[]): CityItem[] {
    const allCities: CityItem[] = [];
    cities.forEach((state) => {
      state.cities.forEach((city) => {
        allCities.push({
          state: state.state,
          stateValue: state.stateValue,
          city,
        });
      });
    });
    return allCities;
  }

  /**
   * Divide as cidades em grupos (round-robin)
   */
  static divideIntoGroups(cities: CityItem[]): CityItem[][] {
    const groups: CityItem[][] = [];

    for (let i = 0; i < this.NUM_WORKERS; i++) {
      groups.push([]);
    }

    cities.forEach((item, index) => {
      groups[index % this.NUM_WORKERS].push(item);
    });

    return groups;
  }

  /**
   * Salva os grupos em arquivos JSON
   */
  static saveGroups(groups: CityItem[][]): void {
    // Cria diretório temp se não existir
    if (!fs.existsSync(this.TEMP_DIR)) {
      fs.mkdirSync(this.TEMP_DIR);
    }

    groups.forEach((group, index) => {
      const filePath = path.join(this.TEMP_DIR, `worker-${index}.json`);
      fs.writeFileSync(filePath, JSON.stringify(group, null, 2));
      Logger.success(
        `✅ Worker ${index + 1}: ${group.length} cidades salvas em worker-${index}.json`
      );
    });
  }

  /**
   * Carrega cidades de um worker específico
   */
  static loadWorkerCities(workerId: number): CityItem[] {
    const customFile = process.env.WORKER_FILE;
    const fileName = customFile && customFile.trim() !== ""
      ? customFile
      : `worker-${workerId}.json`;
    const filePath = path.join(this.TEMP_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Arquivo de cidades não encontrado para worker ${workerId}: ${filePath}`
      );
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  }

  /**
   * Divide e salva as cidades em grupos
   */
  static divideAndSave(cities: StateData[]): void {
    Logger.info('📊 Dividindo cidades em grupos...');
    
    const allCities = this.flattenCities(cities);
    Logger.info(`   Total de cidades: ${allCities.length}`);

    const groups = this.divideIntoGroups(allCities);
    this.saveGroups(groups);

    Logger.separator();
    Logger.info('📋 Resumo da divisão:');
    groups.forEach((group, index) => {
      Logger.info(`   Worker ${index + 1}: ${group.length} cidades`);
    });
    Logger.separator();
  }
}
