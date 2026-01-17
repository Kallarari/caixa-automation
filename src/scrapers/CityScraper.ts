import { Page } from "puppeteer";
import { StateOption, CityOption, StateData } from "../types/Scraping.types";
import { delay } from "../utils/delay";

/**
 * Pega as options do seletor de estados
 */
export async function getStates(page: Page): Promise<StateOption[]> {
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

/**
 * Com um estado selecionado, pega as options do seletor de cidades
 */
export async function getCities(page: Page): Promise<CityOption[]> {
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

/**
 * Pega os valores do seletor de cidades para todos os estados
 */
export async function getAllCitiesForAllStates(page: Page): Promise<StateData[]> {
  await page.waitForSelector("#cmb_estado");

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
      { timeout: 10000 }
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
export async function selectCity(page: Page, city: string, state: string): Promise<void> {
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
