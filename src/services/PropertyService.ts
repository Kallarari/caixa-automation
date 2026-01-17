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
    let salvos = 0;
    let duplicados = 0;
    let erros = 0;

    for (const dados of propertiesData) {
      try {
        const propertyData = mapearParaPropertyData(dados);

        // Verifica se o imóvel já existe antes de salvar
        const existe = await this.propertyRepository.existsByFields(
          propertyData
        );

        if (existe) {
          duplicados++;
        } else {
          const id = await this.propertyRepository.create(propertyData);
          console.log(
            `✅ Imóvel salvo com sucesso (ID: ${id}): ${dados.titulo}`
          );
          salvos++;
        }
      } catch (error: any) {
        console.error(
          `❌ Erro ao salvar imóvel "${dados.titulo}":`,
          error.message
        );
        erros++;
      }
    }

    return { salvos, duplicados, erros };
  }
}
