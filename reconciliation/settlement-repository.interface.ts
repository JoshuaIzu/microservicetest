import type { ISettlementDTO, SettlementResult } from "./settlement.types";

export interface ISettlementRepository {
  recordAndMatch(ownerId: string, dto: ISettlementDTO): Promise<SettlementResult>;
}
