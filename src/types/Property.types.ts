export interface DadosImovel {
  imagem: string;
  valores: {
    valorAvaliacao: string;
    valorMinimo1Leilao: string;
    valorMinimo2Leilao: string;
  };
  caracteristicas: {
    tipoImovel: string;
    quartos: number | null;
    garagem: number | null;
    areaTotal: string;
    areaPrivativa: string;
    areaTerreno: string;
  };
  identificacao: {
    numeroImovel: string;
    matriculas: string;
    comarca: string;
    oficcio: number | null;
    inscricaoImobiliaria: string;
    averbacaoLeiloesNegativos: string;
  };
  leilao: {
    tipoLeilao: string;
    edital: string;
    numeroItem: string;
    leiloeiro: string;
    data1Leilao: string;
    data2Leilao: string;
    desconto: string;
  };
  localizacao: {
    endereco: string;
    cep: string;
    cidade: string;
    estado: string;
  };
  titulo: string;
  descricao: string;
  formasPagamento: string;
  regrasDespesas: string;
  observacoes: string;
}
