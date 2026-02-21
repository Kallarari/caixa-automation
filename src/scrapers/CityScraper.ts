import { Page } from "puppeteer";
import { StateOption, CityOption, StateData } from "../types/Scraping.types";
import { delay } from "../utils/delay";
import { defaultConfig } from "../config/scraping.config";
import { ErrorHandler } from "../utils/errorHandler";

/**
 * Pega as options do seletor de estados
 */
export async function getStates(page: Page): Promise<StateOption[]> {
  await delay(defaultConfig.actionDelayMs);
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

/**
 * Com um estado selecionado, pega as options do seletor de cidades
 */
export async function getCities(page: Page): Promise<CityOption[]> {
  await delay(defaultConfig.actionDelayMs);
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

/**
 * Pega os valores do seletor de cidades para todos os estados
 */
export async function getAllCitiesForAllStates(page: Page): Promise<StateData[]> {
  await page.waitForSelector("#cmb_estado", { timeout: defaultConfig.selectorTimeoutMs });

  const states = await getStates(page);

  const data: StateData[] = [];

  for (let i = 0; i < states.length; i++) {
    await page.select("#cmb_estado", states[i].value);

    await page.waitForFunction(
      () => {
        const select = document.querySelector(
          "#cmb_cidade"
        ) as HTMLSelectElement;
        return select && select.options.length > 1;
      },
      { timeout: defaultConfig.selectorTimeoutMs }
    );

    const cities = await getCities(page);
    const stateData: StateData = {
      state: states[i].innerText,
      stateValue: states[i].value,
      cities: cities,
    };
    data.push(stateData);
  }

  return data;
}

/**
 * Seleciona a cidade e o estado e espera carregar a página
 */
async function safeClickButton(
  page: Page,
  selector: string,
  stepName: string,
  maxAttempts: number = 1
): Promise<void> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.waitForSelector(selector, {
        timeout: defaultConfig.selectorTimeoutMs,
        visible: true,
      });

      await page.waitForFunction(
        (sel) => {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const isHidden =
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0" ||
            style.pointerEvents === "none";
          const isDisabled = "disabled" in el && (el as HTMLButtonElement).disabled;
          return rect.width > 0 && rect.height > 0 && !isHidden && !isDisabled;
        },
        { timeout: defaultConfig.selectorTimeoutMs },
        selector
      );

      await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ block: "center", inline: "center" });
        }
      }, selector);

      try {
        await page.click(selector);
      } catch (clickError) {
        const elementHandle = await page.$(selector);
        if (!elementHandle) {
          throw clickError;
        }
        await elementHandle.click();
      }

      await delay(defaultConfig.actionDelayMs);
      return;
    } catch (error: any) {
      lastError = error;
      if (attempt < maxAttempts) {
        await delay(defaultConfig.actionDelayMs);
      }
    }
  }

  const errorDetails = await ErrorHandler.captureErrorDetails(
    lastError || new Error("Falha ao clicar no elemento"),
    "selectCity",
    "CityScraper.ts",
    page,
    selector,
    `${stepName} tentativa=${maxAttempts}`
  );
  throw new Error(ErrorHandler.formatError(errorDetails));
}

/**
 * Seleciona a cidade e o estado e espera carregar a página
 */
export async function selectCity(page: Page, city: string, state: string): Promise<void> {
  console.log(`selecionando cidade ${city} do estado ${state}...`);

  // Tenta clicar no botão "Alterar" se estiver na página de resultados
  const isToDelay = await page.waitForFunction(
    () => {
      const alter = document.querySelector("#altera_0 a");
      if (alter && alter instanceof HTMLElement) {
        alter.click();
        return true;
      }
      return false;
    },
    { timeout: defaultConfig.selectorTimeoutMs }
  ).catch(() => false);

  if (isToDelay) {
    await delay(defaultConfig.actionDelayMs);
    // Aguarda novamente o seletor de estado após clicar em "Alterar"
    await page.waitForSelector("#cmb_estado", { timeout: defaultConfig.selectorTimeoutMs });
  }

  await page.waitForSelector("#cmb_estado", { timeout: defaultConfig.selectorTimeoutMs });
  // Seleciona o estado
  await page.select("#cmb_estado", state);
  console.log(`✅ Estado ${state} selecionado`);

  // Aguarda as cidades carregarem após selecionar o estado
  await page.waitForFunction(
    () => {
      const select = document.querySelector("#cmb_cidade") as HTMLSelectElement;
      return select && select.options.length > 1;
    },
    { timeout: defaultConfig.selectorTimeoutMs }
  );

  // Seleciona a cidade
  await page.select("#cmb_cidade", city);
  console.log(`✅ Cidade ${city} selecionada`);

  await delay(3000);
  if(city === "7186" || city === "RIO DE JANEIRO"){
    await delay(5000);
  }
  // Clica no primeiro botão "Próximo"
  await safeClickButton(page, "#btn_next0", "click btn_next0", 3);

  // Clica no segundo botão "Próximo"
  await safeClickButton(page, "#btn_next1", "click btn_next1", 2 );

  await safeClickButton(page, "#btn_next2", "click btn_next2", 2 );

  await delay(defaultConfig.actionDelayMs);

  console.log("✅ Cidade selecionada e página carregada!");

  // Captura erros gerais que possam ter ocorrido
  try {
    // Verifica se a página carregou corretamente
    await page.waitForSelector("#paginacao", { timeout: defaultConfig.selectorTimeoutMs });
  } catch (error: any) {
    // Se não encontrar #paginacao, pode ser que não há imóveis ou houve erro
    // Mas não lança erro aqui, apenas loga
    console.warn("⚠️  Seletor #paginacao não encontrado após selecionar cidade");
  }
}
