import { PropertyData, PropertyRepository } from "../repositories/PropertyRepository";
import { DadosImovel } from "../types/Property.types";

/**
 * Converte DadosImovel para PropertyData (formato do banco de dados)
 */
export function mapearParaPropertyData(dados: DadosImovel): PropertyData {
  return {
    titulo: dados.titulo || "",
    imagem_url: dados.imagem || null,
    valor_avaliacao: dados.valores.valorAvaliacao || null,
    valor_minimo_1_leilao: dados.valores.valorMinimo1Leilao || null,
    valor_minimo_2_leilao: dados.valores.valorMinimo2Leilao || null,
    valor_min_venda: dados.valores.valorMinVenda || null,
    tipo_imovel: dados.caracteristicas.tipoImovel || null,
    quartos: dados.caracteristicas.quartos,
    garagem: dados.caracteristicas.garagem,
    area_total: dados.caracteristicas.areaTotal || null,
    area_privativa: dados.caracteristicas.areaPrivativa || null,
    area_terreno: dados.caracteristicas.areaTerreno || null,
    numero_imovel: dados.identificacao.numeroImovel || null,
    matriculas: dados.identificacao.matriculas || null,
    comarca: dados.identificacao.comarca || null,
    oficio: dados.identificacao.oficcio,
    inscricao_imobiliaria: dados.identificacao.inscricaoImobiliaria || null,
    averbacao_leiloes_negativos:
      dados.identificacao.averbacaoLeiloesNegativos || null,
    tipo_leilao: dados.leilao.tipoLeilao || null,
    edital: dados.leilao.edital || null,
    numero_item: dados.leilao.numeroItem || null,
    leiloeiro: dados.leilao.leiloeiro || null,
    data_1_leilao: dados.leilao.data1Leilao || null,
    data_2_leilao: dados.leilao.data2Leilao || null,
    endereco: dados.localizacao.endereco || null,
    cep: dados.localizacao.cep || null,
    cidade: dados.localizacao.cidade || null,
    estado: dados.localizacao.estado || null,
    descricao: dados.descricao || null,
    formas_pagamento: dados.formasPagamento || null,
    regras_despesas: dados.regrasDespesas || null,
    observacoes: dados.observacoes || null,
    dataFimLeilao: dados.leilao.data2Leilao || null,
    desconto: dados.leilao.desconto || null,
  };
}

export class PropertyService {
  constructor(private propertyRepository: PropertyRepository) {}

  async saveProperties(
    propertiesData: DadosImovel[]
  ): Promise<{ salvos: number; duplicados: number; erros: number }> {
    try {
      const properties = propertiesData.map(mapearParaPropertyData);
      const insertedIds = await this.propertyRepository.createMany(properties);

      const salvos = insertedIds.length;
      const duplicados = Math.max(propertiesData.length - salvos, 0);
      const erros = 0;

      console.log(
        `✅ Lote processado: ${salvos} salvos, ${duplicados} duplicados`
      );

      return { salvos, duplicados, erros };
    } catch (error: any) {
      console.error("❌ Erro ao salvar lote de imóveis:", error.message);
      return { salvos: 0, duplicados: 0, erros: propertiesData.length };
    }
  }
}
