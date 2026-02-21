### Estrutura do projeto

Esse sistema faz o webscrapping de imóveis de leilão do site da Caixa econômica federal.
Ele usa node e puppeteer para fazer isso e é organizado usando PPO e classes.

Para isso ele tem três possiveis processos, por cidade, por estado e no geral.

Demora algumas horas para recolher todos os dados.

### Estrutura
Ponto principal onde todas as funções estão conectadas.

### Sobre as pastas 
## src/config
tem os arquivos scraping.config e browser.config.

# scraping.config
Esse arquivo mantem as configurações de utilização do puppeteer.

# browser.config
Esse arquivo criar o browser para o puppeteer usando as configurações do scraping.config.


## src/database
Aqui temos dois arquivos, um deles inicia o banco de dados e testa a conexão o outro salva dados em um json no root do projeto.

## src/filters
Essa pasta a lógica dos filtros de "o que" processar, para processar uma determinada cidade ou um determinado estado ele pula até a selecionada

## src/repositories
Aqui temos os arquivos que recebem os dados tratados e salvam no banco de dados.

## src/scrapers
Aqui temos os arquivos que detém as funções que atuam com a tela do navegador, fazendo a coleta de dados de cidades e estados, fazendo coleta de paginação da cidade, e também coletando os dados na página do imóvel.

Nesta pasta também temos o sitema de navegação para filtrar ou entrar em um imóvel, sem necessáriamente recolher dados.

## src/services
Cotém os arquivos responsáveis por coordenar a aplicação, orquestrando os processos e tratando os dados.

## src/statics
Faz um Log de tudo e marca quais cidades foram ou não processadas corretamente.

## src/types
Contém os tipos usados na aplicação

## src/utils
Algumas funções utilitarias como delay, logger e notify.


### Fluxo completo de execução

1. index.ts inicia
   ↓
2. Carrega configurações (modo, IDs)
   ↓
3. Cria browser Puppeteer
   ↓
4. Navega para URL base
   ↓
5. CityScraper.getAllCitiesForAllStates()
   - Itera todos os estados
   - Para cada estado: seleciona → extrai cidades
   ↓
6. Inicializa StatisticsManager, ProcessingFilter, ScrapingService
   ↓
7. ScrapingService.processAll/State/City()
   ↓
8. Para cada cidade (CityService.processCity):
   a) Seleciona cidade no site (CityScraper.selectCity)
   b) Extrai todos os imóveis (PropertyScraper.extractAllPropertiesData):
      - Navega páginas (PaginationScraper)
      - Para cada imóvel:
        * Navega para detalhes (NavigationService)
        * Extrai dados (PropertyScraper.extractPropertyData)
        * Volta para lista
   c) Salva no banco (PropertyService.saveProperties):
      - Converte formato (mapearParaPropertyData)
      - Verifica duplicados
      - Salva novos
   d) Atualiza estatísticas
   ↓
9. Exibe relatório final (StatisticsManager.printGlobalReport)
   ↓
10. Fecha browser

### Execução paralela

- Windows:
  - `npm run parallel`
- Linux:
  - `npm run parallel:linux`
  - Para definir quantidade de workers: `npm run parallel:linux -- 4`

No Linux os workers rodam em background e escrevem logs em `temp/worker-<id>.log`.
