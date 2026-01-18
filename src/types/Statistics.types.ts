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
  erroDetalhado?: {
    funcao: string;
    step?: string;
    seletor?: string;
    outerHTML?: string | null;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
      top: number;
      left: number;
      bottom: number;
      right: number;
    } | null;
    display?: string | null;
    visibility?: string | null;
    opacity?: string | null;
  };
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
  erros: Array<{ 
    cidade: string; 
    erro: string;
    erroDetalhado?: {
      funcao: string;
      step?: string;
      seletor?: string;
      outerHTML?: string | null;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
        top: number;
        left: number;
        bottom: number;
        right: number;
      } | null;
      display?: string | null;
      visibility?: string | null;
      opacity?: string | null;
    };
  }>;
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
  erros: Array<{ 
    cidade: string; 
    estado: string; 
    erro: string;
    erroDetalhado?: {
      funcao: string;
      step?: string;
      seletor?: string;
      outerHTML?: string | null;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
        top: number;
        left: number;
        bottom: number;
        right: number;
      } | null;
      display?: string | null;
      visibility?: string | null;
      opacity?: string | null;
    };
  }>;
}
