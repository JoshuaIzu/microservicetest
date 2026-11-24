import type { Currency } from "../events/payment-captured.contract";

export const ENTRY_SIDES = ["DEBIT", "CREDIT"] as const;
export type EntrySide = (typeof ENTRY_SIDES)[number];

export const LEDGER_ACCOUNTS = [
  "provider_clearing",
  "merchant_payable",
] as const;

export type LedgerAccount = (typeof LEDGER_ACCOUNTS)[number];

export interface IJournalEntry {
  account: LedgerAccount;
  side: EntrySide;
  amountMinor: number;
}

export interface ICreateJournalParams {
  eventId: string;
  paymentId: string;
  currency: Currency;
  entries: IJournalEntry[];
}