import type { ISettlementRepository } from "./settlement-repository.interface";
import type { ISettlementDTO, SettlementResult } from "./settlement.types";

export class SettlementService {
  constructor(private readonly settlementRepo: ISettlementRepository) {}

  public reconcile = async (
    ownerId: string,
    dto: ISettlementDTO,
  ): Promise<SettlementResult> => {
    return this.settlementRepo.recordAndMatch(ownerId, dto);
  };
}