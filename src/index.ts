import puppeteer, { Page } from "puppeteer";
import { salvarDadosEmJSON } from "./database/saveData";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Conta quantos imóveis existem na página atual
 */
async function contarImoveisNaPagina(page: Page): Promise<number> {
  await page.waitForSelector("#paginacao", { timeout: 10000 });

  const totalImoveis = await page.evaluate(() => {
    const imoveis = document.querySelectorAll("ul.control-group.no-bullets");
    return imoveis.length;
  });

  return totalImoveis;
}

/**
 * Extrai o nome do imóvel da div específica, removendo inputs e pegando apenas o texto do h5
 */
async function extrairNomeImovel(page: Page): Promise<string> {
  const nomeImovel = await page.evaluate(() => {
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

    // Retorna apenas o texto, removendo espaços extras
    return h5Clone.textContent?.trim() || "";
  });

  return nomeImovel;
}

/**
 * Navega para um imóvel específico na página atual pelo índice
 */
async function navegarParaImovel(page: Page, indice: number): Promise<void> {
  await page.waitForSelector("#paginacao", { timeout: 10000 });

  await page.evaluate((index) => {
    const imoveis = document.querySelectorAll("ul.control-group.no-bullets");
    if (imoveis[index]) {
      const linkDetalhes = imoveis[index].querySelector(
        'a[onclick*="detalhe_imovel"]'
      );
      if (linkDetalhes) {
        (linkDetalhes as HTMLElement).click();
      }
    }
  }, indice);

  // Aguarda a página de detalhes carregar verificando se o elemento #preview existe
  await page.waitForSelector("#preview", { timeout: 10000 }).catch(() => {
    // Se #preview não existir, aguarda pelo menos o body estar carregado
    return page.waitForSelector("body", { timeout: 10000 });
  });
}

/**
 * Obtém o total de páginas disponíveis
 */
async function obterTotalPaginas(page: Page): Promise<number> {
  await page.waitForSelector("#paginacao", { timeout: 10000 });

  const totalPaginas = await page.evaluate(() => {
    const paginacaoDiv = document.querySelector("#paginacao");
    if (!paginacaoDiv) {
      return 0;
    }

    const links = paginacaoDiv.querySelectorAll(
      'a[href*="carregaListaImoveis"]'
    );
    return links.length;
  });

  return totalPaginas;
}

/**
 * Navega para uma página específica pelo índice (0 = primeira página)
 */
async function navegarParaPagina(
  page: Page,
  indicePagina: number
): Promise<void> {
  await page.waitForSelector("#paginacao", { timeout: 10000 });

  await page.evaluate((index) => {
    const paginacaoDiv = document.querySelector("#paginacao");
    if (paginacaoDiv) {
      const links = paginacaoDiv.querySelectorAll(
        'a[href*="carregaListaImoveis"]'
      );
      if (links[index]) {
        (links[index] as HTMLElement).click();
      }
    }
  }, indicePagina);

  await delay(2000);
}

/**
 * Mapeia todos os imóveis de todas as páginas e retorna uma lista com os nomes
 */
async function mapearTodosImoveis(page: Page): Promise<string[]> {
  const nomesImoveis: string[] = [];

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
      console.log(
        `  Processando imóvel ${indiceImovel + 1} de ${totalImoveisNaPagina}...`
      );

      // Navega para o imóvel
      await navegarParaImovel(page, indiceImovel);

      // Extrai o nome do imóvel
      const nomeImovel = await extrairNomeImovel(page);

      if (nomeImovel) {
        nomesImoveis.push(nomeImovel);
        console.log(`    Nome coletado: ${nomeImovel}`);
      } else {
        console.log(
          `    ⚠️  Nome não encontrado para o imóvel ${indiceImovel + 1}`
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

  return nomesImoveis;
}

interface DadosImovel {
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
  };
  localizacao: {
    endereco: string;
    cep: string;
    cidade: string;
    estado: string;
  };
  descricao: string;
  formasPagamento: string;
  regrasDespesas: string;
  observacoes: string;
}

//função que extrai os dados de imóveis da página de imóveis
async function extrairDadosImovel(page: Page): Promise<DadosImovel> {
  await page.waitForSelector("body", { timeout: 10000 });
  await page.waitForSelector("#preview", { timeout: 10000 });

  const dadosImovel = await page.evaluate(() => {
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

    const tipoLeilao = extrairValor(/^(Leilão Único|Leilão)/m, bodyText);
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
      if (dias === null && horas === null && minutos === null && segundos === null) {
        return null;
      }
      if(dias === 0 && horas === 0 && minutos === 0 && segundos === 0) {
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
        tipoLeilao,
        edital,
        numeroItem,
        leiloeiro,
        data1Leilao,
        data2Leilao,
      },
      localizacao: {
        endereco: enderecoCompleto.trim(),
        cep,
        cidade,
        estado,
      },
      dataFimLeilao,
      descricao,
      formasPagamento,
      regrasDespesas,
      observacoes,
    };
  });

  return dadosImovel;
}

