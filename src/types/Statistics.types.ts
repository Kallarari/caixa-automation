export interface CityStatistics {
  cidade: string;
  estado: string;
  cidadeId: string;
  estadoId: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  imoveisEncontrados: number;
  imoveisSalvos: number;
  imoveisDuplicados: number;
  imoveisComErro: number;
  erro?: string;
  tempoProcessamento?: number;
  dataInicio?: Date;
  dataFim?: Date;
}

export interface StateStatistics {
  estado: string;
  estadoId: string;
  totalCidades: number;
  cidadesProcessadas: number;
  cidadesComSucesso: number;
  cidadesComErro: number;
  imoveisSalvos: number;
  imoveisDuplicados: number;
  imoveisComErro: number;
  erros: Array<{ cidade: string; erro: string }>;
}

export interface GlobalStatistics {
  totalEstados: number;
  totalCidades: number;
  estadosProcessados: number;
  cidadesProcessadas: number;
  cidadesComSucesso: number;
  cidadesComErro: number;
  imoveisSalvos: number;
  imoveisDuplicados: number;
  imoveisComErro: number;
  tempoTotal: number;
  erros: Array<{ cidade: string; estado: string; erro: string }>;
}
