import pool from "../database/config";

export interface PropertyData {
  titulo: string;
  imagem_url: string | null;
  valor_avaliacao: string | null;
  valor_minimo_1_leilao: string | null;
  valor_minimo_2_leilao: string | null;
  tipo_imovel: string | null;
  quartos: number | null;
  garagem: number | null;
  area_total: string | null;
  area_privativa: string | null;
  area_terreno: string | null;
  numero_imovel: string | null;
  matriculas: string | null;
  comarca: string | null;
  oficio: number | null;
  inscricao_imobiliaria: string | null;
  averbacao_leiloes_negativos: string | null;
  tipo_leilao: string | null;
  edital: string | null;
  numero_item: string | null;
  leiloeiro: string | null;
  data_1_leilao: string | null;
  data_2_leilao: string | null;
  endereco: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  descricao: string | null;
  formas_pagamento: string | null;
  regras_despesas: string | null;
  observacoes: string | null;
  dataFimLeilao: string | null;
  desconto: string | null;
}

export class PropertyRepository {
  /**
   * Salva um imóvel no banco de dados
   */
  async create(property: PropertyData): Promise<number> {
    const query = `
      INSERT INTO property_bronze (
        titulo, imagem_url, valor_avaliacao, valor_minimo_1_leilao, valor_minimo_2_leilao,
        tipo_imovel, quartos, garagem, area_total, area_privativa, area_terreno,
        numero_imovel, matriculas, comarca, oficio, inscricao_imobiliaria, averbacao_leiloes_negativos,
        tipo_leilao, edital, numero_item, leiloeiro, data_1_leilao, data_2_leilao,
        endereco, cep, cidade, estado,
        descricao, formas_pagamento, regras_despesas, observacoes,data_fim_leilao
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
      ) RETURNING id
    `;

    const values = [
      property.titulo,
      property.imagem_url || null,
      property.valor_avaliacao || null,
      property.valor_minimo_1_leilao || null,
      property.valor_minimo_2_leilao || null,
      property.tipo_imovel || null,
      property.quartos,
      property.garagem,
      property.area_total || null,
      property.area_privativa || null,
      property.area_terreno || null,
      property.numero_imovel || null,
      property.matriculas || null,
      property.comarca || null,
      property.oficio,
      property.inscricao_imobiliaria || null,
      property.averbacao_leiloes_negativos || null,
      property.tipo_leilao || null,
      property.edital || null,
      property.numero_item || null,
      property.leiloeiro || null,
      property.data_1_leilao || null,
      property.data_2_leilao || null,
      property.endereco || null,
      property.cep || null,
      property.cidade || null,
      property.estado || null,
      property.descricao || null,
      property.formas_pagamento || null,
      property.regras_despesas || null,
      property.observacoes || null,
      property.dataFimLeilao || null,
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error("Erro ao salvar imóvel no banco de dados:", error);
      throw error;
    }
  }

  /**
   * Salva múltiplos imóveis em uma transação
   */
  async createMany(properties: PropertyData[]): Promise<number[]> {
    const client = await pool.connect();
    const ids: number[] = [];

    try {
      await client.query("BEGIN");

      for (const property of properties) {
        const id = await this.createWithClient(client, property);
        ids.push(id);
      }

      await client.query("COMMIT");
      return ids;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao salvar múltiplos imóveis:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Método auxiliar para criar com um client específico (usado em transações)
   */
  private async createWithClient(
    client: any,
    property: PropertyData
  ): Promise<number> {
    const query = `
      INSERT INTO property_bronze (
        titulo, imagem_url, valor_avaliacao, valor_minimo_1_leilao, valor_minimo_2_leilao,
        tipo_imovel, quartos, garagem, area_total, area_privativa, area_terreno,
        numero_imovel, matriculas, comarca, oficio, inscricao_imobiliaria, averbacao_leiloes_negativos,
        tipo_leilao, edital, numero_item, leiloeiro, data_1_leilao, data_2_leilao,
        endereco, cep, cidade, estado,
        descricao, formas_pagamento, regras_despesas, observacoes, desconto
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
      ) RETURNING id
    `;

    const values = [
      property.titulo,
      property.imagem_url || null,
      property.valor_avaliacao || null,
      property.valor_minimo_1_leilao || null,
      property.valor_minimo_2_leilao || null,
      property.tipo_imovel || null,
      property.quartos,
      property.garagem,
      property.area_total || null,
      property.area_privativa || null,
      property.area_terreno || null,
      property.numero_imovel || null,
      property.matriculas || null,
      property.comarca || null,
      property.oficio,
      property.inscricao_imobiliaria || null,
      property.averbacao_leiloes_negativos || null,
      property.tipo_leilao || null,
      property.edital || null,
      property.numero_item || null,
      property.leiloeiro || null,
      property.data_1_leilao || null,
      property.data_2_leilao || null,
      property.endereco || null,
      property.cep || null,
      property.cidade || null,
      property.estado || null,
      property.descricao || null,
      property.formas_pagamento || null,
      property.regras_despesas || null,
      property.observacoes || null,
      property.desconto || null,
    ];

    const result = await client.query(query, values);
    return result.rows[0].id;
  }

  /**
   * Verifica se um imóvel já existe pelo número do imóvel
   */
  async existsByNumeroImovel(numeroImovel: string): Promise<boolean> {
    const query = "SELECT id FROM property_bronze WHERE numero_imovel = $1 LIMIT 1";
    const result = await pool.query(query, [numeroImovel]);
    return result.rows.length > 0;
  }

  /**
   * Verifica se um imóvel já existe usando uma combinação de campos (fallback quando numero_imovel não está disponível)
   */
  async existsByFields(property: PropertyData): Promise<boolean> {
    // Tenta primeiro pelo número do imóvel se disponível
    if (property.numero_imovel) {
      return await this.existsByNumeroImovel(property.numero_imovel);
    }

    // Se não tiver numero_imovel, verifica por título + endereco + cidade
    if (property.titulo && property.endereco && property.cidade) {
      const query = `
        SELECT id FROM property_bronze 
        WHERE titulo = $1 
          AND endereco = $2 
          AND cidade = $3 
        LIMIT 1
      `;
      const result = await pool.query(query, [
        property.titulo,
        property.endereco,
        property.cidade,
      ]);
      return result.rows.length > 0;
    }

    // Se não tiver informações suficientes, retorna false (não pode verificar)
    return false;
  }

  /**
   * Fecha todas as conexões do pool
   */
  async close(): Promise<void> {
    await pool.end();
  }
}
