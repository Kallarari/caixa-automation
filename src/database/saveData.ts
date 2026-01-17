import * as fs from "fs";
import * as path from "path";

export function salvarDadosEmJSON(dados: any, nomeArquivo: string = "dados.json"): void {
    try {
      // Caminho para a raiz do projeto
      const caminhoArquivo = path.join(process.cwd(), nomeArquivo);
      
      // Converte os dados para JSON formatado (com indentação)
      const jsonString = JSON.stringify(dados, null, 2);
      
      // Escreve o arquivo
      fs.writeFileSync(caminhoArquivo, jsonString, "utf-8");
      
      console.log(`\n✅ Dados salvos em: ${caminhoArquivo}`);
    } catch (error) {
      console.error("❌ Erro ao salvar dados em JSON:", error);
      throw error;
    }
  }
  