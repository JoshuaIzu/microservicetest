import { asyncHandler } from "../shared/async-handler";
import type { AuthRequestHandler } from "../auth/auth.middleware";
import type { SettlementService } from "./settlement.service";
import { settlementSchema } from "./settlement.types";

export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  public reconcile: AuthRequestHandler = asyncHandler(async (req, res) => {
    const auth = res.locals.auth;

    if (!auth) {
      res.status(401).json({ error: "UNAUTHENTICATED" });
      return;
    }

    const input = settlementSchema.safeParse(req.body);

    if (!input.success) {
      res.status(400).json({ error: "INVALID_SETTLEMENT_INPUT" });
      return;
    }

    const result = await this.settlementService.reconcile(auth.sub, input.data);

    if (!result) {
      res.status(404).json({ error: "SETTLEMENT_NOT_FOUND" });
      return;
    }

    res.status(result.status === "pending" ? 202 : 200).json(result);
  });
}
