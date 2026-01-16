import puppeteer, { Page } from "puppeteer";
import pool from "./database/config";
import {
  PropertyData,
  PropertyRepository,
} from "./repositories/PropertyRepository";
const notifier = require("node-notifier");
const path = require("path");

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
  try {
    await page.waitForSelector("#paginacao", { timeout: 5000 });
  } catch (error) {
    // Se não encontrar a paginação, verifica se há imóveis na página
    const temImoveis = await page.evaluate(() => {
      const imoveis = document.querySelectorAll("ul.control-group.no-bullets");
      return imoveis.length > 0;
    });
    console.log("temImoveis: " + temImoveis);
    return temImoveis ? 1 : 0;
  }

  const totalPaginas = await page.evaluate(() => {
    const paginacaoDiv = document.querySelector("#paginacao");

    if (!paginacaoDiv) {
      return 0;
    }

    const links = paginacaoDiv.querySelectorAll(
      'a[href*="carregaListaImoveis"]'
    );

    // Se não há links de paginação mas há a div, significa 1 página
    return links.length > 0 ? links.length : 1;
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
async function extractAllPropertiesData(page: Page): Promise<DadosImovel[]> {
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

//função que extrai os dados de imóveis da página de imóveis
async function extractPropertyData(page: Page): Promise<DadosImovel> {
  await page.waitForSelector("body", { timeout: 10000 });
  await page.waitForSelector("#preview", { timeout: 10000 });

  const dadosImovel = await page.evaluate(async () => {
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

      // Retorna apenas o texto, removendo espaços extras
      const titulo = h5Clone.textContent?.trim() || "";
      return titulo;
    };

    const extraiModalidade = () => {
      const modalidadeDiv = document.querySelectorAll(".control-span-12_12");

      if (modalidadeDiv.length === 0) {
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

        const textoCompleto = primeiroParagrafo?.textContent;

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

// pega os valores do seletor de cidades pora todos os estados
async function getAllCitiesForAllStates(page: Page) {
  await page.waitForSelector("#cmb_estado");

  const states = await getStates(page);

  const data: Array<{
    state: string;
    cities: Array<{ innerText: string; value: string }>;
  }> = [];

  for (let i = 0; i < states.length; i++) {
    await page.select("#cmb_estado", states[i].value);

    await page.waitForFunction(
      () => {
        const select = document.querySelector(
          "#cmb_cidade"
        ) as HTMLSelectElement;
        return select && select.options.length > 1;
      },
      { timeout: 10000 }
    );

    const cities = await getCities(page);
    const stateData = {
      state: states[i].innerText,
      cities: cities,
    };
    data.push(stateData);
  }

  return data;
}

//função que seleciona a cidade e o estado e espera carregar a página
async function selectCity(page: Page, city: string, state: string) {
  console.log(`selecionando cidade ${city} ...`);

  const isToDelay = await page.waitForFunction(
    () => {
      const alter = document.querySelector("#altera_0 a");
      if (alter) {
        (alter as HTMLElement).click();
        return true;
      }
      return false;
    },
    { timeout: 10000 }
  );

  if (isToDelay) {
    await delay(2000);
  }

  await page.select("#cmb_estado", state);

  await page.waitForFunction(
    () => {
      const select = document.querySelector("#cmb_cidade") as HTMLSelectElement;
      return select && select.options.length > 1;
    },
    { timeout: 10000 }
  );

  await page.select("#cmb_cidade", city);
  await delay(1000);

  await page.waitForSelector("#btn_next0", { timeout: 10000 });

  await page.click("#btn_next0");

  await page.waitForSelector("#btn_next1", { timeout: 10000 });

  await page.click("#btn_next1");

  await delay(1000);

  console.log("cidade selecionada!");
}

/**
 * Converte DadosImovel para PropertyData (formato do banco de dados)
 */
function mapearParaPropertyData(dados: DadosImovel): PropertyData {
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

async function start() {
  console.log("Iniciando scraping...");
  // Testa a conexão com o banco de dados antes de iniciar o scraping

  try {
    console.log("🔌 Testando conexão com o banco de dados...");
    const result = await pool.query(
      "SELECT NOW() as current_time, version() as version"
    );
    console.log("✅ Conexão com o banco de dados estabelecida com sucesso");
  } catch (error: any) {
    console.error("❌ Erro ao conectar com o banco de dados:");
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Código: ${error.code || "N/A"}`);
  }

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

  const cities = await getAllCitiesForAllStates(page);

  const propertyRepository = new PropertyRepository();

  const relatorio = {
    totalEstados: cities.length,
    totalCidades: cities.reduce((acc, state) => acc + state.cities.length, 0),
    cidadesProcessadas: 0,
    cidadesComSucesso: 0,
    cidadesComErro: 0,
    imoveisSalvos: 0,
    imoveisDuplicados: 0,
    imoveisComErro: 0,
    erros: [] as Array<{ cidade: string; estado: string; erro: string }>,
  };

  let salvos = 0;
  let duplicados = 0;
  let erros = 0;

  console.log("\n" + "=".repeat(80));
  console.log("📊 INICIANDO PROCESSAMENTO DE TODAS AS CIDADES");
  console.log("=".repeat(80));

  for (const stateData of cities) {
    for (let i = 0; i < stateData.cities.length; i++) {
      const city = stateData.cities[i];
      relatorio.cidadesProcessadas++;
      try {
        await selectCity(page, city.value, stateData.state);
        const propertiesData = await extractAllPropertiesData(page);
        console.log("\n💾 Salvando dados no banco de dados...\n");

        for (const dados of propertiesData) {
          try {
            const propertyData = mapearParaPropertyData(dados);

            // Verifica se o imóvel já existe antes de salvar
            const existe = await propertyRepository.existsByFields(
              propertyData
            );

            if (existe) {
              duplicados++;
            } else {
              const id = await propertyRepository.create(propertyData);
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
      } catch (error: any) {
        notifier.notify(
          {
            title: "ERRO NO SCRAPING",
            message: "Veja no console para mais detalhes",
            sound: true, // Only Notification Center or Windows Toasters
            wait: true, // Wait with callback, until user action is taken against notification
          },
          function (err: any, response: any, metadata: any) {
            if (err) console.error(err);
            console.log("Notification sound played.");
          }
        );

        await delay(2000);

        relatorio.cidadesComErro++;
        relatorio.erros.push({
          cidade: city.innerText,
          estado: stateData.state,
          erro: `Erro ao processar cidade: ${error.message}`,
        });
        console.error(`   ❌ Erro: ${error.message}`);
      }

      try {
        await page.waitForSelector("#altera_0 a", { timeout: 5000 });
        console.log("clicando no botão de voltar para a lista de cidade");
        await page.click("#altera_0 a");
      } catch (error: any) {
        await page.goto(
          "https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?sltTipoBusca=imoveis",
          {
            waitUntil: "networkidle2",
          }
        );

        console.error(
          `❌ Erro ao clicar no botão de voltar para a lista de cidade: ${error.message}`
        );
      }

      await delay(1000);
    }
  }

  await browser.close();
  return;
}

start();
