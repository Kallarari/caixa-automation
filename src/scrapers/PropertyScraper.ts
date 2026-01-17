import { Page } from "puppeteer";
import { DadosImovel } from "../types/Property.types";
import { navegarParaImovel } from "./NavigationService";
import { contarImoveisNaPagina, obterTotalPaginas, navegarParaPagina } from "./PaginationScraper";
import { delay } from "../utils/delay";

/**
 * Extrai os dados de um imóvel da página atual
 */
export async function extractPropertyData(page: Page): Promise<DadosImovel> {
  await page.waitForSelector("body", { timeout: 10000 });
  
  try {
    await page.waitForSelector("#preview", { timeout: 5000 });
  } catch (error) {
    // Se #preview não existir, apenas continua (a função já trata isso internamente)
    console.log("⚠️  Elemento #preview não encontrado, continuando mesmo assim...");
  }

  const dadosImovel = await page.evaluate(async () => {
    console.log("extractPropertyData");

    const bodyText = document.body.innerText || document.body.textContent || "";

    const imgPreview = document.querySelector("#preview") as HTMLImageElement;
    const linkImagem = imgPreview ? imgPreview.src : "";

    const extrairValor = (padrao: RegExp, texto: string): string => {
      const match = texto.match(padrao);
      return match ? match[1].trim() : "";
    };

    const extrairValorMonetario = (padrao: RegExp, texto: string): string => {
      const match = texto.match(padrao);
      return match ? match[1].trim() : "";
    };

    const extrairTitulo = (texto: string): string => {
      const div = document.querySelector("div.control-item.control-span-12_12");
      if (!div) {
        return "";
      }

      const h5 = div.querySelector("h5");
      if (!h5) {
        return "";
      }

      // Clona o h5 para não modificar o original
      const h5Clone = h5.cloneNode(true) as HTMLElement;

      // Remove todos os inputs dentro do h5
      const inputs = h5Clone.querySelectorAll("input");
      inputs.forEach((input) => input.remove());

      const titulo = h5Clone.textContent?.trim() || "";
      return titulo;
    };

    const extraiModalidade = () => {
      const modalidadeDiv = document.querySelectorAll(".control-span-12_12");

      if (modalidadeDiv.length === 0) {
        return "";
      }

      if (
        modalidadeDiv[1]?.textContent === undefined ||
        modalidadeDiv[1]?.textContent === null
      ) {
        return "";
      }

      const modalidade = modalidadeDiv[1].textContent?.trim() || "";
      return modalidade;
    };

    const extrairDesconto = () => {
      try {
        const primeiroParagrafo = document.querySelector(".content p");
        if (!primeiroParagrafo) {
          return "";
        }

        if (primeiroParagrafo.textContent === undefined) {
          return "";
        }

        const textoCompleto = primeiroParagrafo.textContent;

        const regexDesconto = /desconto de (\d+,\d+%)/;
        const resultado = textoCompleto?.match(regexDesconto);

        return resultado?.[1] || "";
      } catch (error) {
        // Em caso de erro inesperado, retorna string vazia
        console.warn("Erro ao extrair desconto:", error);
        return "";
      }
    };

    const extrairNumero = (padrao: RegExp, texto: string): string => {
      const match = texto.match(padrao);
      return match ? match[1].trim() : "";
    };

    const valorAvaliacao = extrairValorMonetario(
      /Valor de avaliação:\s*(R\$\s*[\d.,]+)/i,
      bodyText
    );

    const valorMinimo1Leilao = extrairValorMonetario(
      /Valor mínimo de venda 1º Leilão:\s*(R\$\s*[\d.,]+)/i,
      bodyText
    );

    const valorMinimo2Leilao = extrairValorMonetario(
      /Valor mínimo de venda 2º Leilão:\s*(R\$\s*[\d.,]+)/i,
      bodyText
    );

    const titulo = extrairTitulo(bodyText);
    const tipoImovel = extrairValor(/Tipo de imóvel:\s*(.+)/i, bodyText);
    const quartos = extrairNumero(/Quartos:\s*(\d+)/i, bodyText);
    const garagem = extrairNumero(/Garagem:\s*(\d+)/i, bodyText);
    const numeroImovel = extrairValor(/Número do imóvel:\s*(.+)/i, bodyText);
    const matriculas = extrairValor(/Matrícula\(s\):\s*(.+)/i, bodyText);
    const comarca = extrairValor(/Comarca:\s*(.+)/i, bodyText);
    const oficcio = extrairNumero(/Ofício:\s*(\d+)/i, bodyText);
    const inscricaoImobiliaria = extrairValor(
      /Inscrição imobiliária:\s*(.+)/i,
      bodyText
    );

    const averbacaoLeiloesNegativos = extrairValor(
      /Averbação dos leilões negativos:\s*(.+)/i,
      bodyText
    );

    const areaTotal = extrairValor(/Área total\s*=\s*([\d.,]+m2)/i, bodyText);
    const areaPrivativa = extrairValor(
      /Área privativa\s*=\s*([\d.,]+m2)/i,
      bodyText
    );
    const areaTerreno = extrairValor(
      /Área do terreno\s*=\s*([\d.,]+m2)/i,
      bodyText
    );

    const edital = extrairValor(/Edital:\s*(.+)/i, bodyText);
    const numeroItem = extrairValor(/Número do item:\s*(.+)/i, bodyText);
    const leiloeiro = extrairValor(/Leiloeiro\(a\):\s*(.+)/i, bodyText);
    const data1Leilao = extrairValor(/Data do 1º Leilão\s*-\s*(.+)/i, bodyText);
    const data2Leilao = extrairValor(/Data do 2º Leilão\s*-\s*(.+)/i, bodyText);

    const enderecoCompleto = extrairValor(
      /Endereço:\s*(.+?)(?:\n|Baixar|Descrição|$)/is,
      bodyText
    );

    const cepMatch = bodyText.match(/CEP:\s*(\d{5}-\d{3})/i);
    const cep = cepMatch ? cepMatch[1] : "";

    const cidadeEstadoMatch = bodyText.match(
      /CEP:\s*\d{5}-\d{3},\s*(.+?)\s*-\s*(.+?)(?:\n|$)/i
    );

    const cidade = cidadeEstadoMatch ? cidadeEstadoMatch[1].trim() : "";
    const estado = cidadeEstadoMatch ? cidadeEstadoMatch[2].trim() : "";

    const descricaoMatch = bodyText.match(
      /Descrição:\s*(.+?)(?:\n\n|FORMAS DE PAGAMENTO|$)/is
    );
    const descricao = descricaoMatch ? descricaoMatch[1].trim() : "";

    const formasPagamentoMatch = bodyText.match(
      /FORMAS DE PAGAMENTO ACEITAS:\s*(.+?)(?:\n\n|REGRAS PARA PAGAMENTO|$)/is
    );
    const formasPagamento = formasPagamentoMatch
      ? formasPagamentoMatch[1].trim()
      : "";

    const regrasDespesasMatch = bodyText.match(
      /REGRAS PARA PAGAMENTO DAS DESPESAS[^:]*:\s*(.+?)(?:\n\n|Imóvel com|$)/is
    );
    const regrasDespesas = regrasDespesasMatch
      ? regrasDespesasMatch[1].trim()
      : "";

    const observacoesMatch = bodyText.match(/Imóvel com (.+?)(?:\n\n|$)/is);
    const observacoes = observacoesMatch ? observacoesMatch[1].trim() : "";

    const extrairTempoContador = (id: string): number | null => {
      const elemento = document.querySelector(`#${id}`) as HTMLElement;
      if (!elemento) {
        return null;
      }

      // Pega o texto interno da div (que contém &nbsp;21&nbsp;)
      const textoCompleto = elemento.innerHTML || elemento.innerText || "";

      // Remove tags HTML e &nbsp;
      const textoLimpo = textoCompleto
        .replace(/&nbsp;/g, " ")
        .replace(/<[^>]*>/g, "")
        .trim();

      // Extrai apenas os números
      const match = textoLimpo.match(/\d+/);
      if (match) {
        const valor = parseInt(match[0], 10);
        return isNaN(valor) ? null : valor;
      }

      return null;
    };

    const dias = extrairTempoContador("dias0");
    const horas = extrairTempoContador("horas0");
    const minutos = extrairTempoContador("minutos0");
    const segundos = extrairTempoContador("segundos0");

    const calcularDataFutura = (
      dias: number | null,
      horas: number | null,
      minutos: number | null,
      segundos: number | null
    ): string | null => {
      // Se não houver nenhum valor, retorna null
      if (
        dias === null &&
        horas === null &&
        minutos === null &&
        segundos === null
      ) {
        return null;
      }
      if (dias === 0 && horas === 0 && minutos === 0 && segundos === 0) {
        return new Date().toISOString();
      }

      // Cria uma nova data baseada na data atual
      const dataAtual = new Date();
      const dataFutura = new Date(dataAtual);

      // Adiciona os valores (usando 0 se for null)
      if (dias !== null) {
        dataFutura.setDate(dataFutura.getDate() + dias);
      }
      if (horas !== null) {
        dataFutura.setHours(dataFutura.getHours() + horas);
      }
      if (minutos !== null) {
        dataFutura.setMinutes(dataFutura.getMinutes() + minutos);
      }
      if (segundos !== null) {
        dataFutura.setSeconds(dataFutura.getSeconds() + segundos);
      }

      // Retorna em formato ISO string
      return dataFutura.toISOString();
    };

    const dataFimLeilao = calcularDataFutura(dias, horas, minutos, segundos);

    return {
      imagem: linkImagem,
      valores: {
        valorAvaliacao,
        valorMinimo1Leilao,
        valorMinimo2Leilao,
      },
      caracteristicas: {
        tipoImovel,
        quartos: quartos ? parseInt(quartos) : null,
        garagem: garagem ? parseInt(garagem) : null,
        areaTotal,
        areaPrivativa,
        areaTerreno,
      },
      identificacao: {
        numeroImovel,
        matriculas,
        comarca,
        oficcio: oficcio ? parseInt(oficcio) : null,
        inscricaoImobiliaria: inscricaoImobiliaria,
        averbacaoLeiloesNegativos,
      },
      leilao: {
        tipoLeilao: extraiModalidade(),
        edital,
        numeroItem,
        leiloeiro,
        data1Leilao,
        data2Leilao,
        desconto: extrairDesconto(),
      },
      localizacao: {
        endereco: enderecoCompleto.trim(),
        cep,
        cidade,
        estado,
      },
      titulo,
      dataFimLeilao,
      descricao,
      formasPagamento,
      regrasDespesas,
      observacoes,
    };
  });

  return dadosImovel;
}

