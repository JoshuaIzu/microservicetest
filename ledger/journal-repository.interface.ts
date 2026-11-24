import type { ICreateJournalParams } from "./ledger.types";

export interface IJournalRepository {
  postOnce(data: ICreateJournalParams): Promise<void>;
}