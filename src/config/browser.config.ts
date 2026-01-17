import puppeteer from 'puppeteer';

export interface BrowserConfig {
  headless: boolean;
  defaultViewport: null | { width: number; height: number };
}

export const defaultBrowserConfig: BrowserConfig = {
  headless: false,
  defaultViewport: null,
};

export async function createBrowser(config: BrowserConfig = defaultBrowserConfig) {
  return await puppeteer.launch({
    headless: config.headless,
    defaultViewport: config.defaultViewport,
  });
}
