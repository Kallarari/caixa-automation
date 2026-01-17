export type ProcessingMode = 'all' | 'state' | 'city';

export interface ScrapingConfig {
  // Modo de processamento
  mode: ProcessingMode;
  
  // IDs para filtro
  estadoInicioId?: string;
  cidadeInicioId?: string;
  
  // Configurações de navegação
  timeout: number;
  headless: boolean;
  
  // URLs
  baseUrl: string;
}

export const defaultConfig: ScrapingConfig = {
  mode: 'all',
  timeout: 10000,
  headless: false,
  baseUrl: 'https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?sltTipoBusca=imoveis',
};