// essa função pega as options do seletor de estados
async function getStates(page: Page) {
  delay(1000);
  const estados = (await page.evaluate(() => {
    const selectEstado = document.querySelector(
      "#cmb_estado"
    ) as HTMLSelectElement;

    if (!selectEstado) {
      return [] as Array<{ innerText: string; value: string }>;
    }

    const options: Array<{ innerText: string; value: string }> = [];
    const optionElements = selectEstado.querySelectorAll("option");

    optionElements.forEach((option) => {
      const value = option.value;
      const innerText = option.textContent?.trim() || option.innerText.trim();

      if (
        value &&
        value.trim() !== "" &&
        innerText &&
        innerText.toLowerCase() !== "selecione"
      ) {
        options.push({
          innerText,
          value,
        });
      }
    });

    return options;
  })) as Array<{ innerText: string; value: string }>;
  return estados.slice(1, estados.length);
}

//com um estado selecionado essa função pega as options do seletor de cidades
async function getCities(page: Page) {
  delay(1000);
  const cities = (await page.evaluate(() => {
    const selectCity = document.querySelector(
      "#cmb_cidade"
    ) as HTMLSelectElement;

    if (!selectCity) {
      return [] as Array<{ innerText: string; value: string }>;
    }

    const options: Array<{ innerText: string; value: string }> = [];
    const optionElements = selectCity.querySelectorAll("option");

    optionElements.forEach((option) => {
      const value = option.value;
      const innerText = option.textContent?.trim() || option.innerText.trim();

      if (
        value &&
        value.trim() !== "" &&
        innerText &&
        innerText.toLowerCase() !== "selecione"
      ) {
        options.push({
          innerText,
          value,
        });
      }
    });

    return options;
  })) as Array<{ innerText: string; value: string }>;

  return cities.slice(1, cities.length);
}

// função que seleciona o estado do paraná e depois curitiba
async function makeInitialProcess(page: Page, state: string = "PR") {

  await page.waitForSelector("#cmb_estado");

  
  const states = await getStates(page);
  

  const data: Array<{ state: string; cities: Array<{ innerText: string; value: string }> }> = [];

  for (let i = 0; i < states.length; i++) {
    await page.select("#cmb_estado", states[i].value);
  
    await page.waitForFunction(
      () => {
        const select = document.querySelector("#cmb_cidade") as HTMLSelectElement;
        return select && select.options.length > 1;
      },
      { timeout: 10000 }
    );

    const cities = await getCities(page);
    const stateData = {
      state: states[i].innerText,
      cities: cities,
    }
    data.push(stateData);
  }

  salvarDadosEmJSON(data, "cidades-teste.json");
  return;
  await page.select("#cmb_estado", states[1].value);
  await delay(3000);
  await getCities(page);
  return;

  //seleciona PR
  await page.select("cmb_estado", "PR");

  await page.evaluate(() => {
    if (typeof (window as any).selecionaEstado === "function") {
      (window as any).selecionaEstado();
    }
  });

  await delay(1000);

  await page.waitForSelector("#cmb_cidade", { timeout: 10000 });

  await delay(1000);

  //seleciona Curitiba
  await page.select("#cmb_cidade", "6143");

  await delay(1000);

  await page.waitForSelector("#btn_next0", { timeout: 10000 });
  await page.click("#btn_next0");

  await page.waitForSelector("#btn_next1", { timeout: 10000 });
  await page.click("#btn_next1");

  await delay(2000);
}

async function start() {
  console.log("Iniciando scraping...");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto(
    "https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?sltTipoBusca=imoveis",
    {
      waitUntil: "networkidle2",
    }
  );

  await makeInitialProcess(page);

  // Mapeia todos os imóveis de todas as páginas
  const nomesImoveis = await mapearTodosImoveis(page);

  // Imprime todos os nomes coletados
  console.log("\n" + "=".repeat(80));
  console.log("RESUMO FINAL - TODOS OS IMÓVEIS COLETADOS");
  console.log("=".repeat(80));
  console.log(`\nTotal de imóveis coletados: ${nomesImoveis.length}\n`);

  nomesImoveis.forEach((nome, index) => {
    console.log(`${index + 1}. ${nome}`);
  });

  console.log("\n" + "=".repeat(80));

  await browser.close();
}

start();