/**
 * Mapeia todos os imóveis de todas as páginas e retorna uma lista
 */
export async function extractAllPropertiesData(page: Page): Promise<DadosImovel[]> {
  const propertiesData: Array<DadosImovel> = [];

  // Obtém o total de páginas
  const totalPaginas = await obterTotalPaginas(page);

  console.log(`Total de páginas encontradas: ${totalPaginas}`);

  // Itera sobre cada página
  for (let paginaAtual = 0; paginaAtual < totalPaginas; paginaAtual++) {
    console.log(
      `\nProcessando página ${paginaAtual + 1} de ${totalPaginas}...`
    );

    // Navega para a página atual (se não for a primeira)
    if (paginaAtual > 0) {
      await navegarParaPagina(page, paginaAtual);
    }

    // Conta quantos imóveis tem na página atual
    const totalImoveisNaPagina = await contarImoveisNaPagina(page);
    console.log(`  Imóveis encontrados na página: ${totalImoveisNaPagina}`);

    // Itera sobre cada imóvel da página
    for (
      let indiceImovel = 0;
      indiceImovel < totalImoveisNaPagina;
      indiceImovel++
    ) {
      // Navega para o imóvel
      await navegarParaImovel(page, indiceImovel);

      // Extrai os dados do imóvel
      const propertyData = await extractPropertyData(page);

      if (propertyData) {
        propertiesData.push(propertyData);
        console.log(`    Dados coletados de: ${propertyData.titulo}`);
      } else {
        console.log(
          `    ⚠️  Dados não encontrados para o imóvel ${indiceImovel + 1}`
        );
      }

      // Volta para a lista de imóveis
      await page.goBack();

      // Aguarda a paginação aparecer novamente e a lista de imóveis estar carregada
      await page.waitForFunction(
        () => {
          const paginacao = document.querySelector("#paginacao");
          const imoveis = document.querySelectorAll(
            "ul.control-group.no-bullets"
          );
          return paginacao !== null && imoveis.length > 0;
        },
        { timeout: 10000 }
      );
    }
  }

  return propertiesData;
}
