import * as fs from "fs";
import * as path from "path";
import { createBrowser } from "../config/browser.config";
import { defaultConfig } from "../config/scraping.config";
import { WorkerService } from "../services/WorkerService";
import { Logger } from "../utils/logger";
import { CityItem } from "../utils/cityDivider";

type ReportCity = {
  cidade?: string;
  estado?: string;
  cidadeId?: string;
  estadoId?: string;
  status?: string;
};

type Report = {
  cidades?: ReportCity[];
  erros?: {
    cidadesDetalhadas?: ReportCity[];
  };
};

const TEMP_DIR = path.join(process.cwd(), "temp");
const RETRY_FILE = "worker-retry.json";

function readReports(): Report[] {
  if (!fs.existsSync(TEMP_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(TEMP_DIR)
    .filter((file) => /^worker-\d+-report\.json$/i.test(file));

  return files.map((file) => {
    const content = fs.readFileSync(path.join(TEMP_DIR, file), "utf-8");
    return JSON.parse(content) as Report;
  });
}

function extractFailedCities(reports: Report[]): CityItem[] {
  const map = new Map<string, CityItem>();

  reports.forEach((report) => {
    const fromCities = report.cidades || [];
    const fromErrors = report.erros?.cidadesDetalhadas || [];
    const all = [...fromCities, ...fromErrors];

    all.forEach((city) => {
      if (!city || !city.cidadeId || !city.estadoId) {
        return;
      }
      if (city.status && city.status !== "error") {
        return;
      }

      const key = `${city.estadoId}-${city.cidadeId}`;
      if (!map.has(key)) {
        map.set(key, {
          state: city.estado || "",
          stateValue: city.estadoId,
          city: {
            innerText: city.cidade || "",
            value: city.cidadeId,
          },
        });
      }
    });
  });

  return Array.from(map.values());
}

async function runRetryWorker(): Promise<void> {
  Logger.separator("=");
  Logger.info("♻️  Gerando worker-retry com cidades com erro...");
  Logger.separator("=");

  const reports = readReports();
  const failedCities = extractFailedCities(reports);

  if (failedCities.length === 0) {
    Logger.warn("⚠️  Nenhuma cidade com erro encontrada. Nada para reprocessar.");
    return;
  }

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
  }

  const retryPath = path.join(TEMP_DIR, RETRY_FILE);
  fs.writeFileSync(retryPath, JSON.stringify(failedCities, null, 2), "utf-8");

  Logger.success(
    `✅ worker-retry.json criado com ${failedCities.length} cidades`
  );

  process.env.WORKER_FILE = RETRY_FILE;
  const workerId = 0;

  const browser = await createBrowser({
    headless: defaultConfig.headless,
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto(defaultConfig.baseUrl, {
    waitUntil: "networkidle2",
    timeout: defaultConfig.navigationTimeoutMs,
  });

  const workerService = new WorkerService(workerId, page);

  try {
    await workerService.processWorkerCities();
  } catch (error: any) {
    Logger.error(`❌ Erro no worker retry: ${error.message}`);
  } finally {
    await browser.close();
  }
}

runRetryWorker();
