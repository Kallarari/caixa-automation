import puppeteer from "puppeteer";

export interface BrowserConfig {
  headless: boolean;
  defaultViewport: null | { width: number; height: number };
  args?: string[];
}

export const defaultBrowserConfig: BrowserConfig = {
  headless: false,
  defaultViewport: null,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ],
};

export async function createBrowser(
  config: BrowserConfig = defaultBrowserConfig,
) {
  return await puppeteer.launch({
    headless: config.headless,
    defaultViewport: config.defaultViewport,    
    args: config.args,
  });
}
