export interface StateOption {
  innerText: string;
  value: string;
}

export interface CityOption {
  innerText: string;
  value: string;
}

export interface StateData {
  state: string;
  stateValue: string;
  cities: CityOption[];
}
