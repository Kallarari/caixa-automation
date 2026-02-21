export type ProcessingMode = 'all' | 'state' | 'city' | 'worker' | 'divide';

export interface ScrapingConfig {
  // Modo de processamento
  mode: ProcessingMode;
  
  // IDs para filtro
  estadoInicioId?: string;
  cidadeInicioId?: string;
  
  // Configurações de navegação
  timeout: number;
  headless: boolean;

  // Ajustes finos de performance
  selectorTimeoutMs: number;
  navigationTimeoutMs: number;
  actionDelayMs: number;
  
  // URLs
  baseUrl: string;
}

export const defaultConfig: ScrapingConfig = {
  mode: 'worker',
  timeout: 10000,
  headless: false,
  selectorTimeoutMs: 10000,
  navigationTimeoutMs: 30000,
  actionDelayMs: 800,
  baseUrl: 'https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?sltTipoBusca=imoveis',
};
