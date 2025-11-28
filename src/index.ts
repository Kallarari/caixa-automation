import puppeteer, { Page } from "puppeteer";

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    const bodyText = document.body.innerText || document.body.textContent || '';
    
    const imgPreview = document.querySelector('#preview') as HTMLImageElement;
    const linkImagem = imgPreview ? imgPreview.src : '';
    
    const extrairValor = (padrao: RegExp, texto: string): string => {
      const match = texto.match(padrao);
      return match ? match[1].trim() : '';
    };

    const extrairValorMonetario = (padrao: RegExp, texto: string): string => {
      const match = texto.match(padrao);
      return match ? match[1].trim() : '';
    };

    const extrairNumero = (padrao: RegExp, texto: string): string => {
      const match = texto.match(padrao);
      return match ? match[1].trim() : '';
    };

    const valorAvaliacao = extrairValorMonetario(/Valor de avaliação:\s*(R\$\s*[\d.,]+)/i, bodyText);
    const valorMinimo1Leilao = extrairValorMonetario(/Valor mínimo de venda 1º Leilão:\s*(R\$\s*[\d.,]+)/i, bodyText);
    const valorMinimo2Leilao = extrairValorMonetario(/Valor mínimo de venda 2º Leilão:\s*(R\$\s*[\d.,]+)/i, bodyText);
    const tipoImovel = extrairValor(/Tipo de imóvel:\s*(.+)/i, bodyText);
    const quartos = extrairNumero(/Quartos:\s*(\d+)/i, bodyText);
    const garagem = extrairNumero(/Garagem:\s*(\d+)/i, bodyText);
    const numeroImovel = extrairValor(/Número do imóvel:\s*(.+)/i, bodyText);
    const matriculas = extrairValor(/Matrícula\(s\):\s*(.+)/i, bodyText);
    const comarca = extrairValor(/Comarca:\s*(.+)/i, bodyText);
    const oficcio = extrairNumero(/Ofício:\s*(\d+)/i, bodyText);
    const inscricaoImobiliaria = extrairValor(/Inscrição imobiliária:\s*(.+)/i, bodyText);
    const averbacaoLeiloesNegativos = extrairValor(/Averbação dos leilões negativos:\s*(.+)/i, bodyText);
    
    const areaTotal = extrairValor(/Área total\s*=\s*([\d.,]+m2)/i, bodyText);
    const areaPrivativa = extrairValor(/Área privativa\s*=\s*([\d.,]+m2)/i, bodyText);
    const areaTerreno = extrairValor(/Área do terreno\s*=\s*([\d.,]+m2)/i, bodyText);
    
    const tipoLeilao = extrairValor(/^(Leilão Único|Leilão)/m, bodyText);
    const edital = extrairValor(/Edital:\s*(.+)/i, bodyText);
    const numeroItem = extrairValor(/Número do item:\s*(.+)/i, bodyText);
    const leiloeiro = extrairValor(/Leiloeiro\(a\):\s*(.+)/i, bodyText);
    const data1Leilao = extrairValor(/Data do 1º Leilão\s*-\s*(.+)/i, bodyText);
    const data2Leilao = extrairValor(/Data do 2º Leilão\s*-\s*(.+)/i, bodyText);
    
    const enderecoCompleto = extrairValor(/Endereço:\s*(.+?)(?:\n|Baixar|Descrição|$)/is, bodyText);
    
    const cepMatch = bodyText.match(/CEP:\s*(\d{5}-\d{3})/i);
    const cep = cepMatch ? cepMatch[1] : '';
    
    const cidadeEstadoMatch = bodyText.match(/CEP:\s*\d{5}-\d{3},\s*(.+?)\s*-\s*(.+?)(?:\n|$)/i);
    const cidade = cidadeEstadoMatch ? cidadeEstadoMatch[1].trim() : '';
    const estado = cidadeEstadoMatch ? cidadeEstadoMatch[2].trim() : '';
    
    const descricaoMatch = bodyText.match(/Descrição:\s*(.+?)(?:\n\n|FORMAS DE PAGAMENTO|$)/is);
    const descricao = descricaoMatch ? descricaoMatch[1].trim() : '';
    
    const formasPagamentoMatch = bodyText.match(/FORMAS DE PAGAMENTO ACEITAS:\s*(.+?)(?:\n\n|REGRAS PARA PAGAMENTO|$)/is);
    const formasPagamento = formasPagamentoMatch ? formasPagamentoMatch[1].trim() : '';
    
    const regrasDespesasMatch = bodyText.match(/REGRAS PARA PAGAMENTO DAS DESPESAS[^:]*:\s*(.+?)(?:\n\n|Imóvel com|$)/is);
    const regrasDespesas = regrasDespesasMatch ? regrasDespesasMatch[1].trim() : '';
    
    const observacoesMatch = bodyText.match(/Imóvel com (.+?)(?:\n\n|$)/is);
    const observacoes = observacoesMatch ? observacoesMatch[1].trim() : '';

    return {
      imagem: linkImagem,
      valores: {
        valorAvaliacao,
        valorMinimo1Leilao,
        valorMinimo2Leilao
      },
      caracteristicas: {
        tipoImovel,
        quartos: quartos ? parseInt(quartos) : null,
        garagem: garagem ? parseInt(garagem) : null,
        areaTotal,
        areaPrivativa,
        areaTerreno
      },
      identificacao: {
        numeroImovel,
        matriculas,
        comarca,
        oficcio: oficcio ? parseInt(oficcio) : null,
        inscricaoImobiliaria: inscricaoImobiliaria,
        averbacaoLeiloesNegativos
      },
      leilao: {
        tipoLeilao,
        edital,
        numeroItem,
        leiloeiro,
        data1Leilao,
        data2Leilao
      },
      localizacao: {
        endereco: enderecoCompleto.trim(),
        cep,
        cidade,
        estado
      },
      descricao,
      formasPagamento,
      regrasDespesas,
      observacoes
    };
  });

  return dadosImovel;
}

