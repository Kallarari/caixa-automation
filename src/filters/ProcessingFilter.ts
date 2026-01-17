import { ProcessingMode } from "../config/scraping.config";

export class ProcessingFilter {
  constructor(
    private mode: ProcessingMode,
    private estadoId?: string,
    private cidadeId?: string
  ) {}

  shouldProcessState(stateId: string): boolean {
    if (this.mode === "all") {
      return true;
    }
    if (this.mode === "state" || this.mode === "city") {
      return this.estadoId === stateId;
    }
    return false;
  }

  shouldProcessCity(stateId: string, cityId: string): boolean {
    if (this.mode === "all") {
      return true;
    }
    if (this.mode === "state") {
      return this.estadoId === stateId;
    }
    if (this.mode === "city") {
      return this.estadoId === stateId && this.cidadeId === cityId;
    }
    return false;
  }

  getMode(): ProcessingMode {
    return this.mode;
  }

  getEstadoId(): string | undefined {
    return this.estadoId;
  }

  getCidadeId(): string | undefined {
    return this.cidadeId;
  }
}
