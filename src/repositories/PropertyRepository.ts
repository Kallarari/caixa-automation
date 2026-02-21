import pool from "../database/config";

export interface PropertyData {
  titulo: string;
  imagem_url: string | null;
  valor_avaliacao: string | null;
  valor_minimo_1_leilao: string | null;
  valor_minimo_2_leilao: string | null;
  valor_min_venda: string | null;
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
  async create(property: PropertyData): Promise<number | null> {
    const query = `
      INSERT INTO property_bronze (
        titulo, imagem_url, valor_avaliacao, valor_minimo_1_leilao, valor_minimo_2_leilao, valor_min_venda,
        tipo_imovel, quartos, garagem, area_total, area_privativa, area_terreno,
        numero_imovel, matriculas, comarca, oficio, inscricao_imobiliaria, averbacao_leiloes_negativos,
        tipo_leilao, edital, numero_item, leiloeiro, data_1_leilao, data_2_leilao,
        endereco, cep, cidade, estado,
        descricao, formas_pagamento, regras_despesas, observacoes, data_fim_leilao, desconto
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    const values = [
      property.titulo,
      property.imagem_url || null,
      property.valor_avaliacao || null,
      property.valor_minimo_1_leilao || null,
      property.valor_minimo_2_leilao || null,
      property.valor_min_venda || null,
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
      property.desconto || null,
    ];

    try {
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
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
    if (properties.length === 0) {
      return [];
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const placeholders: string[] = [];
      const values: any[] = [];
      const columnsPerRow = 34;

      properties.forEach((property, index) => {
        const offset = index * columnsPerRow;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${
            offset + 5
          }, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${
            offset + 10
          }, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${
            offset + 15
          }, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${
            offset + 20
          }, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${
            offset + 25
          }, $${offset + 26}, $${offset + 27}, $${offset + 28}, $${offset + 29}, $${
            offset + 30
          }, $${offset + 31}, $${offset + 32}, $${offset + 33}, $${offset + 34})`
        );

        values.push(
          property.titulo,
          property.imagem_url || null,
          property.valor_avaliacao || null,
          property.valor_minimo_1_leilao || null,
          property.valor_minimo_2_leilao || null,
          property.valor_min_venda || null,
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
          property.desconto || null
        );
      });

      const query = `
        INSERT INTO property_bronze (
          titulo, imagem_url, valor_avaliacao, valor_minimo_1_leilao, valor_minimo_2_leilao, valor_min_venda,
          tipo_imovel, quartos, garagem, area_total, area_privativa, area_terreno,
          numero_imovel, matriculas, comarca, oficio, inscricao_imobiliaria, averbacao_leiloes_negativos,
          tipo_leilao, edital, numero_item, leiloeiro, data_1_leilao, data_2_leilao,
          endereco, cep, cidade, estado,
          descricao, formas_pagamento, regras_despesas, observacoes, data_fim_leilao, desconto
        ) VALUES ${placeholders.join(", ")}
        ON CONFLICT DO NOTHING
        RETURNING id
      `;

      const result = await client.query(query, values);

      await client.query("COMMIT");
      return result.rows.map((row: any) => row.id);
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
        titulo, imagem_url, valor_avaliacao, valor_minimo_1_leilao, valor_minimo_2_leilao, valor_min_venda,
        tipo_imovel, quartos, garagem, area_total, area_privativa, area_terreno,
        numero_imovel, matriculas, comarca, oficio, inscricao_imobiliaria, averbacao_leiloes_negativos,
        tipo_leilao, edital, numero_item, leiloeiro, data_1_leilao, data_2_leilao,
        endereco, cep, cidade, estado,
        descricao, formas_pagamento, regras_despesas, observacoes, data_fim_leilao, desconto
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
      ) RETURNING id
    `;

    const values = [
      property.titulo,
      property.imagem_url || null,
      property.valor_avaliacao || null,
      property.valor_minimo_1_leilao || null,
      property.valor_minimo_2_leilao || null,
      property.valor_min_venda || null,
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