// função que seleciona o estado do paraná e depois curitiba
async function makeInitialProcess(page:Page, state:string = "PR"){
  await page.waitForSelector("select");

  //seleciona PR
  await page.select("select", "PR");

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

  await page.goto("https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?sltTipoBusca=imoveis", {
    waitUntil: "networkidle2",
  });

  await makeInitialProcess(page);
  

  await page.waitForSelector("#paginacao", { timeout: 10000 });

  const { totalPaginas, linksPaginas } = await page.evaluate(() => {
    const paginacaoDiv = document.querySelector("#paginacao");
    if (!paginacaoDiv) {
      return { totalPaginas: 0, linksPaginas: [] };
    }
    
    const links = paginacaoDiv.querySelectorAll('a[href*="carregaListaImoveis"]');
    const linksArray: string[] = [];
    
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      linksArray.push(href);
    });
    
    return {
      totalPaginas: links.length,
      linksPaginas: linksArray
    };
  });

  // Busca e conta as divs de imóveis
  const totalImoveis = await page.evaluate(() => {
    const imoveis = document.querySelectorAll('ul.control-group.no-bullets');
    return imoveis.length;
  });

  // Clica na primeira div de imóvel encontrada
  if (totalImoveis > 0) {
    await page.evaluate(() => {
      const primeiroImovel = document.querySelector('ul.control-group.no-bullets');
      if (primeiroImovel) {
        const linkDetalhes = primeiroImovel.querySelector('a[onclick*="detalhe_imovel"]');
        if (linkDetalhes) {
          (linkDetalhes as HTMLElement).click();
        }
      }
    });
  }

  await delay(1500);

  const dadosImovel = await extrairDadosImovel(page);

  // Volta uma página no navegador
  await page.goBack();
  await delay(2000);

  // Aguarda a div de paginação aparecer novamente
  await page.waitForSelector("#paginacao", { timeout: 10000 });

  // Clica no segundo componente de página (índice 1, pois o primeiro é índice 0)
  if (linksPaginas.length >= 2) {
    await page.evaluate((index) => {
      const paginacaoDiv = document.querySelector("#paginacao");
      if (paginacaoDiv) {
        const links = paginacaoDiv.querySelectorAll('a[href*="carregaListaImoveis"]');
        if (links[index]) {
          (links[index] as HTMLElement).click();
        }
      }
    }, 1); // Índice 1 = segunda página
  }

  await delay(2000);
  
  await delay(13000);

  await browser.close();
}

start();
